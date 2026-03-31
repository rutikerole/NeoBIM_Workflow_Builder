"use client";

/**
 * BIMViewer — Production-quality BIM 3D viewer with element selection,
 * properties panel, post-processing (SSAO, bloom, FXAA), and BIM features
 * (section planes, discipline coloring, storey isolation).
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import {
  Loader2, AlertCircle, RotateCcw, Maximize2, Minimize2,
  MousePointerClick, X, Download, Layers, Scissors, Eye,
} from "lucide-react";
import type { BIMMetadata, BIMElementMeta } from "@/services/metadata-extractor";
import { getDisciplineColor, getStoreyColor } from "@/services/material-mapping";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BIMViewerProps {
  glbUrl: string;
  metadataUrl?: string;
  ifcUrl?: string;
  height?: number;
}

type ColorMode = "default" | "discipline" | "storey";

// ─── Highlight Material ──────────────────────────────────────────────────────

const HIGHLIGHT_MAT = new THREE.MeshStandardMaterial({
  color: 0x4FC3F7,
  emissive: 0x2288BB,
  emissiveIntensity: 0.4,
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function BIMViewer({ glbUrl, metadataUrl, ifcUrl, height = 500 }: BIMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const animFrameRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const metadataRef = useRef<BIMMetadata | null>(null);
  const originalMatsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selectedElement, setSelectedElement] = useState<BIMElementMeta | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("default");
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionY, setSectionY] = useState(0.5);

  const selectedMeshRef = useRef<THREE.Mesh | null>(null);

  // ─── Load Metadata ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!metadataUrl) return;
    fetch(metadataUrl)
      .then((r) => r.json())
      .then((data: BIMMetadata) => {
        metadataRef.current = data;
      })
      .catch((err) => console.warn("[BIMViewer] Metadata load failed:", err));
  }, [metadataUrl]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    composerRef.current = null;
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    controlsRef.current?.dispose();
    controlsRef.current = null;
    sceneRef.current = null;
    cameraRef.current = null;
    modelRef.current = null;
    originalMatsRef.current.clear();
  }, []);

  // ─── Deselect ──────────────────────────────────────────────────────────────

  const deselectElement = useCallback(() => {
    if (selectedMeshRef.current) {
      const orig = originalMatsRef.current.get(selectedMeshRef.current.name);
      if (orig) selectedMeshRef.current.material = orig;
      selectedMeshRef.current = null;
    }
    setSelectedElement(null);
  }, []);

  // ─── Color Mode Application ────────────────────────────────────────────────

  const applyColorMode = useCallback((mode: ColorMode) => {
    const model = modelRef.current;
    if (!model) return;

    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || obj.name === "ground-plane") return;

      if (mode === "default") {
        // Restore original materials
        const orig = originalMatsRef.current.get(obj.name);
        if (orig) obj.material = orig;
      } else if (mode === "discipline") {
        const disc = obj.userData.discipline as string;
        const color = getDisciplineColor(disc);
        obj.material = new THREE.MeshStandardMaterial({
          color, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide,
        });
      } else if (mode === "storey") {
        const storeyIdx = obj.userData.storeyIndex as number;
        const color = getStoreyColor(storeyIdx ?? 0);
        obj.material = new THREE.MeshStandardMaterial({
          color, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide,
        });
      }
    });
  }, []);

  // ─── Build Scene ───────────────────────────────────────────────────────────

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    if (!container || !glbUrl) return;

    cleanup();
    container.innerHTML = "";
    setLoading(true);
    setError(null);
    setProgress(0);

    const w = container.clientWidth || 800;
    const h = expanded ? Math.min(window.innerHeight * 0.85, 800) : height;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE8EDF2);
    scene.fog = new THREE.Fog(0xE8EDF2, 80, 250);
    sceneRef.current = scene;

    // ── Procedural environment for reflections ──
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    // Sky gradient
    const skyGeo = new THREE.SphereGeometry(50, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x88AACC,
      side: THREE.BackSide,
    });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));
    // Ground color for reflection bounce
    const groundReflGeo = new THREE.PlaneGeometry(100, 100);
    const groundReflMat = new THREE.MeshBasicMaterial({ color: 0x556644 });
    const groundRefl = new THREE.Mesh(groundReflGeo, groundReflMat);
    groundRefl.rotation.x = -Math.PI / 2;
    groundRefl.position.y = -5;
    envScene.add(groundRefl);
    const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    camera.position.set(30, 20, 30);
    cameraRef.current = camera;

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.minDistance = 3;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2.05;
    controlsRef.current = controls;

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xCCCCDD, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.7);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xFFEECC, 2.0);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xBBCCEE, 0.6);
    fillLight.position.set(-25, 30, -15);
    scene.add(fillLight);

    // Section plane (Y-axis cut)
    const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);

    // ── Post-processing ──
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Bloom (subtle glow on glass/emissives)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h), 0.08, 0.4, 0.9
    );
    composer.addPass(bloomPass);

    // FXAA anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms["resolution"].value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio()));
    composer.addPass(fxaaPass);

    composer.addPass(new OutputPass());
    composerRef.current = composer;

    // ── Load GLB ──
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Compute bounding box for camera fitting
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Enable shadows and store original materials
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.name === "ground-plane") {
              child.castShadow = false;
            }
            // Store original material for color mode reset
            originalMatsRef.current.set(child.name, child.material);
          }
        });

        scene.add(model);

        // Fit camera to model
        const dist = Math.max(maxDim * 1.8, 20);
        camera.position.set(
          center.x + dist * 0.7,
          center.y + dist * 0.5,
          center.z + dist * 0.7
        );
        controls.target.copy(center);
        controls.update();

        // Update shadow camera to fit building
        const shadowExtent = maxDim * 1.2;
        sunLight.shadow.camera.left = -shadowExtent;
        sunLight.shadow.camera.right = shadowExtent;
        sunLight.shadow.camera.top = shadowExtent;
        sunLight.shadow.camera.bottom = -shadowExtent;
        sunLight.shadow.camera.updateProjectionMatrix();
        sunLight.position.set(
          center.x + shadowExtent,
          center.y + shadowExtent * 1.5,
          center.z + shadowExtent * 0.7
        );
        sunLight.target.position.copy(center);
        scene.add(sunLight.target);

        // Set section plane default to mid-height
        setSectionY(center.y + size.y * 0.5);

        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) setProgress(Math.round((xhr.loaded / xhr.total) * 100));
      },
      (err) => {
        console.error("[BIMViewer]", err);
        cleanup();
        setError("Failed to load 3D model");
        setLoading(false);
      }
    );

    // ── Click handler (element selection) ──
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const model = modelRef.current;
      if (!model) return;

      const meshes: THREE.Mesh[] = [];
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name && obj.name !== "ground-plane") {
          meshes.push(obj);
        }
      });

      const intersects = raycasterRef.current.intersectObjects(meshes, false);

      // Deselect previous
      deselectElement();

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const elementId = hit.name;

        // Highlight
        originalMatsRef.current.set(hit.name, hit.material);
        hit.material = HIGHLIGHT_MAT;
        selectedMeshRef.current = hit;

        // Look up metadata
        const meta = metadataRef.current?.elements[elementId];
        if (meta) {
          setSelectedElement(meta);
        } else {
          // Basic info from userData
          setSelectedElement({
            id: elementId,
            ifcType: hit.userData.ifcType ?? "Unknown",
            type: hit.userData.elementType ?? "unknown",
            storeyIndex: hit.userData.storeyIndex ?? 0,
            storeyName: `Storey ${hit.userData.storeyIndex ?? 0}`,
            properties: { name: elementId, storeyIndex: hit.userData.storeyIndex ?? 0 },
          });
        }

        // Stop auto-rotate on selection
        controls.autoRotate = false;
      }
    };

    renderer.domElement.addEventListener("click", onClick);

    // ── Animate ──
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Apply section plane
      if (sectionPlane) {
        renderer.clippingPlanes = sectionEnabled
          ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionY)]
          : [];
      }

      composer.render();
    }
    animate();

    // ── Resize ──
    const onResize = () => {
      const newW = container.clientWidth;
      const newH = expanded ? Math.min(window.innerHeight * 0.85, 800) : height;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      composer.setSize(newW, newH);
      fxaaPass.uniforms["resolution"].value.set(
        1 / (newW * renderer.getPixelRatio()),
        1 / (newH * renderer.getPixelRatio())
      );
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glbUrl, height, expanded, cleanup, deselectElement]);

  useEffect(() => {
    const removeListeners = buildScene();
    return () => {
      removeListeners?.();
      cleanup();
    };
  }, [buildScene, cleanup]);

  // Apply color mode changes
  useEffect(() => {
    applyColorMode(colorMode);
  }, [colorMode, applyColorMode]);

  // Update section plane
  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.clippingPlanes = sectionEnabled
        ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionY)]
        : [];
    }
  }, [sectionEnabled, sectionY]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full" style={{ minHeight: expanded ? 800 : height }}>
      {/* ── Toolbar ── */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        {/* Color mode buttons */}
        <button
          onClick={() => setColorMode(colorMode === "discipline" ? "default" : "discipline")}
          className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{
            background: colorMode === "discipline" ? "rgba(79, 195, 247, 0.3)" : "rgba(13, 13, 26, 0.7)",
            color: colorMode === "discipline" ? "#4FC3F7" : "#888",
            border: `1px solid ${colorMode === "discipline" ? "rgba(79, 195, 247, 0.5)" : "transparent"}`,
          }}
          title="Color by discipline (Arch/Struct/MEP)"
        >
          <Layers size={12} className="inline mr-1" />
          Discipline
        </button>
        <button
          onClick={() => setColorMode(colorMode === "storey" ? "default" : "storey")}
          className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{
            background: colorMode === "storey" ? "rgba(79, 195, 247, 0.3)" : "rgba(13, 13, 26, 0.7)",
            color: colorMode === "storey" ? "#4FC3F7" : "#888",
            border: `1px solid ${colorMode === "storey" ? "rgba(79, 195, 247, 0.5)" : "transparent"}`,
          }}
          title="Color by storey"
        >
          <Layers size={12} className="inline mr-1" />
          Storey
        </button>
        <button
          onClick={() => setSectionEnabled(!sectionEnabled)}
          className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{
            background: sectionEnabled ? "rgba(79, 195, 247, 0.3)" : "rgba(13, 13, 26, 0.7)",
            color: sectionEnabled ? "#4FC3F7" : "#888",
            border: `1px solid ${sectionEnabled ? "rgba(79, 195, 247, 0.5)" : "transparent"}`,
          }}
          title="Section cut"
        >
          <Scissors size={12} className="inline mr-1" />
          Section
        </button>
      </div>

      {/* Section height slider */}
      {sectionEnabled && (
        <div className="absolute top-10 left-2 z-10 flex items-center gap-2 rounded px-2 py-1"
          style={{ background: "rgba(13, 13, 26, 0.8)" }}>
          <span style={{ color: "#888", fontSize: 10 }}>Cut Height</span>
          <input
            type="range"
            min={0}
            max={Math.max(sectionY * 2, 30)}
            step={0.5}
            value={sectionY}
            onChange={(e) => setSectionY(parseFloat(e.target.value))}
            style={{ width: 100, accentColor: "#4FC3F7" }}
          />
          <span style={{ color: "#4FC3F7", fontSize: 10 }}>{sectionY.toFixed(1)}m</span>
        </div>
      )}

      {/* Right toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {ifcUrl && (
          <a
            href={ifcUrl}
            download="model.ifc"
            className="rounded p-1.5 transition-colors"
            style={{ background: "rgba(13, 13, 26, 0.7)", color: "#4FC3F7" }}
            title="Download IFC file"
          >
            <Download size={14} />
          </a>
        )}
        <button
          onClick={() => controlsRef.current?.reset()}
          className="rounded p-1.5 transition-colors"
          style={{ background: "rgba(13, 13, 26, 0.7)", color: "#4FC3F7" }}
          title="Reset camera"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1.5 transition-colors"
          style={{ background: "rgba(13, 13, 26, 0.7)", color: "#4FC3F7" }}
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ── Properties Panel ── */}
      {selectedElement && (
        <div
          className="absolute top-2 right-14 z-20 overflow-auto rounded-lg"
          style={{
            background: "rgba(13, 13, 26, 0.92)",
            border: "1px solid rgba(79, 195, 247, 0.3)",
            width: 260,
            maxHeight: expanded ? 700 : height - 20,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#4FC3F7", fontSize: 11, fontWeight: 600 }}>
              <MousePointerClick size={12} className="inline mr-1" />
              BIM PROPERTIES
            </span>
            <button onClick={deselectElement} style={{ color: "#666" }}>
              <X size={14} />
            </button>
          </div>
          <div className="px-3 py-2 space-y-1" style={{ fontSize: 11 }}>
            <PropRow label="Element" value={selectedElement.properties.name} accent />
            <PropRow label="IFC Type" value={selectedElement.ifcType} />
            <PropRow label="Category" value={selectedElement.type} />
            <PropRow label="Storey" value={selectedElement.storeyName} />
            {selectedElement.properties.height != null && (
              <PropRow label="Height" value={`${selectedElement.properties.height.toFixed(2)} m`} />
            )}
            {selectedElement.properties.width != null && (
              <PropRow label="Width" value={`${selectedElement.properties.width.toFixed(2)} m`} />
            )}
            {selectedElement.properties.length != null && (
              <PropRow label="Length" value={`${selectedElement.properties.length?.toFixed(2)} m`} />
            )}
            {selectedElement.properties.thickness != null && (
              <PropRow label="Thickness" value={`${(selectedElement.properties.thickness * 1000).toFixed(0)} mm`} />
            )}
            {selectedElement.properties.area != null && (
              <PropRow label="Area" value={`${selectedElement.properties.area.toFixed(1)} m²`} />
            )}
            {selectedElement.properties.volume != null && (
              <PropRow label="Volume" value={`${selectedElement.properties.volume.toFixed(2)} m³`} />
            )}
            {selectedElement.properties.radius != null && (
              <PropRow label="Radius" value={`${(selectedElement.properties.radius * 1000).toFixed(0)} mm`} />
            )}
            {selectedElement.properties.material && (
              <PropRow label="Material" value={selectedElement.properties.material} />
            )}
            {selectedElement.properties.discipline && (
              <PropRow label="Discipline" value={selectedElement.properties.discipline} />
            )}
            {selectedElement.properties.isExterior != null && (
              <PropRow label="Exterior" value={selectedElement.properties.isExterior ? "Yes" : "No"} />
            )}
            {selectedElement.properties.isPartition != null && (
              <PropRow label="Partition" value={selectedElement.properties.isPartition ? "Yes" : "No"} />
            )}
            {selectedElement.properties.spaceName && (
              <PropRow label="Space" value={selectedElement.properties.spaceName} />
            )}
            {selectedElement.properties.spaceUsage && (
              <PropRow label="Usage" value={selectedElement.properties.spaceUsage} />
            )}
            {selectedElement.properties.sillHeight != null && (
              <PropRow label="Sill Height" value={`${selectedElement.properties.sillHeight.toFixed(2)} m`} />
            )}
            {selectedElement.properties.riserCount != null && (
              <PropRow label="Risers" value={String(selectedElement.properties.riserCount)} />
            )}
            {selectedElement.properties.diameter != null && (
              <PropRow label="Diameter" value={`${(selectedElement.properties.diameter * 1000).toFixed(0)} mm`} />
            )}
          </div>
        </div>
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2"
          style={{ background: "#E8EDF2", borderRadius: 8 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: "#4FC3F7" }} />
          <span style={{ fontSize: 11, color: "#666" }}>
            Loading BIM Model{progress > 0 ? ` (${progress}%)` : "..."}
          </span>
        </div>
      )}

      {/* ── Error overlay ── */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
          style={{ background: "#E8EDF2", borderRadius: 8 }}>
          <AlertCircle size={24} style={{ color: "#ef4444" }} />
          <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>
          <button onClick={buildScene} className="rounded px-3 py-1 text-xs"
            style={{ background: "rgba(79, 195, 247, 0.15)", color: "#4FC3F7", border: "1px solid rgba(79, 195, 247, 0.3)" }}>
            Retry
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full"
        style={{
          height: expanded ? Math.min(typeof window !== "undefined" ? window.innerHeight * 0.85 : 800, 800) : height,
          borderRadius: 8,
          overflow: "hidden",
        }}
      />

      {/* ── Attribution + info ── */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
        <span style={{ fontSize: 9, color: "#999" }}>
          <Eye size={9} className="inline mr-0.5" />
          BIM Viewer • Click elements to inspect
        </span>
        {metadataRef.current && (
          <span style={{ fontSize: 9, color: "#666" }}>
            • {metadataRef.current.summary.totalElements} elements
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Property Row ────────────────────────────────────────────────────────────

function PropRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 3 }}>
      <span style={{ color: "#666", flexShrink: 0 }}>{label}</span>
      <span style={{ color: accent ? "#4FC3F7" : "#CCC", textAlign: "right", wordBreak: "break-word", fontWeight: accent ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

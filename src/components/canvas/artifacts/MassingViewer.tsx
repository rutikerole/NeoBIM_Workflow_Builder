"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface MassingViewerProps {
  floors: number;
  height: number;
  footprint: number;
  gfa: number;
  buildingType?: string;
}

export default function MassingViewer({ floors, height, footprint, buildingType }: MassingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cleanup previous
    if (rendererRef.current) {
      rendererRef.current.dispose();
      cancelAnimationFrame(animFrameRef.current);
      container.innerHTML = "";
    }

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ─── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── Scene ─────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0D0D1A");
    scene.fog = new THREE.FogExp2("#0D0D1A", 0.008);

    // ─── Camera ────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    const maxDim = Math.max(height, Math.sqrt(footprint));
    const dist = maxDim * 2.2;
    camera.position.set(dist * 0.8, dist * 0.6, dist * 0.8);
    camera.lookAt(0, height / 3, 0);

    // ─── Controls ──────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, height / 3, 0);
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = maxDim * 0.8;
    controls.maxDistance = maxDim * 5;

    // ─── Lighting ──────────────────────────────────────────────
    const ambient = new THREE.AmbientLight("#4466aa", 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight("#ffffff", 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.setScalar(1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    const shadowSize = maxDim * 2;
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight("#6688cc", 0.4);
    fillLight.position.set(-20, 30, -10);
    scene.add(fillLight);

    // ─── Ground plane ──────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#1A1A2E",
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(200, 40, "#2A2A44", "#1E1E34");
    grid.position.y = 0.01;
    scene.add(grid);

    // ─── Building geometry ─────────────────────────────────────
    const aspect = 1.5; // width:depth ratio
    const bWidth = Math.sqrt(footprint * aspect);
    const bDepth = footprint / bWidth;
    const floorHeight = height / floors;

    const isMixedUse = buildingType?.toLowerCase().includes("mixed") ||
      buildingType?.toLowerCase().includes("tower");

    // Podium (if mixed-use, wider base for first 2 floors)
    if (isMixedUse && floors > 3) {
      const podiumFloors = Math.min(2, Math.floor(floors * 0.3));
      const podiumH = podiumFloors * floorHeight;
      const podiumW = bWidth * 1.3;
      const podiumD = bDepth * 1.2;

      const podiumGeo = new THREE.BoxGeometry(podiumW, podiumH, podiumD);
      const podiumMat = new THREE.MeshStandardMaterial({
        color: "#2A3A5C",
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      });
      const podium = new THREE.Mesh(podiumGeo, podiumMat);
      podium.position.y = podiumH / 2;
      podium.castShadow = true;
      podium.receiveShadow = true;
      scene.add(podium);

      // Podium floor lines
      for (let i = 1; i <= podiumFloors; i++) {
        const lineY = i * floorHeight;
        const lineGeo = new THREE.BoxGeometry(podiumW + 0.1, 0.08, podiumD + 0.1);
        const lineMat = new THREE.MeshBasicMaterial({ color: "#1A2A44" });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.y = lineY;
        scene.add(line);
      }
    }

    // Tower body
    const towerStartY = isMixedUse && floors > 3
      ? Math.min(2, Math.floor(floors * 0.3)) * floorHeight
      : 0;
    const towerFloors = isMixedUse && floors > 3
      ? floors - Math.min(2, Math.floor(floors * 0.3))
      : floors;
    const towerH = towerFloors * floorHeight;

    const towerGeo = new THREE.BoxGeometry(bWidth, towerH, bDepth);
    const towerMat = new THREE.MeshPhysicalMaterial({
      color: "#4477AA",
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
      transmission: 0.2,
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = towerStartY + towerH / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    scene.add(tower);

    // Floor lines on tower
    for (let i = 1; i <= towerFloors; i++) {
      const lineY = towerStartY + i * floorHeight;
      const lineGeo = new THREE.BoxGeometry(bWidth + 0.05, 0.06, bDepth + 0.05);
      const lineMat = new THREE.MeshBasicMaterial({ color: "#223355" });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.y = lineY;
      scene.add(line);
    }

    // Glass edge highlight
    const edgeGeo = new THREE.EdgesGeometry(towerGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: "#6699CC", linewidth: 1 });
    const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
    wireframe.position.copy(tower.position);
    scene.add(wireframe);

    // ─── Animate ───────────────────────────────────────────────
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ─── Resize ────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [floors, height, footprint, buildingType]);

  useEffect(() => {
    const cleanup = buildScene();
    return () => { cleanup?.(); };
  }, [buildScene]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 220,
          borderRadius: 8,
          overflow: "hidden",
          cursor: "grab",
        }}
      />
      <div style={{
        position: "absolute", bottom: 6, left: 8,
        fontSize: 9, color: "rgba(255,255,255,0.3)",
        pointerEvents: "none",
      }}>
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}

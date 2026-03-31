/**
 * Server-side GLB Generator
 * Converts MassingGeometry into a binary GLB file using Three.js.
 * Each mesh is named by its element ID for client-side raycasting/metadata lookup.
 *
 * ALL Three.js usage is inside generateGLB() via dynamic import to avoid
 * polluting Next.js server globals with DOM polyfills at module load time.
 */

import type { MassingGeometry, GeometryElement } from "@/types/geometry";
import type * as THREEns from "three";
import { getMaterialForElement } from "@/services/material-mapping";
import type { PBRMaterialDef } from "@/services/material-mapping";

/**
 * Apply minimal DOM/window polyfill for Three.js server-side usage.
 * Must be called BEFORE importing Three.js.
 */
function ensureServerPolyfill() {
  if (typeof globalThis.window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      location: { protocol: "https:", host: "localhost", hostname: "localhost" },
      addEventListener: () => {},
      removeEventListener: () => {},
      devicePixelRatio: 1,
      innerWidth: 800,
      innerHeight: 600,
    };
  } else if (!globalThis.window.location) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.window as any).location = { protocol: "https:", host: "localhost", hostname: "localhost" };
  }
  if (typeof globalThis.document === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: () => ({ getContext: () => null, width: 0, height: 0, style: {} }),
      createElementNS: () => ({ getContext: () => null, width: 0, height: 0, style: {} }),
    };
  }
}

/**
 * Generate a binary GLB buffer from MassingGeometry.
 * Each mesh is named by its element ID for click-to-inspect in the viewer.
 */
export async function generateGLB(geometry: MassingGeometry): Promise<Buffer> {
  // Polyfill BEFORE importing Three.js
  ensureServerPolyfill();

  // Dynamic import to avoid side effects at module load time
  const THREE = await import("three");
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  // ─── Material factory ──────────────────────────────────────────────────────

  function createMaterial(def: PBRMaterialDef): THREEns.Material {
    if (def.transmission && def.transmission > 0) {
      return new THREE.MeshPhysicalMaterial({
        color: def.color,
        roughness: def.roughness,
        metalness: def.metalness,
        transparent: true,
        opacity: def.opacity ?? 0.3,
        transmission: def.transmission,
        ior: def.ior ?? 1.5,
        reflectivity: def.reflectivity ?? 0.5,
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      transparent: def.transparent ?? false,
      opacity: def.opacity ?? 1.0,
      emissive: def.emissive ?? 0x000000,
      emissiveIntensity: def.emissiveIntensity ?? 0,
      side: THREE.DoubleSide,
    });
  }

  // ─── Material cache ────────────────────────────────────────────────────────

  const materialCache = new Map<string, THREEns.Material>();

  function getCachedMaterial(elementType: string): THREEns.Material {
    let mat = materialCache.get(elementType);
    if (!mat) {
      mat = createMaterial(getMaterialForElement(elementType));
      materialCache.set(elementType, mat);
    }
    return mat;
  }

  // ─── Geometry builders ─────────────────────────────────────────────────────

  function buildGeometryFromElement(element: GeometryElement): THREEns.BufferGeometry | null {
    const { vertices, faces } = element;
    if (!vertices.length || !faces.length) return buildParametricGeometry(element);

    const positions: number[] = [];
    const indices: number[] = [];

    for (const v of vertices) {
      // MassingGeometry: x,y = plan, z = vertical → Three.js: x,z = plan, y = vertical
      positions.push(v.x, v.z, v.y);
    }

    for (const face of faces) {
      const vi = face.vertices;
      if (vi.length === 3) {
        indices.push(vi[0], vi[1], vi[2]);
      } else if (vi.length === 4) {
        indices.push(vi[0], vi[1], vi[2]);
        indices.push(vi[0], vi[2], vi[3]);
      } else if (vi.length > 4) {
        for (let i = 1; i < vi.length - 1; i++) {
          indices.push(vi[0], vi[i], vi[i + 1]);
        }
      }
    }

    if (indices.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function buildParametricGeometry(element: GeometryElement): THREEns.BufferGeometry | null {
    const { type, vertices, properties } = element;
    const w = properties.width ?? 0.5;
    const h = properties.height ?? 0.5;
    const l = properties.length ?? 0.5;

    if (type === "pipe") {
      const d = properties.diameter ?? 0.05;
      return new THREE.CylinderGeometry(d / 2, d / 2, properties.height ?? 3.0, 8);
    }
    if (type === "column" && properties.radius) {
      return new THREE.CylinderGeometry(properties.radius, properties.radius, h, 12);
    }
    if (type === "duct" || type === "cable-tray" || type === "equipment") {
      return new THREE.BoxGeometry(w, h, l);
    }
    if (vertices.length === 1) {
      return new THREE.BoxGeometry(w || 0.5, h || 0.5, l || 0.5);
    }
    if (vertices.length === 2) {
      const v0 = vertices[0], v1 = vertices[1];
      const dx = v1.x - v0.x, dy = v1.y - v0.y, dz = v1.z - v0.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 0.01) return null;
      return new THREE.BoxGeometry(w || 0.3, h || 0.3, len);
    }
    return null;
  }

  function getElementPosition(element: GeometryElement): THREEns.Vector3 {
    const { vertices, properties } = element;
    if (vertices.length === 0) return new THREE.Vector3(0, 0, 0);
    if (vertices.length === 1) {
      const v = vertices[0];
      return new THREE.Vector3(v.x, v.z + (properties.height ?? 0.5) / 2, v.y);
    }
    if (vertices.length === 2) {
      const v0 = vertices[0], v1 = vertices[1];
      return new THREE.Vector3((v0.x + v1.x) / 2, (v0.z + v1.z) / 2, (v0.y + v1.y) / 2);
    }
    let cx = 0, cy = 0, cz = 0;
    for (const v of vertices) { cx += v.x; cy += v.z; cz += v.y; }
    const n = vertices.length;
    return new THREE.Vector3(cx / n, cy / n, cz / n);
  }

  // ─── Build scene ───────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.name = geometry.buildingType;

  const bb = geometry.boundingBox;
  const centerX = (bb.min.x + bb.max.x) / 2;
  const centerY = (bb.min.y + bb.max.y) / 2;

  for (const storey of geometry.storeys) {
    const storeyGroup = new THREE.Group();
    storeyGroup.name = `storey-${storey.index}-${storey.name.replace(/\s+/g, "_")}`;

    for (const element of storey.elements) {
      const material = getCachedMaterial(element.type);
      let mesh: THREEns.Mesh | null = null;
      const hasReal = element.vertices.length >= 3 && element.faces.length >= 1;

      if (hasReal) {
        const geo = buildGeometryFromElement(element);
        if (geo) {
          mesh = new THREE.Mesh(geo, material);
          mesh.position.x -= centerX;
          mesh.position.z -= centerY;
        }
      } else {
        const geo = buildParametricGeometry(element);
        if (geo) {
          const pos = getElementPosition(element);
          mesh = new THREE.Mesh(geo, material);
          mesh.position.set(pos.x - centerX, pos.y, pos.z - centerY);
        }
      }

      if (mesh) {
        mesh.name = element.id;
        mesh.userData = {
          ifcType: element.ifcType,
          elementType: element.type,
          storeyIndex: storey.index,
          discipline: element.properties.discipline ?? "unclassified",
        };
        storeyGroup.add(mesh);
      }
    }

    scene.add(storeyGroup);
  }

  // Ground plane
  const groundSize = Math.max((bb.max.x - bb.min.x) * 3, (bb.max.y - bb.min.y) * 3, 50);
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x4A6B3A, roughness: 0.95, metalness: 0.0 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  groundMesh.name = "ground-plane";
  scene.add(groundMesh);

  // ─── Export to GLB ─────────────────────────────────────────────────────────

  const exporter = new GLTFExporter();
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result as ArrayBuffer),
      (error) => reject(error),
      { binary: true }
    );
  });

  // Cleanup
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.geometry?.dispose();
  });
  materialCache.clear();

  return Buffer.from(glb);
}

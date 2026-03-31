/**
 * Server-side GLB Generator
 * Converts MassingGeometry into a binary GLB file using Three.js.
 * Each mesh is named by its element ID for client-side raycasting/metadata lookup.
 *
 * Runs in Node.js (API routes) — no DOM/canvas required for geometry-only export.
 */

// Minimal DOM polyfill for Three.js GLTFExporter (only needed for texture paths we don't hit)
if (typeof globalThis.document === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = {
    createElement: () => ({ getContext: () => null, width: 0, height: 0 }),
  };
}
if (typeof globalThis.window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = globalThis;
}

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { MassingGeometry, GeometryElement, Vertex, Face } from "@/types/geometry";
import { getMaterialForElement } from "@/services/material-mapping";
import type { PBRMaterialDef } from "@/services/material-mapping";

// ─── Material Factory ────────────────────────────────────────────────────────

function createThreeMaterial(def: PBRMaterialDef): THREE.Material {
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

// ─── Geometry Builders ───────────────────────────────────────────────────────

/**
 * Build BufferGeometry from MassingGeometry element vertices and faces.
 */
function buildGeometryFromElement(element: GeometryElement): THREE.BufferGeometry | null {
  const { vertices, faces } = element;

  // Elements with only bounding-box or single-point vertices → parametric geometry
  if (!vertices.length || !faces.length) {
    return buildParametricGeometry(element);
  }

  // Triangulate quad faces into triangles
  const positions: number[] = [];
  const indices: number[] = [];

  for (const v of vertices) {
    // MassingGeometry uses x,y for plan coords and z for vertical
    // Three.js uses x,z for plan and y for vertical — swap y↔z
    positions.push(v.x, v.z, v.y);
  }

  for (const face of faces) {
    const vi = face.vertices;
    if (vi.length === 3) {
      indices.push(vi[0], vi[1], vi[2]);
    } else if (vi.length === 4) {
      // Triangulate quad: 0-1-2, 0-2-3
      indices.push(vi[0], vi[1], vi[2]);
      indices.push(vi[0], vi[2], vi[3]);
    } else if (vi.length > 4) {
      // Fan triangulation for polygons
      for (let i = 1; i < vi.length - 1; i++) {
        indices.push(vi[0], vi[i], vi[i + 1]);
      }
    }
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Build parametric geometry for elements without full vertex/face data.
 * Used for MEP elements (ducts, pipes, equipment) that store bounding-box or point data.
 */
function buildParametricGeometry(element: GeometryElement): THREE.BufferGeometry | null {
  const { type, vertices, properties } = element;
  const w = properties.width ?? 0.5;
  const h = properties.height ?? 0.5;
  const l = properties.length ?? 0.5;

  if (type === "pipe") {
    const diameter = properties.diameter ?? 0.05;
    const pipeH = properties.height ?? 3.0;
    return new THREE.CylinderGeometry(diameter / 2, diameter / 2, pipeH, 8);
  }

  if (type === "column" && properties.radius) {
    return new THREE.CylinderGeometry(properties.radius, properties.radius, h, 12);
  }

  if (type === "duct" || type === "cable-tray" || type === "equipment") {
    return new THREE.BoxGeometry(w, h, l);
  }

  // Fallback: small box at element position
  if (vertices.length === 1) {
    return new THREE.BoxGeometry(w || 0.5, h || 0.5, l || 0.5);
  }

  // Two vertices = line segment → box between them
  if (vertices.length === 2) {
    const v0 = vertices[0], v1 = vertices[1];
    const dx = v1.x - v0.x, dy = v1.y - v0.y, dz = v1.z - v0.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 0.01) return null;
    return new THREE.BoxGeometry(w || 0.3, h || 0.3, length);
  }

  return null;
}

/**
 * Compute world position for a parametric element.
 */
function getElementPosition(element: GeometryElement): THREE.Vector3 {
  const { vertices, properties } = element;

  if (vertices.length === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  if (vertices.length === 1) {
    const v = vertices[0];
    const h = properties.height ?? 0.5;
    // Swap y↔z for Three.js coordinate system
    return new THREE.Vector3(v.x, v.z + h / 2, v.y);
  }

  if (vertices.length === 2) {
    const v0 = vertices[0], v1 = vertices[1];
    return new THREE.Vector3(
      (v0.x + v1.x) / 2,
      (v0.z + v1.z) / 2,
      (v0.y + v1.y) / 2
    );
  }

  // Centroid of all vertices
  let cx = 0, cy = 0, cz = 0;
  for (const v of vertices) {
    cx += v.x; cy += v.z; cz += v.y; // swap y↔z
  }
  const n = vertices.length;
  return new THREE.Vector3(cx / n, cy / n, cz / n);
}

/**
 * Check if an element has real geometry (vertices + faces) vs parametric.
 */
function hasRealGeometry(element: GeometryElement): boolean {
  return element.vertices.length >= 3 && element.faces.length >= 1;
}

// ─── Material Cache ──────────────────────────────────────────────────────────

const materialCache = new Map<string, THREE.Material>();

function getCachedMaterial(elementType: string): THREE.Material {
  let mat = materialCache.get(elementType);
  if (!mat) {
    const def = getMaterialForElement(elementType);
    mat = createThreeMaterial(def);
    materialCache.set(elementType, mat);
  }
  return mat;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

/**
 * Generate a binary GLB buffer from MassingGeometry.
 * Each mesh is named by its element ID for click-to-inspect in the viewer.
 */
export async function generateGLB(geometry: MassingGeometry): Promise<Buffer> {
  materialCache.clear();

  const scene = new THREE.Scene();
  scene.name = geometry.buildingType;

  // Center the building around origin
  const bb = geometry.boundingBox;
  const centerX = (bb.min.x + bb.max.x) / 2;
  const centerY = (bb.min.y + bb.max.y) / 2;

  for (const storey of geometry.storeys) {
    const storeyGroup = new THREE.Group();
    storeyGroup.name = `storey-${storey.index}-${storey.name.replace(/\s+/g, "_")}`;

    for (const element of storey.elements) {
      const material = getCachedMaterial(element.type);
      let mesh: THREE.Mesh | null = null;

      if (hasRealGeometry(element)) {
        // Build from actual vertices/faces
        const geo = buildGeometryFromElement(element);
        if (geo) {
          mesh = new THREE.Mesh(geo, material);
          // Center the building
          mesh.position.x -= centerX;
          mesh.position.z -= centerY;
        }
      } else {
        // Parametric geometry for MEP/simplified elements
        const geo = buildParametricGeometry(element);
        if (geo) {
          const pos = getElementPosition(element);
          mesh = new THREE.Mesh(geo, material);
          mesh.position.set(pos.x - centerX, pos.y, pos.z - centerY);
        }
      }

      if (mesh) {
        // Critical: mesh.name = element ID for raycasting → metadata lookup
        mesh.name = element.id;
        // Store BIM type in userData (preserved as glTF extras)
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

  // Add a ground plane
  const groundSize = Math.max(
    (bb.max.x - bb.min.x) * 3,
    (bb.max.y - bb.min.y) * 3,
    50
  );
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4A6B3A,
    roughness: 0.95,
    metalness: 0.0,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  groundMesh.name = "ground-plane";
  scene.add(groundMesh);

  // Export to GLB
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
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
    }
  });
  materialCache.clear();

  return Buffer.from(glb);
}

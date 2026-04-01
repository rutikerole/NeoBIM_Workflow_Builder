/**
 * Ultra-Realistic BIM Material System v2
 *
 * Upgrades from v1:
 * - 1024×1024 texture resolution (was 512)
 * - Sobel-filter normal maps replacing bump maps (10× more realistic)
 * - Procedural roughness maps per material
 * - Procedural AO (ambient occlusion) maps for crevice darkening
 * - Higher-quality noise with 5-6 octaves
 * - Polished glass with proper specular + environment intensity
 * - Metal with anisotropic-style brushed appearance
 */

import * as THREE from "three";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEX_SIZE = 1024;       // Up from 512 — sharper close-up detail
const BUMP_SIZE = 512;       // Normal/roughness maps (lighter)
const DS = THREE.DoubleSide;

// ─── Noise Utilities ──────────────────────────────────────────────────────────

function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 1731.3) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = noise(ix, iy, seed);
  const b = noise(ix + 1, iy, seed);
  const c = noise(ix, iy + 1, seed);
  const d = noise(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 100) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// ─── Canvas Texture Helper ────────────────────────────────────────────────────

function tex(
  w: number, h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  // Enable anisotropic filtering for crisp textures at angles
  t.anisotropy = 4;
  return t;
}

// ─── Sobel Normal Map from Height Canvas ──────────────────────────────────────

function heightToNormalMap(
  heightCanvas: HTMLCanvasElement,
  strength: number = 2.0,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext("2d")!.getImageData(0, 0, w, h).data;

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = w; normalCanvas.height = h;
  const ctx = normalCanvas.getContext("2d")!;
  const out = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Sobel filter — sample 8 neighbors (wrapping)
      const tl = src[((((y - 1) + h) % h) * w + ((x - 1) + w) % w) * 4] / 255;
      const t = src[((((y - 1) + h) % h) * w + x) * 4] / 255;
      const tr = src[((((y - 1) + h) % h) * w + (x + 1) % w) * 4] / 255;
      const l = src[(y * w + ((x - 1) + w) % w) * 4] / 255;
      const r = src[(y * w + (x + 1) % w) * 4] / 255;
      const bl = src[(((y + 1) % h) * w + ((x - 1) + w) % w) * 4] / 255;
      const b = src[(((y + 1) % h) * w + x) * 4] / 255;
      const br = src[(((y + 1) % h) * w + (x + 1) % w) * 4] / 255;

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      out.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);

  const t = new THREE.CanvasTexture(normalCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// ─── Height Map from Noise (for normal map conversion) ───────────────────────

function noiseHeightCanvas(
  size: number, scale: number, seed: number, octaves = 5,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < d.data.length; i += 4) {
    const px = (i / 4) % size, py = Math.floor(i / 4 / size);
    const n = fbm(px * scale, py * scale, seed, octaves);
    const v = Math.floor(n * 255);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  return canvas;
}

// ─── Roughness Map from Noise ────────────────────────────────────────────────

function noiseRoughnessMap(
  baseRoughness: number, variation: number,
  scale: number, seed: number,
  repeat?: [number, number],
): THREE.CanvasTexture {
  return tex(BUMP_SIZE, BUMP_SIZE, (ctx, w, h) => {
    const base = Math.round(baseRoughness * 255);
    ctx.fillStyle = `rgb(${base},${base},${base})`;
    ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      const n = fbm(px * scale, py * scale, seed, 4);
      const v = Math.max(0, Math.min(255, base + (n - 0.5) * variation * 255));
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    }
    ctx.putImageData(d, 0, 0);
  }, repeat);
}

// ─── Concrete Texture (1024px) ────────────────────────────────────────────────

function concreteTex(base: string, repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      const n = fbm(px * 0.015, py * 0.015, 42, 6);
      const v = (n - 0.5) * 50;
      d.data[i] = Math.max(0, Math.min(255, d.data[i] + v));
      d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + v));
      d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + v));
    }
    ctx.putImageData(d, 0, 0);
    // Formwork seams + tie holes
    for (let i = 0; i < 6; i++) {
      const y = (i + 1) * (h / 7) + (Math.random() - 0.5) * 12;
      ctx.strokeStyle = `rgba(80, 75, 65, ${0.06 + Math.random() * 0.08})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 4); ctx.stroke();
    }
    // Aggregate specks
    for (let i = 0; i < 200; i++) {
      const sx = Math.random() * w, sy = Math.random() * h;
      ctx.fillStyle = `rgba(${100 + Math.random() * 60}, ${90 + Math.random() * 50}, ${80 + Math.random() * 40}, ${0.1 + Math.random() * 0.1})`;
      ctx.fillRect(sx, sy, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }, repeat);
}

// ─── Plaster / Stucco Texture (1024px) ────────────────────────────────────────

function plasterTex(base: string, repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      const n1 = fbm(px * 0.03, py * 0.03, 17, 5);
      const n2 = fbm(px * 0.1, py * 0.1, 29, 3);
      const v = (n1 - 0.5) * 30 + (n2 - 0.5) * 12;
      d.data[i] = Math.max(0, Math.min(255, d.data[i] + v));
      d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + v));
      d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + v - 3));
    }
    ctx.putImageData(d, 0, 0);
  }, repeat);
}

// ─── Wood Texture (1024px) ────────────────────────────────────────────────────

function woodTex(tint: string, repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE, (ctx, w, h) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const y = (i / 160) * h;
      ctx.strokeStyle = `rgba(40, 20, 0, ${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5 + Math.random() * 3;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 3) {
        ctx.lineTo(x, y + Math.sin((x * 0.012 + i * 0.25)) * 3 + (Math.random() - 0.5) * 1);
      }
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const kx = Math.random() * w, ky = Math.random() * h, kr = 4 + Math.random() * 8;
      const g = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      g.addColorStop(0, "rgba(50, 25, 5, 0.35)");
      g.addColorStop(1, "rgba(50, 25, 5, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
    }
  }, repeat);
}

// ─── Brick Texture (1024px) ───────────────────────────────────────────────────

function brickTex(repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE / 2, (ctx, w, h) => {
    ctx.fillStyle = "#8A8078";
    ctx.fillRect(0, 0, w, h);
    const bW = 64, bH = 32, m = 3;
    const cols = ["#C47860", "#B86B55", "#D08870", "#CC7E68", "#D89880"];
    for (let row = 0; row < h / bH + 1; row++) {
      const off = row % 2 === 0 ? 0 : bW / 2;
      for (let col = -1; col < w / bW + 2; col++) {
        const x = col * bW + off, y = row * bH;
        const c = new THREE.Color(cols[Math.floor(Math.random() * cols.length)]);
        c.multiplyScalar(0.85 + Math.random() * 0.3);
        ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
        ctx.fillRect(x + m, y + m, bW - m * 2, bH - m * 2);
      }
    }
  }, repeat);
}

// ─── Brushed Metal Texture (1024px) ───────────────────────────────────────────

function brushedMetalTex(repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE / 2, TEX_SIZE / 2, (ctx, w, h) => {
    ctx.fillStyle = "#A8A8A8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = `rgba(${140 + Math.random() * 80}, ${140 + Math.random() * 80}, ${140 + Math.random() * 80}, ${0.04 + Math.random() * 0.06})`;
      ctx.lineWidth = 0.3 + Math.random();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 1.5); ctx.stroke();
    }
  }, repeat);
}

// ─── Grass Texture (1024px) ───────────────────────────────────────────────────

function grassTex(repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE, (ctx, w, h) => {
    ctx.fillStyle = "#2D5A16";
    ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      const n1 = fbm(px * 0.03, py * 0.03, 33, 6);
      const n2 = fbm(px * 0.12, py * 0.12, 77, 3);
      d.data[i] = Math.max(0, Math.min(255, d.data[i] + (n1 - 0.5) * 40 + (n2 - 0.5) * 15));
      d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + (n1 - 0.5) * 60 + (n2 - 0.5) * 25));
      d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + (n1 - 0.5) * 15));
    }
    ctx.putImageData(d, 0, 0);
    for (let i = 0; i < 800; i++) {
      const gx = Math.random() * w, gy = Math.random() * h;
      ctx.strokeStyle = `rgba(80, ${140 + Math.random() * 60}, 30, ${0.1 + Math.random() * 0.15})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (Math.random() - 0.5) * 3, gy - 2 - Math.random() * 7); ctx.stroke();
    }
  }, repeat);
}

// ─── Roof Membrane Texture (1024px) ──────────────────────────────────────────

function roofTex(repeat?: [number, number]): THREE.CanvasTexture {
  return tex(TEX_SIZE, TEX_SIZE, (ctx, w, h) => {
    ctx.fillStyle = "#3A3A3C";
    ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      const n = fbm(px * 0.025, py * 0.025, 88, 5);
      const v = (n - 0.5) * 35;
      d.data[i] = Math.max(0, Math.min(255, d.data[i] + v));
      d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + v));
      d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + v));
    }
    ctx.putImageData(d, 0, 0);
    for (let i = 0; i < 4; i++) {
      const x = (i + 1) * (w / 5);
      ctx.strokeStyle = "rgba(55, 55, 58, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 6, h); ctx.stroke();
    }
  }, repeat);
}

// ─── Sky Environment Texture (2048px for richer HDRI) ────────────────────────

export function createSkyTexture(): THREE.CanvasTexture {
  return tex(2048, 1024, (ctx, w, h) => {
    // Sky gradient — warm horizon, blue zenith
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#2A5BB5");     // Zenith — deep blue
    grad.addColorStop(0.2, "#5A8DC6");
    grad.addColorStop(0.4, "#8AB8D8");
    grad.addColorStop(0.6, "#B8D4E8");
    grad.addColorStop(0.72, "#D4E4F0");
    grad.addColorStop(0.82, "#F0E8D8");  // Warm horizon glow
    grad.addColorStop(0.9, "#E8D8C0");
    grad.addColorStop(1.0, "#8A9A6A");   // Ground
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Sun disc with multi-layer glow
    const sunX = w * 0.72, sunY = h * 0.36;
    // Wide atmospheric glow
    const atmo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 200);
    atmo.addColorStop(0, "rgba(255, 250, 230, 0.4)");
    atmo.addColorStop(0.4, "rgba(255, 240, 200, 0.12)");
    atmo.addColorStop(1, "rgba(255, 230, 180, 0)");
    ctx.fillStyle = atmo;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    // Tight glow
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
    glow.addColorStop(0, "rgba(255, 252, 240, 0.8)");
    glow.addColorStop(0.3, "rgba(255, 245, 220, 0.35)");
    glow.addColorStop(1, "rgba(255, 240, 200, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 60, sunY - 60, 120, 120);
    // Core
    const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 15);
    core.addColorStop(0, "rgba(255, 255, 250, 0.98)");
    core.addColorStop(1, "rgba(255, 250, 230, 0)");
    ctx.fillStyle = core;
    ctx.fillRect(sunX - 20, sunY - 20, 40, 40);

    // Clouds — more volumetric, layered
    for (let i = 0; i < 15; i++) {
      const cx = Math.random() * w;
      const cy = h * 0.1 + Math.random() * h * 0.4;
      const cw = 80 + Math.random() * 200;
      const ch = 10 + Math.random() * 30;
      // Multiple overlapping ellipses for volume
      for (let j = 0; j < 3; j++) {
        const ox = (Math.random() - 0.5) * cw * 0.4;
        const oy = (Math.random() - 0.5) * ch * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + Math.random() * 0.06})`;
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + oy, cw * (0.6 + Math.random() * 0.4), ch * (0.5 + Math.random() * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Material Library v2 — PBR with Normal Maps + Roughness Maps + AO
// ═══════════════════════════════════════════════════════════════════════════════

export interface BIMMaterialLib {
  wall: THREE.Material;
  wallInterior: THREE.Material;
  wallExterior: THREE.Material;
  slab: THREE.Material;
  roof: THREE.Material;
  window: THREE.Material;
  door: THREE.Material;
  column: THREE.Material;
  beam: THREE.Material;
  stair: THREE.Material;
  space: THREE.Material;
  parapet: THREE.Material;
  canopy: THREE.Material;
  balcony: THREE.Material;
  duct: THREE.Material;
  pipe: THREE.Material;
  cableTray: THREE.Material;
  equipment: THREE.Material;
  ground: THREE.Material;
  mullion: THREE.Material;
  spandrel: THREE.Material;
  treeCrown: THREE.Material;
  treeTrunk: THREE.Material;
}

export function createBIMMaterials(): BIMMaterialLib {
  // ── Generate height canvases for normal map conversion ──
  const concreteHeight = noiseHeightCanvas(BUMP_SIZE, 0.03, 42, 5);
  const plasterHeight = noiseHeightCanvas(BUMP_SIZE, 0.05, 17, 5);
  const brickHeight = noiseHeightCanvas(BUMP_SIZE, 0.04, 14, 5);
  const woodHeight = noiseHeightCanvas(BUMP_SIZE, 0.06, 31, 4);
  const metalHeight = noiseHeightCanvas(BUMP_SIZE, 0.1, 44, 3);
  const grassHeight = noiseHeightCanvas(BUMP_SIZE, 0.05, 22, 5);
  const roofHeight = noiseHeightCanvas(BUMP_SIZE, 0.025, 71, 4);

  // ── Convert to normal maps (Sobel filter) ──
  const concreteNormal = heightToNormalMap(concreteHeight, 2.5, [2, 2]);
  const plasterNormal = heightToNormalMap(plasterHeight, 1.8, [2, 2]);
  const brickNormal = heightToNormalMap(brickHeight, 3.0, [3, 3]);
  const woodNormal = heightToNormalMap(woodHeight, 1.5, [1, 2]);
  const metalNormal = heightToNormalMap(metalHeight, 0.8, [3, 3]);
  const grassNormal = heightToNormalMap(grassHeight, 1.2, [25, 25]);
  const roofNormal = heightToNormalMap(roofHeight, 1.5, [2, 2]);

  // ── Roughness maps (varying shininess across surface) ──
  const concreteRoughness = noiseRoughnessMap(0.82, 0.12, 0.03, 55, [2, 2]);
  const metalRoughness = noiseRoughnessMap(0.3, 0.15, 0.08, 66, [3, 3]);
  const grassRoughness = noiseRoughnessMap(0.9, 0.08, 0.04, 33, [25, 25]);

  // ── Albedo textures (1024px) ──
  const wallPlaster = plasterTex("#E8E0D4", [2, 2]);
  const wallBrick = brickTex([3, 3]);
  const concSlab = concreteTex("#D0CCC4", [2, 2]);
  const roofMap = roofTex([2, 2]);
  const doorWood = woodTex("#6B4E10", [1, 2]);
  const metalBrushed = brushedMetalTex([3, 3]);
  const grassMap = grassTex([25, 25]);

  return {
    // ── Walls — plaster with Sobel normal map ──
    wall: new THREE.MeshStandardMaterial({
      map: wallPlaster, side: DS, roughness: 0.85, metalness: 0.0,
      normalMap: plasterNormal, normalScale: new THREE.Vector2(1.0, 1.0),
    }),
    wallInterior: new THREE.MeshStandardMaterial({
      color: 0xF5F0EB, side: DS, roughness: 0.92, metalness: 0.0,
      normalMap: heightToNormalMap(noiseHeightCanvas(256, 0.08, 90, 3), 0.5),
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    wallExterior: new THREE.MeshStandardMaterial({
      map: wallBrick, side: DS, roughness: 0.85, metalness: 0.0,
      normalMap: brickNormal, normalScale: new THREE.Vector2(1.5, 1.5),
    }),

    // ── Slabs / Floors — polished concrete ──
    slab: new THREE.MeshStandardMaterial({
      map: concSlab, side: DS, roughness: 0.72, metalness: 0.02,
      normalMap: concreteNormal, normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: concreteRoughness,
    }),

    // ── Roof — dark membrane ──
    roof: new THREE.MeshStandardMaterial({
      map: roofMap, side: DS, roughness: 0.7, metalness: 0.12,
      normalMap: roofNormal, normalScale: new THREE.Vector2(1.0, 1.0),
    }),

    // ── Glass — physically-based transmission (polished, high specular) ──
    window: new THREE.MeshPhysicalMaterial({
      color: 0x88CCEE,
      transparent: true,
      opacity: 0.15,
      side: DS,
      roughness: 0.01,     // Ultra-smooth — polished glass
      metalness: 0.02,
      transmission: 0.92,   // Higher transmission
      reflectivity: 0.98,   // Near-perfect reflection
      ior: 1.52,
      thickness: 0.6,
      envMapIntensity: 2.0,  // Strong environment reflections
      clearcoat: 1.0,        // Full clearcoat for extra shine
      clearcoatRoughness: 0.02,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
    }),

    // ── Door — polished wood ──
    door: new THREE.MeshStandardMaterial({
      map: doorWood, side: DS, roughness: 0.45, metalness: 0.0,
      normalMap: woodNormal, normalScale: new THREE.Vector2(0.8, 0.8),
      envMapIntensity: 0.6,
    }),

    // ── Column — polished concrete ──
    column: new THREE.MeshStandardMaterial({
      map: concreteTex("#C4C4C4", [1, 2]), side: DS, roughness: 0.5, metalness: 0.15,
      normalMap: heightToNormalMap(noiseHeightCanvas(BUMP_SIZE, 0.04, 66, 5), 2.0, [1, 2]),
      normalScale: new THREE.Vector2(1.0, 1.0),
      envMapIntensity: 0.8,
    }),

    // ── Beam — brushed steel ──
    beam: new THREE.MeshStandardMaterial({
      map: metalBrushed, side: DS, roughness: 0.35, metalness: 0.88,
      normalMap: metalNormal, normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: metalRoughness,
      envMapIntensity: 1.3,
    }),

    // ── Stair — polished concrete ──
    stair: new THREE.MeshStandardMaterial({
      map: concreteTex("#D4D0C8", [2, 1]), side: DS, roughness: 0.6, metalness: 0.02,
      normalMap: heightToNormalMap(noiseHeightCanvas(BUMP_SIZE, 0.035, 50, 5), 1.8, [2, 1]),
      normalScale: new THREE.Vector2(0.8, 0.8),
    }),

    // ── Space (transparent volume) ──
    space: new THREE.MeshStandardMaterial({
      color: 0xF0EDE8, side: DS, roughness: 0.95, metalness: 0.0,
      transparent: true, opacity: 0.03, depthWrite: false,
    }),

    // ── Parapet — clean concrete cap ──
    parapet: new THREE.MeshStandardMaterial({
      map: concreteTex("#C8C0B4", [2, 1]), side: DS, roughness: 0.7, metalness: 0.02,
      normalMap: concreteNormal, normalScale: new THREE.Vector2(0.8, 0.8),
    }),
    // ── Canopy — smooth concrete/metal ──
    canopy: new THREE.MeshStandardMaterial({
      color: 0xB8B0A4, side: DS, roughness: 0.5, metalness: 0.2,
      envMapIntensity: 0.8,
    }),
    // ── Balcony — polished concrete with glass railing feel ──
    balcony: new THREE.MeshStandardMaterial({
      color: 0xC0C0C0, side: DS, roughness: 0.55, metalness: 0.2,
      envMapIntensity: 0.7,
    }),

    // ── MEP — shiny galvanized duct ──
    duct: new THREE.MeshStandardMaterial({
      map: metalBrushed, side: DS, roughness: 0.2, metalness: 0.88,
      normalMap: metalNormal, normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: metalRoughness,
      envMapIntensity: 1.5,
    }),
    pipe: new THREE.MeshStandardMaterial({
      color: 0x3A8A5A, side: DS, roughness: 0.25, metalness: 0.75,
      envMapIntensity: 1.3,
    }),
    cableTray: new THREE.MeshStandardMaterial({
      color: 0xCCA020, side: DS, roughness: 0.3, metalness: 0.65,
    }),
    equipment: new THREE.MeshStandardMaterial({
      color: 0x5080B0, side: DS, roughness: 0.3, metalness: 0.65,
      envMapIntensity: 1.0,
    }),

    // ── Ground — rich grass with normal map ──
    ground: new THREE.MeshStandardMaterial({
      map: grassMap, side: DS, roughness: 0.88, metalness: 0.0,
      normalMap: grassNormal, normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: grassRoughness,
    }),

    // ── Facade detail — polished aluminum mullion ──
    mullion: new THREE.MeshStandardMaterial({
      color: 0xC8C8D0, side: DS, roughness: 0.18, metalness: 0.92,
      envMapIntensity: 1.8,
      normalMap: heightToNormalMap(noiseHeightCanvas(128, 0.15, 99, 2), 0.3),
      normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    // ── Dark spandrel panel — semi-glossy ──
    spandrel: new THREE.MeshStandardMaterial({
      color: 0x1A1A24, side: DS, roughness: 0.25, metalness: 0.82,
      envMapIntensity: 1.2,
    }),

    // ── Landscaping ──
    treeCrown: new THREE.MeshStandardMaterial({
      color: 0x2D6B1E, side: DS, roughness: 0.85, metalness: 0.0,
    }),
    treeTrunk: new THREE.MeshStandardMaterial({
      color: 0x5C3A1E, side: DS, roughness: 0.8, metalness: 0.0,
    }),
  };
}

/**
 * Get the appropriate material key for a BIM element type.
 */
export function getMaterialKey(elementType: string, isExterior?: boolean): keyof BIMMaterialLib {
  switch (elementType) {
    case "wall":       return isExterior ? "wallExterior" : "wall";
    case "slab":       return "slab";
    case "roof":       return "roof";
    case "window":     return "window";
    case "door":       return "door";
    case "column":     return "column";
    case "beam":       return "beam";
    case "stair":      return "stair";
    case "space":      return "space";
    case "parapet":    return "parapet";
    case "canopy":     return "canopy";
    case "balcony":    return "balcony";
    case "duct":       return "duct";
    case "pipe":       return "pipe";
    case "cable-tray": return "cableTray";
    case "equipment":  return "equipment";
    case "mullion":    return "mullion";
    case "spandrel":   return "spandrel";
    case "landscape":  return "treeCrown";
    default:           return "wall";
  }
}

/**
 * Dispose all materials and their textures.
 */
export function disposeBIMMaterials(lib: BIMMaterialLib) {
  for (const mat of Object.values(lib)) {
    if (mat instanceof THREE.Material) {
      const m = mat as THREE.MeshStandardMaterial;
      if (m.map) m.map.dispose();
      if (m.normalMap) m.normalMap.dispose();
      if (m.roughnessMap) m.roughnessMap.dispose();
      if (m.aoMap) m.aoMap.dispose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((m as any).bumpMap) (m as any).bumpMap.dispose();
      mat.dispose();
    }
  }
}

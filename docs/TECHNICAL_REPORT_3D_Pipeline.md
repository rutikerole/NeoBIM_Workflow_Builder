# Technical Research Report: Text Prompt to 3D Building + IFC Export Pipeline

**System:** NeoBIM Workflow Builder (BuildFlow)  
**Workflow ID:** wf-03  
**Date:** 2026-04-01  
**Version:** better-3d-model branch

---

## 1. Executive Summary

This report documents the complete technical architecture for the "Text Prompt to 3D Building + IFC Export" pipeline. The workflow transforms natural language architectural descriptions into photorealistic 3D BIM models and IFC-compliant files through a four-node chain:

```
IN-001 (Text Input) -> TR-003 (Design Brief Analyzer) -> GN-001 (3D Generator) -> EX-001 (IFC Exporter)
```

The system implements a **Unified BIM+AI Pipeline** that combines procedural BIM geometry (real walls, windows, columns, slabs, MEP) with AI-derived material colors (from DALL-E + GPT-4o vision), producing a single model that has both photorealistic appearance and full BIM element inspection capability.

---

## 2. Pipeline Architecture

### 2.1 Node Chain & Data Flow

```
User Text Description
    |
    v
[IN-001] Text Prompt Input
    | outputs: { content: string, prompt: string }
    | artifact type: "text"
    v
[TR-003] Design Brief Analyzer (GPT-4o)
    | receives: raw text from IN-001
    | outputs: BuildingDescription (structured JSON)
    | extracts: buildingType, floors, totalArea, height, footprint,
    |           structure, facade, materials, features, program
    | preserves: _originalPrompt (full user text for 3D AI passthrough)
    v
[GN-001] 3D Building Generator
    | receives: BuildingDescription from TR-003
    | fallback chain: 3D AI Studio -> Meshy -> Image-to-3D -> BIM+AI
    | outputs: GLB model + IFC file + BIM metadata + KPIs
    | artifact type: "3d"
    v
[EX-001] IFC Exporter
    | receives: geometry + metadata from GN-001
    | outputs: 4 discipline-split IFC files (arch, struct, MEP, combined)
    | artifact type: "file"
```

### 2.2 Edge Connections

| Edge | Source | Target | Data Key |
|------|--------|--------|----------|
| e1-2 | IN-001.text-out | TR-003.json-in | User text |
| e2-3 | TR-003.prog-out | GN-001.req-in | BuildingDescription JSON |
| e3-4 | GN-001.geo-out | EX-001.geo-in | 3D geometry + metadata URLs |

---

## 3. Node TR-003: Design Brief Analyzer

### 3.1 Input Processing

Accepts either free-form text or structured JSON from upstream nodes. Uses GPT-4o to parse natural language into structured building parameters.

### 3.2 GPT-4o Extraction

The system prompt instructs GPT-4o to extract a `BuildingDescription` with these fields:

```typescript
interface BuildingDescription {
  projectName: string;              // Project identifier
  buildingType: string;             // e.g., "Civic Space", "Office Tower"
  floors: number;                   // Storey count
  totalArea: number;                // Gross floor area (m2)
  height?: number;                  // Building height (m)
  footprint?: number;               // Base footprint area (m2)
  totalGFA?: number;                // Alternative GFA field
  program?: Array<{                 // Space breakdown
    space: string;
    area_m2?: number;
    floor?: string;
  }>;
  structure: string;                // Structural system description
  facade: string;                   // Facade material/system
  sustainabilityFeatures: string[]; // Green features
  programSummary: string;           // Narrative summary
  style?: string;                   // Architectural style
  massing?: string;                 // Massing type keyword
  materials?: string[];             // Facade materials list
  features?: string[];              // Building features list
  footprintShape?: string;          // circular, rectangular, L-shape, etc.
  floorToFloorHeight?: number;      // Floor-to-floor height (m)
  context?: {
    site?: string;
    climate?: string;
    orientation?: string;
    surroundings?: string;
  };
}
```

### 3.3 Original Prompt Preservation

The system preserves `_originalPrompt` (the user's raw text) alongside the structured extraction. This is critical because the passthrough template in 3D AI Studio uses the full descriptive text for richer 3D generation.

---

## 4. Node GN-001: 3D Building Generator

### 4.1 Fallback Chain Architecture

The generator attempts multiple 3D generation approaches in priority order:

```
Priority 1: 3D AI Studio (text-to-3D API)
    |-- if THREEDAI_API_KEY configured + credits available
    |-- Also generates BIM companion model (procedural)
    |-- Result: AI visual model + BIM inspection model
    |
Priority 2: Meshy.ai (text-to-3D API)
    |-- if MESHY_API_KEY configured
    |-- Meshy-6 model, 50k polycount target
    |
Priority 3: Image-to-3D Pipeline
    |-- if ENABLE_IMAGE_TO_3D_PIPELINE=true + OPENAI_API_KEY
    |-- DALL-E generates concept render -> SAM 3D converts to GLB
    |
Priority 4: Unified BIM+AI Pipeline (always available)
    |-- AI Material Palette: DALL-E + GPT-4o-mini color extraction
    |-- Procedural BIM: massing-generator.ts creates full building
    |-- GLB with AI-derived material colors
    |-- IFC + metadata for BIM inspection
```

### 4.2 3D AI Studio Integration

**API:** `https://api.3daistudio.com`

**Endpoints:**
- POST `/v1/3d-models/tencent/generate/rapid/` - Create generation task
- GET `/v1/generation-request/{task_id}/status/` - Poll for completion
- POST `/v1/tools/convert/` - OBJ archive to GLB conversion

**Request Parameters:**
```json
{
  "prompt": "<max 1024 chars>",
  "negative_prompt": "<exclusion terms>",
  "enable_pbr": true
}
```

**Polling Strategy:**
- Initial delay: 5,000ms (generation takes 30-60s)
- Poll interval: 3,000ms
- Max timeout: 300,000ms (5 minutes)
- Retries: 3 with exponential backoff (1s, 2s, 4s, max 10s)

**Prompt Engineering:**

The system uses 4 prompt templates selected by priority:

1. **Passthrough** (user text >100 chars): Preserves user's architectural vision with prefix "Architectural building exterior (NOT a vehicle or spacecraft): " + realism suffix
2. **Master** (structured data available): Combines building type, scale, proportions, footprint, massing, materials, facade details, features
3. **Campus** (masterplan detected): Multi-building campus layout prompt
4. **Minimal** (fallback): Basic building description

**Negative Prompt (full text):**
```
low quality, blurry, distorted, noise, artifacts, unrealistic proportions,
toy-like, cartoon, non-architectural, furniture, people, vehicles, trees,
interior details, text, watermark, signature, simplified, abstract, blocky,
flat shading, untextured, plastic, miniature, dollhouse, game asset, low-poly,
smooth featureless walls, missing windows, blank facade, no detail,
spaceship, spacecraft, UFO, flying saucer, rocket, vehicle, airplane, robot,
sci-fi ship, starship, space station, action figure, figurine, diorama, model kit
```

**View Suffix:**
```
isometric view, white background, ultra-realistic architectural visualization,
detailed facade with windows and facade panels, real-world building proportions,
high-resolution PBR materials and textures, sharp edges,
accurate scale, photorealistic octane render quality,
architectural photography lighting, 8K detail,
large-scale detailed building model with visible structural columns, floor slabs,
glass curtain wall mullions, entrance canopy, roof parapet,
real architectural building at full scale not a miniature or toy
```

**Vocabulary Maps:**

| Category | Count | Examples |
|----------|-------|---------|
| MASSING_VOCAB | 15 | extruded, stepped, tapered, twisted, podium_tower, cantilever, terraced, sculpted |
| STYLE_DESCRIPTORS | 18 | parametric, brutalist, minimalist, hightech, deconstructivist, organic, futuristic |
| MATERIAL_DESCRIPTORS | 14 | glass curtain wall, aluminum composite, exposed concrete, timber CLT, brick masonry |
| FACADE_DETAIL_BY_TYPE | 10 | residential: Juliet balconies; office: curtain wall; museum: windowless gallery walls |
| PROPORTION_BY_TYPE | 14 | residential: slender; hospital: broad deep floor plates; stadium: tiered seating |
| FEATURE_DESCRIPTIONS | 20 | terrace, canopy, rooftop_garden, double_skin, atrium, skybridge, brise_soleil |

### 4.3 BIM Companion Model Generation

When 3D AI Studio succeeds, the system also generates a procedural BIM model in parallel:

```
1. generateMassingGeometry(massingInput) -> full BIM geometry
2. generateGLB(geometry) -> BIM GLB file
3. generateIFCFile(geometry) -> IFC STEP file
4. extractMetadata(geometry) -> element metadata JSON
5. uploadBuildingAssets(glb, ifc, metadata) -> R2 URLs
```

This provides BIM inspection capability (element selection, properties, section planes) alongside the AI visual model.

### 4.4 Unified BIM+AI Pipeline (Procedural Path)

When AI APIs are unavailable, the system generates a unified model:

**Step 1: AI Material Palette Generation**
```
DALL-E generates concept render from building description
GPT-4o-mini analyzes description and extracts color palette:
  - style: modern|classical|industrial|futuristic|organic
  - glassTint: clear|blue|bronze|green|dark
  - facadeMaterial: glass|concrete|metal|brick|wood|stone
  - wallExteriorHex, mullionHex, spandrelHex, roofHex, columnHex
```

**Step 2: Procedural BIM Geometry Generation**

See Section 5 for complete geometry generation documentation.

**Step 3: GLB Export with AI Color Overrides**

The `generateGLB(geometry, materialOverrides)` function accepts an optional `materialOverrides` parameter that maps AI palette colors to BIM element types, combining procedural geometry with AI-derived appearance.

---

## 5. Procedural BIM Geometry Generation

### 5.1 Shape Detection

**File:** `src/services/massing-generator.ts`

The system detects building footprint shape from text using regex patterns:

| Shape | Regex Pattern | Vertex Count |
|-------|--------------|--------------|
| Circular | `circular\|round\|cylindrical\|rotunda\|dome\|silo\|observatory\|planetarium` | 32 |
| Hexagonal | `hexagonal\|hex-shaped\|honeycomb` | 6 |
| Octagonal | `octagonal\|oct-shaped` | 8 |
| Triangular | `triangular\|tri-shaped\|pyramid` | 3 |
| L-Shape | `l-shape\|courtyard` or building type contains "mixed" | 6 (composite) |
| Rectangular | Default fallback | 4 |

### 5.2 Footprint Computation Formulas

| Shape | Formula | Implementation |
|-------|---------|----------------|
| Circular | r = sqrt(A / pi) | 32-point polygon approximation |
| Hexagonal | r = sqrt(2A / 3*sqrt(3)) | Regular hexagon |
| Octagonal | r = sqrt(A / 2(1+sqrt(2))) | Regular octagon |
| Triangular | s = sqrt(4A / sqrt(3)), r = s / sqrt(3) | Equilateral triangle |
| L-Shape | totalSide = sqrt(A * 1.3), main=60%, wing=40% | Only for A > 200m2 |
| Rectangular | w = sqrt(A * 1.618), d = A / w | Golden ratio (1.618:1) |

**Explicit Dimension Extraction:**
- Diameter pattern: `/diameter\s+(?:of\s+)?(?:about\s+)?(\d+)/i` -> radius = value/2
- Width x Depth pattern: `/(\d+)\s*m?\s*[x×]\s*(\d+)/i` -> explicit rectangle

### 5.3 Wall Element Generation

**Function:** `createWallElement(p1, p2, baseZ, wallHeight, wallThickness, storeyIndex, wallIndex)`

**Algorithm:**
```
1. Calculate wall direction: dx = p2.x - p1.x, dy = p2.y - p1.y
2. Wall length: L = sqrt(dx^2 + dy^2)
3. Normal vectors (perpendicular): nx = -dy/L * t/2, ny = dx/L * t/2
4. Generate 8 vertices: 4 outer face + 4 inner face (offset by +-normal)
5. Generate 6 faces: outer, inner, left cap, right cap, top, bottom
```

**Constants:**
- Exterior wall thickness: 250mm
- Interior partition thickness: 150mm
- Basement wall thickness: 300mm

### 5.4 Window Generation

**Function:** `generateWindowsForWall(p1, p2, elevation, floorHeight, storeyIndex, wallIndex, buildingType)`

**Building Type Presets:**

| Building Type | Width (m) | Height (m) | Sill (m) | Spacing (m) |
|--------------|-----------|------------|----------|-------------|
| Office | 1.8 | 2.2 | 0.8 | 2.7 |
| Residential | 1.2 | 1.5 | 0.9 | 3.0 |
| Hotel | 1.4 | 1.8 | 0.8 | 3.2 |
| Warehouse | 2.0 | 1.0 | 2.5 | 5.0 |
| Museum/Gallery | 2.5 | 3.0 | 0.6 | 4.0 |
| School | 1.8 | 1.8 | 0.9 | 2.4 |

**Curtain Wall Mode:**

Detected for: `civic|commercial|tower|corporate|tech|futur|modern|mixed-use|retail|convention|arena|stadium|terminal|airport`

Curtain wall parameters:
- Window width = max(wallLength - 2 * 80mm, wallLength * 0.92)
- Window height = floorHeight - 350mm (floor-to-ceiling)
- Sill height = 150mm (minimal)
- ONE panel per wall segment
- Edge margin = 4mm (mullion only)

**Placement Algorithm:**
```
edgeMargin = isCurtainWall ? 0.04 : 0.8
usableLength = wallLength - 2 * edgeMargin
numWindows = isCurtainWall ? 1 : max(1, floor(usableLength / spacing))
actualSpacing = usableLength / numWindows

for i = 0 to numWindows-1:
  offset = edgeMargin + (i + 0.5) * actualSpacing
  cx = p1.x + dirX * offset
  cy = p1.y + dirY * offset
  baseZ = elevation + sillHeight
```

Window depth: 50mm normal to wall surface. Each window = 8 vertices, 6 faces (box geometry).

### 5.5 Mullion Frame Generation

**Function:** `generateMullionFrames(windowElements, storeyIndex, wallIndex, floorHeight, elevation)`

**Mullion Dimensions:**
- Frame depth: 60mm
- Frame width: 50mm

**Bars per window (4-6):**
1. Left vertical mullion
2. Right vertical mullion
3. Bottom horizontal (sill bar)
4. Top horizontal (head bar)
5. Mid horizontal transom (if window height > 1.5m)
6. Mid vertical mullion (if window width > 2.0m)

Each bar = 8-vertex box extrusion along a line. Material: aluminum, metalness 0.9, roughness 0.25.

### 5.6 Spandrel Panel Generation

**Function:** `generateSpandrelPanel(p1, p2, elevation, panelHeight, storeyIndex, wallIndex)`

- Panel thickness: 40mm
- Material: aluminum_composite, metalness 0.8
- IFC type: IfcCovering

**Placement (for curtain wall buildings):**
- Below sill: between floor level and window bottom (if sillHeight > 100mm)
- Above window: between window top and next floor slab (if gap > 50mm)

### 5.7 Interior Space Generation

**Circular buildings** (`isCircularFootprint` = footprint.length >= 16):
- Central core: 25% of outer radius, 16-segment ring wall
- Radial partition walls from core to perimeter
- Wedge-shaped spaces between partitions
- Column ring at 60% radius (6-12 columns)

**Rectangular buildings:**
- Central corridor: 2.0m wide, along longer axis
- Room partitions perpendicular to corridor
- Column grid: 6-8m spacing in both directions

### 5.8 Door Generation

- Main entrance (longest wall): 2.4m wide x 2.8m high (double door)
- Secondary doors: 1.0m wide x 2.1m high
- Ground floor only, center of wall, wall minimum 3.0m

### 5.9 Floor Height Logic

| Building Type | Default Height | Ground Floor |
|--------------|---------------|-------------|
| Warehouse/Industrial | 5.0m | max(5.0, 4.5) |
| Museum/Gallery | 4.5m | max(4.5, 4.5) |
| Commercial/Retail | 4.2m | max(4.2, 4.5) |
| Office | 3.8m | max(3.8, 4.5) |
| Residential | 3.0m | max(3.0, 4.5) |
| Default | 3.6m | max(3.6, 4.5) |

Ground floor height is always >= 4.5m (lobby/retail height).

### 5.10 Storey Assembly Order

For each floor (0 to floors-1):
1. Exterior walls (one per footprint edge)
2. Windows on each wall
3. Mullion frames around windows
4. Spandrel panels between floors (curtain wall types)
5. Doors on ground floor
6. Balconies (residential/hotel, alternating pattern)
7. Floor slab (footprint extrusion, 300mm thick)
8. Structural beams (rectangular buildings only)
9. Staircase (centralized)
10. Interior elements (partitions, spaces, columns)
11. Elevator shaft (4 walls + central space)
12. MEP elements (ducts, pipes, cable trays, equipment, diffusers)

**Additional features:**
- Setback at 70% height for buildings >= 6 floors (2m inset)
- Basement for buildings >= 3 floors (3.6m height, 6m column grid)
- Roof slab + parapet walls on top floor

### 5.11 MEP Systems

- **Ducts:** Central trunk along building length + branch ducts
- **Pipes:** Parallel runs to ducts (water supply/drainage)
- **Cable trays:** Overhead runs
- **Equipment:** HVAC units, transformers placed in service spaces
- **Diffusers:** Distributed in occupied spaces

---

## 6. GLB Generation (Three.js Server-Side)

### 6.1 Server-Side Polyfills

Required because Three.js expects browser APIs:

| Global | Polyfill |
|--------|----------|
| `window` | location, addEventListener (noop), devicePixelRatio, innerWidth/Height |
| `document` | createElement, createElementNS (return mock canvas) |
| `FileReader` | Custom class using Blob.arrayBuffer() for GLTFExporter binary mode |

### 6.2 Coordinate System Transformation

MassingGeometry uses (x, y = plan, z = vertical). Three.js uses (x, z = plan, y = vertical).

Conversion: `positions.push(v.x, v.z, v.y)` for each vertex.

### 6.3 Face Triangulation

- 3-vertex faces: direct triangle
- 4-vertex faces (quads): split into 2 triangles (0,1,2) + (0,2,3)
- N-vertex faces: fan triangulation from vertex 0

### 6.4 Material System

Two material types based on PBR properties:

- **Glass** (transmission > 0): `MeshPhysicalMaterial` with transmission, IOR, reflectivity, opacity
- **Opaque**: `MeshStandardMaterial` with color, roughness, metalness, emissive

**AI Material Override:** When `materialOverrides` parameter is provided, each element type's base material is merged with the AI-derived colors: `finalDef = {...baseDef, ...override}`.

### 6.5 Scene Structure

```
Scene (named by buildingType)
  +-- Storey-0 (Ground Floor)
  |     +-- wall-s0-w0 (userData: {ifcType, elementType, storeyIndex, discipline})
  |     +-- window-s0-w0-0
  |     +-- mullion-v-s0-w0-0-L
  |     +-- spandrel-s0-w0
  |     +-- ...
  +-- Storey-1 (Level 2)
  |     +-- ...
  +-- ground-plane (PlaneGeometry, 3x building size)
  +-- landscaping (Group)
        +-- tree-trunk-0 (CylinderGeometry)
        +-- tree-crown-0-0 (ConeGeometry)
        +-- tree-crown-0-1 (ConeGeometry)
        +-- tree-crown-0-2 (ConeGeometry)
        +-- ... (8-24 trees in ring + 6 scattered)
```

### 6.6 Tree Generation

- Ring placement: `treeRingRadius = buildingRadius + 6 + random(0,4)`
- Count: `max(8, min(24, floor(buildingRadius * 1.2)))`
- Each tree: trunk (CylinderGeometry, 6 sides) + 3 layered cones (crown)
- 6 additional scattered trees at further distances
- Tree height: 4-9m, crown radius: 1.5-3.5m

### 6.7 Export

`GLTFExporter.parse(scene, { binary: true })` -> ArrayBuffer -> Buffer

---

## 7. IFC Export (ISO 10303-21)

### 7.1 File Structure

- Format: ISO 10303-21 (STEP Physical File)
- Schema: IFC4
- View Definition: DesignTransferView_V1
- Units: SI (metre, m2, m3, radian, second)

### 7.2 Spatial Hierarchy

```
IfcProject
  +-- IfcSite
        +-- IfcBuilding
              +-- IfcBuildingStorey (Ground Floor, elevation 0.0)
              |     +-- IfcWall (exterior walls)
              |     +-- IfcWindow (windows)
              |     +-- IfcDoor (doors)
              |     +-- IfcSlab (floor slab)
              |     +-- IfcColumn (columns)
              |     +-- IfcBeam (beams, mullions, spandrels)
              |     +-- IfcSpace (room volumes)
              |     +-- IfcDuctSegment (ducts)
              |     +-- IfcPipeSegment (pipes)
              |     +-- IfcFlowTerminal (equipment)
              +-- IfcBuildingStorey (Level 2)
              |     +-- ...
              +-- IfcBuildingStorey (Roof)
```

### 7.3 GUID Generation

Deterministic xorshift32 PRNG seeded from entity index:

```
state = ((seed + 1) * 2654435761) >>> 0
xorshift: state ^= state << 13; state ^= state >>> 17; state ^= state << 5
Output: 22-character base-64 string from IFC alphabet
```

### 7.4 Material Layer Definitions

**Wall composition (250mm total):**
- Gypsum Plaster (inner): 15mm
- Reinforced Concrete: 150mm
- Mineral Wool Insulation: 70mm
- Gypsum Plaster (outer): 15mm

**Slab composition (300mm total):**
- Reinforced Concrete: 250mm
- Mineral Wool Insulation: 50mm

### 7.5 Property Sets

Building: NumberOfFloors, TotalHeight, GrossFloorArea, FootprintArea, BuildingType  
Storey: Elevation, Height, WallCount, WindowCount, DoorCount

### 7.6 Discipline Filtering

| Discipline | Element Types |
|-----------|--------------|
| Architectural | wall, window, door, space, balcony, canopy, parapet, mullion, spandrel |
| Structural | column, beam, slab, stair, roof |
| MEP | duct, pipe, cable-tray, equipment |

---

## 8. 3D Viewer Rendering Pipeline

### 8.1 Renderer Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| antialias | true | Smooth edges |
| pixelRatio | min(devicePixelRatio, 2) | Performance cap |
| shadowMap.type | PCFSoftShadowMap | Soft shadow filtering |
| toneMapping | ACESFilmicToneMapping | Cinematic exposure curve |
| toneMappingExposure | 1.4 | Brightness coefficient |
| outputColorSpace | SRGBColorSpace | Web color standard |

### 8.2 Lighting (6-Light Cinematic Setup)

| Light | Type | Color | Intensity | Shadow | Purpose |
|-------|------|-------|-----------|--------|---------|
| Ambient | AmbientLight | 0xCCCCDD | 0.5 | No | Global fill |
| Hemisphere | HemisphereLight | sky: 0x87CEEB, ground: 0x556633 | 0.8 | No | Natural color bleed |
| Sun | DirectionalLight | 0xFFEECC | 2.5 | 4096x4096 | Primary key light |
| Fill | DirectionalLight | 0xBBCCEE | 0.7 | No | Shadow softening |
| Rim | DirectionalLight | 0xF0E8D0 | 0.3 | No | Edge definition |
| Bounce | DirectionalLight | 0xEEDDCC | 0.2 | No | Ground reflection |

### 8.3 Post-Processing Pipeline

```
RenderPass -> SSAOPass -> UnrealBloomPass -> FXAAShader -> OutputPass
```

| Pass | Parameters | Purpose |
|------|-----------|---------|
| SSAO | kernelRadius: 0.8, minDistance: 0.001, maxDistance: 0.15 | Contact shadows and depth |
| Bloom | strength: 0.12, radius: 0.5, threshold: 0.85 | Glass/emissive glow |
| FXAA | resolution-based | Edge anti-aliasing |
| Output | Tone mapping finalization | HDR to LDR conversion |

### 8.4 Environment Mapping

- PMREMGenerator creates cubemap from procedural sky scene
- Sky sphere (SphereGeometry 100, 64x32) with gradient texture
- Ground plane for bounce light in environment
- Visible sky dome (SphereGeometry 400, 64x32) in main scene
- Sky gradient: zenith blue (#3A6BC5) -> horizon warm (#F0E8D8) -> ground (#8A9A6A)
- Procedural sun disc with radial glow at (0.7w, 0.38h)
- 8 wispy cloud ellipses

### 8.5 Material Library (22 materials)

| Material | Type | Color/Texture | Roughness | Metalness | Special |
|----------|------|--------------|-----------|-----------|---------|
| wall | Standard | plaster texture | 0.85 | 0.0 | bump map |
| wallExterior | Standard | brick texture | 0.85 | 0.0 | bump map |
| slab | Standard | concrete texture | 0.78 | 0.0 | bump map |
| roof | Standard | membrane texture | 0.7 | 0.12 | bump map |
| window | Physical | 0x88CCEE | 0.02 | 0.05 | transmission: 0.88, IOR: 1.52, clearcoat: 0.1 |
| door | Standard | wood texture | 0.5 | 0.0 | bump map |
| column | Standard | concrete texture | 0.55 | 0.2 | bump map |
| beam | Standard | brushed metal | 0.4 | 0.85 | reflective |
| mullion | Standard | 0xC0C0C8 | 0.25 | 0.9 | envMapIntensity: 1.4 |
| spandrel | Standard | 0x1A1A22 | 0.3 | 0.8 | dark metallic |
| duct | Standard | brushed metal | 0.25 | 0.85 | envMapIntensity: 1.2 |
| ground | Standard | grass texture | 0.92 | 0.0 | bump map, repeat [25,25] |

**Procedural Textures (Canvas-based):**
- Concrete: FBM noise (5 octaves, seed 42) + formwork seam lines
- Plaster: Dual-layer FBM noise for stipple/stucco effect
- Wood: 120 horizontal grain lines + random knots
- Brick: Running bond pattern, 5-color palette with mortar
- Brushed Metal: 300 horizontal brush lines
- Grass: Dual FBM noise + 600 blade highlight strokes
- Roof: FBM noise + 3 membrane seam lines

**Noise System:**
```
noise(x, y, seed) = frac(sin(x*127.1 + y*311.7 + seed*1731.3) * 43758.5453)
smoothNoise: Hermite interpolation (t^2*(3-2t)) with bilinear sampling
fbm: 4 octaves, amplitude decay 0.5x, frequency growth 2x
```

### 8.6 BIM Interaction Features

- Element selection via raycaster click
- Properties panel: name, IFC type, category, storey, dimensions, material, discipline
- Discipline coloring: Architectural (blue), Structural (red), MEP (green)
- Storey coloring: 12-color rotating palette
- Section planes: Y-axis clipping with draggable height slider
- BIM controls hidden when metadata unavailable (AI-generated models)

---

## 9. AI Material Palette Service

### 9.1 Pipeline

```
Building Description Text
    |
    v
DALL-E 3 / gpt-image-1
    | generates concept render (photorealistic)
    v
GPT-4o-mini Vision
    | analyzes description + optional image
    | extracts: style, glassTint, facadeMaterial,
    |           wallExteriorHex, mullionHex, spandrelHex, roofHex, columnHex
    v
AIMaterialPalette
    | maps to PBRMaterialDef overrides
    v
generateGLB(geometry, materialOverrides)
```

### 9.2 Palette Schema

```typescript
interface AIMaterialPalette {
  wallExterior: number;    // hex color
  wallInterior: number;
  window: number;
  windowOpacity: number;
  mullion: number;
  spandrel: number;
  slab: number;
  roof: number;
  column: number;
  door: number;
  ground: number;
  style: "modern" | "classical" | "industrial" | "futuristic" | "organic";
  glassTint: "clear" | "blue" | "bronze" | "green" | "dark";
  facadeMaterial: "glass" | "concrete" | "metal" | "brick" | "wood" | "stone";
}
```

### 9.3 Glass Tint Mapping

| Tint | Color | Opacity |
|------|-------|---------|
| clear | 0xCCEEFF | 0.2 |
| blue | 0x88CCEE | 0.2 |
| bronze | 0x998866 | 0.3 |
| green | 0x88BBAA | 0.2 |
| dark | 0x334455 | 0.35 |

---

## 10. KPI Calculation

Generated from BuildingRequirements (independent of 3D geometry):

| KPI | Formula |
|-----|---------|
| Gross Floor Area | footprint_m2 * floors |
| Net Floor Area | GFA * efficiency% |
| Efficiency | By type: office 82%, residential 80%, hotel 70%, retail 85%, museum 65% |
| Building Height | floors * floorToFloorHeight |
| Facade Area | perimeter * totalHeight |
| Volume | GFA * floorToFloorHeight |
| S/V Ratio | (facadeArea + 2*footprint) / volume |
| Floor Area Ratio | GFA / siteArea (if site area known) |
| Site Coverage | footprint / siteArea (if site area known) |
| Estimated EUI | office: 150, residential: 120, other: 170 kWh/m2/year |
| Daylight Potential | High if facadeArea/GFA > 0.4, else Medium |
| Natural Ventilation | Viable if floors <= 5, else Limited |

---

## 11. Output Artifact Structure

### 11.1 GN-001 Output (type: "3d")

```json
{
  "id": "cuid",
  "type": "3d",
  "data": {
    "glbUrl": "https://r2.example.com/buildings/{id}/model.glb",
    "ifcUrl": "https://r2.example.com/buildings/{id}/model.ifc",
    "metadataUrl": "https://r2.example.com/buildings/{id}/metadata.json",
    "thumbnailUrl": "https://oaidalleapi.com/...",
    "floors": 5,
    "height": 21.5,
    "footprint": 800,
    "gfa": 4000,
    "buildingType": "Civic Space",
    "metrics": [{ "label": "...", "value": "...", "unit": "..." }],
    "content": "User's original description text",
    "prompt": "User's prompt or AI-enhanced prompt",
    "kpis": { "...": "..." },
    "_geometry": { "...MassingGeometry..." },
    "_raw": { "...TR-003 output..." },
    "style": { "...parsed style data..." }
  },
  "metadata": {
    "engine": "bim-ai-hybrid",
    "real": true
  }
}
```

### 11.2 EX-001 Output (type: "file")

```json
{
  "type": "file",
  "data": {
    "url": "https://r2.example.com/buildings/{id}/model.ifc",
    "filename": "civic_space_2026-04-01_combined.ifc",
    "contentType": "application/x-step",
    "label": "IFC Export (from BIM pipeline)",
    "discipline": "all"
  }
}
```

---

## 12. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| 3D Engine | Three.js | 0.183.2 |
| Language | TypeScript (strict) | 5.x |
| AI (Text) | GPT-4o, GPT-4o-mini | latest |
| AI (Image) | DALL-E 3, gpt-image-1 | latest |
| AI (3D) | 3D AI Studio, Meshy.ai, SAM 3D (fal.ai) | v2/v6 |
| BIM Format | IFC4 (ISO 16739-1:2018) | STEP P21 |
| 3D Format | glTF 2.0 / GLB (binary) | 2.0 |
| Storage | Cloudflare R2 | S3-compatible |
| Post-processing | SSAO, UnrealBloom, FXAA | Three.js addons |

---

## 13. Known Limitations & Research Opportunities

### 13.1 Current Limitations

1. **3D AI Studio generates surface meshes without BIM structure** - AI-generated models lack individual element identification
2. **Procedural geometry is schematic** - Walls are flat panels, no moldings/reveals/trim detail
3. **Window frames lack glazing bar subdivisions** - Mullion grid is simplified (max 6 bars per window)
4. **MEP systems are simplified** - Ducts/pipes are basic cylinders/boxes, no fittings or valves
5. **No structural analysis integration** - Columns/beams are aesthetic, not load-calculated
6. **Material textures are procedural** - Canvas-based, limited resolution (512x512)
7. **No terrain/topography** - Ground plane is flat
8. **Single-building focus** - No site context or neighboring buildings

### 13.2 Research Opportunities

1. **AI-guided geometry refinement** - Use GPT-4o to generate specific facade panel layouts, mullion patterns, and architectural details from text
2. **Neural texture synthesis** - Replace procedural textures with AI-generated PBR texture maps (albedo + normal + roughness + metalness)
3. **Structural optimization** - Integrate FEA analysis to validate/optimize column and beam placement
4. **IFC enrichment** - Add IfcMaterial, IfcPropertySet with thermal/acoustic data, IfcClassification (Uniclass/OmniClass)
5. **LOD system** - Progressive detail levels for large models (LOD 100-400 per BIM standards)
6. **Parametric facades** - Support for parametric panel patterns (Voronoi, diagrid, folded plates)
7. **Real HDRI environment** - Load actual HDR environment maps instead of procedural sky
8. **Mesh optimization** - Reduce vertex count while maintaining visual quality (mesh decimation)
9. **Ray-traced rendering** - Replace rasterized post-processing with Three.js WebGPU path tracing
10. **Digital twin integration** - Connect to IoT sensors for live building performance visualization

---

## 14. File Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/api/execute-node/route.ts` | Node execution orchestration | ~5600 |
| `src/services/massing-generator.ts` | Procedural BIM geometry | ~1800 |
| `src/services/glb-generator.ts` | Three.js GLB export | ~350 |
| `src/services/ifc-exporter.ts` | IFC4 STEP file generation | ~1300 |
| `src/services/threedai-studio.ts` | 3D AI Studio API integration | ~876 |
| `src/services/meshy-ai.ts` | Meshy.ai text-to-3D API | ~210 |
| `src/services/ai-material-palette.ts` | DALL-E + GPT-4o material extraction | ~160 |
| `src/services/material-mapping.ts` | PBR material definitions | ~136 |
| `src/services/metadata-extractor.ts` | BIM element metadata extraction | ~200 |
| `src/components/canvas/artifacts/BIMViewer.tsx` | Ultra-realistic 3D viewer | ~820 |
| `src/components/canvas/artifacts/bim-materials.ts` | Procedural PBR texture library | ~380 |
| `src/types/geometry.ts` | Geometry type definitions | ~112 |
| `src/constants/prebuilt-workflows.ts` | Workflow wf-03 definition | ~85 |

---

*End of Technical Report*

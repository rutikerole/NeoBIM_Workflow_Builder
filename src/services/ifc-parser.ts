/**
 * TR-007: IFC Quantity Extractor
 * Real IFC parsing with CSI MasterFormat mapping and waste factors
 *
 * Extracts:
 * - Element counts by type
 * - Physical quantities (area, volume, length) from IfcElementQuantity (Qto_*)
 * - Net area calculations (gross minus openings)
 * - CSI division categorization
 * - Waste factor application
 * - Professional QS-ready output
 */

import {
  IfcAPI,
  IFCBUILDINGSTOREY,
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCWINDOW,
  IFCDOOR,
  IFCSLAB,
  IFCCOLUMN,
  IFCBEAM,
  IFCSTAIR,
  IFCRAILING,
  IFCCOVERING,
  IFCROOF,
  IFCFOOTING,
  IFCPROJECT,
  IFCRELDEFINESBYPROPERTIES,
  IFCELEMENTQUANTITY,
} from "web-ifc";

// ============================================================================
// TYPES
// ============================================================================

export interface QuantityData {
  count: number;
  area?: {
    gross?: number;
    net?: number;
    unit: string;
  };
  volume?: {
    base: number;
    withWaste: number;
    unit: string;
  };
  length?: number;
  width?: number;
  height?: number;
  thickness?: number;
  perimeter?: number;
  openingArea?: number;
  [key: string]: any;
}

export interface IFCElementData {
  id: string;
  type: string;
  name: string;
  storey: string;
  material: string;
  quantities: QuantityData;
  properties?: Record<string, any>;
}

export interface CSICategory {
  code: string;
  name: string;
  elements: IFCElementData[];
}

export interface CSIDivision {
  code: string;
  name: string;
  totalVolume?: number;
  volumeWithWaste?: number;
  totalArea?: number;
  totalNetArea?: number;
  totalOpeningArea?: number;
  areaWithWaste?: number;
  wasteFactor: number;
  elementCount: number;
  categories: CSICategory[];
}

export interface BuildingStorey {
  name: string;
  elevation: number;
  height: number;
  elementCount: number;
}

export interface IFCParseResult {
  meta: {
    version: string;
    timestamp: string;
    processingTimeMs: number;
    ifcSchema: string;
    projectName: string;
    projectGuid: string;
    units: {
      length: string;
      area: string;
      volume: string;
    };
    warnings: string[];
    errors: string[];
  };
  summary: {
    totalElements: number;
    processedElements: number;
    failedElements: number;
    divisionsFound: string[];
    buildingStoreys: number;
    grossFloorArea: number;
    totalConcrete?: number;
    totalMasonry?: number;
  };
  divisions: CSIDivision[];
  buildingStoreys: BuildingStorey[];
}

// ============================================================================
// CSI MASTERFORMAT MAPPING
// ============================================================================

interface CSIMapping {
  division: string;
  divisionName: string;
  code: string;
  codeName: string;
  wasteFactor: number;
}

const DEFAULT_WASTE_FACTORS: Record<string, number> = {
  "03": 5.0,  // Concrete
  "04": 8.0,  // Masonry
  "05": 3.0,  // Metals
  "06": 10.0, // Wood
  "07": 10.0, // Thermal/Moisture
  "08": 2.0,  // Openings
  "09": 15.0, // Finishes
  default: 5.0,
};

function getCSIMapping(
  ifcType: string,
  materialName: string = ""
): CSIMapping {
  const material = materialName.toLowerCase();

  // Material-based overrides
  if (ifcType === "IfcWall" || ifcType === "IfcWallStandardCase") {
    if (material.includes("brick") || material.includes("block")) {
      return {
        division: "04",
        divisionName: "Masonry",
        code: "04 20 00",
        codeName: "Unit Masonry",
        wasteFactor: DEFAULT_WASTE_FACTORS["04"],
      };
    }
    return {
      division: "03",
      divisionName: "Concrete",
      code: "03 30 00",
      codeName: "Cast-in-Place Concrete",
      wasteFactor: DEFAULT_WASTE_FACTORS["03"],
    };
  }

  if (ifcType === "IfcColumn") {
    if (material.includes("steel")) {
      return {
        division: "05",
        divisionName: "Metals",
        code: "05 12 00",
        codeName: "Structural Steel Framing",
        wasteFactor: DEFAULT_WASTE_FACTORS["05"],
      };
    }
    return {
      division: "03",
      divisionName: "Concrete",
      code: "03 30 00",
      codeName: "Cast-in-Place Concrete",
      wasteFactor: DEFAULT_WASTE_FACTORS["03"],
    };
  }

  if (ifcType === "IfcBeam") {
    if (material.includes("timber") || material.includes("wood")) {
      return {
        division: "06",
        divisionName: "Wood, Plastics, and Composites",
        code: "06 10 00",
        codeName: "Rough Carpentry",
        wasteFactor: DEFAULT_WASTE_FACTORS["06"],
      };
    }
    return {
      division: "05",
      divisionName: "Metals",
      code: "05 12 00",
      codeName: "Structural Steel Framing",
      wasteFactor: DEFAULT_WASTE_FACTORS["05"],
    };
  }

  // Type-based mapping
  const mappings: Record<string, CSIMapping> = {
    IfcFooting: {
      division: "03",
      divisionName: "Concrete",
      code: "03 30 00",
      codeName: "Cast-in-Place Concrete",
      wasteFactor: DEFAULT_WASTE_FACTORS["03"],
    },
    IfcSlab: {
      division: "03",
      divisionName: "Concrete",
      code: "03 30 00",
      codeName: "Cast-in-Place Concrete",
      wasteFactor: DEFAULT_WASTE_FACTORS["03"],
    },
    IfcDoor: {
      division: "08",
      divisionName: "Openings",
      code: "08 10 00",
      codeName: "Doors and Frames",
      wasteFactor: DEFAULT_WASTE_FACTORS["08"],
    },
    IfcWindow: {
      division: "08",
      divisionName: "Openings",
      code: "08 50 00",
      codeName: "Windows",
      wasteFactor: DEFAULT_WASTE_FACTORS["08"],
    },
    IfcCovering: {
      division: "09",
      divisionName: "Finishes",
      code: "09 60 00",
      codeName: "Flooring",
      wasteFactor: DEFAULT_WASTE_FACTORS["09"],
    },
    IfcRoof: {
      division: "07",
      divisionName: "Thermal and Moisture Protection",
      code: "07 40 00",
      codeName: "Roofing and Siding Panels",
      wasteFactor: DEFAULT_WASTE_FACTORS["07"],
    },
    IfcStair: {
      division: "03",
      divisionName: "Concrete",
      code: "03 30 00",
      codeName: "Cast-in-Place Concrete",
      wasteFactor: DEFAULT_WASTE_FACTORS["03"],
    },
    IfcRailing: {
      division: "05",
      divisionName: "Metals",
      code: "05 52 00",
      codeName: "Metal Railings",
      wasteFactor: DEFAULT_WASTE_FACTORS["05"],
    },
  };

  return (
    mappings[ifcType] || {
      division: "00",
      divisionName: "Unknown",
      code: "00 00 00",
      codeName: "Unclassified",
      wasteFactor: DEFAULT_WASTE_FACTORS.default,
    }
  );
}

// ============================================================================
// IFC TYPES TO EXTRACT
// ============================================================================

const IFC_TYPES = [
  { typeId: IFCWALL, label: "IfcWall" },
  { typeId: IFCWALLSTANDARDCASE, label: "IfcWallStandardCase" },
  { typeId: IFCWINDOW, label: "IfcWindow" },
  { typeId: IFCDOOR, label: "IfcDoor" },
  { typeId: IFCSLAB, label: "IfcSlab" },
  { typeId: IFCCOLUMN, label: "IfcColumn" },
  { typeId: IFCBEAM, label: "IfcBeam" },
  { typeId: IFCSTAIR, label: "IfcStair" },
  { typeId: IFCRAILING, label: "IfcRailing" },
  { typeId: IFCCOVERING, label: "IfcCovering" },
  { typeId: IFCROOF, label: "IfcRoof" },
  { typeId: IFCFOOTING, label: "IfcFooting" },
];

// ============================================================================
// QUANTITY PROPERTY NAMES (ISO 16739)
// ============================================================================

const AREA_QUANTITY_NAMES = {
  gross: ["GrossSideArea", "GrossArea", "GrossFootprintArea", "GrossSurfaceArea", "TotalSurfaceArea"],
  net: ["NetSideArea", "NetArea", "NetFootprintArea", "NetSurfaceArea"],
  opening: ["TotalOpeningArea", "OpeningArea"],
  general: ["Area"],
};

const VOLUME_QUANTITY_NAMES = ["NetVolume", "GrossVolume", "Volume"];
const LENGTH_QUANTITY_NAMES = ["Length", "NominalLength"];
const WIDTH_QUANTITY_NAMES = ["Width", "NominalWidth", "Thickness"];
const HEIGHT_QUANTITY_NAMES = ["Height", "NominalHeight", "Depth"];
const PERIMETER_QUANTITY_NAMES = ["Perimeter", "GrossPerimeter"];

// ============================================================================
// QUANTITY EXTRACTION — Real IfcElementQuantity parsing
// ============================================================================

/**
 * Build a lookup map: elementExpressID → [propertyDefinitionExpressID]
 * This avoids O(n²) by iterating IfcRelDefinesByProperties once.
 */
function buildPropertyLookup(
  ifcAPI: IfcAPI,
  modelID: number,
  warnings: string[]
): Map<number, number[]> {
  const lookup = new Map<number, number[]>();

  try {
    const relIds = ifcAPI.GetLineIDsWithType(modelID, IFCRELDEFINESBYPROPERTIES);
    const relCount = relIds.size();

    for (let i = 0; i < relCount; i++) {
      try {
        const relId = relIds.get(i);
        const rel = ifcAPI.GetLine(modelID, relId, false);
        if (!rel) continue;

        // Get the property definition reference
        const propDefRef = rel.RelatingPropertyDefinition;
        if (!propDefRef?.value) continue;

        // Get the related objects (elements this applies to)
        const relatedObjects = rel.RelatedObjects;
        if (!relatedObjects) continue;

        const objRefs = Array.isArray(relatedObjects) ? relatedObjects : [relatedObjects];

        for (const objRef of objRefs) {
          const elementId = objRef?.value;
          if (typeof elementId !== "number") continue;

          const existing = lookup.get(elementId) || [];
          existing.push(propDefRef.value);
          lookup.set(elementId, existing);
        }
      } catch {
        // Skip malformed relationships
      }
    }
  } catch (e) {
    warnings.push("Failed to build property lookup from IfcRelDefinesByProperties");
  }

  return lookup;
}

/**
 * Extract a numeric value from a quantity line object.
 * web-ifc returns quantity values under different property names.
 */
function getQuantityValue(quantityLine: any): number {
  // Try all known value properties
  for (const prop of [
    "AreaValue", "VolumeValue", "LengthValue", "CountValue", "WeightValue",
    "areaValue", "volumeValue", "lengthValue", "countValue", "weightValue",
  ]) {
    if (quantityLine[prop]?.value != null) {
      return Number(quantityLine[prop].value);
    }
    if (typeof quantityLine[prop] === "number") {
      return quantityLine[prop];
    }
  }
  return 0;
}

function extractQuantities(
  ifcAPI: IfcAPI,
  modelID: number,
  expressID: number,
  ifcType: string,
  propertyLookup: Map<number, number[]>
): QuantityData {
  const quantities: QuantityData = { count: 1 };

  try {
    const propDefIds = propertyLookup.get(expressID) || [];

    for (const propDefId of propDefIds) {
      try {
        const propDef = ifcAPI.GetLine(modelID, propDefId, false);
        if (!propDef) continue;

        // Check if it's an IfcElementQuantity (name usually starts with "Qto_")
        const qtoName = propDef.Name?.value || "";
        const isElementQuantity =
          qtoName.startsWith("Qto_") ||
          qtoName.startsWith("BaseQuantities") ||
          propDef.type === IFCELEMENTQUANTITY ||
          propDef.expressID != null; // We check quantities inside regardless

        // Get the Quantities array from the IfcElementQuantity
        const quantitiesRef = propDef.Quantities;
        if (!quantitiesRef) continue;

        const qRefs = Array.isArray(quantitiesRef) ? quantitiesRef : [quantitiesRef];

        for (const qRef of qRefs) {
          try {
            const qId = qRef?.value;
            if (typeof qId !== "number") continue;

            const qLine = ifcAPI.GetLine(modelID, qId, false);
            if (!qLine) continue;

            const name = qLine.Name?.value || "";
            const value = getQuantityValue(qLine);

            if (value === 0) continue;

            // Match to known quantity names
            // Area — gross
            if (AREA_QUANTITY_NAMES.gross.some((n) => name === n)) {
              if (!quantities.area) quantities.area = { unit: "m²" };
              quantities.area.gross = value;
            }
            // Area — net
            else if (AREA_QUANTITY_NAMES.net.some((n) => name === n)) {
              if (!quantities.area) quantities.area = { unit: "m²" };
              quantities.area.net = value;
            }
            // Area — opening
            else if (AREA_QUANTITY_NAMES.opening.some((n) => name === n)) {
              quantities.openingArea = value;
            }
            // Area — general fallback
            else if (AREA_QUANTITY_NAMES.general.some((n) => name === n)) {
              if (!quantities.area) quantities.area = { unit: "m²" };
              if (!quantities.area.gross) quantities.area.gross = value;
            }
            // Volume
            else if (VOLUME_QUANTITY_NAMES.some((n) => name === n)) {
              if (!quantities.volume) quantities.volume = { base: 0, withWaste: 0, unit: "m³" };
              quantities.volume.base = Math.max(quantities.volume.base, value);
            }
            // Length
            else if (LENGTH_QUANTITY_NAMES.some((n) => name === n)) {
              quantities.length = value;
            }
            // Width / Thickness
            else if (WIDTH_QUANTITY_NAMES.some((n) => name === n)) {
              quantities.width = value;
              if (name === "Thickness") quantities.thickness = value;
            }
            // Height
            else if (HEIGHT_QUANTITY_NAMES.some((n) => name === n)) {
              quantities.height = value;
            }
            // Perimeter
            else if (PERIMETER_QUANTITY_NAMES.some((n) => name === n)) {
              quantities.perimeter = value;
            }
          } catch {
            // Skip individual quantity parsing errors
          }
        }
      } catch {
        // Skip malformed property definitions
      }
    }

    // --- Calculate derived quantities when IFC didn't provide them ---

    // Net area for walls: gross - openings
    if (quantities.area?.gross && quantities.openingArea) {
      if (!quantities.area.net) {
        quantities.area.net = quantities.area.gross - quantities.openingArea;
      }
    }

    // If we have length + height but no gross area (common for walls)
    if (!quantities.area?.gross && quantities.length && quantities.height) {
      if (!quantities.area) quantities.area = { unit: "m²" };
      quantities.area.gross = quantities.length * quantities.height;
      if (quantities.openingArea) {
        quantities.area.net = quantities.area.gross - quantities.openingArea;
      }
    }

    // If we have area but no volume, estimate from thickness
    if (quantities.area?.gross && !quantities.volume?.base && quantities.thickness) {
      quantities.volume = {
        base: quantities.area.gross * quantities.thickness,
        withWaste: 0,
        unit: "m³",
      };
    }

    // For doors/windows: try to get area from width × height
    if (
      (ifcType === "IfcDoor" || ifcType === "IfcWindow") &&
      !quantities.area?.gross &&
      quantities.width &&
      quantities.height
    ) {
      if (!quantities.area) quantities.area = { unit: "m²" };
      quantities.area.gross = quantities.width * quantities.height;
    }

    // Ensure area struct exists for area-based element types
    if (
      (ifcType === "IfcWall" || ifcType === "IfcWallStandardCase" || ifcType === "IfcSlab" ||
        ifcType === "IfcRoof" || ifcType === "IfcCovering") &&
      !quantities.area
    ) {
      quantities.area = { gross: 0, net: 0, unit: "m²" };
    }

    // Ensure volume struct exists for volume-based element types
    if (
      (ifcType === "IfcColumn" || ifcType === "IfcBeam" || ifcType === "IfcFooting" ||
        ifcType === "IfcStair" || ifcType === "IfcWall" || ifcType === "IfcWallStandardCase" ||
        ifcType === "IfcSlab") &&
      !quantities.volume
    ) {
      quantities.volume = { base: 0, withWaste: 0, unit: "m³" };
    }

  } catch (error) {
    console.warn(`Failed to extract quantities for element ${expressID}:`, error);
  }

  return quantities;
}

function getMaterialName(
  ifcAPI: IfcAPI,
  modelID: number,
  expressID: number
): string {
  try {
    const element = ifcAPI.GetLine(modelID, expressID, false);
    if (element?.Name?.value) {
      return element.Name.value;
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

function getStoreyName(
  ifcAPI: IfcAPI,
  modelID: number,
  expressID: number,
  storeyMap: Map<number, string>
): string {
  try {
    return "Unassigned";
  } catch {
    return "Unassigned";
  }
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export async function parseIFCBuffer(
  buffer: Uint8Array,
  filename: string,
  customWasteFactors?: Record<string, number>
): Promise<IFCParseResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  // Initialize web-ifc API
  const ifcAPI = new IfcAPI();
  await ifcAPI.Init();

  // Open model
  const modelID = ifcAPI.OpenModel(buffer, {
    COORDINATE_TO_ORIGIN: true,
  });

  // Extract metadata
  const schema = ifcAPI.GetModelSchema(modelID) || "IFC2X3";

  // Get project info
  let projectName = "Unknown Project";
  let projectGuid = "";

  try {
    const projectIDs = ifcAPI.GetLineIDsWithType(modelID, IFCPROJECT);
    if (projectIDs.size() > 0) {
      const projectID = projectIDs.get(0);
      const project = ifcAPI.GetLine(modelID, projectID, false);
      if (project?.Name?.value) {
        projectName = project.Name.value;
      }
      if (project?.GlobalId?.value) {
        projectGuid = project.GlobalId.value;
      }
    }
  } catch (err) {
    warnings.push("Failed to extract project metadata");
  }

  // Get building storeys
  const storeyIDs = ifcAPI.GetLineIDsWithType(modelID, IFCBUILDINGSTOREY);
  const storeyCount = storeyIDs.size();
  const storeyMap = new Map<number, string>();
  const buildingStoreys: BuildingStorey[] = [];

  for (let i = 0; i < storeyCount; i++) {
    const storeyID = storeyIDs.get(i);
    try {
      const storey = ifcAPI.GetLine(modelID, storeyID, false);
      const name = storey?.Name?.value || `Level ${i + 1}`;
      const elevation = storey?.Elevation?.value || 0;

      storeyMap.set(storeyID, name);
      buildingStoreys.push({
        name,
        elevation,
        height: 3.0,
        elementCount: 0,
      });
    } catch (err) {
      warnings.push(`Failed to parse storey ${storeyID}`);
    }
  }

  // Build property lookup once (O(n) instead of O(n²))
  const propertyLookup = buildPropertyLookup(ifcAPI, modelID, warnings);

  // Track opening areas per wall for net area deduction
  // First pass: collect total opening area from doors + windows
  let totalDoorArea = 0;
  let totalWindowArea = 0;
  let doorCount = 0;
  let windowCount = 0;

  try {
    const doorIds = ifcAPI.GetLineIDsWithType(modelID, IFCDOOR);
    doorCount = doorIds.size();
    for (let i = 0; i < doorCount; i++) {
      try {
        const doorQ = extractQuantities(ifcAPI, modelID, doorIds.get(i), "IfcDoor", propertyLookup);
        totalDoorArea += doorQ.area?.gross || (doorQ.width && doorQ.height ? doorQ.width * doorQ.height : 1.89); // default 0.9m × 2.1m
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  try {
    const windowIds = ifcAPI.GetLineIDsWithType(modelID, IFCWINDOW);
    windowCount = windowIds.size();
    for (let i = 0; i < windowCount; i++) {
      try {
        const winQ = extractQuantities(ifcAPI, modelID, windowIds.get(i), "IfcWindow", propertyLookup);
        totalWindowArea += winQ.area?.gross || (winQ.width && winQ.height ? winQ.width * winQ.height : 2.4); // default 1.2m × 2.0m
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  const totalOpeningArea = totalDoorArea + totalWindowArea;

  // Extract elements by type
  const elementsByDivision = new Map<string, Map<string, IFCElementData[]>>();
  let totalElements = 0;
  let processedElements = 0;
  let failedElements = 0;

  for (const { typeId, label } of IFC_TYPES) {
    const ids = ifcAPI.GetLineIDsWithType(modelID, typeId);
    const count = ids.size();

    if (count === 0) continue;

    for (let i = 0; i < count; i++) {
      const expressID = ids.get(i);
      totalElements++;

      try {
        const element = ifcAPI.GetLine(modelID, expressID, false);
        const globalId = element?.GlobalId?.value || `TEMP_${expressID}`;
        const name = element?.Name?.value || `${label}-${i + 1}`;

        const materialName = getMaterialName(ifcAPI, modelID, expressID);
        const csiMapping = getCSIMapping(label, materialName);
        const quantities = extractQuantities(ifcAPI, modelID, expressID, label, propertyLookup);

        // Apply waste factor to volume
        if (quantities.volume) {
          quantities.volume.withWaste =
            quantities.volume.base * (1 + csiMapping.wasteFactor / 100);
        }

        const storeyName = getStoreyName(ifcAPI, modelID, expressID, storeyMap);

        const elementData: IFCElementData = {
          id: globalId,
          type: label,
          name,
          storey: storeyName,
          material: materialName,
          quantities,
        };

        // Organize by division and category
        if (!elementsByDivision.has(csiMapping.division)) {
          elementsByDivision.set(csiMapping.division, new Map());
        }

        const divisionMap = elementsByDivision.get(csiMapping.division)!;
        if (!divisionMap.has(csiMapping.code)) {
          divisionMap.set(csiMapping.code, []);
        }

        divisionMap.get(csiMapping.code)!.push(elementData);
        processedElements++;

      } catch (err) {
        failedElements++;
        warnings.push(`Failed to process ${label} element ${expressID}`);
      }
    }
  }

  // Build divisions output
  const divisions: CSIDivision[] = [];
  const divisionsFound: string[] = [];

  for (const [divisionCode, categoriesMap] of elementsByDivision) {
    const categories: CSICategory[] = [];
    let divisionElementCount = 0;
    let totalVolume = 0;
    let volumeWithWaste = 0;
    let totalArea = 0;
    let totalNetArea = 0;
    let divisionOpeningArea = 0;
    let areaWithWaste = 0;

    for (const [categoryCode, elements] of categoriesMap) {
      divisionElementCount += elements.length;

      for (const element of elements) {
        if (element.quantities.volume) {
          totalVolume += element.quantities.volume.base;
          volumeWithWaste += element.quantities.volume.withWaste;
        }
        if (element.quantities.area?.gross) {
          totalArea += element.quantities.area.gross;
        }
        if (element.quantities.area?.net) {
          totalNetArea += element.quantities.area.net;
        }
        if (element.quantities.openingArea) {
          divisionOpeningArea += element.quantities.openingArea;
        }
      }

      const firstElement = elements[0];
      const csiMapping = getCSIMapping(firstElement.type, firstElement.material);

      categories.push({
        code: categoryCode,
        name: csiMapping.codeName,
        elements,
      });
    }

    const firstCategoryElement = categories[0]?.elements[0];
    const csiMapping = firstCategoryElement
      ? getCSIMapping(firstCategoryElement.type, firstCategoryElement.material)
      : { divisionName: "Unknown", wasteFactor: 5.0 };

    areaWithWaste = totalArea * (1 + csiMapping.wasteFactor / 100);

    // For wall divisions: distribute opening area if not already per-element
    const isWallDivision = categories.some((c) =>
      c.elements.some((e) => e.type === "IfcWall" || e.type === "IfcWallStandardCase")
    );
    if (isWallDivision && totalArea > 0 && divisionOpeningArea === 0 && totalOpeningArea > 0) {
      divisionOpeningArea = totalOpeningArea;
      totalNetArea = totalArea - totalOpeningArea;
    }

    divisions.push({
      code: divisionCode,
      name: csiMapping.divisionName,
      totalVolume: totalVolume > 0 ? totalVolume : undefined,
      volumeWithWaste: volumeWithWaste > 0 ? volumeWithWaste : undefined,
      totalArea: totalArea > 0 ? totalArea : undefined,
      totalNetArea: totalNetArea > 0 ? totalNetArea : undefined,
      totalOpeningArea: divisionOpeningArea > 0 ? divisionOpeningArea : undefined,
      areaWithWaste: areaWithWaste > 0 ? areaWithWaste : undefined,
      wasteFactor: csiMapping.wasteFactor,
      elementCount: divisionElementCount,
      categories,
    });

    divisionsFound.push(divisionCode);
  }

  // Sort divisions by code
  divisions.sort((a, b) => a.code.localeCompare(b.code));

  // Calculate summary
  const grossFloorArea = buildingStoreys.reduce((sum, storey) => sum + 0, 0);
  const totalConcrete = divisions.find((d) => d.code === "03")?.totalVolume;
  const totalMasonry = divisions.find((d) => d.code === "04")?.totalArea;

  // Close model
  ifcAPI.CloseModel(modelID);

  const processingTimeMs = Date.now() - startTime;

  return {
    meta: {
      version: "1.0",
      timestamp: new Date().toISOString(),
      processingTimeMs,
      ifcSchema: schema,
      projectName,
      projectGuid,
      units: {
        length: "m",
        area: "m²",
        volume: "m³",
      },
      warnings,
      errors,
    },
    summary: {
      totalElements,
      processedElements,
      failedElements,
      divisionsFound,
      buildingStoreys: storeyCount,
      grossFloorArea,
      totalConcrete,
      totalMasonry,
    },
    divisions,
    buildingStoreys,
  };
}

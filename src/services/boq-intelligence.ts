/**
 * BOQ Intelligence — Quantity validation + Provisional sums
 *
 * Capability 2: Quantity sanity checker (validates IFC-extracted quantities)
 * Capability 3: MEP provisional sum (estimated from building type + GFA)
 * Capability 4: Foundation provisional sum (estimated from floors + footprint)
 * Capability 5: External works provisional sum (estimated from GFA)
 */

// ─── Quantity Sanity Checker ────────────────────────────────────────────────

export interface QuantityWarning {
  element: string;
  metric: string;
  value: number;
  expectedRange: string;
  severity: "info" | "warning" | "critical";
  suggestion: string;
}

export function checkQuantitySanity(
  elements: Array<{ description: string; grossArea?: number; totalVolume?: number; elementCount?: number; storey?: string }>,
  totalGFA: number,
  floorCount: number
): QuantityWarning[] {
  const warnings: QuantityWarning[] = [];
  if (totalGFA <= 0 || floorCount <= 0) return warnings;

  const avgFloorPlate = totalGFA / floorCount;

  // Wall-to-floor ratio check
  const totalWallArea = elements
    .filter(e => e.description.toLowerCase().includes("wall"))
    .reduce((s, e) => s + (e.grossArea ?? 0), 0);
  const wallToFloorRatio = totalWallArea / totalGFA;
  if (wallToFloorRatio < 0.3) {
    warnings.push({
      element: "Walls", metric: "Wall-to-floor ratio",
      value: Math.round(wallToFloorRatio * 100) / 100,
      expectedRange: "0.3 – 1.2",
      severity: "warning",
      suggestion: "Low wall area may indicate missing internal partitions. Check if the IFC model includes all wall types.",
    });
  } else if (wallToFloorRatio > 1.5) {
    warnings.push({
      element: "Walls", metric: "Wall-to-floor ratio",
      value: Math.round(wallToFloorRatio * 100) / 100,
      expectedRange: "0.3 – 1.2",
      severity: "info",
      suggestion: "High wall area — may include multiple layers (inner + outer leaf) or curved walls.",
    });
  }

  // Slab area per floor check
  const totalSlabArea = elements
    .filter(e => e.description.toLowerCase().includes("slab"))
    .reduce((s, e) => s + (e.grossArea ?? 0), 0);
  const slabPerFloor = totalSlabArea / floorCount;
  if (totalSlabArea > 0 && slabPerFloor < avgFloorPlate * 0.5) {
    warnings.push({
      element: "Slabs", metric: "Slab area per floor vs expected floor plate",
      value: Math.round(slabPerFloor),
      expectedRange: `${Math.round(avgFloorPlate * 0.7)} – ${Math.round(avgFloorPlate * 1.3)} m²`,
      severity: "warning",
      suggestion: "Slab area seems low — some floor slabs may use geometry the parser couldn't extract. Manual verification recommended.",
    });
  }

  // Door density check
  const totalDoors = elements
    .filter(e => e.description.toLowerCase().includes("door"))
    .reduce((s, e) => s + (e.elementCount ?? 1), 0);
  const doorDensity = totalGFA / Math.max(totalDoors, 1);
  if (totalDoors > 0 && doorDensity < 10) {
    warnings.push({
      element: "Doors", metric: "Floor area per door",
      value: Math.round(doorDensity),
      expectedRange: "15 – 50 m² per door",
      severity: "info",
      suggestion: "High door count — likely includes internal partition doors, closet doors, etc.",
    });
  }

  // Column count check
  const totalColumns = elements
    .filter(e => e.description.toLowerCase().includes("column"))
    .reduce((s, e) => s + (e.elementCount ?? 1), 0);
  if (totalColumns === 0 && floorCount > 1) {
    warnings.push({
      element: "Columns", metric: "Column count",
      value: 0,
      expectedRange: `${Math.max(4, Math.round(avgFloorPlate / 25))} – ${Math.round(avgFloorPlate / 12)} columns`,
      severity: "critical",
      suggestion: "No columns detected. Structural columns may be modelled as IfcBuildingElementProxy or missing from the IFC export.",
    });
  }

  return warnings;
}

// ─── MEP Provisional Sum ────────────────────────────────────────────────────

export interface ProvisionalSum {
  category: string;
  description: string;
  amount: number;
  unit: string;
  rate: number;
  quantity: number;
  basis: string;
  is1200Code?: string;
  confidence: "estimated" | "benchmark" | "provisional";
}

export function estimateMEPCosts(
  totalGFA: number,
  buildingType: string,
  floorCount: number,
  cityTier: string,
  isINR: boolean,
): ProvisionalSum[] {
  if (totalGFA <= 0) return [];

  // MEP cost benchmarks per m² GFA (INR, 2024 rates)
  // Source: RICS India Cost Guide, CBRE India Construction Monitor
  const typeMultiplier: Record<string, number> = {
    residential: 0.75, commercial: 1.0, "mixed-use": 1.05,
    educational: 0.90, healthcare: 1.8, hospital: 2.0,
    hospitality: 1.3, industrial: 0.6, warehouse: 0.4,
    datacenter: 2.5, laboratory: 2.0, default: 1.0,
  };
  const typeMult = typeMultiplier[buildingType.toLowerCase()] ?? typeMultiplier.default;
  const tierMult = cityTier === "metro" ? 1.15 : cityTier === "tier-2" ? 0.95 : 0.80;

  // Base MEP rates per m² (INR)
  const plumbingRate = Math.round(1200 * typeMult * tierMult);
  const electricalRate = Math.round(2000 * typeMult * tierMult);
  const hvacRate = Math.round(1800 * typeMult * tierMult);
  const fireRate = Math.round(500 * typeMult * tierMult);
  const bmsRate = buildingType === "commercial" || buildingType === "datacenter" ? Math.round(300 * tierMult) : 0;

  // Lift estimation
  const liftsNeeded = floorCount <= 2 ? 0 : floorCount <= 5 ? 1 : floorCount <= 10 ? 2 : Math.ceil(floorCount / 5);
  const liftCostPerUnit = Math.round(2500000 * tierMult); // ₹25 lakh per passenger lift

  const fx = isINR ? 1 : 1 / 83.5; // Convert to USD if not INR

  const sums: ProvisionalSum[] = [
    {
      category: "PROVISIONAL — MEP", description: "Plumbing & drainage (supply, waste, storm water)",
      amount: Math.round(totalGFA * plumbingRate * fx), unit: "m²", rate: Math.round(plumbingRate * fx),
      quantity: Math.round(totalGFA), basis: `₹${plumbingRate}/m² GFA × ${typeMult.toFixed(2)} type factor`,
      is1200Code: "IS1200-P14", confidence: "benchmark",
    },
    {
      category: "PROVISIONAL — MEP", description: "Electrical (LT panels, wiring, lighting, earthing)",
      amount: Math.round(totalGFA * electricalRate * fx), unit: "m²", rate: Math.round(electricalRate * fx),
      quantity: Math.round(totalGFA), basis: `₹${electricalRate}/m² GFA × ${typeMult.toFixed(2)} type factor`,
      is1200Code: "IS1200-P16", confidence: "benchmark",
    },
    {
      category: "PROVISIONAL — MEP", description: "HVAC / ventilation system",
      amount: Math.round(totalGFA * hvacRate * fx), unit: "m²", rate: Math.round(hvacRate * fx),
      quantity: Math.round(totalGFA), basis: `₹${hvacRate}/m² GFA × ${typeMult.toFixed(2)} type factor`,
      confidence: "benchmark",
    },
    {
      category: "PROVISIONAL — MEP", description: "Fire fighting system (sprinklers, hydrants, detection)",
      amount: Math.round(totalGFA * fireRate * fx), unit: "m²", rate: Math.round(fireRate * fx),
      quantity: Math.round(totalGFA), basis: `₹${fireRate}/m² GFA`,
      confidence: "benchmark",
    },
  ];

  if (liftsNeeded > 0) {
    sums.push({
      category: "PROVISIONAL — MEP", description: `Passenger lifts (${liftsNeeded} nos, ${floorCount} floors)`,
      amount: Math.round(liftsNeeded * liftCostPerUnit * fx), unit: "EA", rate: Math.round(liftCostPerUnit * fx),
      quantity: liftsNeeded, basis: `${liftsNeeded} lifts × ₹${(liftCostPerUnit / 100000).toFixed(1)} lakh each`,
      confidence: "estimated",
    });
  }

  if (bmsRate > 0) {
    sums.push({
      category: "PROVISIONAL — MEP", description: "Building management system (BMS/automation)",
      amount: Math.round(totalGFA * bmsRate * fx), unit: "m²", rate: Math.round(bmsRate * fx),
      quantity: Math.round(totalGFA), basis: `₹${bmsRate}/m² GFA (commercial/datacenter)`,
      confidence: "estimated",
    });
  }

  return sums;
}

// ─── Foundation Provisional Sum ─────────────────────────────────────────────

export function estimateFoundationCosts(
  totalGFA: number,
  floorCount: number,
  buildingType: string,
  cityTier: string,
  isINR: boolean,
): ProvisionalSum[] {
  if (totalGFA <= 0) return [];

  const footprint = totalGFA / Math.max(floorCount, 1);
  const tierMult = cityTier === "metro" ? 1.15 : cityTier === "tier-2" ? 0.95 : 0.80;

  // Foundation type inference
  let foundationType: string;
  let ratePerSqm: number; // INR per m² of footprint

  if (floorCount <= 3) {
    foundationType = "Isolated footings + grade beams";
    ratePerSqm = Math.round(3500 * tierMult);
  } else if (floorCount <= 8) {
    foundationType = "Raft foundation / combined footings";
    ratePerSqm = Math.round(5500 * tierMult);
  } else {
    foundationType = "Pile foundation (RCC bored cast-in-situ)";
    ratePerSqm = Math.round(8500 * tierMult);
  }

  const fx = isINR ? 1 : 1 / 83.5;

  return [
    {
      category: "PROVISIONAL — SUBSTRUCTURE",
      description: `${foundationType} (estimated for ${floorCount}-storey ${buildingType})`,
      amount: Math.round(footprint * ratePerSqm * fx),
      unit: "m²", rate: Math.round(ratePerSqm * fx),
      quantity: Math.round(footprint),
      basis: `₹${ratePerSqm}/m² footprint. ${floorCount} floors → ${foundationType.split(" (")[0]}`,
      is1200Code: "IS1200-P2",
      confidence: "estimated",
    },
    {
      category: "PROVISIONAL — SUBSTRUCTURE",
      description: "Excavation & backfill (estimated from footprint)",
      amount: Math.round(footprint * 1.5 * 800 * fx), // 1.5m depth avg, ₹800/m³
      unit: "m³", rate: Math.round(800 * fx),
      quantity: Math.round(footprint * 1.5),
      basis: `Footprint ${Math.round(footprint)}m² × 1.5m avg depth × ₹800/m³`,
      is1200Code: "IS1200-P1",
      confidence: "estimated",
    },
  ];
}

// ─── External Works Provisional Sum ─────────────────────────────────────────

export function estimateExternalWorksCosts(
  totalGFA: number,
  floorCount: number,
  cityTier: string,
  isINR: boolean,
): ProvisionalSum[] {
  if (totalGFA <= 0) return [];

  const footprint = totalGFA / Math.max(floorCount, 1);
  // Assume plot area ≈ 2× footprint (FAR ~0.5 for low-rise, higher for high-rise)
  const plotArea = footprint * (floorCount <= 4 ? 2.5 : floorCount <= 10 ? 2.0 : 1.5);
  const openArea = plotArea - footprint;
  const perimeter = Math.sqrt(plotArea) * 4; // rough square plot
  const tierMult = cityTier === "metro" ? 1.15 : cityTier === "tier-2" ? 0.95 : 0.80;
  const fx = isINR ? 1 : 1 / 83.5;

  return [
    {
      category: "PROVISIONAL — EXTERNAL WORKS",
      description: "Compound wall with gates (estimated perimeter)",
      amount: Math.round(perimeter * 4500 * tierMult * fx), // ₹4,500/Rmt
      unit: "Rmt", rate: Math.round(4500 * tierMult * fx), quantity: Math.round(perimeter),
      basis: `Est. perimeter ${Math.round(perimeter)}m × ₹4,500/Rmt`,
      confidence: "estimated",
    },
    {
      category: "PROVISIONAL — EXTERNAL WORKS",
      description: "Internal roads, parking & paving",
      amount: Math.round(openArea * 0.4 * 2200 * tierMult * fx), // 40% of open area paved
      unit: "m²", rate: Math.round(2200 * tierMult * fx), quantity: Math.round(openArea * 0.4),
      basis: `40% of open area (${Math.round(openArea * 0.4)}m²) × ₹2,200/m²`,
      confidence: "estimated",
    },
    {
      category: "PROVISIONAL — EXTERNAL WORKS",
      description: "External drainage, STP & water tank",
      amount: Math.round(totalGFA * 250 * tierMult * fx),
      unit: "LS", rate: Math.round(totalGFA * 250 * tierMult * fx), quantity: 1,
      basis: `Lump sum: ₹250/m² GFA × ${Math.round(totalGFA)}m²`,
      confidence: "estimated",
    },
    {
      category: "PROVISIONAL — EXTERNAL WORKS",
      description: "Landscaping & softscape",
      amount: Math.round(openArea * 0.3 * 800 * tierMult * fx), // 30% of open area landscaped
      unit: "m²", rate: Math.round(800 * tierMult * fx), quantity: Math.round(openArea * 0.3),
      basis: `30% of open area (${Math.round(openArea * 0.3)}m²) × ₹800/m²`,
      confidence: "estimated",
    },
  ];
}

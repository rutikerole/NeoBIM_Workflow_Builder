/**
 * Cost Database - Realistic Construction Unit Rates
 * 
 * Base rates in USD (United States baseline)
 * Regional multipliers applied separately
 * 
 * Sources:
 * - RSMeans 2024/2025
 * - Industry averages (US, Europe, Asia)
 * - Construction Engineer validation
 */

export interface UnitRate {
  item: string;
  unit: string;
  baseRate: number; // USD
  category: "hard" | "soft";
  subcategory: string;
  notes?: string;
}

export interface RegionalFactor {
  region: string;
  multiplier: number;
  currency: string;
  notes: string;
}

// =============================================================================
// HARD COSTS - Direct Construction Costs
// =============================================================================

export const CONCRETE_RATES: UnitRate[] = [
  {
    item: "Concrete Foundation",
    unit: "CY",
    baseRate: 180,
    category: "hard",
    subcategory: "Concrete",
    notes: "Including formwork, rebar, pour, finish",
  },
  {
    item: "Concrete Slab on Grade",
    unit: "CY",
    baseRate: 150,
    category: "hard",
    subcategory: "Concrete",
    notes: "4-6 inch slab with mesh",
  },
  {
    item: "Concrete Column",
    unit: "CY",
    baseRate: 250,
    category: "hard",
    subcategory: "Concrete",
    notes: "Heavy formwork + rebar",
  },
  {
    item: "Concrete Beam",
    unit: "CY",
    baseRate: 220,
    category: "hard",
    subcategory: "Concrete",
    notes: "Elevated formwork",
  },
  {
    item: "Concrete Elevated Slab",
    unit: "CY",
    baseRate: 200,
    category: "hard",
    subcategory: "Concrete",
    notes: "Decking + pour + finish",
  },
  {
    item: "Concrete Wall",
    unit: "CY",
    baseRate: 190,
    category: "hard",
    subcategory: "Concrete",
    notes: "Vertical formwork + pour",
  },
  {
    item: "Concrete Stair",
    unit: "CY",
    baseRate: 300,
    category: "hard",
    subcategory: "Concrete",
    notes: "Complex formwork",
  },
];

export const STEEL_RATES: UnitRate[] = [
  {
    item: "Structural Steel (Beams & Columns)",
    unit: "ton",
    baseRate: 3500,
    category: "hard",
    subcategory: "Steel",
    notes: "Wide flange sections, painted",
  },
  {
    item: "Steel Joist",
    unit: "ton",
    baseRate: 3200,
    category: "hard",
    subcategory: "Steel",
    notes: "Open web joists",
  },
  {
    item: "Steel Deck",
    unit: "SF",
    baseRate: 4.5,
    category: "hard",
    subcategory: "Steel",
    notes: "Composite metal deck",
  },
  {
    item: "Rebar",
    unit: "ton",
    baseRate: 2800,
    category: "hard",
    subcategory: "Steel",
    notes: "Grade 60, placed & tied",
  },
  {
    item: "Steel Stud Framing",
    unit: "SF",
    baseRate: 3.2,
    category: "hard",
    subcategory: "Steel",
    notes: "Light gauge interior partition",
  },
];

export const MASONRY_RATES: UnitRate[] = [
  {
    item: "CMU Block Wall (8 inch)",
    unit: "SF",
    baseRate: 12,
    category: "hard",
    subcategory: "Masonry",
    notes: "Concrete masonry unit",
  },
  {
    item: "Brick Veneer",
    unit: "SF",
    baseRate: 18,
    category: "hard",
    subcategory: "Masonry",
    notes: "Standard modular brick",
  },
  {
    item: "Stone Veneer",
    unit: "SF",
    baseRate: 35,
    category: "hard",
    subcategory: "Masonry",
    notes: "Natural stone cladding",
  },
  {
    item: "Glass Block",
    unit: "SF",
    baseRate: 45,
    category: "hard",
    subcategory: "Masonry",
    notes: "8x8 inch blocks",
  },
];

export const FINISHES_RATES: UnitRate[] = [
  {
    item: "Gypsum Board (Drywall)",
    unit: "SF",
    baseRate: 2.8,
    category: "hard",
    subcategory: "Finishes",
    notes: "1/2 inch, taped & finished",
  },
  {
    item: "Ceramic Tile Flooring",
    unit: "SF",
    baseRate: 15,
    category: "hard",
    subcategory: "Finishes",
    notes: "12x12 inch, installed",
  },
  {
    item: "Vinyl Tile Flooring (VCT)",
    unit: "SF",
    baseRate: 6,
    category: "hard",
    subcategory: "Finishes",
    notes: "Commercial grade",
  },
  {
    item: "Hardwood Flooring",
    unit: "SF",
    baseRate: 22,
    category: "hard",
    subcategory: "Finishes",
    notes: "Oak strip, installed & finished",
  },
  {
    item: "Carpet (Commercial)",
    unit: "SF",
    baseRate: 8,
    category: "hard",
    subcategory: "Finishes",
    notes: "Broadloom with padding",
  },
  {
    item: "Acoustic Ceiling Tile",
    unit: "SF",
    baseRate: 5.5,
    category: "hard",
    subcategory: "Finishes",
    notes: "2x2 grid system",
  },
  {
    item: "Paint (Interior Walls)",
    unit: "SF",
    baseRate: 1.5,
    category: "hard",
    subcategory: "Finishes",
    notes: "Two coats, labor included",
  },
];

export const OPENINGS_RATES: UnitRate[] = [
  {
    item: "Hollow Metal Door & Frame",
    unit: "EA",
    baseRate: 850,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "3x7 standard door with hardware",
  },
  {
    item: "Wood Door",
    unit: "EA",
    baseRate: 650,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "Solid core with hardware",
  },
  {
    item: "Aluminum Storefront Door",
    unit: "EA",
    baseRate: 2200,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "3x7 with closer & panic hardware",
  },
  {
    item: "Double-Glazed Window (Standard)",
    unit: "SF",
    baseRate: 65,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "Aluminum frame, installed",
  },
  {
    item: "Curtain Wall System",
    unit: "SF",
    baseRate: 120,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "Unitized system with glass",
  },
  {
    item: "Skylight",
    unit: "SF",
    baseRate: 95,
    category: "hard",
    subcategory: "Doors & Windows",
    notes: "Fixed aluminum frame with glazing",
  },
];

export const ROOFING_RATES: UnitRate[] = [
  {
    item: "Built-Up Roofing (BUR)",
    unit: "SF",
    baseRate: 8.5,
    category: "hard",
    subcategory: "Roofing",
    notes: "Multi-ply with gravel",
  },
  {
    item: "Single-Ply Membrane (TPO/EPDM)",
    unit: "SF",
    baseRate: 7,
    category: "hard",
    subcategory: "Roofing",
    notes: "Fully adhered",
  },
  {
    item: "Metal Roofing",
    unit: "SF",
    baseRate: 12,
    category: "hard",
    subcategory: "Roofing",
    notes: "Standing seam",
  },
  {
    item: "Asphalt Shingle Roofing",
    unit: "SF",
    baseRate: 5.5,
    category: "hard",
    subcategory: "Roofing",
    notes: "Architectural shingle",
  },
];

export const MEP_RATES: UnitRate[] = [
  {
    item: "HVAC System (Commercial)",
    unit: "SF",
    baseRate: 18,
    category: "hard",
    subcategory: "MEP",
    notes: "VAV system with ductwork",
  },
  {
    item: "Plumbing Rough-In",
    unit: "SF",
    baseRate: 8,
    category: "hard",
    subcategory: "MEP",
    notes: "Per SF of building area",
  },
  {
    item: "Electrical Rough-In",
    unit: "SF",
    baseRate: 12,
    category: "hard",
    subcategory: "MEP",
    notes: "Wiring, panels, outlets",
  },
  {
    item: "Fire Sprinkler System",
    unit: "SF",
    baseRate: 6,
    category: "hard",
    subcategory: "MEP",
    notes: "Wet system",
  },
  {
    item: "Lighting (Commercial)",
    unit: "SF",
    baseRate: 7,
    category: "hard",
    subcategory: "MEP",
    notes: "LED fixtures installed",
  },
];

export const SITEWORK_RATES: UnitRate[] = [
  {
    item: "Excavation",
    unit: "CY",
    baseRate: 12,
    category: "hard",
    subcategory: "Sitework",
    notes: "Bulk earthwork",
  },
  {
    item: "Grading",
    unit: "SF",
    baseRate: 0.8,
    category: "hard",
    subcategory: "Sitework",
    notes: "Fine grading",
  },
  {
    item: "Asphalt Paving",
    unit: "SF",
    baseRate: 6,
    category: "hard",
    subcategory: "Sitework",
    notes: "2 inch overlay on base",
  },
  {
    item: "Concrete Sidewalk",
    unit: "SF",
    baseRate: 8.5,
    category: "hard",
    subcategory: "Sitework",
    notes: "4 inch thick",
  },
  {
    item: "Site Utilities",
    unit: "LF",
    baseRate: 45,
    category: "hard",
    subcategory: "Sitework",
    notes: "Underground water/sewer/storm",
  },
];

// =============================================================================
// SOFT COSTS - Indirect / Professional Costs
// =============================================================================

export const SOFT_COST_RATES: UnitRate[] = [
  {
    item: "Architectural Design Fees",
    unit: "%",
    baseRate: 8, // 8% of construction cost
    category: "soft",
    subcategory: "Professional Fees",
    notes: "Full service through construction documents",
  },
  {
    item: "Structural Engineering Fees",
    unit: "%",
    baseRate: 2,
    category: "soft",
    subcategory: "Professional Fees",
    notes: "2% of construction cost",
  },
  {
    item: "MEP Engineering Fees",
    unit: "%",
    baseRate: 3.5,
    category: "soft",
    subcategory: "Professional Fees",
    notes: "3.5% of construction cost",
  },
  {
    item: "Civil Engineering Fees",
    unit: "%",
    baseRate: 1.5,
    category: "soft",
    subcategory: "Professional Fees",
    notes: "Site design, grading, utilities",
  },
  {
    item: "Permit & Inspection Fees",
    unit: "%",
    baseRate: 2,
    category: "soft",
    subcategory: "Regulatory",
    notes: "Building permit, plan review, inspections",
  },
  {
    item: "General Contractor Overhead & Profit",
    unit: "%",
    baseRate: 18,
    category: "soft",
    subcategory: "Contractor Fees",
    notes: "GC O&P on hard costs",
  },
  {
    item: "Contingency",
    unit: "%",
    baseRate: 10,
    category: "soft",
    subcategory: "Risk",
    notes: "Design contingency (reduce during CD phase)",
  },
  {
    item: "Insurance & Bonding",
    unit: "%",
    baseRate: 2.5,
    category: "soft",
    subcategory: "Risk",
    notes: "Builder's risk, performance bond",
  },
];

// =============================================================================
// REGIONAL COST FACTORS
// =============================================================================

export const REGIONAL_FACTORS: RegionalFactor[] = [
  {
    region: "New York City, NY (USA)",
    multiplier: 1.30,
    currency: "USD",
    notes: "High labor costs, union rates, logistics",
  },
  {
    region: "San Francisco, CA (USA)",
    multiplier: 1.28,
    currency: "USD",
    notes: "High labor + materials, seismic requirements",
  },
  {
    region: "Los Angeles, CA (USA)",
    multiplier: 1.15,
    currency: "USD",
    notes: "Above-average costs, seismic",
  },
  {
    region: "Chicago, IL (USA)",
    multiplier: 1.10,
    currency: "USD",
    notes: "Union labor, winter weather impacts",
  },
  {
    region: "Houston, TX (USA)",
    multiplier: 0.95,
    currency: "USD",
    notes: "Lower labor costs, high material availability",
  },
  {
    region: "Atlanta, GA (USA)",
    multiplier: 0.92,
    currency: "USD",
    notes: "Below-average costs",
  },
  {
    region: "Phoenix, AZ (USA)",
    multiplier: 0.90,
    currency: "USD",
    notes: "Low labor costs, desert climate",
  },
  {
    region: "London, UK",
    multiplier: 1.22,
    currency: "GBP",
    notes: "High costs, converted at £1 = $1.27 USD",
  },
  {
    region: "Munich, Germany",
    multiplier: 1.18,
    currency: "EUR",
    notes: "High European costs, €1 = $1.10 USD",
  },
  {
    region: "Paris, France",
    multiplier: 1.15,
    currency: "EUR",
    notes: "Above-average EU costs",
  },
  {
    region: "Amsterdam, Netherlands",
    multiplier: 1.12,
    currency: "EUR",
    notes: "High costs, complex regulations",
  },
  {
    region: "Berlin, Germany",
    multiplier: 1.05,
    currency: "EUR",
    notes: "Average EU costs",
  },
  {
    region: "Madrid, Spain",
    multiplier: 0.95,
    currency: "EUR",
    notes: "Lower EU costs",
  },
  {
    region: "Mumbai, India",
    multiplier: 0.40,
    currency: "INR",
    notes: "Low labor costs, ₹1 = $0.012 USD",
  },
  {
    region: "Bangalore, India",
    multiplier: 0.42,
    currency: "INR",
    notes: "Slightly higher than Mumbai",
  },
  {
    region: "Delhi, India",
    multiplier: 0.45,
    currency: "INR",
    notes: "Capital city premium",
  },
  {
    region: "Dubai, UAE",
    multiplier: 0.85,
    currency: "AED",
    notes: "Low labor, high materials, AED 1 = $0.27 USD",
  },
  {
    region: "Singapore",
    multiplier: 1.08,
    currency: "SGD",
    notes: "High-cost Asian city, S$1 = $0.74 USD",
  },
  {
    region: "Tokyo, Japan",
    multiplier: 1.20,
    currency: "JPY",
    notes: "High costs, seismic, ¥1 = $0.0067 USD",
  },
  {
    region: "Sydney, Australia",
    multiplier: 1.12,
    currency: "AUD",
    notes: "High costs, A$1 = $0.65 USD",
  },
  {
    region: "Toronto, Canada",
    multiplier: 1.05,
    currency: "CAD",
    notes: "Moderate costs, C$1 = $0.72 USD",
  },
  {
    region: "Mexico City, Mexico",
    multiplier: 0.65,
    currency: "MXN",
    notes: "Lower costs, MXN 1 = $0.05 USD",
  },
  {
    region: "São Paulo, Brazil",
    multiplier: 0.70,
    currency: "BRL",
    notes: "Moderate Latin America costs, R$1 = $0.20 USD",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const ALL_HARD_COSTS = [
  ...CONCRETE_RATES,
  ...STEEL_RATES,
  ...MASONRY_RATES,
  ...FINISHES_RATES,
  ...OPENINGS_RATES,
  ...ROOFING_RATES,
  ...MEP_RATES,
  ...SITEWORK_RATES,
];

export const ALL_UNIT_RATES = [...ALL_HARD_COSTS, ...SOFT_COST_RATES];

/**
 * Find a unit rate by item name (fuzzy match)
 */
export function findUnitRate(itemName: string): UnitRate | null {
  const normalized = itemName.toLowerCase().trim();
  
  // Exact match first
  let match = ALL_UNIT_RATES.find((r) =>
    r.item.toLowerCase() === normalized
  );
  
  if (match) return match;
  
  // Partial match
  match = ALL_UNIT_RATES.find((r) =>
    r.item.toLowerCase().includes(normalized) ||
    normalized.includes(r.item.toLowerCase())
  );
  
  return match ?? null;
}

/**
 * Apply regional multiplier to base rate
 */
export function applyRegionalFactor(
  baseRate: number,
  regionName: string
): { adjustedRate: number; multiplier: number; region: string } {
  const region = REGIONAL_FACTORS.find((r) =>
    r.region.toLowerCase().includes(regionName.toLowerCase())
  );
  
  if (!region) {
    return { adjustedRate: baseRate, multiplier: 1.0, region: "USA (baseline)" };
  }
  
  return {
    adjustedRate: baseRate * region.multiplier,
    multiplier: region.multiplier,
    region: region.region,
  };
}

/**
 * Calculate total cost with hard and soft costs breakdown
 */
export function calculateTotalCost(
  hardCostSubtotal: number,
  includeOverhead: boolean = true,
  includeContingency: boolean = true
): {
  hardCosts: number;
  softCosts: number;
  totalCost: number;
  breakdown: Array<{ item: string; percentage: number; amount: number }>;
} {
  const breakdown: Array<{ item: string; percentage: number; amount: number }> = [];
  
  let softCostTotal = 0;
  
  // Add professional fees
  const archFees = hardCostSubtotal * 0.08;
  breakdown.push({ item: "Architectural Fees", percentage: 8, amount: archFees });
  softCostTotal += archFees;
  
  const structFees = hardCostSubtotal * 0.02;
  breakdown.push({ item: "Structural Engineering", percentage: 2, amount: structFees });
  softCostTotal += structFees;
  
  const mepFees = hardCostSubtotal * 0.035;
  breakdown.push({ item: "MEP Engineering", percentage: 3.5, amount: mepFees });
  softCostTotal += mepFees;
  
  const civilFees = hardCostSubtotal * 0.015;
  breakdown.push({ item: "Civil Engineering", percentage: 1.5, amount: civilFees });
  softCostTotal += civilFees;
  
  const permits = hardCostSubtotal * 0.02;
  breakdown.push({ item: "Permits & Inspections", percentage: 2, amount: permits });
  softCostTotal += permits;
  
  if (includeOverhead) {
    const overhead = hardCostSubtotal * 0.18;
    breakdown.push({ item: "GC Overhead & Profit", percentage: 18, amount: overhead });
    softCostTotal += overhead;
  }
  
  if (includeContingency) {
    const contingency = hardCostSubtotal * 0.10;
    breakdown.push({ item: "Contingency", percentage: 10, amount: contingency });
    softCostTotal += contingency;
  }
  
  const insurance = hardCostSubtotal * 0.025;
  breakdown.push({ item: "Insurance & Bonding", percentage: 2.5, amount: insurance });
  softCostTotal += insurance;
  
  return {
    hardCosts: hardCostSubtotal,
    softCosts: softCostTotal,
    totalCost: hardCostSubtotal + softCostTotal,
    breakdown,
  };
}

/**
 * Get recommended unit rate for a building element
 */
export function getRecommendedRate(
  elementType: string,
  material?: string
): UnitRate | null {
  const searchTerm = material ? `${elementType} ${material}` : elementType;
  return findUnitRate(searchTerm);
}

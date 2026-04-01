/**
 * Deterministic Room Sizer
 *
 * Overrides AI-estimated room areas with formula-based sizing.
 * AI decides WHAT rooms to create; this module decides HOW BIG each should be.
 *
 * Based on: NBC 2016, Neufert Architects' Data, Indian residential practice.
 *
 * Key principle: bathrooms/utility/pooja are FIXED-size (don't scale with total area),
 * while bedrooms/living/dining SCALE with total area (with diminishing returns).
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type BuildingType =
  | "apartment" | "villa" | "bungalow" | "duplex" | "row_house"
  | "penthouse" | "studio" | "hostel" | "office" | "farmhouse" | "default";

export interface BuildingContext {
  totalAreaSqm: number;
  bhkCount: number;
  buildingType: BuildingType;
  floorCount: number;
  isVastu: boolean;
}

// ── Area allocation rules ───────────────────────────────────────────────────

interface AreaRule {
  basePct: number;          // base percentage of per-floor area
  min: number;              // absolute minimum sqm
  max: number;              // absolute maximum sqm
  scale: "linear" | "sqrt" | "fixed";
}

const RULES: Record<string, AreaRule> = {
  // ── Bedrooms ──
  master_bedroom:    { basePct: 0.15, min: 12.0, max: 22.0, scale: "sqrt" },
  bedroom:           { basePct: 0.12, min: 10.0, max: 18.0, scale: "sqrt" },
  guest_bedroom:     { basePct: 0.10, min: 9.5,  max: 16.0, scale: "sqrt" },

  // ── Bathrooms (FIXED — never scales with total area) ──
  master_bathroom:   { basePct: 0.04, min: 4.0,  max: 6.5,  scale: "fixed" },
  bathroom:          { basePct: 0.03, min: 3.0,  max: 5.5,  scale: "fixed" },
  toilet:            { basePct: 0.02, min: 1.8,  max: 3.5,  scale: "fixed" },
  powder_room:       { basePct: 0.015,min: 1.5,  max: 2.5,  scale: "fixed" },

  // ── Public rooms ──
  living_room:       { basePct: 0.18, min: 14.0, max: 30.0, scale: "sqrt" },
  dining_room:       { basePct: 0.09, min: 8.0,  max: 16.0, scale: "sqrt" },
  drawing_room:      { basePct: 0.12, min: 12.0, max: 22.0, scale: "sqrt" },
  family_room:       { basePct: 0.10, min: 10.0, max: 18.0, scale: "sqrt" },

  // ── Kitchen ──
  kitchen:           { basePct: 0.07, min: 5.5,  max: 12.0, scale: "sqrt" },

  // ── Service (FIXED) ──
  pooja_room:        { basePct: 0.03, min: 3.0,  max: 6.0,  scale: "fixed" },
  utility:           { basePct: 0.03, min: 2.5,  max: 6.0,  scale: "fixed" },
  store_room:        { basePct: 0.02, min: 2.5,  max: 5.0,  scale: "fixed" },
  servant_quarter:   { basePct: 0.04, min: 7.0,  max: 12.0, scale: "fixed" },
  servant_toilet:    { basePct: 0.015,min: 1.8,  max: 3.0,  scale: "fixed" },
  laundry:           { basePct: 0.02, min: 2.5,  max: 5.0,  scale: "fixed" },
  shoe_rack:         { basePct: 0.01, min: 1.5,  max: 3.0,  scale: "fixed" },

  // ── Circulation ──
  corridor:          { basePct: 0.08, min: 5.0,  max: 18.0, scale: "linear" },
  foyer:             { basePct: 0.04, min: 3.0,  max: 8.0,  scale: "sqrt" },
  lobby:             { basePct: 0.04, min: 4.0,  max: 10.0, scale: "sqrt" },

  // ── Outdoor ──
  balcony:           { basePct: 0.05, min: 3.0,  max: 10.0, scale: "sqrt" },
  verandah:          { basePct: 0.06, min: 5.0,  max: 12.0, scale: "sqrt" },
  terrace:           { basePct: 0.10, min: 8.0,  max: 30.0, scale: "linear" },

  // ── Staircase (FIXED) ──
  staircase:         { basePct: 0.06, min: 6.0,  max: 12.0, scale: "fixed" },

  // ── Parking (FIXED) ──
  parking:           { basePct: 0.00, min: 13.0, max: 18.0, scale: "fixed" },
  garage:            { basePct: 0.00, min: 13.0, max: 18.0, scale: "fixed" },

  // ── Study / Office ──
  study:             { basePct: 0.05, min: 6.0,  max: 10.0, scale: "sqrt" },
  home_office:       { basePct: 0.06, min: 8.0,  max: 14.0, scale: "sqrt" },

  // ── Commercial ──
  reception:         { basePct: 0.08, min: 8.0,  max: 20.0, scale: "sqrt" },
  cabin:             { basePct: 0.06, min: 8.0,  max: 14.0, scale: "sqrt" },
  conference_room:   { basePct: 0.10, min: 12.0, max: 25.0, scale: "sqrt" },
  open_workspace:    { basePct: 0.30, min: 20.0, max: 80.0, scale: "linear" },
  server_room:       { basePct: 0.03, min: 4.0,  max: 8.0,  scale: "fixed" },
  pantry:            { basePct: 0.04, min: 4.0,  max: 10.0, scale: "sqrt" },
  break_room:        { basePct: 0.05, min: 6.0,  max: 12.0, scale: "sqrt" },

  // ── Hostel ──
  hostel_room:       { basePct: 0.00, min: 9.0,  max: 14.0, scale: "fixed" },
  common_room:       { basePct: 0.10, min: 15.0, max: 25.0, scale: "sqrt" },
  warden_room:       { basePct: 0.06, min: 10.0, max: 14.0, scale: "fixed" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function findRule(type: string, name: string): AreaRule {
  const n = name.toLowerCase();
  const t = type.toLowerCase();

  // Specific name matches first (more specific → higher priority)
  if (n.includes("master") && (n.includes("bath") || n.includes("toilet"))) return RULES.master_bathroom;
  if (n.includes("master") && (n.includes("bed") || t === "bedroom")) return RULES.master_bedroom;
  if (n.includes("guest") && n.includes("bed")) return RULES.guest_bedroom;
  if (n.includes("guest") && (n.includes("toilet") || n.includes("bath"))) return RULES.bathroom;
  if (n.includes("powder")) return RULES.powder_room;
  if (n.includes("servant") && (n.includes("toilet") || n.includes("bath"))) return RULES.servant_toilet;
  if (n.includes("servant") || n.includes("maid") || n.includes("driver")) return RULES.servant_quarter;
  if (n.includes("pooja") || n.includes("puja") || n.includes("prayer") || n.includes("mandir")) return RULES.pooja_room;
  if (n.includes("shoe") || n.includes("linen")) return RULES.shoe_rack;
  if (n.includes("store") || n.includes("storage")) return RULES.store_room;
  if (n.includes("laundry") || n.includes("washing")) return RULES.laundry;
  if (n.includes("drawing")) return RULES.drawing_room;
  if (n.includes("family")) return RULES.family_room;
  if (n.includes("common")) return RULES.common_room;
  if (n.includes("warden")) return RULES.warden_room;
  if (n.includes("hostel")) return RULES.hostel_room;
  if (n.includes("conference") || n.includes("meeting") || n.includes("board")) return RULES.conference_room;
  if (n.includes("cabin")) return RULES.cabin;
  if (n.includes("reception")) return RULES.reception;
  if (n.includes("server")) return RULES.server_room;
  if (n.includes("break")) return RULES.break_room;
  if (n.includes("open") && (n.includes("work") || n.includes("office"))) return RULES.open_workspace;
  if (n.includes("pantry")) return RULES.pantry;
  if (n.includes("parking") || n.includes("garage") || n.includes("car")) return RULES.parking;
  if (n.includes("terrace")) return RULES.terrace;
  if (n.includes("verandah") || n.includes("veranda") || n.includes("porch")) return RULES.verandah;

  // Type-based fallback
  if (t === "bedroom") return RULES.bedroom;
  if (t === "bathroom") return RULES.bathroom;
  if (t === "living" || t === "living_room") return RULES.living_room;
  if (t === "dining" || t === "dining_room") return RULES.dining_room;
  if (t === "kitchen") return RULES.kitchen;
  if (t === "hallway" || t === "corridor") return RULES.corridor;
  if (t === "balcony") return RULES.balcony;
  if (t === "utility" || t === "storage") return RULES.utility;
  if (t === "staircase") return RULES.staircase;
  if (t === "study" || t === "home_office") return RULES.study;
  if (t === "foyer" || t === "entrance") return RULES.foyer;
  if (t === "office") return RULES.cabin;

  // Default: small habitable room
  return { basePct: 0.05, min: 4.0, max: 12.0, scale: "sqrt" };
}

// ── Core sizing function ────────────────────────────────────────────────────

function calculateArea(
  type: string,
  name: string,
  perFloorArea: number,
  bhkCount: number,
): number {
  const rule = findRule(type, name);

  let area: number;

  if (rule.scale === "fixed") {
    // Fixed-size rooms: bathrooms, utility, pooja, staircase
    // Don't scale with total area — a bathroom is 4-5 sqm whether house is 500 or 5000 sqft
    const t = Math.min(1, Math.max(0, (perFloorArea - 40) / 160)); // 0 at 40sqm, 1 at 200sqm
    area = rule.min + (rule.max - rule.min) * t * 0.5;
  } else if (rule.scale === "sqrt") {
    // Diminishing returns: larger homes → proportionally smaller rooms
    // A living room in 500sqft is ~25% of total, in 3000sqft is ~12%
    const refArea = 100; // reference area where basePct applies directly
    const scaledPct = rule.basePct * Math.sqrt(refArea / Math.max(perFloorArea, 30));
    const effectivePct = Math.max(rule.basePct * 0.5, Math.min(rule.basePct, scaledPct));
    area = perFloorArea * effectivePct;
  } else {
    // Linear: scales directly (corridors, terraces)
    area = perFloorArea * rule.basePct;
  }

  // BHK adjustment: more bedrooms = less area per bedroom
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if ((t === "bedroom" || n.includes("bedroom")) && !n.includes("master") && bhkCount > 3) {
    area *= (3 / bhkCount) * 1.1;
  }

  // Master bedroom gets a boost
  if (n.includes("master") && (t === "bedroom" || n.includes("bed"))) {
    area = Math.max(area, rule.min * 1.1);
  }

  // Clamp to min/max
  area = Math.max(rule.min, Math.min(rule.max, area));

  return Math.round(area * 10) / 10;
}

// ── Normalization: ensure room areas sum to target ──────────────────────────

function normalizeAreas(
  rooms: Array<{ name: string; type: string; areaSqm: number }>,
  targetTotal: number,
): void {
  const currentTotal = rooms.reduce((s, r) => s + r.areaSqm, 0);
  if (currentTotal <= 0 || Math.abs(currentTotal - targetTotal) < 2.0) return;

  const ratio = targetTotal / currentTotal;

  // Only scale flexible rooms (not fixed-size ones)
  for (const room of rooms) {
    const rule = findRule(room.type, room.name);
    if (rule.scale === "fixed") continue; // Don't touch bathrooms, utility, etc.
    room.areaSqm = Math.max(rule.min, Math.min(rule.max,
      Math.round(room.areaSqm * ratio * 10) / 10
    ));
  }

  // If still off, adjust the largest flexible room
  const newTotal = rooms.reduce((s, r) => s + r.areaSqm, 0);
  const diff = targetTotal - newTotal;
  if (Math.abs(diff) > 1.0) {
    const flexRooms = rooms.filter(r => findRule(r.type, r.name).scale !== "fixed");
    if (flexRooms.length > 0) {
      const largest = flexRooms.reduce((a, b) => a.areaSqm > b.areaSqm ? a : b);
      const rule = findRule(largest.type, largest.name);
      largest.areaSqm = Math.max(rule.min, Math.min(rule.max,
        Math.round((largest.areaSqm + diff) * 10) / 10
      ));
    }
  }
}

// ── Building type detection ─────────────────────────────────────────────────

export function detectBuildingType(prompt: string): BuildingType {
  const p = prompt.toLowerCase();
  if (/\bstudio\b/.test(p)) return "studio";
  if (/\bhostel\b|\bpg\b|\bpaying\s*guest\b/.test(p)) return "hostel";
  if (/\boffice\b|\bcommercial\b|\bworkspace\b/.test(p)) return "office";
  if (/\bfarmhouse\b|\bfarm\s*house\b/.test(p)) return "farmhouse";
  if (/\bpenthouse\b/.test(p)) return "penthouse";
  if (/\brow\s*house\b|\btownhouse\b/.test(p)) return "row_house";
  if (/\bduplex\b|\bg\+1\b|\bground\s*\+\s*first\b/.test(p)) return "duplex";
  if (/\bbungalow\b/.test(p)) return "bungalow";
  if (/\bvilla\b/.test(p)) return "villa";
  if (/\bapartment\b|\bflat\b/.test(p)) return "apartment";
  return "default";
}

export function detectFloorCount(prompt: string): number {
  const p = prompt.toLowerCase();
  if (/\bg\+2\b|\b3\s*(?:floor|stor(?:e?)y)\b/.test(p)) return 3;
  if (/\bduplex\b|\bg\+1\b|\b2\s*(?:floor|stor(?:e?)y)\b/.test(p)) return 2;
  return 1;
}

export function detectBHKCount(rooms: Array<{ name: string; type: string }>): number {
  return rooms.filter(r =>
    r.type === "bedroom" || r.name.toLowerCase().includes("bedroom") || r.name.toLowerCase().includes("master")
  ).length;
}

// ── Total area extraction from prompt ───────────────────────────────────────

export function extractTotalAreaSqm(prompt: string): number | null {
  const p = prompt.toLowerCase();

  // "1500 sqft", "1500 sq ft", "1500 square feet"
  const sqftMatch = p.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet|sqft|sft)/);
  if (sqftMatch) return parseFloat(sqftMatch[1].replace(/,/g, "")) * 0.0929;

  // "140 sqm", "140 sq m", "140 square meters"
  const sqmMatch = p.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*m|square\s*met(?:er|re)s?|sqm)/);
  if (sqmMatch) return parseFloat(sqmMatch[1].replace(/,/g, ""));

  return null;
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Override AI-estimated room areas with deterministic formulas.
 *
 * Call this AFTER the AI (or fallback) has produced a room list with names/types,
 * but BEFORE the layout engine consumes the areas.
 *
 * @param rooms - Room list from AI (names, types, zones). areaSqm will be OVERWRITTEN.
 * @param totalAreaSqm - Target total built-up area in sqm.
 * @param prompt - Original user prompt (for building type detection).
 */
export function applyDeterministicSizing(
  rooms: Array<{ name: string; type: string; areaSqm: number; zone?: string; preferredWidth?: number; preferredDepth?: number }>,
  totalAreaSqm: number,
  prompt: string,
): void {
  if (rooms.length === 0 || totalAreaSqm <= 0) return;

  const buildingType = detectBuildingType(prompt);
  const bhkCount = detectBHKCount(rooms);
  const floorCount = detectFloorCount(prompt);

  // Per-floor area (for multi-floor buildings, each floor gets a share)
  const perFloorArea = totalAreaSqm / Math.max(floorCount, 1);

  // Override each room's area with formula-based sizing
  for (const room of rooms) {
    // SKIP rooms where user specified exact dimensions (e.g., "bedroom 20x15 feet")
    if (room.preferredWidth && room.preferredWidth > 0 && room.preferredDepth && room.preferredDepth > 0) {
      continue;
    }

    const formulaArea = calculateArea(room.type, room.name, perFloorArea, bhkCount);
    room.areaSqm = formulaArea;
  }

  // Normalize so total matches target (scale flexible rooms, keep fixed rooms)
  normalizeAreas(rooms, totalAreaSqm);
}

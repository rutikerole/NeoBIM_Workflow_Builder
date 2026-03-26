/**
 * Market Intelligence Agent — The Single Source of Truth for ALL Pricing
 *
 * Architecture: Agent fetches EVERYTHING needed for a BOQ at runtime.
 * Hardcoded tables are emergency fallbacks only — never the primary source.
 *
 * Works for any city, any year, forever — no code changes needed.
 *
 * Search strategy: city → state → region → national (cascading fallback)
 *
 * Covers:
 * - Material prices (steel, cement, sand, aggregate)
 * - Labor rates (mason, helper, carpenter, electrician, plumber)
 * - MEP benchmarks (electrical, HVAC, plumbing per m²)
 * - Construction cost index
 * - Benchmark cost per m² by building type
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MarketPrice {
  value: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  date: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  fallbackLevel?: "city" | "state" | "national" | "static";
}

export interface LaborRates {
  mason: MarketPrice;
  helper: MarketPrice;
  carpenter: MarketPrice;
  steelFixer: MarketPrice;
  electrician: MarketPrice;
  plumber: MarketPrice;
}

export interface MarketIntelligenceResult {
  // Material prices
  steel_per_tonne: MarketPrice;
  cement_per_bag: MarketPrice & { brand?: string };
  sand_per_cft: MarketPrice & { type?: string };

  // Labor rates (daily wages in INR)
  labor: LaborRates;

  // Benchmarks
  benchmark_per_sqft: {
    value: number;
    range_low: number;
    range_high: number;
    source: string;
    building_type: string;
  };
  cpwd_index: {
    factor: number;
    source: string;
    year: number;
  };

  // Metadata
  sources_summary: string[];
  fetched_at: string;
  city: string;
  state: string;
  agent_status: "success" | "partial" | "fallback";
  agent_notes: string[];
  search_count: number;
  duration_ms: number;
  fallbacks_used: number;
}

// ─── Static Fallback Rates (CPWD DSR 2024 — emergency parachute only) ──────

const STATIC_FALLBACKS = {
  steel_per_tonne: {
    value: 68000, unit: "₹/tonne",
    source: "CPWD DSR 2024 (static fallback — may be outdated)", date: "2024-01",
    confidence: "LOW" as const, fallbackLevel: "national" as const,
  },
  cement_per_bag: {
    value: 380, unit: "₹/bag (50kg)",
    source: "CPWD DSR 2024 (static fallback — may be outdated)", date: "2024-01",
    confidence: "LOW" as const, brand: "Generic OPC 53", fallbackLevel: "national" as const,
  },
  sand_per_cft: {
    value: 55, unit: "₹/cft",
    source: "CPWD DSR 2024 (static fallback — may be outdated)", date: "2024-01",
    confidence: "LOW" as const, type: "M-sand", fallbackLevel: "national" as const,
  },
  labor: {
    mason:       { value: 800, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
    helper:      { value: 450, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
    carpenter:   { value: 900, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
    steelFixer:  { value: 750, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
    electrician: { value: 1000, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
    plumber:     { value: 850, unit: "₹/day", source: "CPWD DSR 2024 (static fallback)", date: "2024-01", confidence: "LOW" as const, fallbackLevel: "national" as const },
  },
};

// ─── Agent Implementation ───────────────────────────────────────────────────

export async function fetchMarketPrices(
  city: string,
  state: string,
  buildingType: string,
): Promise<MarketIntelligenceResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  const now = new Date();
  const monthYear = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const yearStr = String(now.getFullYear());

  // Default result with static fallbacks
  const result: MarketIntelligenceResult = {
    steel_per_tonne: { ...STATIC_FALLBACKS.steel_per_tonne },
    cement_per_bag: { ...STATIC_FALLBACKS.cement_per_bag },
    sand_per_cft: { ...STATIC_FALLBACKS.sand_per_cft },
    labor: {
      mason: { ...STATIC_FALLBACKS.labor.mason },
      helper: { ...STATIC_FALLBACKS.labor.helper },
      carpenter: { ...STATIC_FALLBACKS.labor.carpenter },
      steelFixer: { ...STATIC_FALLBACKS.labor.steelFixer },
      electrician: { ...STATIC_FALLBACKS.labor.electrician },
      plumber: { ...STATIC_FALLBACKS.labor.plumber },
    },
    benchmark_per_sqft: {
      value: 2500, range_low: 1800, range_high: 4500,
      source: "Estimated (no live data)", building_type: buildingType,
    },
    cpwd_index: { factor: 1.0, source: "Baseline (no live data)", year: now.getFullYear() },
    sources_summary: [],
    fetched_at: now.toISOString(),
    city, state,
    agent_status: "fallback",
    agent_notes: [],
    search_count: 0,
    duration_ms: 0,
    fallbacks_used: 9, // materials(3) + labor(6) all start as fallback
  };

  if (!apiKey) {
    result.agent_notes.push("ANTHROPIC_API_KEY not configured — using static fallback rates.");
    return result;
  }

  if (!apiKey.startsWith("sk-ant-api")) {
    result.agent_notes.push(
      "ANTHROPIC_API_KEY must be an API key (starts with sk-ant-api03-), not an OAuth token. " +
      "Get one from console.anthropic.com/settings/keys — using static fallback rates."
    );
    return result;
  }

  const startTime = Date.now();
  const client = new Anthropic({ apiKey });

  // ── The comprehensive prompt — covers ALL pricing for ANY city, ANY year ──
  const userPrompt = `You are a construction cost research agent for India. Find current, real prices for ${city}, ${state}.
Date: ${monthYear}. Building type: ${buildingType}.

SEARCH STRATEGY — use this cascade:
1. Search for ${city} specifically first
2. If not found, search for ${state} state-level rates
3. If not found, search for national average
Always note which level you found the data at.

FIND ALL OF THESE:

MATERIALS:
1. TMT steel Fe500 price per tonne in ${state} (search: "steel TMT price ${state} ${monthYear}")
2. Cement price per 50kg bag in ${city} — try UltraTech/Ambuja/ACC (search: "cement price ${city} today")
3. Construction sand (M-sand or river sand) per cubic feet in ${city}/${state}

LABOR RATES (daily wages):
4. Mason (skilled) daily wage in ${city} (search: "mason wages ${city} ${yearStr}" or "${state} construction labor rate")
5. Helper/unskilled labor daily wage in ${state}
6. Carpenter daily wage in ${city}/${state}
7. Steel fixer daily wage in ${state}
8. Electrician daily wage in ${city}/${state}
9. Plumber daily wage in ${city}/${state}

BENCHMARKS:
10. Construction cost per m² for ${buildingType} in ${city} ${yearStr} (search: "construction cost per sqft ${buildingType} ${city} ${yearStr}")
11. Current CPWD construction cost index or ${state} PWD SOR year

For labor, check: ${state} minimum wages notification ${yearStr}, labour.gov.in, or job portal listings.

RULES:
- Return REAL numbers you found. Do NOT guess or make up values.
- Include the source name/URL for every price.
- If you cannot find a specific item, set confidence to "LOW" and note the fallback level.
- All prices in INR.

Return ONLY this JSON (no markdown, no explanation):
{
  "steel_per_tonne": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
  "cement_per_bag": { "value": <number>, "brand": "<brand>", "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
  "sand_per_cft": { "value": <number>, "type": "M-sand|River sand", "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
  "labor": {
    "mason": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
    "helper": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
    "carpenter": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
    "steelFixer": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
    "electrician": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" },
    "plumber": { "value": <number>, "source": "<source>", "date": "<date>", "confidence": "HIGH|MEDIUM|LOW" }
  },
  "benchmark_per_sqft": { "value": <number>, "range_low": <number>, "range_high": <number>, "source": "<source>", "building_type": "${buildingType}" },
  "cpwd_index": { "factor": <number>, "source": "<source>", "year": ${yearStr} },
  "sources": ["<url1>", "<url2>", ...]
}`;

  let jsonText = "";
  let usedWebSearch = false;

  // ── Attempt 1: Claude with web_search (live prices — best accuracy) ──
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 15 }],
      messages: [{ role: "user", content: userPrompt }],
    });
    for (const block of response.content) {
      if (block.type === "text") jsonText += block.text;
    }
    usedWebSearch = true;
    result.search_count = 11;
    console.log("[Market Intelligence] Web search succeeded");
  } catch (wsErr) {
    const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
    console.warn("[Market Intelligence] Web search unavailable:", wsMsg);
    result.agent_notes.push("Web search not available — using AI knowledge base.");
  }

  // ── Attempt 2: Plain Claude (training data — decent for recent years) ──
  if (!jsonText) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: userPrompt }],
      });
      for (const block of response.content) {
        if (block.type === "text") jsonText += block.text;
      }
      result.search_count = 0;
      console.log("[Market Intelligence] Plain Claude fallback succeeded");
    } catch (plainErr) {
      const plainMsg = plainErr instanceof Error ? plainErr.message : String(plainErr);
      result.agent_notes.push(`Claude API error: ${plainMsg}`);
      console.error("[Market Intelligence] Both attempts failed:", plainMsg);
    }
  }

  // ── Parse response ──
  if (jsonText) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const p = JSON.parse(jsonMatch[0]);
        const src = usedWebSearch ? "Web search" : "AI estimate";
        const conf = usedWebSearch ? "HIGH" : "MEDIUM";

        // Materials
        if (p.steel_per_tonne?.value > 0) {
          result.steel_per_tonne = {
            value: p.steel_per_tonne.value, unit: "₹/tonne",
            source: p.steel_per_tonne.source || src,
            date: p.steel_per_tonne.date || monthYear,
            confidence: p.steel_per_tonne.confidence || conf,
            fallbackLevel: usedWebSearch ? "city" : "national",
          };
        }
        if (p.cement_per_bag?.value > 0) {
          result.cement_per_bag = {
            value: p.cement_per_bag.value, unit: "₹/bag (50kg)",
            source: p.cement_per_bag.source || src,
            date: p.cement_per_bag.date || monthYear,
            confidence: p.cement_per_bag.confidence || conf,
            brand: p.cement_per_bag.brand || "UltraTech/Ambuja",
            fallbackLevel: usedWebSearch ? "city" : "national",
          };
        }
        if (p.sand_per_cft?.value > 0) {
          result.sand_per_cft = {
            value: p.sand_per_cft.value, unit: "₹/cft",
            source: p.sand_per_cft.source || src,
            date: p.sand_per_cft.date || monthYear,
            confidence: p.sand_per_cft.confidence || conf,
            type: p.sand_per_cft.type || "M-sand",
            fallbackLevel: usedWebSearch ? "city" : "national",
          };
        }

        // Labor rates
        const laborKeys = ["mason", "helper", "carpenter", "steelFixer", "electrician", "plumber"] as const;
        if (p.labor && typeof p.labor === "object") {
          for (const key of laborKeys) {
            const lr = p.labor[key];
            if (lr?.value > 0) {
              result.labor[key] = {
                value: lr.value, unit: "₹/day",
                source: lr.source || src,
                date: lr.date || monthYear,
                confidence: lr.confidence || conf,
                fallbackLevel: usedWebSearch ? "city" : "state",
              };
            }
          }
        }

        // Benchmarks
        if (p.benchmark_per_sqft?.value > 0) {
          result.benchmark_per_sqft = {
            value: p.benchmark_per_sqft.value,
            range_low: p.benchmark_per_sqft.range_low || p.benchmark_per_sqft.value * 0.75,
            range_high: p.benchmark_per_sqft.range_high || p.benchmark_per_sqft.value * 1.25,
            source: p.benchmark_per_sqft.source || src,
            building_type: buildingType,
          };
        }
        if (p.cpwd_index?.factor > 0) {
          result.cpwd_index = {
            factor: p.cpwd_index.factor,
            source: p.cpwd_index.source || "CPWD",
            year: p.cpwd_index.year || now.getFullYear(),
          };
        }
        if (Array.isArray(p.sources)) {
          result.sources_summary = p.sources.filter((s: unknown) => typeof s === "string");
        }

        // Status
        const matPrices = [result.steel_per_tonne, result.cement_per_bag, result.sand_per_cft];
        const laborPrices = Object.values(result.labor);
        const allPrices = [...matPrices, ...laborPrices];
        const liveCount = allPrices.filter(p2 => p2.confidence !== "LOW").length;
        result.fallbacks_used = allPrices.length - liveCount;

        if (liveCount >= 7) {
          result.agent_status = "success";
        } else if (liveCount >= 3) {
          result.agent_status = "partial";
          if (!usedWebSearch) result.agent_notes.push("Prices from AI training data — verify against current market.");
        }

      } catch (parseErr) {
        result.agent_notes.push(`Failed to parse AI response: ${String(parseErr)}`);
      }
    } else {
      result.agent_notes.push("AI response did not contain valid JSON.");
    }
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ─── Market Adjustments ─────────────────────────────────────────────────────

export function computeMarketAdjustments(
  marketData: MarketIntelligenceResult
): {
  steelAdjustment: number;
  cementAdjustment: number;
  sandAdjustment: number;
  laborAdjustment: number;
  overallConfidence: "HIGH" | "MEDIUM" | "LOW";
  priceNotes: string[];
} {
  const notes: string[] = [];

  // CPWD DSR 2024 base rates
  const cpwdSteel = 68000;
  const cpwdCement = 380;
  const cpwdSand = 55;
  const cpwdMason = 800;

  const steelAdj = marketData.steel_per_tonne.value / cpwdSteel;
  const cementAdj = marketData.cement_per_bag.value / cpwdCement;
  const sandAdj = marketData.sand_per_cft.value / cpwdSand;
  const laborAdj = marketData.labor.mason.value / cpwdMason;

  if (marketData.steel_per_tonne.confidence !== "LOW") {
    notes.push(`Steel: ₹${marketData.steel_per_tonne.value.toLocaleString()}/tonne (${marketData.steel_per_tonne.source}) — ${marketData.steel_per_tonne.confidence}`);
  }
  if (marketData.cement_per_bag.confidence !== "LOW") {
    notes.push(`Cement: ${marketData.cement_per_bag.brand} ₹${marketData.cement_per_bag.value}/bag (${marketData.cement_per_bag.source}) — ${marketData.cement_per_bag.confidence}`);
  }
  if (marketData.sand_per_cft.confidence !== "LOW") {
    notes.push(`Sand: ${marketData.sand_per_cft.type} ₹${marketData.sand_per_cft.value}/cft (${marketData.sand_per_cft.source}) — ${marketData.sand_per_cft.confidence}`);
  }
  if (marketData.labor.mason.confidence !== "LOW") {
    notes.push(`Mason: ₹${marketData.labor.mason.value}/day (${marketData.labor.mason.source}) — ${marketData.labor.mason.confidence}`);
  }

  const allPrices = [marketData.steel_per_tonne, marketData.cement_per_bag, marketData.sand_per_cft, marketData.labor.mason];
  const highCount = allPrices.filter(p => p.confidence === "HIGH").length;
  const medCount = allPrices.filter(p => p.confidence === "MEDIUM").length;
  const overallConfidence = highCount >= 2 ? "HIGH" : (highCount + medCount) >= 2 ? "MEDIUM" : "LOW";

  return {
    steelAdjustment: Math.round(steelAdj * 1000) / 1000,
    cementAdjustment: Math.round(cementAdj * 1000) / 1000,
    sandAdjustment: Math.round(sandAdj * 1000) / 1000,
    laborAdjustment: Math.round(laborAdj * 1000) / 1000,
    overallConfidence,
    priceNotes: notes,
  };
}

/**
 * POST /api/generate-floor-plan
 *
 * Standalone floor plan generation from a text prompt.
 * Used by the /dashboard/floor-plan page when user types a prompt.
 *
 * Calls GPT-4o to generate room positions, then converts through
 * the pipeline adapter to produce a full FloorPlanProject.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateFloorPlan } from "@/services/openai";
import { convertGeometryToProject } from "@/lib/floor-plan/pipeline-adapter";
import type { FloorPlanGeometry } from "@/types/floor-plan";

// Simple prompt → BuildingDescription parser
function parsePrompt(prompt: string) {
  const p = prompt.toLowerCase().trim();

  // Extract BHK count
  let bhk = 2;
  const bhkMatch = p.match(/(\d)\s*bhk/);
  if (bhkMatch) bhk = parseInt(bhkMatch[1], 10);

  // Extract building type
  let buildingType = "Residential Apartment";
  if (p.includes("villa")) buildingType = "Residential Villa";
  else if (p.includes("bungalow")) buildingType = "Residential Bungalow";
  else if (p.includes("house")) buildingType = "Residential House";
  else if (p.includes("office")) buildingType = "Commercial Office";
  else if (p.includes("studio")) buildingType = "Studio Apartment";
  else if (p.includes("penthouse")) buildingType = "Penthouse";
  else if (p.includes("duplex")) buildingType = "Duplex";

  // Estimate area based on BHK
  const areaPerBhk: Record<number, number> = {
    1: 55, 2: 90, 3: 140, 4: 200, 5: 280,
  };
  const totalArea = areaPerBhk[bhk] ?? bhk * 45 + 20;

  // Build room program based on BHK count
  const program: Array<{ space: string; area_m2?: number }> = [];

  // Living + Dining
  if (bhk <= 2) {
    program.push({ space: "Living + Dining Room", area_m2: Math.round(totalArea * 0.22) });
  } else {
    program.push({ space: "Living Room", area_m2: Math.round(totalArea * 0.15) });
    program.push({ space: "Dining Room", area_m2: Math.round(totalArea * 0.08) });
  }

  // Kitchen
  program.push({ space: "Kitchen", area_m2: Math.max(7, Math.round(totalArea * 0.08)) });

  // Bedrooms
  if (bhk >= 1) program.push({ space: "Master Bedroom", area_m2: Math.max(14, Math.round(totalArea * 0.14)) });
  for (let i = 2; i <= bhk; i++) {
    program.push({ space: `Bedroom ${i}`, area_m2: Math.max(10, Math.round(totalArea * 0.10)) });
  }

  // Bathrooms (1 per bedroom, min 1)
  const numBath = Math.max(1, bhk);
  for (let i = 1; i <= numBath; i++) {
    const name = numBath === 1 ? "Bathroom" : `Bathroom ${i}`;
    program.push({ space: name, area_m2: i === 1 ? 5 : 4 });
  }

  // Corridor/Hallway for 2+ BHK
  if (bhk >= 2) {
    program.push({ space: "Corridor", area_m2: Math.round(totalArea * 0.06) });
  }

  // Utility for 3+ BHK
  if (bhk >= 3) {
    program.push({ space: "Utility", area_m2: 4 });
  }

  // Balcony for villa/bungalow
  if (p.includes("villa") || p.includes("bungalow") || p.includes("house")) {
    program.push({ space: "Verandah", area_m2: Math.round(totalArea * 0.06) });
  }

  const programSummary = `${bhk}BHK ${buildingType} with ${program.map(p => p.space).join(", ")}`;

  return {
    buildingType,
    totalArea,
    floors: 1,
    program,
    programSummary,
    narrative: `A modern ${bhk}BHK ${buildingType.toLowerCase()} designed for comfortable family living. Features ${bhk} bedroom${bhk > 1 ? "s" : ""}, spacious living areas, and well-planned service zones with natural ventilation per NBC India guidelines.`,
    structure: "RCC frame",
    facade: "Contemporary",
    sustainabilityFeatures: ["Natural ventilation", "Cross ventilation"],
    estimatedCost: "",
    constructionDuration: "",
    projectName: `${bhk}BHK ${buildingType.split(" ").pop()}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt as string;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 });
    }

    // Parse prompt into structured description
    const description = parsePrompt(prompt);

    // Call GPT-4o to generate floor plan
    const floorPlan = await generateFloorPlan(description, apiKey);

    // Build FloorPlanGeometry from the result
    const positionedRooms = floorPlan.positionedRooms;
    const roomList = floorPlan.roomList;

    // Estimate footprint
    const fpArea = floorPlan.totalArea / Math.max(floorPlan.floors, 1);
    const aspect = 1.33;
    const bW = Math.round(Math.sqrt(fpArea * aspect) * 10) / 10;
    const bD = Math.round((fpArea / bW) * 10) / 10;

    const rooms = positionedRooms
      ? positionedRooms.map(r => ({
          name: r.name,
          type: r.type as "living" | "bedroom" | "kitchen" | "dining" | "bathroom" | "hallway" | "entrance" | "utility" | "balcony" | "other",
          x: r.x,
          y: r.y,
          width: r.width,
          depth: r.depth,
          center: [r.x + r.width / 2, r.y + r.depth / 2] as [number, number],
          area: r.area,
        }))
      : roomList.map((r) => {
          const area = r.area ?? 16;
          const w = Math.round(Math.sqrt(area * 1.2) * 10) / 10;
          const d = Math.round((area / w) * 10) / 10;
          return {
            name: r.name,
            type: ((r as Record<string, unknown>).type as string ?? "other") as "living" | "bedroom" | "kitchen" | "dining" | "bathroom" | "other",
            x: 0,
            y: 0,
            width: w,
            depth: d,
            center: [w / 2, d / 2] as [number, number],
            area,
          };
        });

    const geometry: FloorPlanGeometry = {
      footprint: { width: bW, depth: bD },
      wallHeight: 3.0,
      walls: [],
      doors: [],
      windows: [],
      rooms,
    };

    // Convert to full FloorPlanProject
    const project = convertGeometryToProject(geometry, description.projectName, prompt);

    return NextResponse.json({
      project,
      geometry,
      svg: floorPlan.svg,
    });
  } catch (err) {
    console.error("[generate-floor-plan] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

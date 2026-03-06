import { NextRequest, NextResponse } from "next/server";
import { generateBuildingDescription, generateConceptImage } from "@/services/openai";
import { generateId } from "@/lib/utils";
import type { ExecutionArtifact } from "@/types/execution";

// Demo endpoint — no auth required, limited to WF-01 nodes only
const DEMO_ALLOWED_IDS = new Set(["TR-003", "GN-003"]);

export async function POST(req: NextRequest) {
  const { catalogueId, executionId, tileInstanceId, inputData } = await req.json();

  if (!DEMO_ALLOWED_IDS.has(catalogueId)) {
    return NextResponse.json(
      { error: { title: "Not available in demo", message: "This node is not available in demo mode.", code: "DEMO_LIMIT" } },
      { status: 400 }
    );
  }

  try {
    let artifact: ExecutionArtifact;

    if (catalogueId === "TR-003") {
      const prompt = inputData?.prompt ?? inputData?.content ?? "Modern mixed-use building";
      const description = await generateBuildingDescription(prompt);

      artifact = {
        id: generateId(),
        executionId: executionId ?? "demo",
        tileInstanceId,
        type: "text",
        data: {
          content: formatDescription(description),
          label: "Building Description (AI Generated)",
          _raw: description,
        },
        metadata: { model: "gpt-4o-mini", real: true, demo: true },
        createdAt: new Date(),
      };
    } else if (catalogueId === "GN-003") {
      const description = inputData?._raw ?? null;
      const prompt = inputData?.prompt ?? inputData?.content ?? "Modern mixed-use building";

      const { url, revisedPrompt } = await generateConceptImage(
        description ?? {
          projectName: "Building",
          buildingType: "Mixed-Use",
          floors: 5,
          totalArea: 5000,
          structure: "Reinforced concrete",
          facade: "White mineral render with timber accents",
          sustainabilityFeatures: [],
          programSummary: prompt,
          estimatedCost: "TBD",
          constructionDuration: "18 months",
        },
        "photorealistic architectural render, professional photography"
      );

      artifact = {
        id: generateId(),
        executionId: executionId ?? "demo",
        tileInstanceId,
        type: "image",
        data: {
          url,
          label: "Concept Render (DALL-E 3)",
          style: revisedPrompt.substring(0, 100),
        },
        metadata: { model: "dall-e-3", real: true, demo: true },
        createdAt: new Date(),
      };
    } else {
      return NextResponse.json(
        { error: { title: "Not implemented", message: "Node not available", code: "NOT_IMPL" } },
        { status: 400 }
      );
    }

    return NextResponse.json({ artifact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo execution failed";
    console.error("[demo/execute]", catalogueId, message);
    return NextResponse.json(
      { error: { title: "Demo Error", message, code: "DEMO_ERROR" } },
      { status: 500 }
    );
  }
}

function formatDescription(d: {
  projectName: string;
  buildingType: string;
  floors: number;
  totalArea: number;
  structure: string;
  facade: string;
  sustainabilityFeatures: string[];
  programSummary: string;
  estimatedCost: string;
  constructionDuration: string;
  narrative?: string;
}): string {
  if (d.narrative) {
    return `# ${d.projectName}\n\n${d.narrative}\n\n---\n\n**Quick Facts**\nType: ${d.buildingType} | Floors: ${d.floors} | Area: ${d.totalArea.toLocaleString()} m²\nCost: ${d.estimatedCost} | Duration: ${d.constructionDuration}`;
  }
  return `${d.projectName.toUpperCase()} — BUILDING DESCRIPTION\n\nType: ${d.buildingType}\nFloors: ${d.floors} | Total Area: ${d.totalArea.toLocaleString()} m²\nEstimated Cost: ${d.estimatedCost} | Duration: ${d.constructionDuration}\n\n${d.programSummary}\n\nStructure: ${d.structure}\nFacade: ${d.facade}\n\nSustainability: ${d.sustainabilityFeatures.join(", ") || "TBD"}`;
}

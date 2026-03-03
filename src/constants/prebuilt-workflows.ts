import type { WorkflowTemplate } from "@/types/workflow";
import { generateId } from "@/lib/utils";

function makeNode(catalogueId: string, x: number, y: number) {
  const id = `${catalogueId}-${generateId()}`;
  return { id, catalogueId, x, y };
}

export const PREBUILT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: "wf-01",
    name: "Text Prompt → Concept Building",
    description:
      "The fastest generative building workflow. Enter a text description and instantly get a building concept: a description card, 3D massing, and a concept render.",
    tags: ["concept", "visualization", "quick-start", "text-to-building"],
    category: "Concept Design",
    complexity: "simple",
    estimatedRunTime: "~45 seconds",
    requiredInputs: ["Text description of your building concept"],
    expectedOutputs: ["Building description card", "3D massing model", "Concept architectural image"],
    thumbnail: "https://picsum.photos/seed/wf01/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-001",
            label: "Text Prompt",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "text-out", label: "Text", type: "text" }],
            icon: "Type",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "TR-003",
            label: "Building Description Generator",
            category: "transform",
            status: "idle",
            inputs: [{ id: "json-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "text-out", label: "Description", type: "text" },
              { id: "prog-out", label: "Program Blocks", type: "json" },
            ],
            icon: "Building2",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "GN-001",
            label: "Massing Generator",
            category: "generate",
            status: "idle",
            inputs: [{ id: "req-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "geo-out", label: "3D Massing", type: "geometry" },
              { id: "kpi-out", label: "KPIs", type: "json" },
            ],
            icon: "Box",
          },
        },
        {
          id: "n4",
          type: "workflowNode",
          position: { x: 940, y: 200 },
          data: {
            catalogueId: "GN-003",
            label: "Image Generator",
            category: "generate",
            status: "idle",
            inputs: [
              { id: "ctrl-in", label: "Control Image", type: "image" },
              { id: "prompt-in", label: "Style Prompt", type: "text" },
            ],
            outputs: [{ id: "images-out", label: "Concept Images", type: "image" }],
            icon: "Palette",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "text-out", target: "n2", targetHandle: "json-in", type: "animatedEdge" },
        { id: "e2-3", source: "n2", sourceHandle: "prog-out", target: "n3", targetHandle: "req-in", type: "animatedEdge" },
        { id: "e3-4", source: "n3", sourceHandle: "geo-out", target: "n4", targetHandle: "ctrl-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-02",
    name: "PDF Brief → Massing",
    description:
      "Turn documents into buildings. Upload a project brief PDF and get a 3D building massing with program cards showing extracted requirements.",
    tags: ["pdf", "brief", "massing", "requirements"],
    category: "Concept Design",
    complexity: "intermediate",
    estimatedRunTime: "~60 seconds",
    requiredInputs: ["PDF project brief document"],
    expectedOutputs: ["Extracted requirements JSON", "Program cards", "3D massing model"],
    thumbnail: "https://picsum.photos/seed/wf02/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-002",
            label: "PDF Upload",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "pdf-out", label: "PDF", type: "pdf" }],
            icon: "FileText",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "TR-001",
            label: "Document Parser",
            category: "transform",
            status: "idle",
            inputs: [{ id: "pdf-in", label: "PDF", type: "pdf" }],
            outputs: [{ id: "text-out", label: "Structured Text", type: "text" }],
            icon: "ScanText",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "TR-002",
            label: "Requirements Extractor",
            category: "transform",
            status: "idle",
            inputs: [{ id: "text-in", label: "Text", type: "text" }],
            outputs: [{ id: "req-out", label: "Requirements JSON", type: "json" }],
            icon: "Sparkles",
          },
        },
        {
          id: "n4",
          type: "workflowNode",
          position: { x: 940, y: 200 },
          data: {
            catalogueId: "GN-001",
            label: "Massing Generator",
            category: "generate",
            status: "idle",
            inputs: [{ id: "req-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "geo-out", label: "3D Massing", type: "geometry" },
              { id: "kpi-out", label: "KPIs", type: "json" },
            ],
            icon: "Box",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "pdf-out", target: "n2", targetHandle: "pdf-in", type: "animatedEdge" },
        { id: "e2-3", source: "n2", sourceHandle: "text-out", target: "n3", targetHandle: "text-in", type: "animatedEdge" },
        { id: "e3-4", source: "n3", sourceHandle: "req-out", target: "n4", targetHandle: "req-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-03",
    name: "Massing → Concept Images",
    description:
      "Visualize architecture without modeling. Take a 3D massing and generate stunning concept images in three distinct architectural styles.",
    tags: ["visualization", "render", "styles", "concept"],
    category: "Visualization",
    complexity: "simple",
    estimatedRunTime: "~45 seconds",
    requiredInputs: ["3D massing model or parameters"],
    expectedOutputs: ["3 concept images in different styles (Nordic, Brick urban, Timber contemporary)"],
    thumbnail: "https://picsum.photos/seed/wf03/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-005",
            label: "Parameter Input",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "params-out", label: "Parameters", type: "json" }],
            icon: "Sliders",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "TR-005",
            label: "Style Prompt Composer",
            category: "transform",
            status: "idle",
            inputs: [
              { id: "geo-in", label: "3D Geometry", type: "geometry" },
              { id: "text-in", label: "Style Text", type: "text" },
            ],
            outputs: [
              { id: "prompt-out", label: "Composed Prompt", type: "text" },
              { id: "ctrl-out", label: "Control Image", type: "image" },
            ],
            icon: "Wand2",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "GN-003",
            label: "Image Generator",
            category: "generate",
            status: "idle",
            inputs: [
              { id: "ctrl-in", label: "Control Image", type: "image" },
              { id: "prompt-in", label: "Style Prompt", type: "text" },
            ],
            outputs: [{ id: "images-out", label: "Concept Images", type: "image" }],
            icon: "Palette",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "params-out", target: "n2", targetHandle: "geo-in", type: "animatedEdge" },
        { id: "e2-3a", source: "n2", sourceHandle: "ctrl-out", target: "n3", targetHandle: "ctrl-in", type: "animatedEdge" },
        { id: "e2-3b", source: "n2", sourceHandle: "prompt-out", target: "n3", targetHandle: "prompt-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-04",
    name: "Parameters → 3D Building",
    description:
      "No-code parametric building generation. Set floors, height, and area then get an instantly updated 3D building model.",
    tags: ["parametric", "3d", "quick", "massing", "sliders"],
    category: "Concept Design",
    complexity: "simple",
    estimatedRunTime: "~20 seconds",
    requiredInputs: ["Building parameters (floors, height, area)"],
    expectedOutputs: ["Interactive 3D building model", "Building KPIs"],
    thumbnail: "https://picsum.photos/seed/wf04/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-005",
            label: "Parameter Input",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "params-out", label: "Parameters", type: "json" }],
            icon: "Sliders",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "GN-001",
            label: "Massing Generator",
            category: "generate",
            status: "idle",
            inputs: [{ id: "req-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "geo-out", label: "3D Massing", type: "geometry" },
              { id: "kpi-out", label: "KPIs", type: "json" },
            ],
            icon: "Box",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "params-out", target: "n2", targetHandle: "req-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-05",
    name: "Massing → IFC Export",
    description:
      "Bridge to BIM. Take any 3D massing model and export it as a standards-compliant IFC file ready for use in Revit, ArchiCAD, or any BIM viewer.",
    tags: ["ifc", "bim", "export", "bridge"],
    category: "BIM Export",
    complexity: "simple",
    estimatedRunTime: "~30 seconds",
    requiredInputs: ["3D massing model"],
    expectedOutputs: ["Downloadable IFC file (.ifc)", "Export summary with element list"],
    thumbnail: "https://picsum.photos/seed/wf05/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-005",
            label: "Parameter Input",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "params-out", label: "Parameters", type: "json" }],
            icon: "Sliders",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "GN-001",
            label: "Massing Generator",
            category: "generate",
            status: "idle",
            inputs: [{ id: "req-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "geo-out", label: "3D Massing", type: "geometry" },
              { id: "kpi-out", label: "KPIs", type: "json" },
            ],
            icon: "Box",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "EX-001",
            label: "IFC Exporter",
            category: "export",
            status: "idle",
            inputs: [
              { id: "geo-in", label: "3D Geometry", type: "geometry" },
              { id: "meta-in", label: "Metadata", type: "json" },
            ],
            outputs: [{ id: "ifc-out", label: "IFC File", type: "ifc" }],
            icon: "Download",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "params-out", target: "n2", targetHandle: "req-in", type: "animatedEdge" },
        { id: "e2-3a", source: "n2", sourceHandle: "geo-out", target: "n3", targetHandle: "geo-in", type: "animatedEdge" },
        { id: "e2-3b", source: "n2", sourceHandle: "kpi-out", target: "n3", targetHandle: "meta-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-09",
    name: "IFC → Quantity Takeoff → BOQ",
    description:
      "Automated quantity extraction and cost estimation. Upload an IFC model and get a complete Bill of Quantities with downloadable XLSX export.",
    tags: ["ifc", "qto", "boq", "cost", "quantities", "estimating"],
    category: "Cost Estimation",
    complexity: "intermediate",
    estimatedRunTime: "~90 seconds",
    requiredInputs: ["IFC model file"],
    expectedOutputs: ["Quantities table by element category", "BOQ with unit prices and totals", "Downloadable XLSX/CSV"],
    thumbnail: "https://picsum.photos/seed/wf09/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-004",
            label: "IFC Upload",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "ifc-out", label: "IFC Model", type: "ifc" }],
            icon: "Box",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "TR-007",
            label: "Quantity Extractor",
            category: "transform",
            status: "idle",
            inputs: [{ id: "ifc-in", label: "IFC Model", type: "ifc" }],
            outputs: [{ id: "qty-out", label: "Quantities JSON", type: "json" }],
            icon: "Calculator",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "TR-008",
            label: "BOQ / Cost Mapper",
            category: "transform",
            status: "idle",
            inputs: [{ id: "qty-in", label: "Quantities", type: "json" }],
            outputs: [{ id: "boq-out", label: "BOQ Line Items", type: "json" }],
            icon: "DollarSign",
          },
        },
        {
          id: "n4",
          type: "workflowNode",
          position: { x: 940, y: 200 },
          data: {
            catalogueId: "EX-002",
            label: "BOQ / Spreadsheet Exporter",
            category: "export",
            status: "idle",
            inputs: [{ id: "boq-in", label: "BOQ Data", type: "json" }],
            outputs: [{ id: "xlsx-out", label: "XLSX + CSV", type: "csv" }],
            icon: "Table",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "ifc-out", target: "n2", targetHandle: "ifc-in", type: "animatedEdge" },
        { id: "e2-3", source: "n2", sourceHandle: "qty-out", target: "n3", targetHandle: "qty-in", type: "animatedEdge" },
        { id: "e3-4", source: "n3", sourceHandle: "boq-out", target: "n4", targetHandle: "boq-in", type: "animatedEdge" },
      ],
    },
  },
  {
    id: "wf-10",
    name: "PDF Brief → Full Pipeline",
    description:
      "The Hero Workflow. Upload a project brief and get everything: extracted requirements, multiple massing variants, concept renders, and an IFC export — all in one pipeline.",
    tags: ["full-pipeline", "hero", "pdf", "massing", "renders", "ifc", "advanced"],
    category: "Full Pipeline",
    complexity: "advanced",
    estimatedRunTime: "~3 minutes",
    requiredInputs: ["PDF project brief document"],
    expectedOutputs: [
      "Extracted requirements and program cards",
      "3 massing variants with KPIs",
      "Concept renders per variant",
      "Downloadable IFC file",
    ],
    thumbnail: "https://picsum.photos/seed/wf10/600/400",
    tileGraph: {
      nodes: [
        {
          id: "n1",
          type: "workflowNode",
          position: { x: 100, y: 200 },
          data: {
            catalogueId: "IN-002",
            label: "PDF Upload",
            category: "input",
            status: "idle",
            inputs: [],
            outputs: [{ id: "pdf-out", label: "PDF", type: "pdf" }],
            icon: "FileText",
          },
        },
        {
          id: "n2",
          type: "workflowNode",
          position: { x: 380, y: 200 },
          data: {
            catalogueId: "TR-001",
            label: "Document Parser",
            category: "transform",
            status: "idle",
            inputs: [{ id: "pdf-in", label: "PDF", type: "pdf" }],
            outputs: [{ id: "text-out", label: "Structured Text", type: "text" }],
            icon: "ScanText",
          },
        },
        {
          id: "n3",
          type: "workflowNode",
          position: { x: 660, y: 200 },
          data: {
            catalogueId: "TR-002",
            label: "Requirements Extractor",
            category: "transform",
            status: "idle",
            inputs: [{ id: "text-in", label: "Text", type: "text" }],
            outputs: [{ id: "req-out", label: "Requirements JSON", type: "json" }],
            icon: "Sparkles",
          },
        },
        {
          id: "n4",
          type: "workflowNode",
          position: { x: 940, y: 200 },
          data: {
            catalogueId: "GN-001",
            label: "Massing Generator",
            category: "generate",
            status: "idle",
            inputs: [{ id: "req-in", label: "Requirements", type: "json" }],
            outputs: [
              { id: "geo-out", label: "3D Massing", type: "geometry" },
              { id: "kpi-out", label: "KPIs", type: "json" },
            ],
            icon: "Box",
          },
        },
        {
          id: "n5",
          type: "workflowNode",
          position: { x: 1220, y: 100 },
          data: {
            catalogueId: "GN-003",
            label: "Image Generator",
            category: "generate",
            status: "idle",
            inputs: [
              { id: "ctrl-in", label: "Control Image", type: "image" },
              { id: "prompt-in", label: "Style Prompt", type: "text" },
            ],
            outputs: [{ id: "images-out", label: "Concept Images", type: "image" }],
            icon: "Palette",
          },
        },
        {
          id: "n6",
          type: "workflowNode",
          position: { x: 1220, y: 320 },
          data: {
            catalogueId: "EX-001",
            label: "IFC Exporter",
            category: "export",
            status: "idle",
            inputs: [
              { id: "geo-in", label: "3D Geometry", type: "geometry" },
              { id: "meta-in", label: "Metadata", type: "json" },
            ],
            outputs: [{ id: "ifc-out", label: "IFC File", type: "ifc" }],
            icon: "Download",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "n1", sourceHandle: "pdf-out", target: "n2", targetHandle: "pdf-in", type: "animatedEdge" },
        { id: "e2-3", source: "n2", sourceHandle: "text-out", target: "n3", targetHandle: "text-in", type: "animatedEdge" },
        { id: "e3-4", source: "n3", sourceHandle: "req-out", target: "n4", targetHandle: "req-in", type: "animatedEdge" },
        { id: "e4-5a", source: "n4", sourceHandle: "geo-out", target: "n5", targetHandle: "ctrl-in", type: "animatedEdge" },
        { id: "e4-6a", source: "n4", sourceHandle: "geo-out", target: "n6", targetHandle: "geo-in", type: "animatedEdge" },
        { id: "e4-6b", source: "n4", sourceHandle: "kpi-out", target: "n6", targetHandle: "meta-in", type: "animatedEdge" },
      ],
    },
  },
];

export const PREBUILT_WORKFLOWS_MAP = new Map(
  PREBUILT_WORKFLOWS.map((wf) => [wf.id, wf])
);

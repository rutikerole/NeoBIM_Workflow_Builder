/**
 * Video Walkthrough Service — Cinematic architectural video from renders.
 * Uses Kling 3.0 Pro via fal.ai for top-tier 4K video with fluid motion
 * and physics-aware rendering (buildings stay solid, no warping).
 *
 * Endpoint: fal-ai/kling-video/v3/pro/image-to-video
 * Pricing: $0.224/s (no audio) — $1.12 for 5s, $2.24 for 10s
 */

import { fal } from "@fal-ai/client";
import { generateId } from "@/lib/utils";

// ─── Configuration ──────────────────────────────────────────────────────────

const FAL_ENDPOINT = "fal-ai/kling-video/v3/pro/image-to-video";
const COST_PER_SECOND = 0.224; // no audio
const REQUEST_TIMEOUT_MS = 600_000; // 10 minutes — Pro 4K generation takes longer

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VideoInput {
  /** URL of the source render image */
  imageUrl: string;
  /** Camera motion / scene description prompt */
  prompt: string;
  /** Video duration: 5s (quick) or 10s (full walkthrough) */
  duration?: "5" | "10";
  /** Aspect ratio */
  aspectRatio?: "16:9" | "9:16" | "1:1";
  /** Negative prompt to avoid artifacts */
  negativePrompt?: string;
  /** CFG scale (0-1, lower = more creative, higher = more prompt-adherent) */
  cfgScale?: number;
}

export interface VideoResult {
  id: string;
  videoUrl: string;
  fileName: string;
  fileSize: number;
  durationSeconds: number;
  costUsd: number;
  generationTimeMs: number;
}

// ─── Error Handling ─────────────────────────────────────────────────────────

class VideoServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean
  ) {
    super(message);
    this.name = "VideoServiceError";
  }
}

function ensureFalKey(): void {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new VideoServiceError(
      "FAL_KEY environment variable is not configured",
      500,
      false
    );
  }
  fal.config({ credentials: key });
}

// ─── Core Function ──────────────────────────────────────────────────────────

/**
 * Generate a cinematic 4K walkthrough video from an architectural render.
 * Uses Kling 3.0 Pro via fal.ai — best-in-class for architecture.
 */
export async function generateWalkthroughVideo(
  input: VideoInput
): Promise<VideoResult> {
  ensureFalKey();

  const {
    imageUrl,
    prompt,
    duration = "10",
    aspectRatio = "16:9",
    negativePrompt = "blur, distortion, low quality, warped geometry, melting walls, deformed architecture, shaky camera, noise, artifacts, morphing surfaces, bent lines, wobbly structure",
    cfgScale = 0.7,
  } = input;

  const startTime = Date.now();
  const requestId = generateId();

  console.log("[Video] Starting Kling 3.0 Pro walkthrough", {
    requestId,
    imageUrl: imageUrl.slice(0, 80),
    duration: `${duration}s`,
    prompt: prompt.slice(0, 120),
  });

  try {
    const result = await fal.subscribe(FAL_ENDPOINT, {
      input: {
        prompt,
        start_image_url: imageUrl,
        duration,
        aspect_ratio: aspectRatio,
        generate_audio: false,
        negative_prompt: negativePrompt,
        cfg_scale: cfgScale,
      },
      pollInterval: 4000,
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = result.data as {
      video?: { url?: string; file_name?: string; file_size?: number };
    };
    const videoUrl = data?.video?.url;

    if (!videoUrl) {
      throw new VideoServiceError(
        "Video generation completed but no video URL returned",
        500,
        false
      );
    }

    const durationSeconds = parseInt(duration, 10);
    const costUsd = parseFloat((durationSeconds * COST_PER_SECOND).toFixed(3));
    const generationTimeMs = Date.now() - startTime;

    console.log("[Video] Kling 3.0 Pro walkthrough complete", {
      requestId,
      videoUrl: videoUrl.slice(0, 80),
      durationSeconds,
      costUsd,
      generationTimeMs,
      fileSize: data.video?.file_size,
    });

    return {
      id: requestId,
      videoUrl,
      fileName: data.video?.file_name ?? `walkthrough_${requestId}.mp4`,
      fileSize: data.video?.file_size ?? 0,
      durationSeconds,
      costUsd,
      generationTimeMs,
    };
  } catch (error: unknown) {
    const err = error as Record<string, unknown> | null;
    const status = typeof err?.status === "number" ? err.status : 500;
    const message =
      typeof err?.message === "string"
        ? err.message
        : "Video generation failed";

    console.error("[Video] Generation failed", { requestId, error: message });

    if (error instanceof VideoServiceError) throw error;

    throw new VideoServiceError(message, status, status >= 500);
  }
}

/**
 * Build an optimized camera motion prompt for architectural walkthroughs.
 * Kling 3.0 has physics-aware rendering, so we can be very specific
 * about camera movement without worrying about building deformation.
 */
export function buildArchitecturalVideoPrompt(
  buildingDescription: string
): string {
  const lower = buildingDescription.toLowerCase();

  const isHighrise =
    /(\d{2,})\s*(?:stor|floor)/i.test(lower) ||
    lower.includes("tower") ||
    lower.includes("skyscraper");
  const hasCourtyard =
    lower.includes("courtyard") || lower.includes("atrium");
  const isResidential =
    lower.includes("villa") ||
    lower.includes("house") ||
    lower.includes("residential");
  const hasGlass =
    lower.includes("glass") ||
    lower.includes("curtain wall") ||
    lower.includes("glazing");

  let cameraMotion: string;
  let lighting: string;

  if (isHighrise) {
    cameraMotion =
      "Epic slow drone shot starting from ground level, smoothly ascending along the facade of the tower, revealing each floor progressively. Camera pulls back while rising to show the full height and scale of the building against the skyline. Final frame shows the complete tower from a dramatic low angle.";
    lighting = "Late afternoon golden hour, warm sunlight reflecting off the upper floors, dramatic long shadows on the ground.";
  } else if (hasCourtyard) {
    cameraMotion =
      "Cinematic dolly shot entering through the main entrance, moving slowly into the courtyard. Camera gently tilts upward to reveal the open sky framed by the surrounding architecture. Smooth 180-degree pan showing all interior facades and landscaping details.";
    lighting = "Soft diffused daylight filtering into the courtyard, dappled shadows from any vegetation, warm ambient glow.";
  } else if (isResidential) {
    cameraMotion =
      "Elegant slow orbit around the residence starting from the front garden view. Camera glides at eye level showcasing the main entrance and facade details, then gradually rises to reveal the roofline, terrace, and surrounding landscape from above.";
    lighting = "Morning golden hour, warm tones, soft shadows emphasizing the residential character and materials.";
  } else {
    cameraMotion =
      "Professional cinematic orbit around the building exterior. Camera begins at pedestrian eye level showing the main entrance, then smoothly arcs around the corner revealing the side facade. Gradually rises to a 30-degree aerial angle showing the roof and site context. Steady, fluid movement throughout.";
    lighting = "Golden hour with warm directional sunlight, crisp shadows defining the building's volumetric form.";
  }

  // Add material-specific details
  const materialNote = hasGlass
    ? "Glass facades show realistic reflections of sky and surroundings. Clean specular highlights on glazing surfaces."
    : "Materials and textures are clearly visible — concrete, brick, stone, or metal cladding rendered with photorealistic detail.";

  return `${cameraMotion} ${lighting} ${materialNote} Ultra photorealistic architectural visualization, 4K cinematic quality, steady smooth camera movement, professional drone cinematography feel. The building structure remains perfectly solid and geometrically precise throughout the entire shot.`;
}

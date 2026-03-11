/**
 * Standalone Kling 3.0 Omni test script.
 *
 * Tests whether Omni tasks actually progress past "submitted".
 * Uses imgbb for public image hosting, then submits to Omni and polls.
 *
 * Usage:
 *   npx tsx src/scripts/test-omni-poll.ts [path/to/image.jpg]
 *
 * Pass a floor plan image path as argument. If omitted, uses a generated 400x400 test image.
 *
 * Requires env vars: KLING_ACCESS_KEY, KLING_SECRET_KEY, IMGBB_API_KEY
 * (reads from .env.local automatically via dotenv)
 */

import crypto from "crypto";
import fs from "fs";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(__dirname, "../../.env.local") });

const KLING_BASE_URL = "https://api.klingai.com";
const KLING_OMNI_PATH = "/v1/videos/omni-video";
const POLL_INTERVAL_MS = 10_000; // 10s
const MAX_POLL_DURATION_MS = 5 * 60_000; // 5 minutes

/** Load image from CLI arg or generate a 400x400 white PNG that meets Kling's min 300x300 */
function getImageBase64(): string {
  const imagePath = process.argv[2];

  if (imagePath) {
    const absPath = resolve(imagePath);
    if (!fs.existsSync(absPath)) {
      console.error(`File not found: ${absPath}`);
      process.exit(1);
    }
    const bytes = fs.readFileSync(absPath);
    console.log(`[image] Loaded ${absPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
    return bytes.toString("base64");
  }

  // Generate minimal valid PNG (400x400 white) — meets Kling's 300x300 minimum
  console.log("[image] No file provided, generating 400x400 white PNG...");
  // PNG signature + IHDR + single IDAT (zlib-compressed scanlines) + IEND
  // This creates a valid 400x400 white PNG
  const width = 400;
  const height = 400;

  // Build raw scanlines: filter byte (0) + width * 3 bytes (RGB white)
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height, 0xff);
  for (let y = 0; y < height; y++) raw[y * rowSize] = 0; // filter byte

  const zlib = require("zlib");
  const compressed = zlib.deflateSync(raw);

  const png = Buffer.concat([
    // PNG signature
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    // IHDR
    pngChunk("IHDR", Buffer.concat([
      uint32(width), uint32(height),
      Buffer.from([8, 2, 0, 0, 0]), // 8-bit RGB
    ])),
    // IDAT
    pngChunk("IDAT", compressed),
    // IEND
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  console.log(`[image] Generated PNG: ${(png.length / 1024).toFixed(1)} KB`);
  return png.toString("base64");
}

function uint32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const zlib = require("zlib");
  const typeData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typeData) >>> 0);
  return Buffer.concat([uint32(data.length), typeData, crc]);
}

// ─── JWT ───
function generateJwtToken(): string {
  const accessKey = process.env.KLING_ACCESS_KEY!;
  const secretKey = process.env.KLING_SECRET_KEY!;
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now })
  );
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── imgbb upload ───
async function uploadToImgbb(base64Image: string): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY not set");

  console.log("[imgbb] Uploading image...");
  const formData = new URLSearchParams();
  formData.append("key", apiKey);
  formData.append("image", base64Image);
  formData.append("expiration", "600");

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(`imgbb failed: ${JSON.stringify(data)}`);

  console.log("[imgbb] Success:", data.data.url);
  return data.data.url;
}

// ─── Kling API call ───
async function klingFetch(path: string, options: { method: string; body?: unknown }) {
  const token = generateJwtToken();
  const url = `${KLING_BASE_URL}${path}`;

  console.log(`[kling] ${options.method} ${path}`);

  const res = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  return { httpStatus: res.status, ...data };
}

// ─── Main ───
async function main() {
  console.log("=== Kling 3.0 Omni Test ===\n");

  // Verify env
  for (const key of ["KLING_ACCESS_KEY", "KLING_SECRET_KEY", "IMGBB_API_KEY"]) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key}`);
      process.exit(1);
    }
  }

  // Step 1: Load image and upload to imgbb
  const imageBase64 = getImageBase64();
  const publicUrl = await uploadToImgbb(imageBase64);

  // Step 2: Create Omni task
  console.log("\n[omni] Creating task with image URL:", publicUrl);

  const prompt =
    "Slow cinematic walkthrough of a modern apartment, smooth camera movement, professional architectural visualization @image_1";

  const createResult = await klingFetch(KLING_OMNI_PATH, {
    method: "POST",
    body: {
      model_name: "kling-v3-omni",
      prompt,
      negative_prompt: "blur, distortion, low quality",
      image_list: [{ image_url: publicUrl }],
      aspect_ratio: "16:9",
      mode: "std", // cheaper for testing
      duration: "5", // shortest duration
    },
  });

  console.log("\n[omni] CREATE response:");
  console.log(JSON.stringify(createResult, null, 2));

  if (createResult.code !== 0) {
    console.error("\n[FAILED] Task creation failed. Exiting.");
    process.exit(1);
  }

  const taskId = createResult.data.task_id;
  console.log("\n[omni] Task ID:", taskId);

  // Step 3: Poll
  console.log(`\n[poll] Polling every ${POLL_INTERVAL_MS / 1000}s for up to ${MAX_POLL_DURATION_MS / 60000} minutes...\n`);

  const deadline = Date.now() + MAX_POLL_DURATION_MS;
  let pollCount = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    pollCount++;

    const status = await klingFetch(`${KLING_OMNI_PATH}/${taskId}`, { method: "GET" });

    const taskStatus = status.data?.task_status ?? "unknown";
    const elapsed = Math.round((Date.now() - (deadline - MAX_POLL_DURATION_MS)) / 1000);

    console.log(`\n--- Poll #${pollCount} (${elapsed}s elapsed) ---`);
    console.log("task_status:", taskStatus);
    console.log("Full response:", JSON.stringify(status, null, 2));

    if (taskStatus === "succeed") {
      console.log("\n[SUCCESS] Task completed!");
      const videoUrl =
        status.data?.task_result?.works?.[0]?.resource?.resource ??
        status.data?.task_result?.videos?.[0]?.url ??
        "NOT FOUND";
      console.log("Video URL:", videoUrl);
      process.exit(0);
    }

    if (taskStatus === "failed") {
      console.log("\n[FAILED] Task failed.");
      console.log("Failure message:", status.data?.task_status_msg ?? "unknown");
      process.exit(1);
    }

    if (taskStatus !== "submitted" && taskStatus !== "processing") {
      console.log(`\n[UNKNOWN] Unexpected status: ${taskStatus}`);
    }
  }

  console.log("\n[TIMEOUT] Task never completed within 5 minutes.");
  console.log("Final status was likely still 'submitted' — Omni is broken for our account.");
  process.exit(1);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

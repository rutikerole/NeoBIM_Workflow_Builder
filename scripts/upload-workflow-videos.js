#!/usr/bin/env node
/**
 * Upload workflow demo videos from public/videos/ to R2 CDN.
 *
 * Usage:
 *   node scripts/upload-workflow-videos.js
 *
 * Reads R2 credentials from .env.local
 * Uploads to: workflow-demos/<clean-name>.mp4
 * Public URL:  https://pub-27d9a7371b6d47ff94fee1a3228f1720.r2.dev/workflow-demos/<clean-name>.mp4
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// ─── Load .env.local ─────────────────────────────────────────────────────────

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "buildflow-files";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-27d9a7371b6d47ff94fee1a3228f1720.r2.dev`;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("Missing R2 credentials in .env.local");
  console.error("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// ─── Video mapping: local filename → R2 key ─────────────────────────────────

const VIDEOS = [
  { local: "Text to Conceptual Building.mp4",                     r2Key: "workflow-demos/text-to-concept-building.mp4" },
  { local: "2D Floor Plans into Interactive 3D Model.mp4",         r2Key: "workflow-demos/floorplan-to-3d-model.mp4" },
  { local: "2D Floor Plans into Stunning 3D Video Renderings.mp4", r2Key: "workflow-demos/floorplan-to-3d-video.mp4" },
  { local: "IFC Exporter.mp4",                                     r2Key: "workflow-demos/ifc-exporter.mp4" },
  { local: "pdf_brief_to_3d_rendered_video.mp4",                   r2Key: "workflow-demos/pdf-brief-to-3d-video.mp4" },
  { local: "Text to IFC.mp4",                                      r2Key: "workflow-demos/text-to-ifc.mp4" },
  { local: "Introduction.mp4",                                     r2Key: "workflow-demos/introduction.mp4" },
];

const VIDEOS_DIR = path.join(__dirname, "..", "public", "videos");

// ─── Upload ──────────────────────────────────────────────────────────────────

async function checkExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadVideo(localName, r2Key) {
  const filePath = path.join(VIDEOS_DIR, localName);

  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP  ${localName} (file not found)`);
    return null;
  }

  // Check if already uploaded
  const exists = await checkExists(r2Key);
  if (exists) {
    const url = `${PUBLIC_URL}/${r2Key}`;
    console.log(`  EXISTS ${r2Key} → ${url}`);
    return url;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`  UPLOADING ${localName} (${sizeMB}MB) → ${r2Key} ...`);

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: {
        "uploaded-at": new Date().toISOString(),
        "source": "workflow-showcase",
      },
    }),
  );

  const url = `${PUBLIC_URL}/${r2Key}`;
  console.log(`  DONE  ${r2Key} → ${url}`);
  return url;
}

async function main() {
  console.log("\n📦 Uploading workflow demo videos to R2...\n");
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   Public: ${PUBLIC_URL}\n`);

  const results = [];

  for (const video of VIDEOS) {
    try {
      const url = await uploadVideo(video.local, video.r2Key);
      results.push({ ...video, url, status: url ? "ok" : "skipped" });
    } catch (err) {
      console.error(`  ERROR  ${video.local}: ${err.message}`);
      results.push({ ...video, url: null, status: "error" });
    }
  }

  console.log("\n─── Results ───\n");
  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "skipped" ? "⏭️" : "❌";
    console.log(`${icon}  ${r.local}`);
    if (r.url) console.log(`   → ${r.url}`);
  }

  console.log("\n─── Paste into page.tsx WORKFLOW_VIDEOS ───\n");
  for (const r of results) {
    if (r.url) {
      console.log(`"${r.url}",`);
    }
  }
  console.log("");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

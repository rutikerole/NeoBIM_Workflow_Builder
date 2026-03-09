/**
 * Types for SAM 3D (Meta's image-to-3D) integration via fal.ai
 */

export type Sam3dJobStatus = "pending" | "processing" | "completed" | "failed";

export interface Sam3dRequest {
  imageUrl: string;
  seed?: number;
  textPrompt?: string;
}

export interface Sam3dModelOutput {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export interface Sam3dApiResponse {
  mesh: Sam3dModelOutput;
  gaussian_splat?: Sam3dModelOutput;
  seed: number;
  timings?: Record<string, number>;
}

export interface Sam3dQueueResponse {
  request_id: string;
  status: string;
  response_url?: string;
}

export interface Sam3dModelMetadata {
  requestId: string;
  format: "glb" | "ply";
  fileSize: number;
  downloadUrl: string;
  localPath?: string;
  seed: number;
  createdAt: string;
  expiresAt: string; // fal.ai files expire after 7 days
  costUsd: number;
}

export interface Sam3dConversionJob {
  id: string;
  status: Sam3dJobStatus;
  imageUrl: string;
  requestId?: string;
  glbModel?: Sam3dModelMetadata;
  plyModel?: Sam3dModelMetadata;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Sam3dGenerateRequest {
  imageUrl?: string;
  imageBase64?: string;
  seed?: number;
  textPrompt?: string;
}

export interface Sam3dGenerateResponse {
  jobId: string;
  status: Sam3dJobStatus;
  glbUrl?: string;
  plyUrl?: string;
  metadata?: Sam3dModelMetadata;
}

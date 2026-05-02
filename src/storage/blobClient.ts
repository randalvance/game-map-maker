import { upload } from "@vercel/blob/client";
import {
  CloudStorageError,
  type BlobClient,
  type CloudUrl,
  type ProjectId,
} from "./types";

const SIGN_URL = "/api/blob/sign";
const RESOLVE_URL = "/api/blob/resolve";

const UUIDV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedConfigured: boolean | null = null;

export function _resetCloudConfiguredCache(): void {
  cachedConfigured = null;
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await new Response(blob).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function classifySdkError(err: unknown): CloudStorageError {
  if (err instanceof CloudStorageError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (/maximum|too large|exceeds|size/i.test(message)) {
    return new CloudStorageError("too-large", message, { cause: err });
  }
  if (/forbidden|not permitted|allowed|content[-\s]?type/i.test(message)) {
    return new CloudStorageError("forbidden-key", message, { cause: err });
  }
  if (/network|fetch|timeout|ENOTFOUND|ECONNREFUSED/i.test(message)) {
    return new CloudStorageError("network", message, { cause: err });
  }
  if (/not[-\s]?configured|503/.test(message)) {
    return new CloudStorageError("not-configured", message, { cause: err });
  }
  return new CloudStorageError("unknown", message, { cause: err });
}

export async function isCloudConfigured(): Promise<boolean> {
  if (cachedConfigured !== null) return cachedConfigured;
  try {
    const res = await fetch(SIGN_URL, { method: "HEAD" });
    cachedConfigured = res.ok;
  } catch {
    cachedConfigured = false;
  }
  return cachedConfigured;
}

export async function uploadTilesetImage(blob: Blob): Promise<CloudUrl> {
  if (blob.type && blob.type !== "image/png") {
    throw new CloudStorageError(
      "forbidden-key",
      `tileset must be image/png, got ${blob.type}`,
    );
  }
  const hash = await sha256Hex(blob);
  try {
    const result = await upload(`tilesets/${hash}.png`, blob, {
      access: "public",
      handleUploadUrl: SIGN_URL,
      contentType: "image/png",
    });
    return result.url;
  } catch (err) {
    throw classifySdkError(err);
  }
}

export async function uploadProjectJson(
  json: string,
  projectId: ProjectId,
): Promise<CloudUrl> {
  if (!UUIDV4.test(projectId)) {
    throw new CloudStorageError(
      "forbidden-key",
      `projectId must be a UUIDv4, got '${projectId}'`,
    );
  }
  const blob = new Blob([json], { type: "application/json" });
  try {
    const result = await upload(`projects/${projectId}.json`, blob, {
      access: "public",
      handleUploadUrl: SIGN_URL,
      contentType: "application/json",
    });
    return result.url;
  } catch (err) {
    throw classifySdkError(err);
  }
}

export function extractProjectId(input: string): string | null {
  const trimmed = input.trim();
  if (UUIDV4.test(trimmed)) return trimmed;
  const m = trimmed.match(/projects\/([0-9a-f-]+)\.json/i);
  if (m && UUIDV4.test(m[1])) return m[1];
  return null;
}

async function resolveProjectUrl(id: ProjectId): Promise<string> {
  const res = await fetch(`${RESOLVE_URL}?id=${encodeURIComponent(id)}`);
  if (res.status === 503) {
    throw new CloudStorageError(
      "not-configured",
      "Cloud storage isn't configured for this deployment",
    );
  }
  if (res.status === 404) {
    throw new CloudStorageError("not-found", `No project found with ID ${id}`);
  }
  if (!res.ok) {
    throw new CloudStorageError(
      "network",
      `Resolve failed: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new CloudStorageError(
      "unknown",
      "Resolve endpoint returned no URL",
    );
  }
  return data.url;
}

export async function fetchProjectJson(idOrUrl: string): Promise<string> {
  const id = extractProjectId(idOrUrl);
  if (!id) {
    throw new CloudStorageError(
      "forbidden-key",
      "Input must be a project UUID or a Blob URL ending in /projects/<uuid>.json",
    );
  }

  const trimmed = idOrUrl.trim();
  const isFullUrl = /^https:\/\//i.test(trimmed) && trimmed.includes(`projects/${id}.json`);
  const url = isFullUrl ? trimmed : await resolveProjectUrl(id);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new CloudStorageError(
      "network",
      `Could not fetch project JSON: ${(err as Error).message}`,
      { cause: err },
    );
  }
  if (res.status === 404) {
    throw new CloudStorageError("not-found", `No project found at ${url}`);
  }
  if (!res.ok) {
    throw new CloudStorageError(
      "network",
      `Fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  return await res.text();
}

export const blobClient: BlobClient = {
  uploadTilesetImage,
  uploadProjectJson,
  fetchProjectJson,
  isCloudConfigured,
};

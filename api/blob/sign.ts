import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const HEX64 = /^[0-9a-f]{64}$/;
const UUIDV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TILESET_PATH = /^tilesets\/([0-9a-f]+)\.png$/;
const SPRITE_PATH = /^sprites\/([0-9a-f]+)\.png$/;
const PROJECT_PATH = /^projects\/([0-9a-f-]+)\.json$/;

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const PROJECT_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_CACHE_MAX_AGE = 31_536_000;

type PathKind = "tileset" | "sprite" | "project";

class ForbiddenKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenKeyError";
  }
}

function classifyPath(pathname: string): PathKind {
  let m = pathname.match(TILESET_PATH);
  if (m && HEX64.test(m[1])) return "tileset";
  m = pathname.match(SPRITE_PATH);
  if (m && HEX64.test(m[1])) return "sprite";
  m = pathname.match(PROJECT_PATH);
  if (m && UUIDV4.test(m[1])) return "project";
  throw new ForbiddenKeyError(`pathname '${pathname}' is not permitted`);
}

type TokenOptions = {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  cacheControlMaxAge: number;
  addRandomSuffix: boolean;
  allowOverwrite: boolean;
  tokenPayload: string;
};

function tokenOptionsFor(kind: PathKind): TokenOptions {
  if (kind === "project") {
    return {
      allowedContentTypes: ["application/json"],
      maximumSizeInBytes: PROJECT_MAX_BYTES,
      cacheControlMaxAge: 0,
      addRandomSuffix: false,
      allowOverwrite: true,
      tokenPayload: kind,
    };
  }
  return {
    allowedContentTypes: ["image/png"],
    maximumSizeInBytes: IMAGE_MAX_BYTES,
    cacheControlMaxAge: IMAGE_CACHE_MAX_AGE,
    addRandomSuffix: false,
    allowOverwrite: false,
    tokenPayload: kind,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === "HEAD") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(503).end();
      return;
    }
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, HEAD");
    res.status(405).json({ kind: "method-not-allowed" });
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    res.status(503).json({
      kind: "not-configured",
      message: "Cloud storage isn't configured for this deployment",
    });
    return;
  }

  const body = req.body as HandleUploadBody;
  const request = new Request(
    `https://${req.headers.host ?? "localhost"}${req.url ?? "/api/blob/sign"}`,
    {
      method: "POST",
      headers: req.headers as Record<string, string>,
    },
  );

  try {
    const json = await handleUpload({
      token,
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const kind = classifyPath(pathname);
        return tokenOptionsFor(kind);
      },
    });
    res.status(200).json(json);
  } catch (err) {
    if (err instanceof ForbiddenKeyError) {
      res.status(400).json({ kind: "forbidden-key", message: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/maximum|too large|size/i.test(message)) {
      res.status(413).json({ kind: "too-large", message });
      return;
    }
    if (/content[-\s]?type|allowed/i.test(message)) {
      res.status(400).json({ kind: "forbidden-key", message });
      return;
    }
    res.status(400).json({ kind: "unknown", message });
  }
}

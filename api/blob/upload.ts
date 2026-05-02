import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

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

function classifyPath(pathname: string): PathKind | null {
  let m = pathname.match(TILESET_PATH);
  if (m && HEX64.test(m[1])) return "tileset";
  m = pathname.match(SPRITE_PATH);
  if (m && HEX64.test(m[1])) return "sprite";
  m = pathname.match(PROJECT_PATH);
  if (m && UUIDV4.test(m[1])) return "project";
  return null;
}

function constraintsFor(kind: PathKind) {
  if (kind === "project") {
    return {
      contentType: "application/json",
      maxBytes: PROJECT_MAX_BYTES,
      cacheControlMaxAge: 0,
      allowOverwrite: true,
    };
  }
  return {
    contentType: "image/png",
    maxBytes: IMAGE_MAX_BYTES,
    cacheControlMaxAge: IMAGE_CACHE_MAX_AGE,
    allowOverwrite: true,
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("payload-too-large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const pathHeader = req.headers["x-blob-pathname"];
  const pathname = Array.isArray(pathHeader) ? pathHeader[0] : pathHeader;
  if (!pathname) {
    res.status(400).json({ kind: "forbidden-key", message: "missing x-blob-pathname header" });
    return;
  }

  const kind = classifyPath(pathname);
  if (!kind) {
    res.status(400).json({ kind: "forbidden-key", message: `pathname '${pathname}' is not permitted` });
    return;
  }

  const constraints = constraintsFor(kind);
  const incomingType = req.headers["content-type"]?.toString() ?? "";
  if (!incomingType.startsWith(constraints.contentType)) {
    res.status(400).json({
      kind: "forbidden-key",
      message: `expected content-type '${constraints.contentType}', got '${incomingType}'`,
    });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = await readBody(req, constraints.maxBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "payload-too-large") {
      res.status(413).json({
        kind: "too-large",
        message: `upload exceeds ${constraints.maxBytes} bytes`,
      });
      return;
    }
    res.status(400).json({ kind: "network", message });
    return;
  }

  try {
    const result = await put(pathname, buffer, {
      access: "public",
      token,
      contentType: constraints.contentType,
      cacheControlMaxAge: constraints.cacheControlMaxAge,
      allowOverwrite: constraints.allowOverwrite,
      addRandomSuffix: false,
    });
    res.status(200).json({ url: result.url, pathname: result.pathname });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ kind: "unknown", message });
  }
}

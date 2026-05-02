import type { VercelRequest, VercelResponse } from "@vercel/node";
import { head } from "@vercel/blob";

const UUIDV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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

  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id || !UUIDV4.test(id)) {
    res.status(400).json({ kind: "forbidden-key", message: "id must be a UUIDv4" });
    return;
  }

  try {
    const blob = await head(`projects/${id}.json`, { token });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not[\s-]?found|404/i.test(message)) {
      res.status(404).json({ kind: "not-found", message: `No project ${id}` });
      return;
    }
    res.status(500).json({ kind: "unknown", message });
  }
}

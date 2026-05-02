import {
  CURRENT_SCHEMA_VERSION,
  type MapProject,
  type SchemaVersion,
  type TileLayer,
} from "@/model/types";

export const AUTOSAVE_KEY = "gmm:project";

const UUIDV4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export function serializeProject(project: MapProject): string {
  const out: MapProject = { ...project, version: CURRENT_SCHEMA_VERSION };
  return JSON.stringify(out);
}

export function deserializeProject(text: string): MapProject {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ProjectValidationError(
      `Invalid JSON: ${(e as Error).message}`,
    );
  }
  return validateProject(raw);
}

export function validateProject(raw: unknown): MapProject {
  if (!isObject(raw)) throw fail("root must be an object");

  const versionRaw = raw.version;
  if (
    typeof versionRaw !== "number" ||
    !Number.isInteger(versionRaw) ||
    versionRaw < 1
  ) {
    throw fail("missing or invalid version");
  }
  if (versionRaw > CURRENT_SCHEMA_VERSION) {
    throw fail(
      `project version ${versionRaw} is newer than this editor (${CURRENT_SCHEMA_VERSION}). Please update the editor.`,
    );
  }
  const version = versionRaw as SchemaVersion;

  const width = numericField(raw, "width");
  const height = numericField(raw, "height");
  numericField(raw, "tileSize");

  const tileset = raw.tileset;
  if (!isObject(tileset)) throw fail("missing tileset");
  validateTilesetSrc(tileset.src, version);

  const layers = raw.layers;
  if (!Array.isArray(layers)) throw fail("layers must be an array");
  for (const layer of layers) validateLayer(layer, width, height);

  const entities = raw.entities;
  if (!Array.isArray(entities)) throw fail("entities must be an array");

  const collision = raw.collision;
  if (!Array.isArray(collision) || collision.length !== width * height) {
    throw fail(`collision must be a boolean array of length ${width * height}`);
  }
  if (!collision.every((v) => typeof v === "boolean")) {
    throw fail("collision entries must all be boolean");
  }

  if ("projectId" in raw && raw.projectId !== undefined) {
    if (typeof raw.projectId !== "string" || !UUIDV4_RE.test(raw.projectId)) {
      throw fail("projectId must be a UUIDv4 string when present");
    }
  }

  return {
    ...(raw as MapProject),
    version,
  };
}

function validateTilesetSrc(src: unknown, version: SchemaVersion): void {
  if (typeof src !== "string") throw fail("tileset.src must be a string");
  if (src === "") return;
  if (src.startsWith("data:image/")) return;
  if (version >= 2 && /^https:\/\//i.test(src)) return;
  throw fail(
    version === 1
      ? "tileset.src in a v1 file must be empty or a data: URL"
      : "tileset.src must be empty, a data: URL, or an https: URL",
  );
}

function validateLayer(layer: unknown, width: number, height: number): asserts layer is TileLayer {
  if (!isObject(layer)) throw fail("layer must be an object");
  if (typeof layer.id !== "string" || typeof layer.name !== "string") {
    throw fail("layer missing id/name");
  }
  if (typeof layer.visible !== "boolean") throw fail("layer.visible must be boolean");
  if (!Array.isArray(layer.tiles) || layer.tiles.length !== width * height) {
    throw fail(`layer.tiles must have length ${width * height}`);
  }
  if (!layer.tiles.every((t: unknown) => typeof t === "number")) {
    throw fail("layer.tiles entries must all be numbers");
  }
}

function numericField(raw: Record<string, unknown>, name: string): number {
  const value = raw[name];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw fail(`missing or invalid ${name}`);
  }
  return value;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function fail(msg: string): ProjectValidationError {
  return new ProjectValidationError(msg);
}

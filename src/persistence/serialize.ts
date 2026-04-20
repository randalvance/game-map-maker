import {
  CURRENT_SCHEMA_VERSION,
  type MapProject,
  type TileLayer,
} from "@/model/types";

export const AUTOSAVE_KEY = "gmm:project";

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export function serializeProject(project: MapProject): string {
  return JSON.stringify(project);
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

  const version = raw.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw fail("missing or invalid version");
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw fail(
      `project version ${version} is newer than this editor (${CURRENT_SCHEMA_VERSION}). Please update the editor.`,
    );
  }

  const width = numericField(raw, "width");
  const height = numericField(raw, "height");
  numericField(raw, "tileSize");

  const tileset = raw.tileset;
  if (!isObject(tileset)) throw fail("missing tileset");

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

  return {
    ...(raw as MapProject),
    version: CURRENT_SCHEMA_VERSION,
  };
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

import { Assets, Texture, Rectangle } from "pixi.js";
import { computeTileGrid, type TilesetGeometry } from "./slicing";
import type { TilesetMeta } from "@/model/types";

export type LoadedTileset = {
  meta: TilesetMeta;
  source: Texture;
  tileTextures: Texture[];
  cols: number;
  rows: number;
};

export type LoadTilesetSource = Blob | string;

export type LoadTilesetOptions = {
  tileWidth: number;
  tileHeight: number;
  margin?: number;
  spacing?: number;
};

export class TilesetLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TilesetLoadError";
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function isUrl(source: LoadTilesetSource): source is string {
  return typeof source === "string";
}

export async function loadTileset(
  source: LoadTilesetSource,
  options: LoadTilesetOptions,
): Promise<LoadedTileset> {
  const src = isUrl(source) ? source : await blobToDataUrl(source);

  let texture: Texture;
  try {
    texture = await Assets.load<Texture>({
      src,
      loadParser: "loadTextures",
      data: { crossOrigin: "anonymous" },
    });
  } catch (err) {
    if (isUrl(source)) {
      throw new TilesetLoadError(
        `Could not load tileset from ${source}. The image may have moved or be unavailable. Re-import the tileset from a local file to recover.`,
        { cause: err },
      );
    }
    throw new TilesetLoadError(
      `Could not parse tileset image: ${(err as Error).message}`,
      { cause: err },
    );
  }

  const geometry: TilesetGeometry = {
    imageWidth: texture.width,
    imageHeight: texture.height,
    tileWidth: options.tileWidth,
    tileHeight: options.tileHeight,
    margin: options.margin ?? 0,
    spacing: options.spacing ?? 0,
  };

  const grid = computeTileGrid(geometry);

  const tileTextures = grid.rects.map(
    (r) =>
      new Texture({
        source: texture.source,
        frame: new Rectangle(r.x, r.y, r.width, r.height),
      }),
  );

  return {
    meta: {
      src,
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
      margin: options.margin ?? 0,
      spacing: options.spacing ?? 0,
    },
    source: texture,
    tileTextures,
    cols: grid.cols,
    rows: grid.rows,
  };
}

export const loadTilesetFromBlob = loadTileset;

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

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function loadTilesetFromBlob(
  blob: Blob,
  options: {
    tileWidth: number;
    tileHeight: number;
    margin?: number;
    spacing?: number;
  },
): Promise<LoadedTileset> {
  const dataUrl = await blobToDataUrl(blob);
  const source = await Assets.load<Texture>({ src: dataUrl, loadParser: "loadTextures" });

  const geometry: TilesetGeometry = {
    imageWidth: source.width,
    imageHeight: source.height,
    tileWidth: options.tileWidth,
    tileHeight: options.tileHeight,
    margin: options.margin ?? 0,
    spacing: options.spacing ?? 0,
  };

  const grid = computeTileGrid(geometry);

  const tileTextures = grid.rects.map(
    (r) =>
      new Texture({
        source: source.source,
        frame: new Rectangle(r.x, r.y, r.width, r.height),
      }),
  );

  return {
    meta: {
      src: dataUrl,
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
      margin: options.margin ?? 0,
      spacing: options.spacing ?? 0,
    },
    source,
    tileTextures,
    cols: grid.cols,
    rows: grid.rows,
  };
}

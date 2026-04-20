import type { Texture } from "pixi.js";
import type { LoadedTileset } from "@/tileset/loadTileset";

let current: LoadedTileset | null = null;

export function setLoadedTileset(loaded: LoadedTileset | null): void {
  current = loaded;
}

export function getLoadedTileset(): LoadedTileset | null {
  return current;
}

export function getTileTexture(index: number): Texture | null {
  if (!current) return null;
  return current.tileTextures[index] ?? null;
}

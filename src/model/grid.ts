import { v4 as uuid } from "uuid";
import { EMPTY_TILE, type TileLayer } from "./types";

export function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

export function coordsOf(i: number, width: number): { x: number; y: number } {
  return { x: i % width, y: Math.floor(i / width) };
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function createEmptyLayer(
  name: string,
  width: number,
  height: number,
  options: { visible?: boolean; id?: string } = {},
): TileLayer {
  return {
    id: options.id ?? uuid(),
    name,
    visible: options.visible ?? true,
    tiles: new Array(width * height).fill(EMPTY_TILE),
  };
}

export function createWalkableGrid(width: number, height: number): boolean[] {
  return new Array(width * height).fill(true);
}

import { createEmptyLayer, createWalkableGrid } from "./grid";
import {
  CURRENT_SCHEMA_VERSION,
  type MapProject,
  type TilesetMeta,
} from "./types";

export const DEFAULT_TILE_SIZE = 16;

export function emptyTileset(): TilesetMeta {
  return {
    src: "",
    tileWidth: DEFAULT_TILE_SIZE,
    tileHeight: DEFAULT_TILE_SIZE,
    margin: 0,
    spacing: 0,
  };
}

export function createNewProject(
  width = 32,
  height = 32,
  tileSize = DEFAULT_TILE_SIZE,
): MapProject {
  return {
    version: CURRENT_SCHEMA_VERSION,
    width,
    height,
    tileSize,
    tileset: emptyTileset(),
    layers: [
      createEmptyLayer("ground", width, height),
      createEmptyLayer("decoration", width, height),
    ],
    entities: [],
    collision: createWalkableGrid(width, height),
  };
}

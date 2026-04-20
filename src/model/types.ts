export type TileIndex = number;
export const EMPTY_TILE: TileIndex = -1;

export const CURRENT_SCHEMA_VERSION = 1;

export type TileLayer = {
  id: string;
  name: string;
  visible: boolean;
  tiles: TileIndex[];
};

export type ObjectPropertyValue = string | number | boolean;

export type GameObject = {
  id: string;
  type: string;
  x: number;
  y: number;
  properties: Record<string, ObjectPropertyValue>;
};

export type TilesetMeta = {
  src: string;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
};

export type MapProject = {
  version: typeof CURRENT_SCHEMA_VERSION;
  width: number;
  height: number;
  tileSize: number;
  tileset: TilesetMeta;
  layers: TileLayer[];
  entities: GameObject[];
  collision: boolean[];
};

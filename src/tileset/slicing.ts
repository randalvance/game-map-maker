export type TilesetGeometry = {
  imageWidth: number;
  imageHeight: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
};

export type TileRect = {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export class TilesetGeometryError extends Error {}

export function computeTileGrid(g: TilesetGeometry): {
  cols: number;
  rows: number;
  total: number;
  rects: TileRect[];
} {
  if (g.imageWidth <= 0 || g.imageHeight <= 0) {
    throw new TilesetGeometryError("image dimensions must be positive");
  }
  if (g.tileWidth <= 0 || g.tileHeight <= 0) {
    throw new TilesetGeometryError("tile dimensions must be positive");
  }
  if (g.margin < 0 || g.spacing < 0) {
    throw new TilesetGeometryError("margin and spacing must be non-negative");
  }

  const usableW = g.imageWidth - 2 * g.margin;
  const usableH = g.imageHeight - 2 * g.margin;
  if (usableW < g.tileWidth || usableH < g.tileHeight) {
    throw new TilesetGeometryError(
      "tile size larger than usable area after margin",
    );
  }

  const cols = Math.floor((usableW + g.spacing) / (g.tileWidth + g.spacing));
  const rows = Math.floor((usableH + g.spacing) / (g.tileHeight + g.spacing));
  const total = cols * rows;

  const rects: TileRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rects.push({
        index: row * cols + col,
        col,
        row,
        x: g.margin + col * (g.tileWidth + g.spacing),
        y: g.margin + row * (g.tileHeight + g.spacing),
        width: g.tileWidth,
        height: g.tileHeight,
      });
    }
  }

  return { cols, rows, total, rects };
}

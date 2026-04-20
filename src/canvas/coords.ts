export type Camera = {
  zoom: number;
  panX: number;
  panY: number;
};

export type CellCoord = { x: number; y: number };

export function screenToCell(
  screenX: number,
  screenY: number,
  camera: Camera,
  tileSize: number,
): CellCoord {
  const worldX = (screenX - camera.panX) / camera.zoom;
  const worldY = (screenY - camera.panY) / camera.zoom;
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}

export function cellToWorld(
  cellX: number,
  cellY: number,
  tileSize: number,
): { x: number; y: number } {
  return { x: cellX * tileSize, y: cellY * tileSize };
}

export function clampCell(
  cell: CellCoord,
  width: number,
  height: number,
): CellCoord | null {
  if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return null;
  return cell;
}

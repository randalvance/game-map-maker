import { indexOf } from "@/model/grid";
import type { TileIndex } from "@/model/types";

export type FloodCell = { x: number; y: number };

export function floodFill(
  tiles: readonly TileIndex[],
  width: number,
  height: number,
  startX: number,
  startY: number,
): FloodCell[] {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return [];
  const target = tiles[indexOf(startX, startY, width)];
  const visited = new Uint8Array(width * height);
  const queue: FloodCell[] = [{ x: startX, y: startY }];
  const result: FloodCell[] = [];

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const i = indexOf(cell.x, cell.y, width);
    if (visited[i]) continue;
    if (tiles[i] !== target) continue;
    visited[i] = 1;
    result.push(cell);

    if (cell.x > 0) queue.push({ x: cell.x - 1, y: cell.y });
    if (cell.x < width - 1) queue.push({ x: cell.x + 1, y: cell.y });
    if (cell.y > 0) queue.push({ x: cell.x, y: cell.y - 1 });
    if (cell.y < height - 1) queue.push({ x: cell.x, y: cell.y + 1 });
  }

  return result;
}

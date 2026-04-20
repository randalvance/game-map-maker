export type LineCell = { x: number; y: number };

/**
 * Bresenham line between two cells (inclusive on both ends).
 * Used to fill gaps when pointermove events are sparse.
 */
export function lineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): LineCell[] {
  const cells: LineCell[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

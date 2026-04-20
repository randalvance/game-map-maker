import type { Graphics } from "pixi.js";

export function drawCollisionOverlay(
  g: Graphics,
  collision: readonly boolean[],
  width: number,
  tileSize: number,
  visible: boolean,
): void {
  g.clear();
  if (!visible) return;

  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < collision.length; i++) {
    if (collision[i]) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    cells.push({ x, y });
  }
  if (cells.length === 0) return;

  for (const { x, y } of cells) {
    g.rect(x * tileSize, y * tileSize, tileSize, tileSize);
  }
  g.fill({ color: 0xef4444, alpha: 0.4 });
}

import type { Graphics } from "pixi.js";

export type GridState = {
  width: number;
  height: number;
  tileSize: number;
  visible: boolean;
};

export function drawGrid(g: Graphics, state: GridState): void {
  g.clear();
  if (!state.visible) return;

  const { width, height, tileSize } = state;
  const totalW = width * tileSize;
  const totalH = height * tileSize;
  g.setStrokeStyle({ width: 1, color: 0x2a2a34, alignment: 0.5 });

  for (let x = 0; x <= width; x++) {
    g.moveTo(x * tileSize, 0).lineTo(x * tileSize, totalH);
  }
  for (let y = 0; y <= height; y++) {
    g.moveTo(0, y * tileSize).lineTo(totalW, y * tileSize);
  }
  g.stroke();
}

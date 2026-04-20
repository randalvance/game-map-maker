import { describe, expect, it } from "vitest";
import { lineCells } from "./line";

describe("lineCells (Bresenham)", () => {
  it("returns single cell when start equals end", () => {
    expect(lineCells(3, 4, 3, 4)).toEqual([{ x: 3, y: 4 }]);
  });

  it("horizontal line", () => {
    expect(lineCells(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("vertical line", () => {
    expect(lineCells(0, 0, 0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ]);
  });

  it("45-degree diagonal", () => {
    expect(lineCells(0, 0, 3, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });

  it("reverse direction works symmetrically", () => {
    expect(lineCells(3, 0, 0, 0)).toEqual([
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("shallow slope fills gaps monotonically", () => {
    const cells = lineCells(0, 0, 5, 2);
    // every step should advance x or y by 1 (no gaps)
    for (let i = 1; i < cells.length; i++) {
      const dx = Math.abs(cells[i].x - cells[i - 1].x);
      const dy = Math.abs(cells[i].y - cells[i - 1].y);
      expect(dx + dy).toBeGreaterThan(0);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dy).toBeLessThanOrEqual(1);
    }
    // endpoints included
    expect(cells[0]).toEqual({ x: 0, y: 0 });
    expect(cells[cells.length - 1]).toEqual({ x: 5, y: 2 });
  });
});

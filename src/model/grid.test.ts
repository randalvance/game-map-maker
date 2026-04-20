import { describe, expect, it } from "vitest";
import {
  coordsOf,
  createEmptyLayer,
  createWalkableGrid,
  inBounds,
  indexOf,
} from "./grid";
import { EMPTY_TILE } from "./types";

describe("indexOf / coordsOf", () => {
  it.each([
    [0, 0, 10],
    [9, 0, 10],
    [0, 9, 10],
    [5, 7, 13],
    [12, 12, 13],
  ])("round-trips (%i, %i) at width %i", (x, y, w) => {
    const i = indexOf(x, y, w);
    expect(coordsOf(i, w)).toEqual({ x, y });
  });

  it("indexOf(0,0,W) === 0 for any width", () => {
    expect(indexOf(0, 0, 1)).toBe(0);
    expect(indexOf(0, 0, 16)).toBe(0);
  });

  it("coordsOf at a 1x1 grid yields (0,0)", () => {
    expect(coordsOf(0, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe("inBounds", () => {
  it("accepts cells inside a 4x3 grid and rejects outside", () => {
    expect(inBounds(0, 0, 4, 3)).toBe(true);
    expect(inBounds(3, 2, 4, 3)).toBe(true);
    expect(inBounds(-1, 0, 4, 3)).toBe(false);
    expect(inBounds(0, -1, 4, 3)).toBe(false);
    expect(inBounds(4, 0, 4, 3)).toBe(false);
    expect(inBounds(0, 3, 4, 3)).toBe(false);
  });
});

describe("createEmptyLayer", () => {
  it("creates an array of width*height EMPTY_TILE values", () => {
    const layer = createEmptyLayer("ground", 3, 2);
    expect(layer.tiles).toHaveLength(6);
    expect(layer.tiles.every((t) => t === EMPTY_TILE)).toBe(true);
    expect(layer.name).toBe("ground");
    expect(layer.visible).toBe(true);
    expect(layer.id).toMatch(/-/);
  });

  it("supports a 1x1 layer", () => {
    const layer = createEmptyLayer("solo", 1, 1);
    expect(layer.tiles).toEqual([EMPTY_TILE]);
  });

  it("supports a 0x0 layer (no tiles allocated)", () => {
    const layer = createEmptyLayer("empty", 0, 0);
    expect(layer.tiles).toEqual([]);
  });

  it("honors overrides", () => {
    const layer = createEmptyLayer("hidden", 2, 2, { visible: false, id: "fixed" });
    expect(layer.id).toBe("fixed");
    expect(layer.visible).toBe(false);
  });
});

describe("createWalkableGrid", () => {
  it("creates width*height booleans, all true", () => {
    const grid = createWalkableGrid(4, 3);
    expect(grid).toHaveLength(12);
    expect(grid.every((v) => v === true)).toBe(true);
  });

  it("is empty for 0x0", () => {
    expect(createWalkableGrid(0, 0)).toEqual([]);
  });
});

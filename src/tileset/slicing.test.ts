import { describe, expect, it } from "vitest";
import { TilesetGeometryError, computeTileGrid } from "./slicing";

describe("computeTileGrid", () => {
  it("32x32 image at 16x16 with no margin/spacing yields 4 tiles", () => {
    const g = computeTileGrid({
      imageWidth: 32,
      imageHeight: 32,
      tileWidth: 16,
      tileHeight: 16,
      margin: 0,
      spacing: 0,
    });
    expect(g).toMatchObject({ cols: 2, rows: 2, total: 4 });
    expect(g.rects[0]).toMatchObject({ index: 0, col: 0, row: 0, x: 0, y: 0 });
    expect(g.rects[3]).toMatchObject({ index: 3, col: 1, row: 1, x: 16, y: 16 });
  });

  it("respects spacing between tiles", () => {
    const g = computeTileGrid({
      imageWidth: 34,
      imageHeight: 34,
      tileWidth: 16,
      tileHeight: 16,
      margin: 0,
      spacing: 2,
    });
    expect(g).toMatchObject({ cols: 2, rows: 2, total: 4 });
    expect(g.rects[1]).toMatchObject({ x: 18, y: 0 });
    expect(g.rects[3]).toMatchObject({ x: 18, y: 18 });
  });

  it("respects margin around the image", () => {
    const g = computeTileGrid({
      imageWidth: 36,
      imageHeight: 36,
      tileWidth: 16,
      tileHeight: 16,
      margin: 2,
      spacing: 0,
    });
    expect(g).toMatchObject({ cols: 2, rows: 2, total: 4 });
    expect(g.rects[0]).toMatchObject({ x: 2, y: 2 });
  });

  it("supports non-square tiles", () => {
    const g = computeTileGrid({
      imageWidth: 48,
      imageHeight: 32,
      tileWidth: 16,
      tileHeight: 8,
      margin: 0,
      spacing: 0,
    });
    expect(g).toMatchObject({ cols: 3, rows: 4, total: 12 });
  });

  it("throws when tile is larger than usable area", () => {
    expect(() =>
      computeTileGrid({
        imageWidth: 16,
        imageHeight: 16,
        tileWidth: 32,
        tileHeight: 32,
        margin: 0,
        spacing: 0,
      }),
    ).toThrow(TilesetGeometryError);
  });

  it("throws on non-positive image or tile dimensions", () => {
    expect(() =>
      computeTileGrid({
        imageWidth: 0,
        imageHeight: 16,
        tileWidth: 16,
        tileHeight: 16,
        margin: 0,
        spacing: 0,
      }),
    ).toThrow();
    expect(() =>
      computeTileGrid({
        imageWidth: 16,
        imageHeight: 16,
        tileWidth: 0,
        tileHeight: 16,
        margin: 0,
        spacing: 0,
      }),
    ).toThrow();
  });
});

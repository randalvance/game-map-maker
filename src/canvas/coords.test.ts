import { describe, expect, it } from "vitest";
import { clampCell, screenToCell } from "./coords";

describe("screenToCell", () => {
  it("at zoom 1 / no pan, screen pixel (33, 17) at tileSize 16 maps to cell (2, 1)", () => {
    expect(
      screenToCell(33, 17, { zoom: 1, panX: 0, panY: 0 }, 16),
    ).toEqual({ x: 2, y: 1 });
  });

  it("accounts for pan offset", () => {
    expect(
      screenToCell(50, 50, { zoom: 1, panX: 50, panY: 50 }, 16),
    ).toEqual({ x: 0, y: 0 });
  });

  it("accounts for zoom", () => {
    // World pixel 16 means cell 1 at tileSize 16. With zoom 2, that lives at screen pixel 32.
    expect(
      screenToCell(32, 0, { zoom: 2, panX: 0, panY: 0 }, 16),
    ).toEqual({ x: 1, y: 0 });
  });

  it("returns negative cells for screen positions left/above origin", () => {
    expect(
      screenToCell(-1, -1, { zoom: 1, panX: 0, panY: 0 }, 16),
    ).toEqual({ x: -1, y: -1 });
  });
});

describe("clampCell", () => {
  it("returns the cell when in bounds", () => {
    expect(clampCell({ x: 0, y: 0 }, 4, 3)).toEqual({ x: 0, y: 0 });
    expect(clampCell({ x: 3, y: 2 }, 4, 3)).toEqual({ x: 3, y: 2 });
  });
  it("returns null when out of bounds", () => {
    expect(clampCell({ x: -1, y: 0 }, 4, 3)).toBeNull();
    expect(clampCell({ x: 4, y: 0 }, 4, 3)).toBeNull();
    expect(clampCell({ x: 0, y: 3 }, 4, 3)).toBeNull();
  });
});

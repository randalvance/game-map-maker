import { describe, expect, it } from "vitest";
import { floodFill } from "./floodFill";
import { EMPTY_TILE } from "@/model/types";

const E = EMPTY_TILE;

describe("floodFill", () => {
  it("fills an entirely-empty grid from any starting cell", () => {
    const tiles = [E, E, E, E, E, E];
    const cells = floodFill(tiles, 3, 2, 1, 1);
    expect(cells).toHaveLength(6);
  });

  it("stops at boundary tiles of a different value", () => {
    // 4x4 grid, a wall of 7s splitting top from bottom rows
    // row 0: E E E E
    // row 1: 7 7 7 7
    // row 2: E E E E
    // row 3: E E E E
    const tiles = [
      E, E, E, E,
      7, 7, 7, 7,
      E, E, E, E,
      E, E, E, E,
    ];
    const top = floodFill(tiles, 4, 4, 0, 0);
    expect(top).toHaveLength(4);

    const bottom = floodFill(tiles, 4, 4, 0, 2);
    expect(bottom).toHaveLength(8);
  });

  it("uses 4-connectivity, not 8 (diagonals do not bridge)", () => {
    // 3x3 with a diagonal of 9s; flood from (0,0) should not cross the diagonal
    const tiles = [
      E, E, 9,
      E, 9, E,
      9, E, E,
    ];
    const cells = floodFill(tiles, 3, 3, 0, 0);
    // Reachable from (0,0) without crossing 9s: (0,0), (1,0), (0,1) only
    expect(cells.map((c) => `${c.x},${c.y}`).sort()).toEqual(["0,0", "0,1", "1,0"]);
  });

  it("returns empty when the start is out of bounds", () => {
    expect(floodFill([E], 1, 1, 1, 0)).toEqual([]);
    expect(floodFill([E], 1, 1, -1, 0)).toEqual([]);
  });

  it("fills only matching same-value cells (not just empties)", () => {
    const tiles = [
      5, 5, E,
      5, 5, E,
      E, E, E,
    ];
    const cells = floodFill(tiles, 3, 3, 0, 0);
    expect(cells).toHaveLength(4);
  });
});

import { describe, expect, it } from "vitest";
import { StrokeBuffer } from "./strokeBuffer";

describe("StrokeBuffer", () => {
  it("adds unique cells in insertion order", () => {
    const buf = new StrokeBuffer(4);
    buf.add({ x: 0, y: 0 });
    buf.add({ x: 1, y: 0 });
    buf.add({ x: 2, y: 0 });
    expect(buf.entries()).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("deduplicates cells with the same (x, y)", () => {
    const buf = new StrokeBuffer(4);
    expect(buf.add({ x: 1, y: 1 })).toBe(true);
    expect(buf.add({ x: 1, y: 1 })).toBe(false);
    expect(buf.size()).toBe(1);
  });

  it("distinguishes cells in different rows even at same column", () => {
    const buf = new StrokeBuffer(4);
    buf.add({ x: 2, y: 0 });
    buf.add({ x: 2, y: 1 });
    expect(buf.size()).toBe(2);
  });

  it("clear resets both entries and dedup state", () => {
    const buf = new StrokeBuffer(4);
    buf.add({ x: 0, y: 0 });
    buf.clear();
    expect(buf.isEmpty()).toBe(true);
    expect(buf.add({ x: 0, y: 0 })).toBe(true);
  });

  it("addMany dedupes across batches", () => {
    const buf = new StrokeBuffer(4);
    buf.addMany([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(buf.size()).toBe(2);
  });
});

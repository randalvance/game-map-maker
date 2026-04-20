import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs vitest with jsdom", () => {
    expect(typeof window).toBe("object");
    expect(1 + 1).toBe(2);
  });
});

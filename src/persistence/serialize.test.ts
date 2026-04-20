import { describe, expect, it } from "vitest";
import { createNewProject } from "@/model/project";
import { EMPTY_TILE } from "@/model/types";
import {
  ProjectValidationError,
  deserializeProject,
  serializeProject,
} from "./serialize";

describe("serialize/deserialize round-trip", () => {
  it("preserves a freshly created project", () => {
    const p0 = createNewProject(4, 3);
    const text = serializeProject(p0);
    const p1 = deserializeProject(text);
    expect(p1).toEqual(p0);
  });

  it("preserves layers, entities, and collision state together", () => {
    const p0 = createNewProject(2, 2);
    p0.layers[0].tiles[0] = 5;
    p0.layers[0].tiles[1] = 7;
    p0.entities.push({
      id: "e1",
      type: "npc",
      x: 0,
      y: 1,
      properties: { dialog: "hi", rewards: 2, blocking: true },
    });
    p0.collision[3] = false;

    const p1 = deserializeProject(serializeProject(p0));
    expect(p1).toEqual(p0);
  });

  it("empty cells remain -1 after round-trip", () => {
    const p0 = createNewProject(2, 2);
    const text = serializeProject(p0);
    expect(JSON.parse(text).layers[0].tiles).toEqual([
      EMPTY_TILE,
      EMPTY_TILE,
      EMPTY_TILE,
      EMPTY_TILE,
    ]);
  });

  it("collision array length equals width * height", () => {
    const p0 = createNewProject(5, 4);
    const parsed = JSON.parse(serializeProject(p0));
    expect(parsed.collision.length).toBe(20);
  });
});

describe("deserialize validation", () => {
  it("rejects invalid JSON", () => {
    expect(() => deserializeProject("not json")).toThrow(ProjectValidationError);
  });

  it("rejects a newer version", () => {
    const bad = JSON.stringify({
      ...createNewProject(1, 1),
      version: 999,
    });
    expect(() => deserializeProject(bad)).toThrow(/newer/);
  });

  it("rejects when collision length mismatches dimensions", () => {
    const p = createNewProject(2, 2);
    const bad = JSON.stringify({ ...p, collision: [true, true] });
    expect(() => deserializeProject(bad)).toThrow(/collision/);
  });

  it("rejects when a layer tile array length mismatches dimensions", () => {
    const p = createNewProject(2, 2);
    const bad = JSON.stringify({
      ...p,
      layers: [{ ...p.layers[0], tiles: [0, 1] }],
    });
    expect(() => deserializeProject(bad)).toThrow(/tiles/);
  });

  it("rejects missing required fields", () => {
    expect(() => deserializeProject(JSON.stringify({}))).toThrow();
    expect(() => deserializeProject(JSON.stringify({ version: 1 }))).toThrow();
  });
});

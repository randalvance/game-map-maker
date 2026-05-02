import { describe, expect, it } from "vitest";
import { createNewProject } from "@/model/project";
import { CURRENT_SCHEMA_VERSION, EMPTY_TILE } from "@/model/types";
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

describe("schema versioning", () => {
  it("serializeProject always emits the current schema version", () => {
    const p = { ...createNewProject(2, 2), version: 1 as 1 };
    const text = serializeProject(p);
    expect(JSON.parse(text).version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("deserializeProject preserves the original version", () => {
    const p = createNewProject(2, 2);
    const v1Text = JSON.stringify({
      ...p,
      version: 1,
      tileset: { ...p.tileset, src: "data:image/png;base64,iVBORw0K" },
    });
    const parsed = deserializeProject(v1Text);
    expect(parsed.version).toBe(1);
    expect(parsed.tileset.src).toBe("data:image/png;base64,iVBORw0K");
  });

  it("accepts a v2 file with an https tileset URL", () => {
    const p = createNewProject(2, 2);
    const v2Text = JSON.stringify({
      ...p,
      version: 2,
      tileset: {
        ...p.tileset,
        src: "https://example.com/tilesets/abc.png",
      },
    });
    const parsed = deserializeProject(v2Text);
    expect(parsed.tileset.src).toBe("https://example.com/tilesets/abc.png");
  });

  it("rejects an https tileset URL in a v1 file", () => {
    const p = createNewProject(2, 2);
    const bad = JSON.stringify({
      ...p,
      version: 1,
      tileset: { ...p.tileset, src: "https://example.com/x.png" },
    });
    expect(() => deserializeProject(bad)).toThrow(/v1/);
  });

  it("rejects a non-string tileset src", () => {
    const p = createNewProject(2, 2);
    const bad = JSON.stringify({
      ...p,
      tileset: { ...p.tileset, src: 12345 },
    });
    expect(() => deserializeProject(bad)).toThrow(/tileset\.src/);
  });

  it("preserves projectId when valid UUIDv4", () => {
    const p = createNewProject(2, 2);
    const id = "8e6f9c5a-1b2c-4d5e-9f0a-1b2c3d4e5f60";
    const text = JSON.stringify({ ...p, projectId: id });
    const parsed = deserializeProject(text);
    expect(parsed.projectId).toBe(id);
  });

  it("rejects an invalid projectId", () => {
    const p = createNewProject(2, 2);
    const bad = JSON.stringify({ ...p, projectId: "not-a-uuid" });
    expect(() => deserializeProject(bad)).toThrow(/projectId/);
  });

  it("rejects a UUID with the wrong version nibble", () => {
    const p = createNewProject(2, 2);
    // version-3 UUID — must reject because we require v4 specifically
    const bad = JSON.stringify({
      ...p,
      projectId: "8e6f9c5a-1b2c-3d5e-9f0a-1b2c3d4e5f60",
    });
    expect(() => deserializeProject(bad)).toThrow(/projectId/);
  });

  it("treats absent projectId as fine", () => {
    const p = createNewProject(2, 2);
    const text = serializeProject(p);
    const parsed = deserializeProject(text);
    expect(parsed.projectId).toBeUndefined();
  });
});

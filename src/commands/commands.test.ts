import { describe, expect, it } from "vitest";
import { createNewProject } from "@/model/project";
import { indexOf } from "@/model/grid";
import { EMPTY_TILE, type GameObject, type MapProject } from "@/model/types";
import { PaintCellsCommand } from "./paintCells";
import { ToggleCollisionCommand } from "./toggleCollision";
import {
  AddEntityCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  UpdateEntityPropertiesCommand,
} from "./entities";

function baseProject(): MapProject {
  return createNewProject(4, 3);
}

describe("PaintCellsCommand", () => {
  it("apply then invert restores tile values", () => {
    const p0 = baseProject();
    const layerId = p0.layers[0].id;
    const cmd = new PaintCellsCommand(layerId, [
      { x: 1, y: 1, prev: EMPTY_TILE, next: 7 },
      { x: 2, y: 1, prev: EMPTY_TILE, next: 7 },
    ]);

    const p1 = cmd.apply(p0);
    const w = p1.width;
    expect(p1.layers[0].tiles[indexOf(1, 1, w)]).toBe(7);
    expect(p1.layers[0].tiles[indexOf(2, 1, w)]).toBe(7);

    const p2 = cmd.invert(p1);
    expect(p2.layers[0].tiles).toEqual(p0.layers[0].tiles);
  });

  it("does not mutate other layers", () => {
    const p0 = baseProject();
    const cmd = new PaintCellsCommand(p0.layers[0].id, [
      { x: 0, y: 0, prev: EMPTY_TILE, next: 3 },
    ]);
    const p1 = cmd.apply(p0);
    expect(p1.layers[1]).toBe(p0.layers[1]);
  });

  it("no-ops on unknown layer", () => {
    const p0 = baseProject();
    const cmd = new PaintCellsCommand("nope", [
      { x: 0, y: 0, prev: EMPTY_TILE, next: 3 },
    ]);
    expect(cmd.apply(p0)).toBe(p0);
  });
});

describe("ToggleCollisionCommand", () => {
  it("apply flips cells, invert restores", () => {
    const p0 = baseProject();
    const cmd = new ToggleCollisionCommand([
      { x: 0, y: 0, prev: true, next: false },
      { x: 3, y: 2, prev: true, next: false },
    ]);
    const p1 = cmd.apply(p0);
    expect(p1.collision[indexOf(0, 0, p1.width)]).toBe(false);
    expect(p1.collision[indexOf(3, 2, p1.width)]).toBe(false);

    const p2 = cmd.invert(p1);
    expect(p2.collision).toEqual(p0.collision);
  });
});

describe("entity commands", () => {
  const entity: GameObject = {
    id: "e1",
    type: "npc",
    x: 1,
    y: 1,
    properties: { dialog: "hi" },
  };

  it("AddEntityCommand round-trips", () => {
    const p0 = baseProject();
    const cmd = new AddEntityCommand(entity);
    const p1 = cmd.apply(p0);
    expect(p1.entities).toEqual([entity]);
    const p2 = cmd.invert(p1);
    expect(p2.entities).toEqual([]);
  });

  it("DeleteEntityCommand snapshots and restores", () => {
    const p0 = { ...baseProject(), entities: [entity] };
    const cmd = new DeleteEntityCommand(entity.id);
    const p1 = cmd.apply(p0);
    expect(p1.entities).toEqual([]);
    const p2 = cmd.invert(p1);
    expect(p2.entities).toEqual([entity]);
  });

  it("MoveEntityCommand round-trips", () => {
    const p0 = { ...baseProject(), entities: [entity] };
    const cmd = new MoveEntityCommand(entity.id, { x: 1, y: 1 }, { x: 3, y: 2 });
    const p1 = cmd.apply(p0);
    expect(p1.entities[0]).toMatchObject({ x: 3, y: 2 });
    const p2 = cmd.invert(p1);
    expect(p2.entities[0]).toMatchObject({ x: 1, y: 1 });
  });

  it("UpdateEntityPropertiesCommand round-trips", () => {
    const p0 = { ...baseProject(), entities: [entity] };
    const cmd = new UpdateEntityPropertiesCommand(
      entity.id,
      { dialog: "hi" },
      { dialog: "bye", loot: "gold" },
    );
    const p1 = cmd.apply(p0);
    expect(p1.entities[0].properties).toEqual({ dialog: "bye", loot: "gold" });
    const p2 = cmd.invert(p1);
    expect(p2.entities[0].properties).toEqual({ dialog: "hi" });
  });
});

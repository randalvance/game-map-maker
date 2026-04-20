import { beforeEach, describe, expect, it } from "vitest";
import { createNewProject } from "@/model/project";
import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";
import { clearHistory } from "@/commands/history";
import { indexOf } from "@/model/grid";
import { EMPTY_TILE } from "@/model/types";
import { brushTool, eraseTool } from "./brushTool";
import { fillTool } from "./fillTool";
import { collisionTool } from "./collisionTool";
import { placeTool } from "./placeTool";
import { selectTool } from "./selectTool";
import { toolContext } from "./toolDispatcher";

function resetWorld(w = 4, h = 3) {
  useDocument.getState().replaceProject(createNewProject(w, h));
  clearHistory();
  const project = useDocument.getState().project;
  useEditor.setState({
    tool: "brush",
    activeTile: 7,
    activeLayerId: project.layers[0].id,
    activeObjectType: null,
    selectedEntityId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    showCollisionOverlay: false,
  });
}

beforeEach(() => resetWorld());

describe("brushTool", () => {
  it("paints a single cell on click (down + up without move)", () => {
    brushTool.onPointerDown({ x: 1, y: 1 }, toolContext);
    brushTool.onPointerUp(null, toolContext);
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(1, 1, p.width)]).toBe(7);
  });

  it("coalesces drag into one command with gap-filling between sparse moves", () => {
    brushTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    brushTool.onPointerMove({ x: 3, y: 0 }, toolContext);
    brushTool.onPointerUp({ x: 3, y: 0 }, toolContext);
    const p = useDocument.getState().project;
    const w = p.width;
    // all four cells along y=0 should now be the active tile
    expect(p.layers[0].tiles[indexOf(0, 0, w)]).toBe(7);
    expect(p.layers[0].tiles[indexOf(1, 0, w)]).toBe(7);
    expect(p.layers[0].tiles[indexOf(2, 0, w)]).toBe(7);
    expect(p.layers[0].tiles[indexOf(3, 0, w)]).toBe(7);
  });

  it("ignores out-of-bounds cells; stroke starts at first in-bounds cell", () => {
    brushTool.onPointerDown({ x: -1, y: -1 }, toolContext);
    brushTool.onPointerMove({ x: 1, y: 0 }, toolContext);
    brushTool.onPointerUp({ x: 1, y: 0 }, toolContext);
    const p = useDocument.getState().project;
    // The out-of-bounds cell is dropped entirely; (1,0) is the first in-bounds
    // cell the stroke sees, so only it is painted. We do NOT extrapolate a
    // virtual line from an off-canvas start.
    expect(p.layers[0].tiles[indexOf(0, 0, p.width)]).toBe(EMPTY_TILE);
    expect(p.layers[0].tiles[indexOf(1, 0, p.width)]).toBe(7);
  });

  it("does not dispatch a command when painting a cell that already has that tile", () => {
    // first paint
    brushTool.onPointerDown({ x: 1, y: 1 }, toolContext);
    brushTool.onPointerUp(null, toolContext);
    const afterFirst = useDocument.getState().project;

    // paint the same cell again with the same tile
    brushTool.onPointerDown({ x: 1, y: 1 }, toolContext);
    brushTool.onPointerUp(null, toolContext);
    const afterSecond = useDocument.getState().project;

    // no-op second stroke should not have mutated the project reference
    expect(afterSecond).toBe(afterFirst);
  });
});

describe("eraseTool", () => {
  it("writes EMPTY_TILE over painted cells", () => {
    brushTool.onPointerDown({ x: 2, y: 1 }, toolContext);
    brushTool.onPointerUp(null, toolContext);
    eraseTool.onPointerDown({ x: 2, y: 1 }, toolContext);
    eraseTool.onPointerUp(null, toolContext);
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(2, 1, p.width)]).toBe(EMPTY_TILE);
  });
});

describe("fillTool", () => {
  it("floods all connected empty cells on click", () => {
    fillTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    const p = useDocument.getState().project;
    // 4x3 grid all empty → all 12 cells filled
    expect(p.layers[0].tiles.every((t) => t === 7)).toBe(true);
  });

  it("no-op when clicking a cell already set to the active tile", () => {
    // First fill
    fillTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    const afterFirst = useDocument.getState().project;
    // Second fill on same cell
    fillTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    const afterSecond = useDocument.getState().project;
    expect(afterSecond).toBe(afterFirst);
  });

  it("does not cross boundaries of a different tile", () => {
    // Paint a vertical wall at x=2 on y=0,1,2
    brushTool.onPointerDown({ x: 2, y: 0 }, toolContext);
    brushTool.onPointerMove({ x: 2, y: 2 }, toolContext);
    brushTool.onPointerUp({ x: 2, y: 2 }, toolContext);

    // Now switch active tile and fill from (0,0)
    useEditor.getState().setActiveTile(3);
    fillTool.onPointerDown({ x: 0, y: 0 }, toolContext);

    const p = useDocument.getState().project;
    const w = p.width;
    // x=0,1 on all rows should be 3; x=2 still 7; x=3 still EMPTY
    expect(p.layers[0].tiles[indexOf(0, 0, w)]).toBe(3);
    expect(p.layers[0].tiles[indexOf(1, 0, w)]).toBe(3);
    expect(p.layers[0].tiles[indexOf(2, 0, w)]).toBe(7);
    expect(p.layers[0].tiles[indexOf(3, 0, w)]).toBe(EMPTY_TILE);
  });
});

describe("collisionTool", () => {
  it("click on walkable cell turns it blocked; stroke keeps same action", () => {
    collisionTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    collisionTool.onPointerMove({ x: 3, y: 0 }, toolContext);
    collisionTool.onPointerUp({ x: 3, y: 0 }, toolContext);
    const p = useDocument.getState().project;
    expect(p.collision[indexOf(0, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(1, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(2, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(3, 0, p.width)]).toBe(false);
  });

  it("mixed starting cells: stroke action is determined by the starting cell's state", () => {
    // Pre-block (2,0)
    collisionTool.onPointerDown({ x: 2, y: 0 }, toolContext);
    collisionTool.onPointerUp({ x: 2, y: 0 }, toolContext);

    // Start stroke on (0,0) which is walkable → action is "block"
    collisionTool.onPointerDown({ x: 0, y: 0 }, toolContext);
    collisionTool.onPointerMove({ x: 3, y: 0 }, toolContext);
    collisionTool.onPointerUp({ x: 3, y: 0 }, toolContext);

    const p = useDocument.getState().project;
    // All four cells in the row should be blocked (not re-toggled)
    expect(p.collision[indexOf(0, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(1, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(2, 0, p.width)]).toBe(false);
    expect(p.collision[indexOf(3, 0, p.width)]).toBe(false);
  });
});

describe("placeTool", () => {
  it("places an entity at the clicked cell with default properties", () => {
    useEditor.getState().setActiveObjectType("npc");
    placeTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    const p = useDocument.getState().project;
    expect(p.entities).toHaveLength(1);
    expect(p.entities[0]).toMatchObject({ type: "npc", x: 1, y: 2 });
    expect(p.entities[0].properties).toHaveProperty("dialog");
  });

  it("no-op when no active object type is set", () => {
    useEditor.getState().setActiveObjectType(null);
    placeTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    expect(useDocument.getState().project.entities).toHaveLength(0);
  });
});

describe("selectTool", () => {
  it("clicking an entity selects it; clicking empty space deselects", () => {
    useEditor.getState().setActiveObjectType("npc");
    placeTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    const entityId = useDocument.getState().project.entities[0].id;

    selectTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    expect(useEditor.getState().selectedEntityId).toBe(entityId);

    selectTool.onPointerDown({ x: 3, y: 0 }, toolContext);
    expect(useEditor.getState().selectedEntityId).toBeNull();
  });

  it("drag moves the selected entity and emits MoveEntityCommand", () => {
    useEditor.getState().setActiveObjectType("npc");
    placeTool.onPointerDown({ x: 1, y: 2 }, toolContext);

    selectTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    selectTool.onPointerMove({ x: 3, y: 2 }, toolContext);
    selectTool.onPointerUp({ x: 3, y: 2 }, toolContext);

    const p = useDocument.getState().project;
    expect(p.entities[0]).toMatchObject({ x: 3, y: 2 });
  });

  it("no-move click does not emit MoveEntityCommand", () => {
    useEditor.getState().setActiveObjectType("npc");
    placeTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    const before = useDocument.getState().project;

    selectTool.onPointerDown({ x: 1, y: 2 }, toolContext);
    selectTool.onPointerUp({ x: 1, y: 2 }, toolContext);

    const after = useDocument.getState().project;
    // Same entity, same position → no mutation dispatched
    expect(after.entities).toEqual(before.entities);
  });
});

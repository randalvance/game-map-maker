import { beforeEach, describe, expect, it } from "vitest";
import { PaintCellsCommand } from "./paintCells";
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  clearHistory,
  dispatch,
  historyDepth,
  redo,
  undo,
} from "./history";
import { useDocument } from "@/store/document";
import { createNewProject } from "@/model/project";
import { EMPTY_TILE } from "@/model/types";
import { indexOf } from "@/model/grid";

function resetStore(w = 4, h = 3) {
  useDocument.getState().replaceProject(createNewProject(w, h));
  clearHistory();
}

function paintAt(x: number, y: number, tile: number) {
  const project = useDocument.getState().project;
  const prev = project.layers[0].tiles[indexOf(x, y, project.width)];
  dispatch(
    new PaintCellsCommand(project.layers[0].id, [{ x, y, prev, next: tile }]),
  );
}

beforeEach(() => resetStore());

describe("history stack", () => {
  it("dispatch updates state and records past", () => {
    paintAt(0, 0, 5);
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(0, 0, p.width)]).toBe(5);
    expect(canUndo()).toBe(true);
    expect(canRedo()).toBe(false);
  });

  it("undo reverts last command and enables redo", () => {
    paintAt(0, 0, 5);
    expect(undo()).toBe(true);
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(0, 0, p.width)]).toBe(EMPTY_TILE);
    expect(canRedo()).toBe(true);
  });

  it("redo re-applies undone command", () => {
    paintAt(0, 0, 5);
    undo();
    expect(redo()).toBe(true);
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(0, 0, p.width)]).toBe(5);
  });

  it("new dispatch clears redo future", () => {
    paintAt(0, 0, 5);
    undo();
    expect(canRedo()).toBe(true);
    paintAt(1, 1, 9);
    expect(canRedo()).toBe(false);
  });

  it("undo on empty stack returns false", () => {
    expect(undo()).toBe(false);
  });

  it("caps past stack at MAX_HISTORY, dropping oldest", () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      paintAt(0, 0, i);
    }
    expect(historyDepth().past).toBe(MAX_HISTORY);

    // Undo all — we should only be able to revert MAX_HISTORY steps.
    let undone = 0;
    while (undo()) undone++;
    expect(undone).toBe(MAX_HISTORY);
    // The 5 oldest commands were dropped, so the original EMPTY is never reached;
    // what's visible is the value at index 4 (the command just before the kept window).
    const p = useDocument.getState().project;
    expect(p.layers[0].tiles[indexOf(0, 0, p.width)]).toBe(4);
  });
});

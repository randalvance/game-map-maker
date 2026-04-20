import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNewProject } from "@/model/project";
import { useDocument } from "@/store/document";
import { clearHistory, dispatch } from "@/commands/history";
import { PaintCellsCommand } from "@/commands/paintCells";
import { EMPTY_TILE } from "@/model/types";
import {
  AUTOSAVE_DEBOUNCE_MS,
  clearAutosave,
  installAutosave,
  loadAutosavedText,
} from "./autosave";
import { AUTOSAVE_KEY, deserializeProject } from "./serialize";

beforeEach(() => {
  window.localStorage.clear();
  useDocument.getState().replaceProject(createNewProject(3, 3));
  clearHistory();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("autosave", () => {
  it("writes to local storage after debounce elapses", () => {
    const uninstall = installAutosave(50);

    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();

    const layerId = useDocument.getState().project.layers[0].id;
    dispatch(
      new PaintCellsCommand(layerId, [
        { x: 0, y: 0, prev: EMPTY_TILE, next: 3 },
      ]),
    );

    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    vi.advanceTimersByTime(60);
    expect(window.localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull();

    uninstall();
  });

  it("coalesces rapid edits into a single write", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const uninstall = installAutosave(50);

    const layerId = useDocument.getState().project.layers[0].id;
    for (let i = 0; i < 5; i++) {
      dispatch(
        new PaintCellsCommand(layerId, [
          { x: i, y: 0, prev: EMPTY_TILE, next: 1 },
        ]),
      );
      vi.advanceTimersByTime(10);
    }

    expect(setItemSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    uninstall();
    setItemSpy.mockRestore();
  });

  it("loadAutosavedText returns the serialized project when present", () => {
    const uninstall = installAutosave(10);
    const layerId = useDocument.getState().project.layers[0].id;
    dispatch(
      new PaintCellsCommand(layerId, [
        { x: 1, y: 1, prev: EMPTY_TILE, next: 9 },
      ]),
    );
    vi.advanceTimersByTime(20);

    const text = loadAutosavedText();
    expect(text).not.toBeNull();
    const restored = deserializeProject(text!);
    const w = restored.width;
    expect(restored.layers[0].tiles[1 * w + 1]).toBe(9);

    uninstall();
  });

  it("clearAutosave removes the stored entry", () => {
    window.localStorage.setItem(AUTOSAVE_KEY, "anything");
    clearAutosave();
    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
  });

  it("uninstalling stops further writes", () => {
    const uninstall = installAutosave(10);
    uninstall();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const layerId = useDocument.getState().project.layers[0].id;
    dispatch(
      new PaintCellsCommand(layerId, [
        { x: 0, y: 0, prev: EMPTY_TILE, next: 1 },
      ]),
    );
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});

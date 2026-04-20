import { dispatch } from "@/commands/history";
import { PaintCellsCommand, type CellEdit } from "@/commands/paintCells";
import { inBounds, indexOf } from "@/model/grid";
import type { Tool, ToolCell, ToolContext } from "./Tool";
import { floodFill } from "./floodFill";

export const fillTool: Tool = {
  id: "fill",

  onPointerDown(cell: ToolCell, ctx: ToolContext): void {
    if (!cell) return;
    const project = ctx.project();
    const activeLayerId = ctx.activeLayerId();
    if (!activeLayerId) return;
    if (!inBounds(cell.x, cell.y, project.width, project.height)) return;

    const layer = project.layers.find((l) => l.id === activeLayerId);
    if (!layer) return;

    const tile = ctx.activeTile();
    const startIdx = indexOf(cell.x, cell.y, project.width);
    if (layer.tiles[startIdx] === tile) return;

    const region = floodFill(
      layer.tiles,
      project.width,
      project.height,
      cell.x,
      cell.y,
    );
    if (region.length === 0) return;

    const edits: CellEdit[] = region.map((c) => {
      const i = indexOf(c.x, c.y, project.width);
      return { x: c.x, y: c.y, prev: layer.tiles[i], next: tile };
    });
    dispatch(new PaintCellsCommand(activeLayerId, edits));
  },

  onPointerMove(): void {
    /* fill acts on click only */
  },
  onPointerUp(): void {
    /* no-op */
  },
  onCancel(): void {
    /* no-op */
  },
};

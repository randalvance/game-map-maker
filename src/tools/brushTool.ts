import { dispatch } from "@/commands/history";
import { PaintCellsCommand, type CellEdit } from "@/commands/paintCells";
import { inBounds, indexOf } from "@/model/grid";
import { EMPTY_TILE } from "@/model/types";
import type { Tool, ToolCell, ToolContext } from "./Tool";
import { StrokeBuffer } from "./strokeBuffer";
import { lineCells } from "./line";

function makePaintTool(id: string, tilePicker: (ctx: ToolContext) => number): Tool {
  let buffer: StrokeBuffer | null = null;
  let last: { x: number; y: number } | null = null;
  let layerId: string | null = null;

  const start = (cell: ToolCell, ctx: ToolContext) => {
    const project = ctx.project();
    const active = ctx.activeLayerId();
    if (!active) return;
    layerId = active;
    buffer = new StrokeBuffer(project.width);
    last = null;
    append(cell, ctx);
  };

  const append = (cell: ToolCell, ctx: ToolContext) => {
    if (!buffer || !cell) return;
    const project = ctx.project();
    if (!inBounds(cell.x, cell.y, project.width, project.height)) return;

    if (last) {
      const segment = lineCells(last.x, last.y, cell.x, cell.y);
      for (const c of segment) {
        if (inBounds(c.x, c.y, project.width, project.height)) buffer.add(c);
      }
    } else {
      buffer.add(cell);
    }
    last = cell;
  };

  const commit = (ctx: ToolContext) => {
    if (!buffer || !layerId) {
      reset();
      return;
    }

    const project = ctx.project();
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) {
      reset();
      return;
    }

    const tile = tilePicker(ctx);
    const edits: CellEdit[] = [];
    for (const cell of buffer.entries()) {
      const i = indexOf(cell.x, cell.y, project.width);
      const prev = layer.tiles[i];
      if (prev === tile) continue;
      edits.push({ x: cell.x, y: cell.y, prev, next: tile });
    }

    if (edits.length > 0) {
      dispatch(new PaintCellsCommand(layerId, edits));
    }
    reset();
  };

  const reset = () => {
    buffer = null;
    last = null;
    layerId = null;
  };

  return {
    id,
    onPointerDown: start,
    onPointerMove(cell, ctx) {
      if (buffer) append(cell, ctx);
    },
    onPointerUp(_cell, ctx) {
      commit(ctx);
    },
    onCancel: reset,
  };
}

export const brushTool = makePaintTool("brush", (ctx) => ctx.activeTile());
export const eraseTool = makePaintTool("erase", () => EMPTY_TILE);

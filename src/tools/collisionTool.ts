import { dispatch } from "@/commands/history";
import {
  ToggleCollisionCommand,
  type CollisionEdit,
} from "@/commands/toggleCollision";
import { inBounds, indexOf } from "@/model/grid";
import type { Tool, ToolCell, ToolContext } from "./Tool";
import { StrokeBuffer } from "./strokeBuffer";
import { lineCells } from "./line";

export const collisionTool: Tool = (() => {
  let buffer: StrokeBuffer | null = null;
  let last: { x: number; y: number } | null = null;
  let targetWalkable: boolean | null = null;

  const start = (cell: ToolCell, ctx: ToolContext) => {
    if (!cell) return;
    const project = ctx.project();
    if (!inBounds(cell.x, cell.y, project.width, project.height)) return;

    buffer = new StrokeBuffer(project.width);
    const startValue = project.collision[indexOf(cell.x, cell.y, project.width)];
    targetWalkable = !startValue;
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
    if (!buffer || targetWalkable === null) {
      reset();
      return;
    }

    const project = ctx.project();
    const edits: CollisionEdit[] = [];
    for (const cell of buffer.entries()) {
      const i = indexOf(cell.x, cell.y, project.width);
      const prev = project.collision[i];
      if (prev === targetWalkable) continue;
      edits.push({ x: cell.x, y: cell.y, prev, next: targetWalkable });
    }

    if (edits.length > 0) {
      dispatch(new ToggleCollisionCommand(edits));
    }
    reset();
  };

  const reset = () => {
    buffer = null;
    last = null;
    targetWalkable = null;
  };

  return {
    id: "collision",
    onPointerDown: start,
    onPointerMove(cell, ctx) {
      if (buffer) append(cell, ctx);
    },
    onPointerUp(_cell, ctx) {
      commit(ctx);
    },
    onCancel: reset,
  } satisfies Tool;
})();

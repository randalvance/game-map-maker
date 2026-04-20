import { dispatch } from "@/commands/history";
import { MoveEntityCommand } from "@/commands/entities";
import { inBounds } from "@/model/grid";
import type { Tool, ToolCell, ToolContext } from "./Tool";

function entityAt(ctx: ToolContext, x: number, y: number): string | null {
  const entities = ctx.project().entities;
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (e.x === x && e.y === y) return e.id;
  }
  return null;
}

export const selectTool: Tool = (() => {
  let dragId: string | null = null;
  let dragFrom: { x: number; y: number } | null = null;
  let dragTo: { x: number; y: number } | null = null;

  const reset = () => {
    dragId = null;
    dragFrom = null;
    dragTo = null;
  };

  return {
    id: "select",

    onPointerDown(cell: ToolCell, ctx: ToolContext) {
      if (!cell) {
        ctx.setSelectedEntity(null);
        return;
      }
      const project = ctx.project();
      if (!inBounds(cell.x, cell.y, project.width, project.height)) {
        ctx.setSelectedEntity(null);
        return;
      }

      const id = entityAt(ctx, cell.x, cell.y);
      if (id) {
        ctx.setSelectedEntity(id);
        const entity = project.entities.find((e) => e.id === id)!;
        dragId = id;
        dragFrom = { x: entity.x, y: entity.y };
        dragTo = { x: entity.x, y: entity.y };
      } else {
        ctx.setSelectedEntity(null);
      }
    },

    onPointerMove(cell: ToolCell, ctx: ToolContext) {
      if (!dragId || !cell) return;
      const project = ctx.project();
      if (!inBounds(cell.x, cell.y, project.width, project.height)) return;
      dragTo = { x: cell.x, y: cell.y };
    },

    onPointerUp(_cell, _ctx: ToolContext) {
      if (dragId && dragFrom && dragTo) {
        if (dragTo.x !== dragFrom.x || dragTo.y !== dragFrom.y) {
          dispatch(new MoveEntityCommand(dragId, dragFrom, dragTo));
        }
      }
      reset();
    },

    onCancel: reset,
  };
})();

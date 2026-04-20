import { v4 as uuid } from "uuid";
import { dispatch } from "@/commands/history";
import { AddEntityCommand } from "@/commands/entities";
import { inBounds } from "@/model/grid";
import { defaultPropertiesFor } from "@/objects/registry";
import type { GameObject } from "@/model/types";
import type { Tool, ToolCell, ToolContext } from "./Tool";

export const placeTool: Tool = {
  id: "place",

  onPointerDown(cell: ToolCell, ctx: ToolContext): void {
    if (!cell) return;
    const type = ctx.activeObjectType();
    if (!type) return;
    const project = ctx.project();
    if (!inBounds(cell.x, cell.y, project.width, project.height)) return;

    const entity: GameObject = {
      id: uuid(),
      type,
      x: cell.x,
      y: cell.y,
      properties: defaultPropertiesFor(type),
    };
    dispatch(new AddEntityCommand(entity));
  },

  onPointerMove(): void {
    /* click-only */
  },
  onPointerUp(): void {
    /* no-op */
  },
  onCancel(): void {
    /* no-op */
  },
};

import type { MapProject } from "@/model/types";

export type ToolCell = { x: number; y: number } | null;

export type ToolContext = {
  project: () => MapProject;
  activeLayerId: () => string | null;
  activeTile: () => number;
  activeObjectType: () => string | null;
  selectedEntityId: () => string | null;
  setSelectedEntity: (id: string | null) => void;
};

export interface Tool {
  readonly id: string;
  onPointerDown(cell: ToolCell, ctx: ToolContext): void;
  onPointerMove(cell: ToolCell, ctx: ToolContext): void;
  onPointerUp(cell: ToolCell, ctx: ToolContext): void;
  onCancel(): void;
}

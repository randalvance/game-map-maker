import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";
import { brushTool, eraseTool } from "./brushTool";
import { collisionTool } from "./collisionTool";
import { fillTool } from "./fillTool";
import { placeTool } from "./placeTool";
import { selectTool } from "./selectTool";
import type { Tool, ToolCell, ToolContext } from "./Tool";

const tools: Record<string, Tool> = {
  brush: brushTool,
  erase: eraseTool,
  fill: fillTool,
  collision: collisionTool,
  place: placeTool,
  select: selectTool,
};

export const toolContext: ToolContext = {
  project: () => useDocument.getState().project,
  activeLayerId: () => useEditor.getState().activeLayerId,
  activeTile: () => useEditor.getState().activeTile,
  activeObjectType: () => useEditor.getState().activeObjectType,
  selectedEntityId: () => useEditor.getState().selectedEntityId,
  setSelectedEntity: (id) => useEditor.getState().setSelectedEntity(id),
};

export function getActiveTool(): Tool | null {
  const id = useEditor.getState().tool;
  return tools[id] ?? null;
}

let currentTool: Tool | null = null;

export function handlePointerDown(cell: ToolCell): void {
  const tool = getActiveTool();
  if (!tool) return;
  currentTool = tool;
  tool.onPointerDown(cell, toolContext);
}

export function handlePointerMove(cell: ToolCell): void {
  if (!currentTool) return;
  currentTool.onPointerMove(cell, toolContext);
}

export function handlePointerUp(cell: ToolCell): void {
  if (!currentTool) return;
  currentTool.onPointerUp(cell, toolContext);
  currentTool = null;
}

export function cancelStroke(): void {
  if (!currentTool) return;
  currentTool.onCancel();
  currentTool = null;
}

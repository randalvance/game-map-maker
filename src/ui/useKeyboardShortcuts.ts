import { useEffect } from "react";
import { useDocument } from "@/store/document";
import { useEditor, type Tool } from "@/store/editor";
import { dispatch, redo, undo } from "@/commands/history";
import { DeleteEntityCommand } from "@/commands/entities";

function targetIsTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

const toolKey: Record<string, Tool> = {
  b: "brush",
  e: "erase",
  f: "fill",
  v: "select",
  c: "collision",
};

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (targetIsTextInput(event.target)) return;

      const key = event.key;
      const lower = key.toLowerCase();
      const meta = event.metaKey || event.ctrlKey;

      if (meta && lower === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (meta) return; // leave other modifier combos alone

      if (toolKey[lower]) {
        useEditor.getState().setTool(toolKey[lower]);
        return;
      }

      if (lower === "g") {
        useEditor.getState().toggleGrid();
        return;
      }
      if (lower === "o") {
        useEditor.getState().toggleCollisionOverlay();
        return;
      }

      if (/^[1-9]$/.test(key)) {
        const index = Number(key) - 1;
        const layers = useDocument.getState().project.layers;
        const target = layers[index];
        if (target) useEditor.getState().setActiveLayer(target.id);
        return;
      }

      if (key === "Delete" || key === "Backspace") {
        const selectedId = useEditor.getState().selectedEntityId;
        if (selectedId) {
          dispatch(new DeleteEntityCommand(selectedId));
          useEditor.getState().setSelectedEntity(null);
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

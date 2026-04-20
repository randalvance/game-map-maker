import { useDocument } from "@/store/document";
import { useEditor, type Tool } from "@/store/editor";
import { canRedo, canUndo, redo, undo } from "@/commands/history";
import type { MapProject } from "@/model/types";
import { downloadProject, readProjectFile } from "@/persistence/file";
import { clearHistory } from "@/commands/history";
import { useRef } from "react";

type ToolbarProps = {
  onLoadTileset: () => void;
  onNewMap: () => void;
};

const toolButtons: Array<{ id: Tool; label: string; shortcut: string }> = [
  { id: "brush", label: "Brush", shortcut: "B" },
  { id: "erase", label: "Erase", shortcut: "E" },
  { id: "fill", label: "Fill", shortcut: "F" },
  { id: "select", label: "Select", shortcut: "V" },
  { id: "collision", label: "Collision", shortcut: "C" },
];

export function Toolbar({ onLoadTileset, onNewMap }: ToolbarProps) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const showGrid = useEditor((s) => s.showGrid);
  const showCollisionOverlay = useEditor((s) => s.showCollisionOverlay);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const toggleCollisionOverlay = useEditor((s) => s.toggleCollisionOverlay);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    const project = useDocument.getState().project;
    downloadProject(project, "map.json");
    useDocument.getState().markClean();
  };

  const handleExport = () => {
    const project = useDocument.getState().project;
    downloadProject(project, "map.export.json");
  };

  const handleOpenClick = () => fileRef.current?.click();

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const project: MapProject = await readProjectFile(file);
      useDocument.getState().replaceProject(project);
      clearHistory();
    } catch (e) {
      alert(`Failed to open project: ${(e as Error).message}`);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button type="button" className="btn" onClick={onNewMap}>
          New…
        </button>
        <button type="button" className="btn" onClick={handleOpenClick}>
          Open…
        </button>
        <button type="button" className="btn" onClick={handleSave}>
          Save
        </button>
        <button type="button" className="btn" onClick={handleExport}>
          Export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleOpenFile}
        />
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        {toolButtons.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`btn${tool === b.id ? " btn--active" : ""}`}
            onClick={() => setTool(b.id)}
            title={`${b.label} (${b.shortcut})`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button
          type="button"
          className={`btn${showGrid ? " btn--active" : ""}`}
          onClick={toggleGrid}
          title="Toggle grid (G)"
        >
          Grid
        </button>
        <button
          type="button"
          className={`btn${showCollisionOverlay ? " btn--active" : ""}`}
          onClick={toggleCollisionOverlay}
          title="Toggle collision overlay (O)"
        >
          Overlay
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button type="button" className="btn" onClick={onLoadTileset}>
          Tileset…
        </button>
        <button type="button" className="btn" onClick={() => undo()} disabled={!canUndo()}>
          Undo
        </button>
        <button type="button" className="btn" onClick={() => redo()} disabled={!canRedo()}>
          Redo
        </button>
      </div>
    </div>
  );
}

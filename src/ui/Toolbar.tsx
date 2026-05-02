import { useEffect, useRef, useState } from "react";
import { useDocument } from "@/store/document";
import { useEditor, type Tool } from "@/store/editor";
import { canRedo, canUndo, redo, undo } from "@/commands/history";
import type { MapProject } from "@/model/types";
import { downloadProject, readProjectFile } from "@/persistence/file";
import { clearHistory } from "@/commands/history";
import { serializeProject } from "@/persistence/serialize";
import {
  isCloudConfigured,
  uploadProjectJson,
} from "@/storage/blobClient";
import { CloudStorageError } from "@/storage/types";
import { migrateTilesetIfNeeded } from "@/storage/migrate";
import { OpenFromCloudDialog } from "./OpenFromCloudDialog";
import { CloudSaveToast } from "./CloudSaveToast";

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

  const [cloudReady, setCloudReady] = useState<boolean | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [openCloudOpen, setOpenCloudOpen] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    isCloudConfigured().then((ready) => {
      if (!cancelled) setCloudReady(ready);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    const project = useDocument.getState().project;
    downloadProject(project, "map.json");
    useDocument.getState().markClean();
  };

  const handleExport = () => {
    const project = useDocument.getState().project;
    downloadProject(project, "map.export.json");
  };

  const handleSaveToCloud = async () => {
    if (cloudBusy) return;
    setCloudBusy(true);
    try {
      const initial = useDocument.getState().project;
      const migrated = await migrateTilesetIfNeeded(initial);
      // Persist any tileset src rewrite back into the document so a subsequent
      // local Save sees the URL too. This is a no-op if migration didn't run.
      if (migrated !== initial) {
        useDocument.setState({ project: migrated });
      }
      const projectId = useDocument.getState().ensureProjectId();
      const projectForSave = {
        ...useDocument.getState().project,
        projectId,
      };
      const json = serializeProject(projectForSave);
      const url = await uploadProjectJson(json, projectId);
      useDocument.getState().markClean();
      setSavedUrl(url);
    } catch (e) {
      const msg = e instanceof CloudStorageError ? messageForError(e) : (e as Error).message;
      alert(`Save to cloud failed: ${msg}`);
    } finally {
      setCloudBusy(false);
    }
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

  const cloudTooltip =
    cloudReady === false
      ? "Cloud storage isn't configured for this deployment"
      : cloudReady === null
        ? "Checking cloud storage…"
        : undefined;

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
        <button
          type="button"
          className="btn"
          onClick={handleSaveToCloud}
          disabled={cloudReady !== true || cloudBusy}
          title={cloudTooltip}
        >
          {cloudBusy ? "Saving…" : "Save to Cloud"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setOpenCloudOpen(true)}
          disabled={cloudReady !== true}
          title={cloudTooltip}
        >
          Open from Cloud
        </button>
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

      <OpenFromCloudDialog
        open={openCloudOpen}
        onClose={() => setOpenCloudOpen(false)}
      />
      {savedUrl && (
        <CloudSaveToast url={savedUrl} onDismiss={() => setSavedUrl(null)} />
      )}
    </div>
  );
}

function messageForError(err: CloudStorageError): string {
  switch (err.kind) {
    case "not-configured":
      return "Cloud storage isn't configured for this deployment.";
    case "not-found":
      return "Project not found.";
    case "forbidden-key":
      return err.message;
    case "network":
      return `Network error: ${err.message}`;
    case "too-large":
      return `Project is too large to upload: ${err.message}`;
    case "unknown":
    default:
      return err.message;
  }
}

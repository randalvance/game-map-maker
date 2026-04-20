import { useEffect, useState } from "react";
import { MapCanvas } from "@/canvas/MapCanvas";
import { Toolbar } from "@/ui/Toolbar";
import { StatusBar } from "@/ui/StatusBar";
import { TilePalette } from "@/ui/TilePalette";
import { ObjectPalette } from "@/ui/ObjectPalette";
import { LayerPanel } from "@/ui/LayerPanel";
import { PropertyPanel } from "@/ui/PropertyPanel";
import { LoadTilesetDialog } from "@/ui/LoadTilesetDialog";
import { NewMapDialog } from "@/ui/NewMapDialog";
import { AutosaveRestore } from "@/ui/AutosaveRestore";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { useKeyboardShortcuts } from "@/ui/useKeyboardShortcuts";
import { useBeforeUnloadGuard } from "@/ui/useBeforeUnloadGuard";
import { installAutosave } from "@/persistence/autosave";
import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";

export function App() {
  return (
    <ErrorBoundary>
      <AutosaveRestore>
        <Editor />
      </AutosaveRestore>
    </ErrorBoundary>
  );
}

function Editor() {
  const [showTilesetDialog, setShowTilesetDialog] = useState(false);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);

  useKeyboardShortcuts();
  useBeforeUnloadGuard();

  useEffect(() => {
    // ensure an active layer is always set
    const { activeLayerId } = useEditor.getState();
    const layers = useDocument.getState().project.layers;
    if (!activeLayerId && layers.length > 0) {
      useEditor.getState().setActiveLayer(layers[0].id);
    }
  }, []);

  useEffect(() => installAutosave(), []);

  return (
    <div className="app-shell">
      <header className="app-shell__toolbar">
        <Toolbar
          onLoadTileset={() => setShowTilesetDialog(true)}
          onNewMap={() => setShowNewMapDialog(true)}
        />
      </header>

      <aside className="app-shell__left">
        <TilePalette onLoadTileset={() => setShowTilesetDialog(true)} />
        <ObjectPalette />
      </aside>

      <main className="app-shell__canvas">
        <MapCanvas />
      </main>

      <aside className="app-shell__right">
        <LayerPanel />
        <PropertyPanel />
      </aside>

      <footer className="app-shell__statusbar">
        <StatusBar />
      </footer>

      <LoadTilesetDialog
        open={showTilesetDialog}
        onClose={() => setShowTilesetDialog(false)}
      />
      <NewMapDialog
        open={showNewMapDialog}
        onClose={() => setShowNewMapDialog(false)}
      />
    </div>
  );
}

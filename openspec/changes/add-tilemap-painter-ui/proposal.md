## Why

The `add-tilemap-painter` change landed the contract layer — data model, commands, persistence, slicing math, flood fill, camera math, object registry — all unit-tested. But there is no interactive editor yet: the app boots to a placeholder page, and nothing from the foundation is reachable by a user. This change builds the React + PixiJS interaction surface that makes the editor usable.

## What Changes

- Mount a single PixiJS `Application` inside a React shell and render the map grid, tile layers, entities, and collision overlay.
- Wire the brush, eraser, fill, select, place, and collision tools to the canvas, with drag strokes coalesced into one undoable `PaintCellsCommand` / `ToggleCollisionCommand` on pointer-up.
- Build the React UI panels: toolbar, tile palette (sourced from an imported PNG), object palette, layer panel, property panel, status bar.
- Wire the file-picker "Open / Save / Export" actions, the "load tileset" flow, and the autosave-restore prompt on boot.
- Compose everything into a top-level CSS-grid layout with keyboard shortcuts, an unsaved-changes indicator, a `beforeunload` warning when dirty, and an app-level error boundary.

No new runtime dependencies. No changes to the JSON schema, data model, or command interfaces.

## Capabilities

### New Capabilities
- `editor-shell`: App-level composition concerns that cut across features — overall layout, global keyboard shortcuts, the dirty/unsaved indicator, the `beforeunload` guard, the autosave-restore prompt on boot, and the error boundary. These were intentionally left out of the foundation specs because they describe how the UI is *composed*, not what any one capability does.

### Modified Capabilities
<!-- None. The baseline specs directory (openspec/specs/) is still empty because
     the add-tilemap-painter change has not been archived yet; MODIFIED requires
     a baseline to modify against. All other UI work in this change is
     implementation of scenarios already specified by add-tilemap-painter's
     tilemap-editor, tileset-management, game-objects, traversability, and
     map-persistence specs. -->

## Impact

- Affects: most of `src/` under `canvas/`, `ui/` (new), `tools/`, `tileset/`, `persistence/` (small UI hooks). Also replaces `src/App.tsx` and adds keyboard/global listeners in `main.tsx` or the shell.
- No new dependencies.
- Bundle size will grow — PixiJS is already included; React chrome adds modestly. Target: keep production build under ~300 KB gzipped.
- Depends on, but does not archive, `add-tilemap-painter`. Both changes can safely be archived together once this one lands.

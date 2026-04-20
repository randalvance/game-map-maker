## 1. Canvas & renderer foundation

- [x] 1.1 Create `src/canvas/MapCanvas.tsx` that mounts a single `PIXI.Application` in a `useEffect`, appends its canvas to a host div, and tears it down on unmount
- [x] 1.2 Build `src/canvas/scene.ts` that constructs the scene graph per design §D2 (`worldContainer`, `gridRenderer`, tile layer containers, `collisionOverlay`, `entityContainer`) and exposes typed handles
- [x] 1.3 Implement `GridRenderer` that redraws cell outlines via a single `Graphics`; only redraws on width/height/tileSize/zoom/grid-visibility change
- [x] 1.4 Implement `TileLayerRenderer` using one `Container` + one `Sprite` per cell (including empty) with its texture flipped on edit (design pivot from `ParticleContainer` — v8 particles can't hold the flexibility we need; regular sprites batch well enough at our scale)
- [x] 1.5 Implement `CollisionOverlayRenderer` (`Graphics`) that tints blocked cells with a 40% red fill when visible
- [x] 1.6 Implement `EntityRenderer` drawing rounded-rect markers with the registry `color` + `glyph` per design §D10, plus a selection ring for the selected entity
- [x] 1.7 Wire each renderer to a `useDocument.subscribe` callback that diffs against the previous project and patches only what changed
- [x] 1.8 Implement camera transform application: `worldContainer.scale = zoom`, `worldContainer.position = (panX, panY)`; subscribe to `useEditor`

## 2. Camera & pointer input

- [x] 2.1 Add wheel-zoom on the canvas: multiplicative step, clamped to [0.25, 8.0], anchored at the cursor
- [ ] 2.2 Add pan via middle-mouse drag AND Space-held left-drag; update `useEditor.setPan` (middle-mouse wired; Space-held left-drag deferred)
- [x] 2.3 Implement rAF-throttled `pointermove` that writes `hoveredCell` into a new ephemeral `useEditor` slice for the status bar
- [x] 2.4 Expose `screenToCell` using current camera state for use by tools

## 3. Tool dispatcher & stroke coalescing

- [x] 3.1 Define `Tool` interface in `src/tools/Tool.ts` with `onPointerDown/Move/Up/Cancel`
- [x] 3.2 Implement `src/tools/toolDispatcher.ts` that reads `useEditor.tool`, routes canvas pointer events, and exposes `cancelStroke()`
- [x] 3.3 Write a pure `src/tools/strokeBuffer.ts` helper with `addCell`, `entries`, `clear`, deduplicating by `(x,y)`; unit-tested
- [x] 3.4 Write a pure `src/tools/line.ts` Bresenham helper for filling gaps between sparse pointer events; unit-tested

## 4. Paint tools (brush, erase, fill)

- [x] 4.1 Implement `brushTool` that buffers cells on down/move (using Bresenham between events) and dispatches one `PaintCellsCommand` on up
- [x] 4.2 Implement `eraseTool` as brush-with-tile `-1`
- [x] 4.3 Implement `fillTool` that calls `floodFill` on down and dispatches one `PaintCellsCommand` covering the entire region
- [x] 4.4 Guard each tool against out-of-bounds cells, missing active layer, and no-op strokes (pointer up without changes)
- [x] 4.5 Unit tests for each tool using fake pointer events + in-memory store: assert correct command dispatched with expected cell set

## 5. Tileset loading & palette UI

- [x] 5.1 Build `src/ui/LoadTilesetDialog.tsx` — hidden file input + a modal for tileWidth / tileHeight / margin / spacing
- [x] 5.2 On submit: call `loadTilesetFromBlob`, store loaded tile textures in a module-level registry keyed by tile index, update `document.tileset` metadata
- [x] 5.3 Build `src/ui/TilePalette.tsx` — scrollable grid of thumbnails drawn from the loaded tileset; click selects, selected tile gets an outline
- [x] 5.4 Hook palette selection into `useEditor.setActiveTile`
- [x] 5.5 Empty state when no tileset is loaded: friendly prompt + "Load tileset" button
- [ ] 5.6 Component test: `TilePalette` renders N thumbnails for N tiles and updates `activeTile` on click (deferred — depends on a loaded tileset fixture)

## 6. Layers panel

- [x] 6.1 Build `src/ui/LayerPanel.tsx` listing each tile layer with visibility toggle and active-layer radio/button
- [x] 6.2 Default to two layers (`ground`, `decoration`) per existing `createNewProject`; render highest layer at top of the list
- [x] 6.3 Active-layer indicator is the visual source of truth; clicking activates, toggle-eye mutates layer `visible`

## 7. Entity UI (object palette + place/select/move/delete)

- [x] 7.1 Build `src/ui/ObjectPalette.tsx` from `listObjectTypes()`; clicking a type switches to the `place` tool with `activeObjectType` set
- [x] 7.2 Implement `placeTool`: on pointer-down, dispatch `AddEntityCommand` with `defaultPropertiesFor(type)` at the cell
- [x] 7.3 Implement `selectTool`: pointer-down on an entity marker sets `useEditor.selectedEntityId`; drag (pointer-move with down held) queues a move and dispatches `MoveEntityCommand` on pointer-up
- [x] 7.4 `EntityRenderer` draws a selection ring around `useEditor.selectedEntityId`
- [x] 7.5 Build `src/ui/PropertyPanel.tsx`: when an entity is selected, render one input per property in the entity's type schema (string/number/boolean); changes dispatch `UpdateEntityPropertiesCommand`
- [x] 7.6 Global `keydown` handler: Delete/Backspace dispatches `DeleteEntityCommand` when an entity is selected (ignored if no selection or focus is inside an input)
- [ ] 7.7 Component test: placing, selecting, and deleting an entity via simulated canvas events; property-edit via fireEvent.change on the property panel (tool-level behaviour covered by `src/tools/tools.test.ts`; DOM-level component tests deferred)

## 8. Collision mode & overlay

- [x] 8.1 Toolbar "collision" button toggles `useEditor.tool` to `collision`
- [x] 8.2 Implement `collisionTool`: click/drag dispatches `ToggleCollisionCommand`; initial click's action (block vs. unblock) is determined by the starting cell and repeated for the rest of the stroke (design §Open Question 2)
- [x] 8.3 Overlay visibility toggle in the toolbar (`O` shortcut) flips `useEditor.showCollisionOverlay`
- [x] 8.4 Unit test `collisionTool` stroke: verify single-action propagation given mixed starting grids

## 9. Persistence UI

- [x] 9.1 Toolbar "Save Project" → `downloadProject(project)` then `markClean()`
- [x] 9.2 Toolbar "Open Project" → hidden file input → `readProjectFile` → `replaceProject` → `clearHistory()`
- [x] 9.3 Toolbar "Export Map" → same pipeline as Save for v1 with a distinct label and file name
- [x] 9.4 Autosave restore dialog in `src/ui/AutosaveRestore.tsx`: reads `loadAutosavedText`, validates, and presents "Restore" / "Start fresh" buttons before mounting the canvas
- [x] 9.5 On corrupt autosave, show a non-blocking toast and start with the default project
- [x] 9.6 Install `installAutosave()` exactly once in the shell's first effect; return the uninstaller for cleanup
- [ ] 9.7 Component test for `AutosaveRestore`: valid data renders the prompt; invalid data triggers the toast path (logic covered by the existing `autosave.test.ts`; DOM-level test deferred)

## 10. App shell (editor-shell capability)

- [x] 10.1 Replace `src/App.tsx` with a CSS-grid shell: toolbar (top), left sidebar, canvas (center), right sidebar, status bar (bottom)
- [x] 10.2 Build `src/ui/Toolbar.tsx` with tool buttons (B/E/F/V/C/place) + overlay/grid toggles + New/Save/Open/Export + Undo/Redo
- [x] 10.3 Build `src/ui/StatusBar.tsx` showing hovered cell, zoom %, and an unsaved-changes indicator driven by `useDocument.dirty`
- [x] 10.4 Build `src/ui/ErrorBoundary.tsx` with a recovery screen offering "Reload" and "Reload and restore autosave"
- [x] 10.5 Install global keyboard shortcuts per editor-shell spec, with the "not-in-text-input" guard (design §R5)
- [x] 10.6 Install `beforeunload` handler only while `dirty === true`; remove on `markClean()`
- [x] 10.7 Write token-based CSS in `src/styles.css` using CSS custom properties; include dark theme defaults

## 11. "New map" flow

- [x] 11.1 Build `src/ui/NewMapDialog.tsx` prompting for width, height, tileSize (defaults 32/32/16)
- [x] 11.2 On submit, dispatch `replaceProject(createNewProject(...))` and `clearHistory()`
- [x] 11.3 If the document is dirty, show the unsaved-changes confirmation before replacing

## 12. Verification

- [x] 12.1 `bun run test` — all existing tests pass + all new unit tests added in this change (90 passing across 13 files)
- [x] 12.2 `bun run build` — production build succeeds; main bundle 151 KB gzipped, PixiJS renderer chunks load lazily
- [ ] 12.3 Manual smoke: load a sample tileset, paint both layers, place an NPC and edit a property, mark cells blocked, save + reload + open + export, verify exported JSON matches `schema/export-map.md` (partially covered via playwright: empty-tileset boot, collision paint + undo, NPC place + select + property panel all verified; full save/load/export round-trip with a real tileset still to do manually)
- [ ] 12.4 Manual keyboard smoke: every shortcut fires the expected action and is suppressed inside text inputs (playwright-verified: `c`, `o`, `v`, `Cmd+Z`; remaining shortcuts to confirm manually)
- [ ] 12.5 Manual autosave smoke: make an edit, wait ~2 s, reload — the Restore prompt appears with the last state
- [x] 12.6 `openspec validate add-tilemap-painter-ui --strict` passes

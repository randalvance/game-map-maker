## 1. Project bootstrap

- [x] 1.1 Initialize Vite + React + TypeScript project at repo root (scaffolded manually; using `bun` instead of `npm`)
- [x] 1.2 Add runtime deps: `pixi.js@^8`, `zustand`, `uuid`
- [x] 1.3 Add dev deps: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@types/uuid`
- [x] 1.4 Configure `tsconfig.json` with `strict: true` and path alias `@/*` → `src/*`
- [x] 1.5 Set up Vitest with jsdom environment and a sample passing test to verify wiring
- [x] 1.6 Add `bun run lint`, `bun run test`, `bun run build`, and `bun run dev` scripts to package.json
- [x] 1.7 Write a minimal `README.md` with run/build/test commands

## 2. Core data model and store

- [x] 2.1 Create `src/model/types.ts` with `TileIndex`, `TileLayer`, `GameObject`, `MapProject` types from design §D4
- [x] 2.2 Add `src/model/grid.ts` helpers: `indexOf(x, y, width)`, `coordsOf(i, width)`, `createEmptyLayer(w, h)`, `createWalkableGrid(w, h)`
- [x] 2.3 Write unit tests for grid helpers covering edge cells, 0×0 and 1×1 grids, and round-trip `indexOf`/`coordsOf`
- [x] 2.4 Create Zustand document store `src/store/document.ts` with slices for map dimensions, layers, entities, collision, and tileset metadata
- [x] 2.5 Create a separate ephemeral store `src/store/editor.ts` for UI state (current tool, active tile, active layer, zoom, pan, selection) — never serialized
- [x] 2.6 Export strongly-typed selectors/actions for each store

## 3. Command pattern and undo/redo

- [x] 3.1 Define `Command` interface in `src/commands/Command.ts` with `apply(state)` and `invert(state)` and `label` fields
- [x] 3.2 Implement `PaintCellsCommand` (batched cell → tileIndex updates for a single layer)
- [x] 3.3 Implement `ToggleCollisionCommand` (batched walkable flips)
- [x] 3.4 Implement `AddEntityCommand`, `MoveEntityCommand`, `DeleteEntityCommand`, `UpdateEntityPropertiesCommand`
- [x] 3.5 Implement a command stack in `src/commands/history.ts` with 200-entry cap, `do/undo/redo`
- [ ] 3.6 Wire Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z global handlers in the app shell
- [x] 3.7 Unit-test each command's `apply` then `invert` restores original state
- [x] 3.8 Unit-test the history stack: push, undo, redo, overflow beyond cap drops oldest

## 4. Tileset loading and palette (spec: tileset-management)

- [x] 4.1 Implement `src/tileset/loadTileset.ts` that accepts a File/Blob and tile-size config, validates dimensions, and returns an in-memory tileset descriptor plus a PixiJS `BaseTexture`
- [x] 4.2 Slice the base texture into per-tile `Texture` objects keyed by row-major index
- [ ] 4.3 Build `TilePalette.tsx` React component: scrollable grid of tile thumbnails, click-to-select, selected-tile outline
- [ ] 4.4 Hook palette selection into the `editor` store's `activeTile`
- [x] 4.5 Unit-test slicing with fabricated 32×32 image at 16/16/0/0 (expect 4 tiles) and with margin/spacing variations
- [ ] 4.6 Component-test `TilePalette` renders one thumbnail per tile and updates `activeTile` on click

## 5. Canvas renderer and camera (spec: tilemap-editor)

- [ ] 5.1 Create `src/canvas/MapCanvas.tsx` — a React component that mounts a single `HTMLCanvasElement` and initializes a PixiJS `Application` in a `useEffect`
- [ ] 5.2 Build a `GridRenderer` that draws cell outlines via a shared `Graphics` object; redraws only on resize/zoom
- [ ] 5.3 Build a `TileLayerRenderer` that batches sprites via `ParticleContainer` (one container per tile layer)
- [ ] 5.4 Implement camera controls: wheel zoom with cursor as anchor, middle-drag (or Space+drag) pan
- [ ] 5.5 Subscribe renderers to the document store; push targeted updates (only changed cells) rather than re-rendering the whole map
- [ ] 5.6 Verify with a 128×128 dev fixture that pan/zoom hold 60fps in a production build

## 6. Tile paint tools (spec: tilemap-editor)

- [x] 6.1 Implement pointer-to-cell conversion accounting for camera pan/zoom
- [ ] 6.2 Brush tool: click paints active tile; drag coalesces cells into one `PaintCellsCommand` on pointer-up
- [ ] 6.3 Eraser tool: same as brush but writes `-1`
- [x] 6.4 Fill tool: 4-connected flood fill on the active layer, matching the clicked cell's value (algorithm; UI wiring deferred)
- [ ] 6.5 Multiple tile layers: default two layers (`ground`, `decoration`); layer panel with visibility toggle and active-layer selection
- [ ] 6.6 Component-tests for each tool using a fake store: assert grid mutations match spec scenarios

## 7. Entity layer (spec: game-objects)

- [x] 7.1 Create `src/objects/registry.ts` with built-in types `player-spawn`, `npc`, `chest`, `trigger` and their property schemas
- [ ] 7.2 Build `ObjectPalette.tsx` listing registered object types with icons
- [ ] 7.3 Implement "place" tool: selecting an object type + clicking a cell dispatches `AddEntityCommand`
- [ ] 7.4 Render entities as sprites (or colored markers) on a dedicated `EntityRenderer` above tile layers
- [ ] 7.5 Selection: clicking an entity with the select tool highlights it; drag moves it (emits `MoveEntityCommand` on pointer-up)
- [ ] 7.6 `PropertyPanel.tsx`: when an entity is selected, show editable fields driven by its type's schema; changes emit `UpdateEntityPropertiesCommand`
- [ ] 7.7 Delete/Backspace removes the selected entity via `DeleteEntityCommand`
- [ ] 7.8 Tests: placing, moving, deleting, property edits; verify tile tools do not affect entities

## 8. Traversability / collision (spec: traversability)

- [ ] 8.1 Add "collision" mode toggle in the toolbar that swaps the active tool for a collision paintbrush
- [ ] 8.2 Click/drag in collision mode dispatches `ToggleCollisionCommand` for the covered cells
- [ ] 8.3 Build `CollisionOverlayRenderer` that tints blocked cells (e.g., 40% red); wire a visibility toggle
- [x] 8.4 New maps default every cell's `walkable` to `true`
- [ ] 8.5 Tests: toggle flips value, undo restores, overlay hides when toggled off

## 9. Persistence & export (spec: map-persistence)

- [x] 9.1 Implement `serializeProject(doc): string` — single serializer used by both autosave and file export
- [x] 9.2 Implement `deserializeProject(text): MapProject` with version check (reject newer, migrate older)
- [x] 9.3 Autosave: subscribe to document-store changes, debounce 1s, write to `localStorage.getItem('gmm:project')`
- [ ] 9.4 On app boot, detect autosaved project and prompt the user to restore or start fresh
- [ ] 9.5 "Save Project" action: triggers a download of the serialized project as `<name>.json`
- [ ] 9.6 "Open Project" action: file-picker, parse + validate, replace document store on success
- [x] 9.7 "Export Map" action: same JSON (v1 exports the same shape as the save format) with a `schema/export-map.md` doc committed alongside
- [x] 9.8 Tests: round-trip serialize → deserialize preserves all state; version-too-new is refused; empty cells serialize as `-1`; collision array length equals `width * height`

## 10. UI shell & polish

- [ ] 10.1 Compose top-level layout in `src/App.tsx`: toolbar (tools + zoom), left palette pane (tileset + objects), center canvas, right property panel, bottom status bar (cursor cell, zoom, dirty flag)
- [ ] 10.2 Keyboard shortcuts: B (brush), E (erase), F (fill), V (select/move), C (collision mode), 1..9 (active layer)
- [ ] 10.3 Unsaved-changes indicator and `beforeunload` warning when dirty
- [ ] 10.4 Minimal app-level error boundary with a "Reload + restore autosave" affordance

## 11. Verification

- [x] 11.1 Run `bun run test` — all tests pass (64 passing across 10 files)
- [x] 11.2 Run `bun run build` — production build succeeds with no type errors
- [ ] 11.3 Manual smoke test per spec scenarios: load a sample tileset, paint two layers, place an NPC with properties, mark a wall as blocked, save, reload, and export; verify exported JSON matches the documented schema
- [x] 11.4 Run `openspec validate add-tilemap-painter --strict` — validation passes

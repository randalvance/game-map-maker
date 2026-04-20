## Context

The `add-tilemap-painter` change established a tested contract layer: the `MapProject` data model, Zustand document/editor stores, reversible commands with a 200-cap history stack, serialize/deserialize with version gating, autosave (debounced to local storage), tileset geometry math, 4-connected flood fill, screen↔cell math, and the built-in object type registry. 64 unit tests are green; `bun run build` is clean.

What does **not** exist yet: any on-screen interaction. `src/App.tsx` is a placeholder. There is no PixiJS application, no canvas, no palette components, no toolbar, no file-picker wiring, no keyboard handling. This change builds all of it.

Relevant constraints carried over from the foundation:

- **Stack:** React 18 + Vite + TypeScript + Zustand + PixiJS 8. No new dependencies.
- **Render architecture:** React owns DOM chrome (toolbar, panels); PixiJS owns the canvas; they communicate through the Zustand store. Per-frame updates must not route through the React reconciler.
- **State split:** Document state (persisted) lives in `useDocument`; editor state (ephemeral UI) lives in `useEditor`. Autosave/export serialize only the former.
- **Commands:** Every undoable mutation flows through `dispatch()`; drag strokes must coalesce into a single command on pointer-up so one Ctrl+Z reverts the whole stroke.

## Goals / Non-Goals

**Goals:**
- Deliver a fully usable editor matching every scenario in the add-tilemap-painter specs plus the editor-shell spec in this change.
- Keep render hot path out of React: one Pixi `Application`, one set of display objects, store subscriptions update them in place.
- Coalesce drag strokes and hold 60 fps panning/painting on a 128×128 map in a production build.
- Ship a CSS-grid layout that scales with viewport size without relying on a UI framework.

**Non-Goals:**
- Design polish beyond a clean, functional look. Iteration is future work.
- Animated tiles, auto-tiling rules, stamp/pattern brushes.
- Undo of non-document operations (tool switches, camera moves).
- A tileset editor — users still bring their own PNG.
- Bundled default tileset. The empty state tells the user to import one.
- Multi-select, rectangle select, or copy/paste of tile regions.
- Touch/mobile support. Desktop pointer + keyboard only.

## Decisions

### D1. One Pixi Application per map canvas, mounted imperatively

**Chosen:** `MapCanvas.tsx` is a thin React component. A single `useEffect` creates a `PIXI.Application`, mounts its `canvas` into the component's div, builds the scene graph once, subscribes to the Zustand stores for changes, and tears everything down in the cleanup. React never re-creates the Pixi app on prop changes.

**Why:**
- Creating a Pixi app per render is catastrophically expensive. A stable `useEffect` with `[]` deps and careful teardown is the standard pattern.
- By keeping Pixi out of the reconciler entirely, we get deterministic, jank-free rendering.

**Alternatives considered:**
- `@pixi/react` — makes Pixi declarative but drags the reconciler into the render loop. Wrong trade for a painting tool.

### D2. Scene graph

```
Stage (Container)
├── worldContainer (Container) — applies camera transform (scale + position)
│   ├── gridRenderer (Graphics) — cell outlines
│   ├── tileLayerContainers[] — one ParticleContainer per tile layer
│   ├── collisionOverlay (Graphics) — blocked-cell tint, toggleable
│   └── entityContainer (Container) — sprites/markers for game objects, plus a selection ring
└── hudContainer (Container) — optional: cursor cell highlight, screen-space only
```

- **`worldContainer`** carries the camera transform; children are drawn in world coordinates.
- **`ParticleContainer`** per tile layer: cheap, batched sprite rendering. We keep one `Sprite` per cell (even empty ones) and flip its `texture` on edit, which avoids add/remove churn. This is memory-bounded by the map size.
- **`gridRenderer`** redraws only on `zoom`, `width`, or `height` changes, not every frame.
- **`collisionOverlay`** is a single `Graphics` that re-draws when the collision grid changes or its visibility toggles.

### D3. Store-driven updates with targeted diffs

**Chosen:** Renderers subscribe to the Zustand stores via `useDocument.subscribe((next, prev) => ...)` and mutate Pixi objects directly. We do *not* re-render the whole scene on every store change; each renderer inspects what changed and patches the minimum needed display objects.

For tile layers specifically: on every `project` update, iterate only the layers whose `tiles` array reference changed (we always replace the array immutably in commands, so a reference check suffices), then walk each changed layer's tiles and update only sprites whose tile index differs. A dirty flag or shallow diff is sufficient — we don't need a proper differ.

**Why:** Repainting a 128×128 map is 16,384 cells. Updating a handful per brush tick is what keeps us at 60fps.

### D4. Camera and pointer handling

- **Zoom:** mouse wheel on the canvas, centered on the cursor. Range [0.25, 8.0]. Wheel delta uses an exponential (multiplicative) step so zoom feels uniform.
- **Pan:** middle-mouse drag, OR holding `Space` + left-drag. No two-finger trackpad pan in v1 (trackpad wheel events already work).
- **Cell tracking:** a single `pointermove` listener on the stage writes the hovered cell into `useEditor` (throttled to rAF) so the status bar updates smoothly without re-rendering the canvas.

### D5. Tool dispatch

One object in `src/tools/` per tool (`brush`, `erase`, `fill`, `select`, `place`, `collision`). Each implements:

```ts
type Tool = {
  onPointerDown(cell: Cell | null, ctx: ToolContext): void;
  onPointerMove(cell: Cell | null, ctx: ToolContext): void;
  onPointerUp(cell: Cell | null, ctx: ToolContext): void;
  onCancel(): void; // pointer leaves canvas or tool switches mid-stroke
};
```

A central `toolDispatcher.ts` reads `useEditor.tool`, routes canvas pointer events to the active tool, and exposes a `cancelStroke()` the shell calls on tool switch or visibility change.

**Stroke coalescing:** brush/erase/collision tools accumulate cell edits in an internal buffer on `pointerDown`/`pointerMove` (deduplicating by cell), then `dispatch()` a single `PaintCellsCommand` or `ToggleCollisionCommand` on `pointerUp`. If the buffer is empty on pointer-up (user clicked and released without moving, and the cell was already the target tile), no command is dispatched.

### D6. Tileset palette UI

Renders each sliced tile as a small `<canvas>` or CSS-background div in a scrollable grid. The palette subscribes to the document store's tileset metadata and rebuilds thumbnails when the tileset changes.

We don't reuse Pixi textures for palette thumbnails — a plain HTML canvas with `drawImage` is simpler and isolates the palette from Pixi's GPU context lifecycle. For a 256-tile palette this is trivially fast.

### D7. Layout & styling

**Chosen:** Plain CSS with CSS Grid for the top-level shell and CSS custom properties for tokens (colors, spacing). No Tailwind, no CSS-in-JS.

**Why:** The UI surface area is small (~8 component files). Adding Tailwind's build step or CSS-in-JS runtime is cost we don't need. CSS custom properties give us dark/light mode later for free.

### D8. Save / Open / Export wiring

- **Save Project** → calls `downloadProject(project)` in `src/persistence/file.ts`. After a successful download, marks the document clean.
- **Open Project** → a hidden `<input type="file" accept=".json">`, clicked imperatively from a toolbar button. On change, call `readProjectFile` → `replaceProject` → `clearHistory`.
- **Export Map** → same pipeline as Save in v1 (see design.md of add-tilemap-painter for why the save and export formats are the same shape). UI labels them differently to support future divergence.
- **Load Tileset** → hidden `<input type="file" accept="image/png">` with a companion modal for tileWidth/tileHeight/margin/spacing. On submit, `loadTilesetFromBlob`, then update the document's tileset metadata. Existing tile indices are preserved; they may no longer reference valid tiles if the user replaces the tileset with one of different dimensions — surface a warning, don't auto-migrate.

### D9. Autosave restore UX

On boot, `main.tsx` (or the shell's first `useEffect`) reads local storage. If a valid project is present, it renders a blocking dialog *before* mounting the editor canvas (to avoid creating a Pixi context we're about to throw away if the user picks "Restore"). Two buttons: "Restore" and "Start fresh". Corrupt autosaves are silently discarded with a non-blocking toast.

We deliberately do not auto-restore. A surprise restoration of yesterday's map on top of a clean session is a footgun; explicit consent is worth the extra click.

### D10. Entity markers

**Chosen v1:** Flat-color rounded-rect markers with the object type's `glyph` text centered in it — no sprite assets. The registry already carries `color` and `glyph` per type.

**Why:** Ships without art dependencies; easy to distinguish types; trivially themeable. Real sprite overrides are a future change.

## Risks / Trade-offs

- **R1 — PixiJS context lost / GPU hiccups** → If WebGL context is lost (e.g., tab moved to background on some systems), Pixi fires `contextLost`. We listen for it and show a "rendering paused" banner; on recovery, rebuild textures.
- **R2 — Large tilesets blow GPU texture budget** → Warn when a tileset exceeds 4096×4096 or contains >4096 tiles. Don't hard-fail; many users will be under this.
- **R3 — ParticleContainer limits styling per-sprite** → Fine for v1; if future features need per-cell tinting (e.g., hover highlight on a specific tile), we'll move that to an overlay `Graphics` rather than fighting ParticleContainer.
- **R4 — `beforeunload` is noisy** → Only register the handler when `dirty === true`; remove it on `markClean()`. Avoids spurious prompts when the user reloads a pristine session.
- **R5 — Keyboard shortcuts inside inputs** → Global listener checks `document.activeElement` is not an `<input>`/`<textarea>`/`[contenteditable]` before routing. Standard pattern; easy to get wrong.
- **R6 — Autosave on every small edit adds up** → Already debounced at 1 s in the foundation. Confirm this is enough once the editor is being used interactively; if not, bump the debounce or add size-based throttling.
- **R7 — Drag-stroke state lives outside the store** → Tools hold transient buffers in module-level state, which makes them harder to test in isolation. Counter: write pure helpers for the stroke-buffer logic (deduplication, line-filling between sparse pointer events) and test those; leave the pointer plumbing to manual QA.

## Migration Plan

No migration — greenfield UI on top of an existing foundation. Rollback is `git revert` of this change's commit. Neither the JSON schema nor the data model change, so any files saved with the existing serializer remain loadable.

## Open Questions

1. **Should we fill gaps between sparse pointer events on brushes?** Pointermove events are not guaranteed to hit every pixel the cursor traveled over. Without line interpolation, fast brushes leave gaps. *Proposed:* yes — Bresenham line between successive pointer positions. Low cost, user-expected.
2. **Drag-to-paint in collision mode: single-state or toggle-per-cell?** If the user clicks a walkable cell and drags across mixed cells, do we (a) set every covered cell to blocked, or (b) toggle each individually? *Proposed:* (a). The initial click establishes the action (block or unblock) based on the starting cell's current state, and the rest of the stroke repeats that action. Prevents accidental flapping.
3. **Property panel layout for objects with many properties?** *Proposed:* plain vertical stack of labeled inputs; revisit if any built-in type carries > ~6 properties (none do today).
4. **Where does "New Map" live, and does it prompt for dimensions?** *Proposed:* toolbar → "New…" button → modal asking width/height/tileSize, defaulting to 32×32×16. "New" while dirty triggers the same unsaved-changes confirmation as page reload.

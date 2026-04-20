## Context

This is a greenfield project. The repository currently contains only OpenSpec scaffolding and `.claude` configuration — no source code, no build tooling, no dependencies. The goal is a browser-based tilemap editor tuned for 8/16-bit RPG authoring: paint tiles from an imported tileset, drop game objects, mark which cells block movement, and export the result as JSON that a game engine can load.

The user has already made four foundational choices (captured in the proposal):
- **Platform**: Web app, React + PixiJS/WebGL
- **Export format**: Custom JSON
- **Game objects**: Separate entity layer (not tagged tiles)
- **Traversability**: Per-tile `walkable` boolean

This document covers the architecture, data model, and key technical decisions needed to turn those into working code.

## Goals / Non-Goals

**Goals:**
- A single-page React app that boots into a usable empty editor.
- PixiJS renders the tile grid, painted layers, entities, and collision overlay at 60fps on a 128×128 map.
- A clean separation between *editor state* (selected tool, active tile, camera) and *document state* (the map being edited), because only document state is persisted and exported.
- Deterministic, undoable mutations: every user edit is a command that can be inverted.
- A documented, versioned JSON export schema that a third-party engine can consume without reverse-engineering.

**Non-Goals:**
- Animated tiles, auto-tiling rules, or terrain brushes (future work).
- Multi-user / collaborative editing.
- Tileset authoring (drawing tiles inside the editor). Users bring their own PNG.
- Compatibility with Tiled's `.tmx`/`.tmj` formats — explicitly a separate format.
- Runtime game logic: the editor does not execute or simulate the map.
- A backend. Everything runs client-side; autosave uses browser local storage.

## Decisions

### D1. Tech stack: Vite + React 18 + TypeScript + PixiJS 8

**Chosen:** Vite for the dev server/build, React 18 for UI chrome (toolbar, palette, property panel), PixiJS 8 for the canvas (grid, tiles, entities, overlay), and TypeScript throughout.

**Why:**
- React owns the DOM UI, where form controls and panels are ergonomic.
- PixiJS owns the canvas, where we need batched sprite rendering for thousands of tiles.
- Keeping React *out* of per-frame rendering avoids reconciler overhead on the hot path.
- PixiJS 8 has a modern, tree-shakeable ESM API.

**Alternatives considered:**
- **Plain Canvas 2D**: simpler but slow on maps >64×64 once multiple layers stack.
- **`@pixi/react`**: tempting, but forces the reconciler into the render loop. We'd rather mount Pixi imperatively inside a single React `useEffect` and let Pixi manage its own scene graph.
- **Three.js**: 3D overkill for a 2D grid.

### D2. State management: Zustand for document state, React local state for UI

**Chosen:** One Zustand store holds the persistent document (map, layers, entities, collision, tileset metadata). UI-only state (current tool, hovered cell, zoom) is kept in React local state or a separate ephemeral Zustand slice that isn't persisted.

**Why:**
- Zustand is tiny, supports slices, and its subscribe API lets the Pixi layer react to document changes without routing through React's reconciler.
- Separating document state from UI state means autosave/export never accidentally serialize "the current tool."

**Alternatives considered:**
- **Redux Toolkit**: heavier, more ceremony; its upside (devtools, middleware) doesn't outweigh boilerplate here.
- **Jotai/Valtio**: fine alternatives, but Zustand's explicit store shape plays well with the command pattern below.

### D3. Edits as reversible commands (command pattern for undo/redo)

**Chosen:** Every mutation that should be undoable is dispatched as a `Command` object with `apply(state)` and `invert(state)` methods. A bounded command stack (e.g., 200 entries) drives undo/redo.

**Why:**
- Painting is a stream of micro-edits. Storing full state snapshots per keystroke is wasteful; commands are compact.
- Drag-painting can be coalesced into a single command on mouse-up so one Ctrl+Z reverts a whole stroke (not one cell at a time).
- Collision toggles and entity moves use the same machinery, giving consistent undo semantics across capabilities.

**Alternatives considered:**
- **Immer patches**: automatic, but granularity is per-setter, making stroke coalescing awkward.
- **Full snapshots**: simple, but memory grows with map size × history depth.

### D4. Data model

```ts
type TileIndex = number;                    // -1 = empty, else index into tileset
type TileLayer = {
  id: string;
  name: string;
  visible: boolean;
  tiles: TileIndex[];                       // length = width * height, row-major
};

type GameObject = {
  id: string;                               // stable uuid
  type: string;                             // "npc", "chest", "player-spawn", ...
  x: number;                                // grid cell
  y: number;
  properties: Record<string, string | number | boolean>;
};

type MapProject = {
  version: 1;
  width: number;                            // cells
  height: number;
  tileSize: number;                         // pixels
  tileset: {
    src: string;                            // data URL or filename
    tileWidth: number;
    tileHeight: number;
    margin: number;
    spacing: number;
  };
  layers: TileLayer[];
  entities: GameObject[];
  collision: boolean[];                     // length = width * height, true = walkable
};
```

**Why flat arrays (not 2D):**
- One allocation, cache-friendly iteration when rendering.
- Trivial to serialize (JSON handles them natively).
- Index arithmetic `i = y * width + x` is a one-liner; if ergonomics suffer, wrap in a helper.

### D5. Export format versioning

**Chosen:** Every exported map has a top-level `version: <integer>`. The loader refuses to open any file with a version *greater* than the editor understands; older versions pass through a migration chain.

**Why:**
- Guarantees forward compatibility of downstream consumers — they can pin a version and fail loudly on a schema bump.
- Encodes a "no silent data loss" promise. See Risk R2.

### D6. Local-storage autosave is a backup, not a source of truth

**Chosen:** Autosave writes the full project to local storage debounced at 1/sec. The user still must explicitly "Save Project" to download a file. On page load, if local storage has a project, the editor offers to restore it.

**Why:**
- Local storage is per-origin and can be cleared unexpectedly (incognito, storage pressure, user-cleared). Treating it as authoritative would be a footgun.
- Offering a restore prompt (instead of auto-loading) means the user consciously opts into recovering in-progress work.

### D7. Object types are defined in a registry module, not user-editable (v1)

**Chosen:** A `src/objects/registry.ts` module exports the built-in types (`player-spawn`, `npc`, `chest`, `trigger`) and their property schemas. User-defined types are out of scope for this change.

**Why:**
- Gets a functional editor shipped. Building a UI to let users define object types + schemas is a non-trivial feature by itself.
- The registry is a single extension point — adding types later means editing one file, not plumbing through the whole app.

**Follow-up:** A future change can introduce a user-facing type editor and promote the registry to a document-level concern.

## Risks / Trade-offs

- **R1 — Large maps strain WebGL draw calls** → Use a PixiJS `ParticleContainer` or `TilingSprite` chunking so we batch tile sprites. Budget target: render a 256×256 map at 60fps on a mid-range laptop.
- **R2 — JSON schema churn during early development will break consumers** → Commit to the `version` field on day one. Maintain a tiny migration function per version bump. Document the schema in `docs/export-schema.md` as part of the implementation tasks.
- **R3 — Undo stack memory growth on long sessions** → Cap history depth (e.g., 200 commands) and coalesce drag strokes into one command. Commands reference indices, not deep copies.
- **R4 — Autosave and explicit save can drift** → Autosave writes the same serialized shape the file export uses (minus any file-only wrapper). One serializer, two sinks.
- **R5 — Tileset image embedded as data URL inflates file size** → For v1, accept it as a simplicity win. Add "external tileset reference" mode later if users complain.
- **R6 — PixiJS upgrades have historically been breaking** → Pin to `pixi.js@^8` and treat major-version bumps as separate OpenSpec changes.

## Migration Plan

This is greenfield; there is no existing code to migrate. Rollback is `git revert` on the implementation commit plus `npm uninstall` of the added deps. No external systems or stored data are affected.

## Open Questions

1. Should we support non-square tiles (e.g., 16×24) in v1? — *Proposed: yes, the data model already supports `tileWidth` ≠ `tileHeight`. Cost is minor.*
2. Should the collision grid be its own toggleable "layer" in the layer panel, or hidden behind a dedicated mode? — *Proposed: dedicated mode + overlay toggle, matching the spec. Revisit if users request layer-panel parity.*
3. What's the minimum browser target? — *Proposed: latest Chrome, Firefox, Safari. No IE/legacy Edge.*
4. Should project files embed the tileset PNG (base64) or reference it by relative path? — *Proposed: embed by default so `.json` is self-contained; add "link instead of embed" later if file size becomes a pain point.*

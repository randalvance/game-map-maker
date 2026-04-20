## Why

There is no tool in this project yet for authoring 8/16-bit style RPG maps from a tileset, placing game objects, and marking traversable paths. Building one unlocks rapid level design for retro-style games without forcing the user into a general-purpose editor like Tiled.

## What Changes

- Introduce a browser-based map editor (React + PixiJS/WebGL) as the root application.
- Load a tileset image + metadata, slice it into a grid of tiles, and render a palette the user can pick from.
- Paint tiles onto a fixed-size map grid with brush, fill, and eraser tools, plus undo/redo.
- Place **game objects** (NPCs, spawn points, chests, triggers) on a separate entity layer with free-form metadata.
- Mark each map cell as **walkable** or **blocked** via a per-tile traversability flag, with a toggleable collision overlay.
- Save/load map projects locally and export maps to a custom JSON format suitable for game engines to consume.

## Capabilities

### New Capabilities
- `tilemap-editor`: Core map canvas — grid rendering, tile painting tools (brush/fill/erase), undo/redo, zoom/pan, selection.
- `tileset-management`: Loading a tileset image, slicing it by tile size, displaying the tile palette, and picking the active tile.
- `game-objects`: Placing, moving, deleting, and editing object instances on a dedicated entity layer with type + properties.
- `traversability`: Per-tile walkable/blocked flag, collision-overlay visualization, and a dedicated paint mode to toggle cells.
- `map-persistence`: Project save/load (local storage + JSON file) and map export to a documented custom JSON schema.

### Modified Capabilities
<!-- None — this is the initial project. -->

## Impact

- Affects: entire codebase (greenfield). No prior code to modify.
- New runtime dependencies: `react`, `pixi.js`, `@pixi/react` (or equivalent), `zustand` (or similar state lib), plus a build toolchain (Vite + TypeScript).
- New dev dependencies: `vitest` for unit tests, `@testing-library/react` for component tests.
- No external services, APIs, or backend — fully client-side.
- Defines a project-level JSON export schema that downstream game engines will consume; future changes to it will be BREAKING for consumers.

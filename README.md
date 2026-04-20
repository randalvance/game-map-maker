# Game Map Maker

Browser-based tilemap editor for authoring 8/16-bit style RPG maps. Paint tiles from a tileset, place game objects on an entity layer, and mark which cells are walkable. Exports to a custom JSON format.

Built with React + PixiJS + TypeScript. Client-side only; no backend.

## Commands

```sh
bun install           # install dependencies
bun run dev           # start dev server (http://localhost:5173)
bun run test          # run unit tests
bun run test:watch    # run tests in watch mode
bun run build         # type-check + production build to dist/
bun run lint          # type-check only (tsc --noEmit)
```

## Architecture

See `openspec/changes/add-tilemap-painter/` for the spec-driven design notes:

- `proposal.md` — goals & capabilities
- `design.md` — architecture & technical decisions
- `specs/**/spec.md` — per-capability requirements and scenarios
- `tasks.md` — implementation checklist

## Directory layout

```
src/
  model/        data types and grid helpers
  store/        Zustand stores (document + editor)
  commands/     undoable command objects and history stack
  tileset/      tileset loading and slicing
  canvas/       PixiJS renderer
  objects/      built-in game object registry
  persistence/  save / load / export
  ui/           React components (toolbar, palettes, panels)
  App.tsx       top-level layout
  main.tsx      entry point
```

# Game Map Maker

Browser-based tilemap editor for authoring 8/16-bit style RPG maps. Paint tiles from a tileset, place game objects on an entity layer, and mark which cells are walkable. Exports to a custom JSON format.

Built with React + PixiJS + TypeScript. The editor runs entirely client-side; an optional Vercel Blob signing endpoint (one serverless route) lets users save tilesets and projects to the cloud.

## Commands

```sh
bun install           # install dependencies
bun run dev           # start dev server (http://localhost:5173)
bun run test          # run unit tests
bun run test:watch    # run tests in watch mode
bun run build         # type-check + production build to dist/
bun run lint          # type-check only (tsc --noEmit)
```

## Cloud storage setup (optional)

Cloud Save / Open and cloud-hosted tilesets require a Vercel Blob token.

1. Create a Vercel project and link it (`vercel link`).
2. Provision a Blob store under **Storage → Blob** in the Vercel dashboard.
3. Pull the env var locally: `vercel env pull .env.local` (or copy `BLOB_READ_WRITE_TOKEN` into `.env.local` manually). See `.env.example` for the variable name.
4. Run the dev server with `vercel dev` so the `/api/blob/sign` route is served alongside the SPA.

When the token is missing, the editor still works — cloud buttons just disable themselves and tilesets fall back to embedded data URLs (the v1 behavior). No data ever leaves the browser without an upload action.

**Security model.** Project URLs are unguessable (UUIDv4) but unauthenticated: anyone with a project's URL can read or overwrite it. This is "share-link as access token" — fine for a single-user editor, but don't paste your URL anywhere public. The signing endpoint enforces strict allow-lists on pathname patterns, MIME types, and file size, and the `BLOB_READ_WRITE_TOKEN` itself never leaves the server.

**Migrating v1 saves.** Project files saved before this version embedded the tileset PNG as a base64 data URL. Opening a v1 file in this build still works; the next time you save (locally or to the cloud), the tileset is uploaded to Blob and the saved file becomes v2 referencing a URL. Local Save without a configured token leaves the data URL in place — the file stays self-contained for offline use.

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

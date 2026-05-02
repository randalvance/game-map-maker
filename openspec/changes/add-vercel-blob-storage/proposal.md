## Why

Today every tileset image is base64-embedded into the saved project JSON via `TilesetMeta.src` (a `data:` URL). A modest 1024×1024 tileset bloats a save file from ~50 KB of map data into a multi-megabyte JSON, and the only place a project lives is the user's local file system. We want maps and the assets they reference to be shareable, durable, and decoupled from the disk file — without taking on a database or auth system. Vercel Blob with a small signed-URL endpoint is the cheapest path to that on the existing Vercel deployment target.

## What Changes

- Add a `cloud-asset-storage` capability: a signed-URL upload contract for image and project blobs, with a serverless `/api/blob/sign` endpoint that holds the `BLOB_READ_WRITE_TOKEN` and issues short-lived, scoped, one-shot upload URLs.
- Add a typed client (`src/storage/blobClient.ts`) wrapping `@vercel/blob/client`'s `upload()` so the rest of the app uploads tilesets, future sprite assets, and project JSON through a single uniform call.
- Extend `TilesetMeta.src` to accept a remote URL in addition to a `data:` URL. When the user imports a PNG, the editor uploads it to Blob and stores the resulting URL; `loadTilesetFromBlob` is generalized to accept either a `Blob` or a URL.
- Add a "Save to Cloud" / "Open from Cloud" pair alongside the existing local Save / Open. Cloud-saved projects upload the `MapProject` JSON to Blob keyed by a project ID stored in `useDocument`; opening pulls the same key. Local Save/Open still works unchanged.
- Add forward-compatibility for sprite/object image assets: the upload pipeline accepts arbitrary image MIME types and returns a URL. No UI for sprite assets in this change.
- **BREAKING (schema, minor)**: bump `CURRENT_SCHEMA_VERSION` from `1` to `2`. Version 1 files (with `data:` URL tilesets) still load — `validateProject` accepts both and lazily re-uploads on next save. Version 2 emits URL tilesets only.

No new third-party services. One new dependency (`@vercel/blob`). Vercel Hobby's free tier covers expected usage.

## Capabilities

### New Capabilities
- `cloud-asset-storage`: signed-URL upload contract — what the client may upload, how the signing endpoint authorizes it, blob-key naming, MIME and size limits, lifecycle (no auto-delete in v1), and the security model (project IDs are unguessable, so the URL is the access token).

### Modified Capabilities
- `tileset-management`: `TilesetMeta.src` is now `data: URL | https: URL`; tileset import uploads the PNG and stores the returned URL; tileset reload from a project pulls the URL (with a `data:` fallback for v1 files).
- `map-persistence`: adds "Save to Cloud" and "Open from Cloud" requirements; serializer accepts both schema versions on read; emits v2; cloud Save sets a `projectId` on the document so subsequent saves overwrite the same blob.

## Impact

- **Affects:** `src/model/types.ts` (schema bump, `projectId`, `TilesetMeta.src` widened), `src/persistence/serialize.ts` (v1↔v2 acceptance, projectId), `src/persistence/file.ts` (cloud variants), `src/tileset/loadTileset.ts` (URL loading), `src/store/document.ts` (projectId), `src/ui/Toolbar.tsx` (cloud buttons), `src/App.tsx` (open-by-id flow). New: `src/storage/` (blob client + types), `api/blob/sign.ts` (serverless route), `vercel.json`.
- **New dependencies:** `@vercel/blob` (~30 KB gzipped server-side; the `/client` subpath is small in the browser bundle).
- **Bundle:** browser bundle grows by the `@vercel/blob/client` import only — well under 10 KB. Stays inside the 300 KB target from `add-tilemap-painter-ui`.
- **Infra:** requires `BLOB_READ_WRITE_TOKEN` in Vercel project env; local dev needs the same in `.env.local`. Without it, cloud actions degrade gracefully (UI disabled, local Save/Open unaffected).
- **Security:** project blobs are served at unguessable URLs (`projects/<uuid>.json`). Anyone with the URL can read or overwrite. v1 has no auth; documented as a known limitation.
- Depends on `add-tilemap-painter-ui` landing first (uses its file picker + serializer wiring); does not archive it.

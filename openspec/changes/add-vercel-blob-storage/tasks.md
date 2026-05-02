## 1. Project setup and dependencies

- [x] 1.1 Add `@vercel/blob` to `package.json` dependencies and run `bun install` to lock the version
- [x] 1.2 Create `vercel.json` at the repo root configuring the SPA rewrite for the editor and the `/api/*` route convention
- [x] 1.3 Add `BLOB_READ_WRITE_TOKEN` to `.env.example` with a comment pointing to the Vercel project env, and update `README.md` with a "Cloud storage setup" section that documents the env var, how to get one, and the share-link-as-auth security model
- [x] 1.4 Confirm `vite.config.ts` and `tsconfig.app.json` exclude `api/` from the browser build so the serverless route never ends up in client code

## 2. Schema bump (model + serializer)

- [x] 2.1 Update `src/model/types.ts`: bump `CURRENT_SCHEMA_VERSION` to `2`, widen `TilesetMeta.src` documentation to `data: URL | https: URL`, add optional `projectId?: string` to `MapProject`
- [x] 2.2 Update `src/persistence/serialize.ts` `validateProject` to accept versions 1 and 2; for v1 inputs, leave the document logically as v1 (so lazy migration in §6 can detect it); for v2 inputs, validate `tileset.src` is one of the two URL forms and `projectId` is either absent or a valid UUIDv4
- [x] 2.3 Update `serializeProject` to always emit `version: 2`
- [x] 2.4 Add unit tests in `serialize.test.ts` covering: v1 file with dataURL tileset round-trips; v2 file with URL tileset round-trips; v2 file with `projectId` round-trips; v1 file with `https:` `tileset.src` is rejected (must be dataURL); v3 file is rejected as too new; missing/invalid `projectId` UUID is rejected on read

## 3. Signing endpoint

- [x] 3.1 Create `api/blob/sign.ts` exporting a default handler that wraps `handleUpload()` from `@vercel/blob/client`, reads `BLOB_READ_WRITE_TOKEN` from env, and returns 503 with a `{ kind: 'not-configured' }` body when the env var is missing
- [x] 3.2 In the handler's `onBeforeGenerateToken`, validate `pathname` matches one of: `tilesets/<hex64>.png`, `sprites/<hex64>.png`, `projects/<uuid>.json`; reject with HTTP 400 and a `{ kind: 'forbidden-key' }` body otherwise
- [x] 3.3 Restrict allowed content types per pattern (`image/png` for tilesets/sprites, `application/json` for projects); reject mismatches with HTTP 400
- [x] 3.4 Set `maximumSizeInBytes` to `10 * 1024 * 1024` for image patterns and `2 * 1024 * 1024` for project JSON; let the SDK reject oversize uploads, mapping its error to HTTP 413 with `{ kind: 'too-large' }`
- [x] 3.5 Set `cacheControlMaxAge: 31536000` and `addRandomSuffix: false` for image keys, and `cacheControlMaxAge: 0` for project keys (effectively no-store)
- [x] 3.6 Add an integration test that POSTs sample bodies and asserts: allowed pattern returns a signed URL with no token in the response; disallowed pattern returns 400; missing-token deployment returns 503

## 4. Blob client wrapper

- [x] 4.1 Create `src/storage/types.ts` defining `CloudStorageError` (with the five `kind` variants) and the public function signatures from D5
- [x] 4.2 Create `src/storage/blobClient.ts` implementing `uploadTilesetImage(blob)`: SHA-256 the blob via `crypto.subtle.digest`, hex-encode, call `upload()` from `@vercel/blob/client` with `pathname: 'tilesets/<hash>.png'` and `handleUploadUrl: '/api/blob/sign'`, return the resulting URL
- [x] 4.3 Implement `uploadProjectJson(json, projectId)` and `fetchProjectJson(projectId)`; for the fetch, use `fetch()` against the canonical Blob public URL pattern (or a thin server route that resolves the URL given an ID — pick whichever is simplest and document the choice). **Decision:** added `api/blob/resolve.ts` (uses `head()` server-side) so the client doesn't need a Blob-base-URL env var.
- [x] 4.4 Implement `isCloudConfigured()` with a HEAD probe against `/api/blob/sign`; cache the boolean result for the rest of the session
- [x] 4.5 Wrap all SDK errors in `CloudStorageError` with the appropriate `kind`; preserve original error as `cause`
- [x] 4.6 Add unit tests with `fetch` mocked: each function maps responses to the right behavior; size-limit and pathname errors surface with correct `kind`; HEAD probe caching only calls the network once per session

## 5. Tileset loading: URL or Blob

- [x] 5.1 Refactor `src/tileset/loadTileset.ts` so the input is `Blob | string` (URL); when given a URL, skip `blobToDataUrl` and pass the URL directly to `Assets.load({ src, loadParser: 'loadTextures', crossOrigin: 'anonymous' })`
- [x] 5.2 In the import flow (called from the toolbar's "Load Tileset"), after a successful slice, also call `uploadTilesetImage(blob)` when cloud is configured and store the returned URL in `TilesetMeta.src`; otherwise keep the dataURL behavior
- [x] 5.3 Surface a clear error message when an `https:` tileset URL fails to fetch (CORS, 404, network) — distinct from "invalid PNG" — and prompt the user to re-import a tileset
- [x] 5.4 Add unit tests for both branches of the loader (mocked PixiJS `Assets`); verify `crossOrigin: 'anonymous'` is set on the URL path

## 6. Document store: projectId + lazy migration

- [x] 6.1 Update `useDocument` to track `projectId: string | undefined` as part of the persisted document state; ensure autosave/restore round-trips it
- [x] 6.2 Add a helper `ensureProjectId()` on the document store that mints a UUIDv4 when not present and returns the current ID
- [x] 6.3 Add a `migrateTilesetIfNeeded()` step invoked from the Save and Save-to-Cloud flows: if `tileset.src` starts with `data:` and cloud is configured, decode to Blob, call `uploadTilesetImage`, and replace `tileset.src` with the URL on the document — all before serialization
- [x] 6.4 Add unit tests for the migration helper covering: dataURL → upload → URL replacement; cloud-not-configured leaves dataURL untouched; upload failure leaves the document state unchanged

## 7. Toolbar wiring (Save / Open)

- [x] 7.1 Add "Save to Cloud" button to the toolbar; on click, run migration (§6.3), `serializeProject`, `uploadProjectJson(json, ensureProjectId())`, then `markClean` and show a toast with the project URL plus copy-to-clipboard action
- [x] 7.2 Disable the "Save to Cloud" button when `isCloudConfigured()` is false; tooltip explains why
- [x] 7.3 Add "Open from Cloud" button; clicking opens a small modal with one input that accepts either a UUID or a full Blob URL — extract the UUID with a regex, validate UUIDv4 shape, then `fetchProjectJson` → validator → `replaceProject` → `clearHistory`
- [x] 7.4 If the active document is dirty when "Open from Cloud" is invoked, show the existing unsaved-changes confirmation before fetching
- [x] 7.5 On successful Open from Cloud, set `projectId` on the in-memory document so the next Save-to-Cloud overwrites the same blob
- [x] 7.6 Surface 404 ("No project found with that ID") and other `CloudStorageError` kinds as targeted toast messages, never as a stuck spinner

## 8. End-to-end testing and verification

- [ ] 8.1 Add an `e2e`/manual test plan to `README.md` (or a `TESTING.md`) covering: import tileset → save to cloud → reload → open from cloud round trip; v1 file with dataURL → save → on-disk file is now v2 with URL; cloud-not-configured deployment still supports local Save / Open
- [x] 8.2 Run `bun run lint`, `bun run test`, and `bun run build` clean
- [ ] 8.3 Manually verify in `vercel dev` with a real `BLOB_READ_WRITE_TOKEN`: upload a tileset, save a project, copy the URL, reload the page, paste the URL into "Open from Cloud", confirm the project loads and the tileset renders
- [ ] 8.4 Manually verify in `vite dev` (no token): cloud buttons disabled, tooltip correct, local Save/Open behavior unchanged from prior version

## 9. Documentation and rollout

- [ ] 9.1 Document the `projectId` field, the v2 schema, and the share-link-as-auth security model in `README.md`
- [ ] 9.2 Add a short "Migrating v1 saves" note explaining that opening a v1 file and saving in this build re-uploads the embedded tileset and produces a v2 file
- [ ] 9.3 Open the PR with screenshots/recordings of the cloud Save and Open flows, the disabled-state tooltip, and a v1→v2 migration save

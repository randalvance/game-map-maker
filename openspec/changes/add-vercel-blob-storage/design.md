## Context

The editor currently treats a saved project as a single self-contained JSON file: `MapProject` carries a `TilesetMeta` whose `src` is a `data:` URL containing the entire base64-encoded tileset PNG. This was a deliberate v1 simplification — one file, no external references, trivially shareable as an email attachment — but it scales badly: a 2048×2048 tileset balloons a 50 KB map into a 5+ MB JSON blob that is slow to parse, slow to download, and miserable to diff.

Constraints carried over from the foundation work:
- **Stack:** React 18 + Vite + TypeScript + Zustand + PixiJS 8. The app is currently a pure SPA with no backend; `package.json` has no server runtime.
- **Schema:** `CURRENT_SCHEMA_VERSION = 1`. `validateProject` rejects future versions and accepts current ones strictly.
- **Persistence model:** document state is what's saved; `useDocument` is the single source of truth. Autosave debounces to local storage. Save / Open are explicit user-initiated actions through the toolbar.
- **No new runtime dependencies** was the rule in the prior change. We're explicitly relaxing that here for `@vercel/blob`, which is the official SDK and is the smallest reasonable surface.

Deployment target is Vercel — both serverless functions and Blob storage are first-party, and the Hobby tier covers expected single-user traffic. Other backends (S3, R2, Supabase) were considered (see D1).

## Goals / Non-Goals

**Goals:**
- Decouple tileset image bytes from the project JSON. A saved project should be small text again.
- Provide a "Save to Cloud" / "Open from Cloud" pair so a project can be reloaded without a local file.
- Keep the editor fully usable when the user has no `BLOB_READ_WRITE_TOKEN` configured — local Save/Open and dataURL tilesets must still work.
- Keep the security surface tiny: one signing endpoint, no auth, no database, no admin panel.
- Stay inside the existing 300 KB gzipped browser bundle target.
- Old (v1) project files keep loading. Any user who saves a v1 file with this version of the editor gets a v2 file, transparently re-uploading any embedded `data:` URL tileset to Blob.

**Non-Goals:**
- Multi-user, accounts, sharing permissions, ACLs.
- Project listing / browse UI ("my recent cloud projects"). v1 only opens by ID.
- Server-side validation of uploaded JSON (browser-side validator runs first; the server doesn't read blob contents).
- CDN cache invalidation for tilesets — tileset URLs are immutable per upload (key includes a content hash); replacing a tileset writes a new key.
- A migration script for existing v1 files on disk. Migration happens lazily on next save.
- Sprite-asset upload UI. The pipeline accepts arbitrary image MIMEs but no entity sprite UI exists yet (entities still use color+glyph markers).
- Versioning of cloud blobs (overwrite-in-place is fine in v1).
- Touch/mobile support, same as the prior change.

## Decisions

### D1. Vercel Blob with a tiny signing endpoint (vs. S3/R2/Supabase, vs. proxy upload)

**Chosen:** Vercel Blob, with one serverless function `api/blob/sign.ts` that wraps `handleUpload()` from `@vercel/blob/client`. The browser calls `upload()` from `@vercel/blob/client`, which auto-fetches a signed URL from the endpoint and PUTs the file directly to Blob.

**Why:**
- Vercel is already the deployment target. Zero new accounts or DNS surface.
- Bytes never pass through a serverless function — the function only signs a URL — so the upload doesn't consume GB-seconds of function quota. Cheapest pattern that's still safe.
- The token (`BLOB_READ_WRITE_TOKEN`) is server-only by design. There is no "client-write token" mode, so we cannot avoid a server endpoint while staying with Blob.
- `@vercel/blob/client` is small (~6 KB gzipped in the browser); the heavier server portion of the SDK doesn't ship to the client.

**Alternatives considered:**
- **Proxy upload through `/api/upload`** — file flows through the function. Strictly more expensive; same security. Rejected.
- **Cloudflare R2** — cheaper egress and a generous free tier, but adds a Cloudflare account and a Worker for signing. The savings only matter at scale we don't expect. Rejected for now; reconsider if usage grows.
- **Supabase Storage with anon RLS** — lets the client write directly with no signing endpoint, but adds a whole auth+RLS surface and a separate dashboard. Rejected; trades one tiny endpoint for a much bigger architectural change.
- **Keep dataURL embedding** — does nothing about the file-size problem. Rejected.

### D2. Blob key layout and content addressing

**Chosen:**
- **Tileset images:** `tilesets/<sha256>.png`. Keyed by content hash so identical PNGs (across users or across saves) deduplicate naturally and a tileset URL is immutable. Browser computes the SHA-256 with `crypto.subtle.digest` before upload.
- **Project JSON:** `projects/<projectId>.json`, where `projectId` is a UUIDv4 minted on first cloud save. Mutable: subsequent Save-to-Cloud overwrites the same key.
- **(Future) sprite images:** `sprites/<sha256>.png`. Same pattern as tilesets.

**Why:**
- Content-addressed image keys mean we never need to garbage-collect unused tilesets — they're naturally shared and the unique-key count is bounded by unique images.
- Mutable, ID-keyed project JSON gives us a stable URL that "is the project," matching the user's mental model of one file.
- Hashing in the browser is fine: a 4 MB tileset hashes in <50 ms with `crypto.subtle`.

**Alternatives considered:**
- All UUID keys, including images: simpler but produces orphans and inflates storage. Rejected.
- Server-computed hash: round-trips the file through the function. Defeats D1. Rejected.

### D3. Schema bump and dual-version acceptance

**Chosen:** Bump `CURRENT_SCHEMA_VERSION` from 1 to 2. `validateProject` accepts both versions on read but `serializeProject` always emits v2.

**v2 differences from v1:**
- `tileset.src` is documented to be either a `data:` URL (v1 legacy) or an `https:` URL (v2 native). Type widens to `string` with a runtime check that the value is one of the two.
- New optional top-level field `projectId?: string` (UUIDv4). Set when the project has been cloud-saved at least once; absent for local-only projects. v1 readers tolerate unknown fields, so forward-compat is fine.

**Lazy migration:** when a v1 project is loaded and the user runs Save (local or cloud), if `tileset.src` is a `data:` URL we upload it to Blob via D2's hash key, replace `src` with the URL, bump `version` to 2, and write. v1 files on disk that are never re-saved stay v1 forever and keep working.

**Why:**
- Reading both means no user gets stranded. Writing only the latest avoids "split-brain" projects where the on-disk version drifts from the live one.
- A schema bump (rather than a silent type widening) makes "this project requires the cloud-aware editor" diagnosable — older builds error out cleanly with the existing `version > CURRENT_SCHEMA_VERSION` guard.

**Alternatives considered:**
- No bump, just widen the type: silently breaks older builds when they encounter a URL `src` they can't fetch (CORS, offline). Rejected.
- Separate v2 file extension (`.gmm` vs `.json`): more cosmetic than useful; no UI surface to make the distinction matter. Rejected.

### D4. Signing endpoint contract

The endpoint is `POST /api/blob/sign`. It expects the body shape `@vercel/blob/client`'s `upload()` already sends — `handleUpload()` does the parsing — but our wrapper restricts what's allowed:

- **Allowed pathname patterns:** `tilesets/<hex64>.png`, `sprites/<hex64>.png`, `projects/<uuid>.json`. Anything else is rejected with 400.
- **Allowed MIMEs:** `image/png` for the image kinds, `application/json` for projects.
- **Max upload size:** 10 MB for images, 2 MB for project JSON. Enforced by `maximumSizeInBytes` in the signing payload.
- **Cache:** image keys get `cacheControl: "public, max-age=31536000, immutable"` (content-addressed → safe). Project keys get `no-store`.
- **Token:** read from `process.env.BLOB_READ_WRITE_TOKEN`. If missing, the endpoint returns 503 with a body the client surfaces as "Cloud storage isn't configured for this deployment."

The endpoint is the only server file in this change. It does not read or write the blob body itself.

### D5. Client wrapper

`src/storage/blobClient.ts` exports:

```ts
export async function uploadTilesetImage(blob: Blob): Promise<string>;
export async function uploadProjectJson(json: string, projectId: string): Promise<string>;
export async function fetchProjectJson(projectId: string): Promise<string>;
export async function fetchTilesetImage(url: string): Promise<Blob>;
export const isCloudConfigured: () => Promise<boolean>; // pings /api/blob/sign with a HEAD
```

- All upload functions wrap `@vercel/blob/client`'s `upload()` with the right `pathname`, content-type, and `handleUploadUrl: '/api/blob/sign'`.
- `fetchProjectJson` is just `fetch().then(r => r.text())` — the URL is public so no signing needed for reads.
- `isCloudConfigured` caches the answer per session; the toolbar uses it to enable/disable cloud buttons.
- Errors are normalized into a `CloudStorageError` class with `kind: 'not-configured' | 'too-large' | 'forbidden-key' | 'network' | 'unknown'` so UI can branch cleanly.

### D6. Tileset loading: URL or Blob

`loadTileset.ts` is generalized to accept either a `Blob` (current path, used for fresh user imports before upload) or a `string` URL (used when reopening a v2 project or a v1 project whose dataURL is mid-migration). Internally:

- Blob path: existing `blobToDataUrl` → `Assets.load`. After this we additionally upload to Blob via D5 and store the returned URL on `TilesetMeta.src`. The dataURL is *not* persisted.
- URL path: pass the URL directly to `Assets.load({ src: url, loadParser: 'loadTextures' })`. PixiJS handles fetching with proper CORS.

CORS: Vercel Blob serves with `Access-Control-Allow-Origin: *` by default for public blobs, so `crossOrigin: 'anonymous'` on the loader is sufficient and lets the texture be GPU-uploaded without taint.

### D7. Save/Open UI

Two new toolbar buttons sit next to the existing local Save / Open:

- **Save to Cloud** — disabled if `isCloudConfigured()` is false. On click: ensure `useDocument.projectId` exists (mint UUIDv4 if not), `serializeProject(project)`, `uploadProjectJson()`, mark clean. Show a toast with the resulting URL (and a copy-to-clipboard button — share-link-as-auth, see D8).
- **Open from Cloud** — opens a modal that asks for a project ID *or* a full Blob URL. We extract the ID, `fetchProjectJson(id)`, run the existing validator, and `replaceProject` + `clearHistory`. Same dirty-confirmation flow as Open Local.

`projectId` is part of `useDocument` document state, persisted by autosave and embedded in saved JSON. A project that's been saved to the cloud once "remembers" where it lives.

### D8. Security model (and what we're explicitly *not* solving)

- The signing endpoint authorizes uploads but does not authenticate users — there are no users.
- Blob URLs are public. Anyone with `projects/<uuid>.json`'s URL can read or overwrite the project.
- We accept this because: (a) UUIDv4 collision and guessing is computationally infeasible at any practical scale; (b) the editor is single-user; (c) anyone with malicious access to a URL has at worst defaced one share link, which the original user can re-save to repair.
- The 10 MB / 2 MB size caps and pathname pattern restrictions in D4 prevent the signing endpoint from being abused as a free-blob-storage gateway by random callers — the worst they can do is upload a PNG up to 10 MB that overwrites a hash-keyed entry equal to its own content (no-op), or burn a UUID-keyed project slot (one slot, one user's headache).
- No rate limiting in v1. Vercel's platform-level rate limits on Hobby cap blast radius. Reconsider if abuse appears.

### D9. Local development

- `BLOB_READ_WRITE_TOKEN` from `.env.local` is read by `vercel dev`. The README gets a one-paragraph "Cloud storage setup" section.
- When the token is absent, `/api/blob/sign` returns 503 → cloud buttons are disabled → editor still works locally. CI runs without the token.
- For unit tests, `blobClient.ts` is dependency-injected behind an interface so tests can fake it without hitting the network.

## Risks / Trade-offs

- **R1 — Public blob URLs leak via browser history / share-button screenshots** → Document the share-link-as-auth model in README; consider per-blob expiry or an `addRandomSuffix` flag in a future revision if this becomes painful.
- **R2 — `crypto.subtle` not available over insecure origins** → Only an issue for HTTP localhost without `--host 127.0.0.1`. Vite dev server already binds to `localhost` over HTTP, which browsers treat as a secure context for `crypto.subtle`. Verified for our targets; document the constraint.
- **R3 — `crossOrigin: 'anonymous'` on tileset URLs taints the canvas if Blob ever changes its CORS defaults** → Pin the `cacheControl` and CORS expectations in a `blobClient.test.ts` integration test (skipped in CI without token).
- **R4 — Schema bump rejects forward-only files in older builds** → That's the intent (D3), but document the user-visible message in README so the support story is clear.
- **R5 — Browser-side hashing for very large tilesets blocks the main thread** → 10 MB cap (D4) keeps `subtle.digest` under ~100 ms even on slow laptops. If we lift the cap later, move hashing into a Web Worker.
- **R6 — Loss of "single self-contained file" property hurts offline use** → Local Save still produces a v1-shaped, fully-embedded file as a deliberate offline mode. Toolbar can label it "Save (offline copy)" if that becomes the dominant export use case.
- **R7 — Vercel Blob outage breaks the editor's cloud path** → Local Save/Open is the always-available fallback. Cloud actions surface a clear error toast, never a stuck spinner.
- **R8 — Hash collisions across maliciously-crafted PNGs** → SHA-256 collision resistance is overkill for this purpose; not a real risk.

## Migration Plan

- **Deploy:** ship the change behind no flag. The signing endpoint is gated by env var presence (D4), so production deployments without `BLOB_READ_WRITE_TOKEN` configured continue to work exactly like today. Set the token in Vercel project env when the team is ready to flip on cloud features.
- **Existing files:** v1 files on disk stay readable forever. The first time a user saves a v1 file in this build, it is silently re-uploaded and rewritten as v2. No batch migration script.
- **Rollback:** `git revert` the change's commit. Cloud-saved v2 files become unreadable to the rolled-back build because of the version guard, so do not roll back without first communicating to anyone who saved cloud projects. Local v1-shaped saves continue to work after a rollback.
- **Data:** if Blob storage needs to be wiped, the Vercel dashboard's bulk-delete is the path. The editor has no admin/cleanup UI in v1.

## Open Questions

1. **Should the cloud Open dialog accept a full Blob URL as well as a bare project ID?** *Proposed:* yes — accept either, parse a UUID out of either, single input field. Reduces the "where does the ID live" support load.
2. **Do we need optimistic concurrency on cloud Save (e.g., If-Match by ETag)?** *Proposed:* not in v1. Single-user, single-tab assumption holds. Revisit if multi-tab editing becomes a footgun.
3. **Should `isCloudConfigured()` be cached forever, or per-session, or per-page-load?** *Proposed:* per-session (in-memory). Toggling the env var requires a redeploy anyway.
4. **Is there value in storing `tilesetUrl` separately from `tileset.src` in the JSON, so a v2 reader could serve a fallback dataURL?** *Proposed:* no — adds complexity for a vanishingly rare case. If a tileset URL 404s, error clearly and let the user re-import.

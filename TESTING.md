# Manual testing — Vercel Blob storage

The unit suite (`bun run test`, 151 tests) covers the contract layer. This
document is the manual round-trip plan that must pass before shipping changes
to the cloud-storage subsystem.

## Setup

You need:

- A linked Vercel project with a provisioned Blob store
  (Dashboard → **Storage → Blob → Create**).
- `BLOB_READ_WRITE_TOKEN` in `.env.local`. Run `vercel env pull .env.local`
  after linking.
- Vercel CLI installed: `bun add -g vercel`.

Two terminals:

```sh
# terminal 1 — runs the SPA + the api/blob/* routes
vercel dev

# terminal 2 — for ad-hoc curl, log inspection, etc.
```

The editor will be on `http://localhost:3000`.

## Path A — full cloud round trip (cloud configured)

1. Open `http://localhost:3000`. The toolbar shows
   `Save to Cloud` and `Open from Cloud` **enabled**.
2. Click **Tileset…**, pick a small PNG (≤10 MB), set tile size, click Load.
   - Verify the palette renders the sliced tiles.
   - Open the network panel: confirm a single `PUT` request to a
     `*.public.blob.vercel-storage.com/tilesets/<hex64>.png` URL.
   - Re-importing the same PNG must reuse the same URL (content-addressed key).
3. Paint a few tiles, place an entity, toggle a collision cell.
4. Click **Save to Cloud**.
   - Verify a toast appears with a project URL of the form
     `https://*.public.blob.vercel-storage.com/projects/<uuid>.json`.
   - Click **Copy** in the toast and paste somewhere — confirm the URL was
     copied verbatim.
   - The status-bar dirty indicator should clear.
5. Reload the page (`Cmd-R`). The autosave-restore prompt should appear; pick
   **Start fresh** so we exercise the cloud path next.
6. Click **Open from Cloud**, paste the URL you copied, click Open.
   - The project loads with all tiles, entities, and collision cells intact.
   - The tileset palette repopulates from the cloud URL (no re-upload —
     verify in the network panel that the only request is a `GET` of the
     tileset PNG, not a `PUT`).
7. Click **Save to Cloud** again.
   - Verify the same project URL is reused (UUID didn't change).
   - The PUT to `projects/<same-uuid>.json` should overwrite the existing key.

## Path B — open by ID (server-resolved)

Same as Path A step 6, but paste only the UUID (the substring between
`projects/` and `.json`). The editor must:

- Call `GET /api/blob/resolve?id=<uuid>` and receive `{ url: "..." }`.
- Then `GET <url>` and load the project.
- Reject a non-UUID input with a clear "Enter a project ID or URL" error.
- Surface a 404 from the resolve endpoint as
  "No project found with that ID" (no stuck spinner).

## Path C — v1 → v2 lazy migration

1. Drop a v1 project file into the editor (any saved file from before this
   change — `version: 1`, `tileset.src` is a `data:` URL).
   - The editor must open it without error.
   - The palette must render from the embedded data URL (no upload yet).
2. Click **Save to Cloud** (cloud configured).
   - Inspect the network panel: a `PUT` to
     `tilesets/<hex64>.png` must precede the project JSON upload.
   - Open the saved project URL in a new tab (or `curl` it). The JSON must
     have `version: 2` and `tileset.src` is the new `https:` URL — no
     embedded `data:` URL anywhere in the body.
3. Click **Save** (local). The downloaded file must also be `version: 2`
   with the same `https:` `tileset.src`.

## Path D — graceful degradation (no token configured)

Stop `vercel dev`. Either:

- Comment out `BLOB_READ_WRITE_TOKEN` in `.env.local`, or
- Run `bun run dev` instead of `vercel dev` (the `/api/*` routes won't be
  served at all).

Reload the editor.

1. **Save to Cloud** and **Open from Cloud** must be visibly disabled with a
   tooltip "Cloud storage isn't configured for this deployment".
2. Local **Save** and **Open** must work exactly as in earlier versions.
3. Tileset import must succeed and produce a `data:` URL `tileset.src`
   (verify by saving and inspecting the JSON).

## Path E — error surfacing

- **Open from Cloud with junk input** ("nope") → form rejects locally with a
  "Enter a project ID or URL" message; no network call.
- **Open from Cloud with a valid-looking but unknown UUID** → resolve returns
  404, form shows "No project found with that ID."
- **Save to Cloud with the dev server stopped mid-flow** → the dirty bit
  must remain set; an alert reports the network error; retry must work after
  the server is back.
- **Cloud saving while clipboard API is blocked** (test in Safari with
  permissions denied) → the toast still shows, the URL is still selectable
  in the input, the Copy button reports "Copy" instead of "Copied" but does
  not throw.

## Path F — schema rejection

- Edit a saved file by hand to set `"version": 999` and try to load it.
  The editor must reject it with the existing
  `project version 999 is newer than this editor` message.
- Edit a v1 file to put an `https:` URL in `tileset.src`. Open it.
  The editor must reject it as "tileset.src in a v1 file must be empty or
  a data: URL" (forward-compat guard).

## Done?

If all six paths pass on a fresh tab, the cloud-storage change is shippable.
File a regression test for any path that surprised you while running
through this list — the unit suite should grow with each manual finding.

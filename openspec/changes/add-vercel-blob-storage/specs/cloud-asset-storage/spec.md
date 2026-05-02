## ADDED Requirements

### Requirement: Signed-URL upload endpoint

The system SHALL expose a server endpoint at `POST /api/blob/sign` that issues short-lived, scoped, single-use upload URLs for Vercel Blob, holding the `BLOB_READ_WRITE_TOKEN` server-side and never returning it to the client.

#### Scenario: Endpoint signs an allowed pathname
- **WHEN** the client calls `upload()` from `@vercel/blob/client` with `handleUploadUrl: '/api/blob/sign'` and a `pathname` of `tilesets/<sha256>.png`, `sprites/<sha256>.png`, or `projects/<uuid>.json`
- **THEN** the endpoint authorizes the request and returns a signed URL that allows exactly one upload to that pathname

#### Scenario: Endpoint rejects a disallowed pathname
- **WHEN** a client requests a signed URL for a pathname that does not match the three allowed patterns
- **THEN** the endpoint responds with HTTP 400 and an error code identifying the rejected pattern

#### Scenario: Endpoint rejects a disallowed MIME type
- **WHEN** a client requests a signed URL for `tilesets/...png` with content-type other than `image/png`, or for `projects/...json` with content-type other than `application/json`
- **THEN** the endpoint responds with HTTP 400 and an error code identifying the MIME mismatch

#### Scenario: Endpoint enforces size limits
- **WHEN** a client requests a signed URL declaring an image upload larger than 10 MB or a project JSON upload larger than 2 MB
- **THEN** the endpoint refuses to sign and responds with HTTP 413

#### Scenario: Endpoint reports missing token
- **WHEN** the deployment has no `BLOB_READ_WRITE_TOKEN` configured and any client calls the endpoint
- **THEN** the endpoint responds with HTTP 503 and an error body that the client surfaces as "Cloud storage isn't configured for this deployment"

#### Scenario: Token is never returned to clients
- **WHEN** the endpoint successfully signs any request
- **THEN** the response body contains only the signed upload URL and metadata required by `@vercel/blob/client`, and never contains the value of `BLOB_READ_WRITE_TOKEN`

### Requirement: Content-addressed image storage

The system SHALL store image assets (tilesets, future sprites) at content-addressed blob keys derived from a SHA-256 of the file bytes, so that identical images deduplicate naturally and image URLs are immutable per content.

#### Scenario: Upload key reflects content hash
- **WHEN** the client uploads a PNG whose SHA-256 hex digest is `abc...`
- **THEN** the resulting blob key is `tilesets/abc....png` (or `sprites/abc....png` for a sprite asset) and the returned URL points at that key

#### Scenario: Re-uploading identical content reuses the key
- **WHEN** two upload calls supply byte-identical PNG content
- **THEN** they target the same blob key and produce the same public URL

#### Scenario: Image blobs are cached aggressively
- **WHEN** an image blob is uploaded
- **THEN** it is stored with `Cache-Control: public, max-age=31536000, immutable`

### Requirement: Mutable project JSON storage

The system SHALL store project documents at UUID-keyed blob paths that the editor may overwrite on subsequent saves, so a single project ID maps to a stable URL across saves.

#### Scenario: First cloud save writes project ID
- **WHEN** a project with no `projectId` is saved to the cloud
- **THEN** a UUIDv4 is minted, the JSON is uploaded to `projects/<uuid>.json`, and the project's in-memory state records `projectId = <uuid>`

#### Scenario: Subsequent cloud save overwrites the same key
- **WHEN** a project that already has `projectId = X` is saved to the cloud again
- **THEN** the JSON is uploaded to `projects/X.json`, overwriting the previous content, and no new project ID is minted

#### Scenario: Project blobs are uncached
- **WHEN** a project JSON blob is uploaded
- **THEN** it is stored with `Cache-Control: no-store` so subsequent fetches always see the latest save

### Requirement: Typed client wrapper

The system SHALL expose a single typed module `src/storage/blobClient.ts` that wraps `@vercel/blob/client` and is the only call site in the codebase that performs blob uploads or fetches.

#### Scenario: Tileset image upload returns a public URL
- **WHEN** application code calls `uploadTilesetImage(blob)`
- **THEN** the function computes the SHA-256 of the blob, uploads to `tilesets/<hash>.png` via the signing endpoint, and resolves with the public Blob URL

#### Scenario: Project JSON upload uses the supplied project ID
- **WHEN** application code calls `uploadProjectJson(jsonString, projectId)`
- **THEN** the function uploads to `projects/<projectId>.json` via the signing endpoint and resolves with the public Blob URL

#### Scenario: Project JSON fetch returns the raw text
- **WHEN** application code calls `fetchProjectJson(projectId)`
- **THEN** the function performs an unauthenticated GET on the project's public URL and resolves with the response body as a string

#### Scenario: Configuration probe reports cloud availability
- **WHEN** the UI calls `isCloudConfigured()`
- **THEN** the function probes the signing endpoint and resolves to `true` if signing is available, `false` if the endpoint reports 503, caching the result for the rest of the session

#### Scenario: Errors surface as a typed CloudStorageError
- **WHEN** any blob client call fails
- **THEN** it rejects with a `CloudStorageError` whose `kind` is one of `'not-configured' | 'too-large' | 'forbidden-key' | 'network' | 'unknown'`

### Requirement: Graceful degradation without configuration

The system SHALL remain fully functional for local Save / Open and dataURL tilesets when no `BLOB_READ_WRITE_TOKEN` is configured.

#### Scenario: Cloud buttons disabled when not configured
- **WHEN** the editor boots in a deployment where `isCloudConfigured()` resolves `false`
- **THEN** the toolbar's "Save to Cloud" and "Open from Cloud" controls are visibly disabled with tooltip text explaining cloud is not configured, and all other editor functionality works unchanged

#### Scenario: Local save unaffected by missing token
- **WHEN** the user uses local Save with cloud unconfigured
- **THEN** a v2 JSON file is downloaded to disk with the tileset embedded as a `data:` URL exactly as in v1 behavior

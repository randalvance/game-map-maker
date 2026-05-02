## ADDED Requirements

### Requirement: Tileset images upload to cloud storage on import

The system SHALL upload an imported tileset PNG to cloud storage (when configured) and store the resulting public URL in `TilesetMeta.src`, replacing the prior practice of embedding a `data:` URL into the saved project.

#### Scenario: Importing a tileset uploads the image
- **WHEN** the user imports a PNG file with cloud storage configured and selects valid tile dimensions
- **THEN** the system uploads the PNG to a content-addressed Blob key, sets `tileset.src` to the returned public URL, and the saved project JSON contains a `https:` URL rather than a `data:` URL

#### Scenario: Importing a tileset without cloud configured falls back to dataURL
- **WHEN** the user imports a PNG file in a deployment where cloud storage is not configured
- **THEN** the system loads the tileset using the existing dataURL path and `tileset.src` is set to a `data:` URL, preserving v1 behavior

#### Scenario: Importing the same tileset twice reuses the same URL
- **WHEN** the user imports byte-identical PNG content twice across two sessions with cloud configured
- **THEN** both imports resolve to the same Blob URL and no duplicate storage is consumed

### Requirement: Tileset reload accepts URL or dataURL sources

The system SHALL load a tileset whose `TilesetMeta.src` is either a `data:` URL (legacy v1) or an `https:` URL (v2 cloud-backed) when reopening a saved project.

#### Scenario: Opening a v2 project with a URL tileset
- **WHEN** the user opens a saved project whose `tileset.src` is `https://...vercel-blob.../tilesets/<hash>.png`
- **THEN** the editor fetches the tileset image directly from the URL and the palette renders without uploading anything

#### Scenario: Opening a v1 project with a dataURL tileset
- **WHEN** the user opens a saved project whose `tileset.src` is a `data:image/png;base64,...` URL
- **THEN** the editor decodes the dataURL and renders the palette as before; no network call is made

#### Scenario: Tileset URL fetch failure surfaces a clear error
- **WHEN** the user opens a v2 project whose tileset URL returns HTTP 404 or fails CORS
- **THEN** the editor reports "Could not load this project's tileset" with the URL, and prompts the user to import a replacement tileset rather than leaving the editor in a broken state

### Requirement: Tileset replacement re-uploads image bytes

The system SHALL upload the new image to cloud storage when the user replaces the active tileset in a cloud-aware deployment, even if a tileset URL already exists.

#### Scenario: Replacing the tileset writes a new URL
- **WHEN** the user uses "Load Tileset" in a project that already has `tileset.src` set to `https://.../old-hash.png`, and selects a new PNG
- **THEN** the new PNG is uploaded to a fresh content-addressed key and `tileset.src` is updated to the new URL; the old URL is left intact for any other projects that may reference it

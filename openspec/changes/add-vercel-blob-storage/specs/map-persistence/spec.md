## ADDED Requirements

### Requirement: Save to Cloud action

The system SHALL provide a "Save to Cloud" action in the toolbar that uploads the current `MapProject` JSON to cloud storage and returns a stable URL identifying the project.

#### Scenario: First cloud save mints a project ID
- **WHEN** the user invokes "Save to Cloud" on a project with no `projectId`
- **THEN** the system mints a UUIDv4, serializes the project, uploads it to `projects/<uuid>.json`, persists `projectId` on the document, marks the document clean, and surfaces a toast containing the project URL with a copy-to-clipboard control

#### Scenario: Subsequent cloud save overwrites the same project
- **WHEN** the user invokes "Save to Cloud" on a project that already has a `projectId`
- **THEN** the system serializes and uploads to the same `projects/<projectId>.json` key, overwrites the previous content, and marks the document clean

#### Scenario: Cloud save is disabled when cloud is not configured
- **WHEN** cloud storage is not configured in the current deployment
- **THEN** the "Save to Cloud" toolbar control is disabled with a tooltip explaining cloud is not configured, and the local Save action is unaffected

#### Scenario: Cloud save failure leaves the document dirty
- **WHEN** "Save to Cloud" fails due to network error or signing-endpoint failure
- **THEN** the document remains in its prior dirty state, no `projectId` is persisted that wasn't persisted before, and the user sees an error toast with a retry control

### Requirement: Open from Cloud action

The system SHALL provide an "Open from Cloud" action that loads a project from cloud storage given either a project ID (UUID) or a full project URL.

#### Scenario: Opening by project ID
- **WHEN** the user invokes "Open from Cloud" and enters a UUIDv4 project ID
- **THEN** the system fetches `projects/<uuid>.json`, runs the existing project validator, replaces the active project, clears history, and the toolbar reflects the loaded project

#### Scenario: Opening by full URL
- **WHEN** the user invokes "Open from Cloud" and pastes a full Blob URL ending in `projects/<uuid>.json`
- **THEN** the system extracts the UUID and proceeds identically to opening by ID

#### Scenario: Opening with unsaved local changes prompts for confirmation
- **WHEN** the user invokes "Open from Cloud" while the active document is dirty
- **THEN** the system shows the same unsaved-changes confirmation dialog used by local Open, and only proceeds with the cloud fetch if the user confirms

#### Scenario: Opening a missing project surfaces a clear error
- **WHEN** the user attempts to open a project ID that does not exist in cloud storage (HTTP 404)
- **THEN** the system reports "No project found with that ID" without modifying the active document

### Requirement: Project schema version 2 with dual-version read

The system SHALL bump `CURRENT_SCHEMA_VERSION` from 1 to 2, accept both v1 and v2 project files on load, and emit only v2 on save.

#### Scenario: Loading a v1 file succeeds
- **WHEN** the user opens a project file with `version: 1` whose `tileset.src` is a `data:` URL
- **THEN** the validator accepts it without error and the editor presents the project unchanged from v1 behavior

#### Scenario: Loading a v2 file succeeds
- **WHEN** the user opens a project file with `version: 2` whose `tileset.src` is an `https:` URL and which may carry an optional `projectId`
- **THEN** the validator accepts it, the editor fetches the tileset by URL, and any `projectId` is preserved on the in-memory document

#### Scenario: Saving always emits v2
- **WHEN** the user saves a project (locally or to the cloud) regardless of the version it was loaded as
- **THEN** the serialized JSON has `version: 2`

#### Scenario: Loading a future version is rejected
- **WHEN** the user opens a project file with `version: 3` or higher
- **THEN** the validator rejects the file with the existing "newer than this editor" error

### Requirement: Lazy migration of v1 dataURL tilesets to cloud storage

The system SHALL re-upload an embedded `data:` URL tileset to cloud storage on the first Save (local or cloud) of a v1 project in a cloud-configured deployment, replacing `tileset.src` with the returned URL before serialization.

#### Scenario: First save of a v1 project rewrites tileset.src
- **WHEN** the user loads a v1 project (with a `data:` URL tileset) into a cloud-configured deployment and invokes Save (local or cloud)
- **THEN** the system uploads the decoded image to a content-addressed Blob key, replaces `tileset.src` with the resulting URL in the document, and emits a v2 file referencing that URL

#### Scenario: First save of a v1 project without cloud preserves dataURL
- **WHEN** the user loads a v1 project and invokes local Save in a deployment where cloud is not configured
- **THEN** the system emits a v2 file but leaves `tileset.src` as the original `data:` URL, preserving the offline self-contained property

#### Scenario: Migration upload failure does not lose data
- **WHEN** the lazy upload during a v1→v2 migration fails
- **THEN** Save aborts with an error toast, the in-memory `tileset.src` is left unchanged, and the user can retry or fall back to local Save

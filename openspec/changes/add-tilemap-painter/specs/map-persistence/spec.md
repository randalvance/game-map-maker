## ADDED Requirements

### Requirement: Autosave to local storage

The system SHALL automatically persist the current project (map grid, entity layer, collision grid, tileset reference, and editor settings) to browser local storage after any user-initiated change, debounced to at most once per second.

#### Scenario: Edits are recovered after reload
- **WHEN** the user paints a cell and then reloads the page
- **THEN** the painted cell is restored from local storage on the next session

### Requirement: Project save/load as JSON file

The system SHALL allow the user to download the current project as a single `.json` file and to load a previously saved project file from disk.

#### Scenario: Saving a project
- **WHEN** the user clicks "Save Project"
- **THEN** the browser downloads a `.json` file containing the full project including an embedded or referenced tileset

#### Scenario: Loading a project
- **WHEN** the user selects a valid project `.json` file via the "Open Project" action
- **THEN** the editor replaces the current project with its contents, including tile layers, entities, and collision data

### Requirement: Map export schema

The system SHALL provide a "Export Map" action that writes a JSON file conforming to a documented schema with these top-level fields: `version` (integer), `width`, `height`, `tileSize`, `tileset` (reference with source filename and tile size), `layers` (array of named tile layers, each a 2D array of tile indices with `-1` for empty), `entities` (array of `{ type, x, y, properties }`), and `collision` (2D array of booleans where `true` means walkable).

#### Scenario: Exported JSON validates against schema
- **WHEN** the user exports a map
- **THEN** the resulting file parses as JSON and contains every required top-level field with types matching the documented schema

#### Scenario: Empty cells export as -1
- **WHEN** a map contains unpainted cells
- **THEN** those cells appear as `-1` in every tile layer of the exported JSON

### Requirement: Export format versioning

The exported schema SHALL include an integer `version` field set to the current schema version, and the exporter SHALL reject loading any project whose version is newer than the editor understands.

#### Scenario: Older version loads successfully
- **WHEN** the user loads a project whose `version` is less than or equal to the current schema version
- **THEN** the project loads, with the editor applying any documented migration steps

#### Scenario: Newer version is refused
- **WHEN** the user tries to load a project whose `version` is greater than the current schema version
- **THEN** the editor refuses the load and shows a clear message explaining the version mismatch

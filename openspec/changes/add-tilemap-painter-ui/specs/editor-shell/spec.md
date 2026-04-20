## ADDED Requirements

### Requirement: App layout

The system SHALL render a top-level layout with four regions: a horizontal toolbar along the top, a left sidebar containing the tile palette and object palette, a central map canvas, a right sidebar containing the layer panel and property panel, and a status bar along the bottom.

#### Scenario: All regions are visible on first load
- **WHEN** the app boots
- **THEN** the toolbar, left sidebar, canvas, right sidebar, and status bar are all rendered and each occupies a non-zero area

#### Scenario: Canvas grows to fill available space
- **WHEN** the browser window is resized
- **THEN** the central canvas region expands or contracts to consume the remaining space after the fixed-width sidebars and fixed-height toolbar/status bar

### Requirement: Status bar information

The status bar SHALL display, at minimum: the cursor's current grid cell (or "—" when the cursor is off-grid), the current camera zoom as a percentage, and an unsaved-changes indicator.

#### Scenario: Cursor cell updates as the mouse moves over the canvas
- **WHEN** the pointer hovers cell (4, 7)
- **THEN** the status bar shows `(4, 7)` in its cursor region

#### Scenario: Off-grid cursor shows a placeholder
- **WHEN** the pointer is outside the map bounds
- **THEN** the status bar shows `(—, —)` (or equivalent) in its cursor region

#### Scenario: Dirty indicator appears after any edit
- **WHEN** the user paints a cell, moves an entity, toggles a collision cell, or otherwise mutates the document
- **THEN** the status bar shows a visible unsaved-changes indicator (e.g., a dot or the word "Unsaved")

#### Scenario: Dirty indicator clears after a successful save
- **WHEN** the user triggers "Save Project" and the download completes without error
- **THEN** the unsaved-changes indicator is hidden

### Requirement: Keyboard shortcuts

The system SHALL bind the following shortcuts, active whenever keyboard focus is not on a text input or textarea:

| Key | Action |
|---|---|
| `B` | Select brush tool |
| `E` | Select eraser tool |
| `F` | Select fill tool |
| `V` | Select move/select tool |
| `C` | Toggle collision mode |
| `G` | Toggle grid visibility |
| `O` | Toggle collision overlay visibility |
| `1` … `9` | Select tile layer 1..N (no-op if that layer does not exist) |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected entity (only when an entity is selected) |

#### Scenario: Pressing B switches to the brush tool
- **WHEN** the user presses `B` while focus is on the canvas or the body
- **THEN** the active tool becomes `brush`

#### Scenario: Shortcuts do not fire while typing in an input
- **WHEN** keyboard focus is on a text input (e.g., an entity property field) and the user types `b`
- **THEN** the tool does NOT change and the character is inserted into the input as normal

### Requirement: Unsaved-changes guard on unload

The system SHALL prompt the user before leaving or reloading the page when the document has unsaved changes.

#### Scenario: Reloading with unsaved edits prompts the user
- **WHEN** the document is dirty and a `beforeunload` event fires
- **THEN** the browser's native "leave site?" confirmation is shown (via setting `event.returnValue`)

#### Scenario: Reloading a clean document does not prompt
- **WHEN** the document is clean and a `beforeunload` event fires
- **THEN** no confirmation prompt is shown

### Requirement: Autosave restore on boot

The system SHALL detect an autosaved project in local storage on app boot and offer the user a clear choice to restore it or discard it and start fresh.

#### Scenario: Autosave present at boot
- **WHEN** the app boots and `localStorage.getItem('gmm:project')` contains a valid serialized project newer than the in-memory default
- **THEN** the user is prompted (via a dialog, banner, or similar) with two explicit options — "Restore" and "Start fresh"

#### Scenario: User chooses to restore
- **WHEN** the user picks "Restore" from the prompt
- **THEN** the stored project is deserialized, loaded into the document store, and the prompt is dismissed

#### Scenario: User chooses to start fresh
- **WHEN** the user picks "Start fresh" from the prompt
- **THEN** the autosave entry is cleared from local storage, the editor keeps the default empty project, and the prompt is dismissed

#### Scenario: Corrupt autosave is recoverable
- **WHEN** the stored autosave fails to deserialize (bad JSON, version mismatch, or schema error)
- **THEN** the editor discards the autosave silently, starts with the default project, and surfaces a non-blocking error indicator the user can inspect or dismiss

### Requirement: App-level error boundary

The system SHALL wrap the root UI in an error boundary that, on an uncaught render error, shows a recovery screen with at least: a brief error message, a "Reload" button, and a "Reload and restore autosave" button.

#### Scenario: Uncaught render error surfaces the recovery screen
- **WHEN** any child component throws during render
- **THEN** the boundary catches the error and shows the recovery screen instead of a blank page

#### Scenario: Recovery screen offers autosave restore
- **WHEN** the user clicks "Reload and restore autosave" on the recovery screen
- **THEN** the page reloads and the autosave-restore flow runs as on a normal boot

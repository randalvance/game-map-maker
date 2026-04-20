## ADDED Requirements

### Requirement: Per-cell walkable flag

The system SHALL store a boolean `walkable` value for every cell on the map grid, with `true` as the default for newly created maps.

#### Scenario: New maps default to all walkable
- **WHEN** the user creates a new map of size W × H
- **THEN** every cell's `walkable` value is `true`

### Requirement: Collision paint mode

The system SHALL provide a "collision" mode that lets the user toggle cells between walkable and blocked by clicking or dragging, without affecting tile or entity layers.

#### Scenario: Clicking a walkable cell blocks it
- **WHEN** collision mode is active and the user clicks a cell where `walkable` is `true`
- **THEN** that cell's `walkable` becomes `false`

#### Scenario: Clicking a blocked cell unblocks it
- **WHEN** collision mode is active and the user clicks a cell where `walkable` is `false`
- **THEN** that cell's `walkable` becomes `true`

#### Scenario: Collision edits participate in undo/redo
- **WHEN** the user toggles a cell's walkable flag and then presses Ctrl/Cmd+Z
- **THEN** the cell's prior walkable value is restored

### Requirement: Collision overlay visualization

The system SHALL provide a toggleable overlay that renders a semi-transparent marker (e.g., red tint or diagonal hatching) on every cell where `walkable` is `false`.

#### Scenario: Overlay reflects current state
- **WHEN** the collision overlay is enabled
- **THEN** every blocked cell is visually marked; every walkable cell shows no overlay

#### Scenario: Overlay can be hidden for clean preview
- **WHEN** the user toggles the overlay off
- **THEN** the collision markers are hidden but the underlying `walkable` data is preserved

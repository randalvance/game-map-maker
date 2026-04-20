## ADDED Requirements

### Requirement: Dedicated entity layer

The system SHALL maintain a separate "entity" layer for game objects, distinct from tile layers, that does not participate in tile paint operations.

#### Scenario: Tile paint tools do not affect entities
- **WHEN** the brush, eraser, or fill tool is used on the canvas
- **THEN** no game object on the entity layer is added, moved, or deleted

### Requirement: Placing game objects

The system SHALL allow the user to place a game object at a specific grid cell by selecting an object type and clicking the canvas.

#### Scenario: Place a spawn point
- **WHEN** the user selects object type "player-spawn" and clicks cell (5, 7)
- **THEN** a new game object of type "player-spawn" is added to the entity layer at grid position (5, 7)

#### Scenario: Multiple objects at the same cell are allowed
- **WHEN** an object already exists at cell (5, 7) and the user places another object there
- **THEN** both objects are retained on the entity layer at that position

### Requirement: Object type registry

The system SHALL provide a registry of object types, each with a name, display icon, and a schema of editable properties (e.g., `npcId: string`, `dialog: string`, `lootTable: string`).

#### Scenario: Built-in types are available by default
- **WHEN** the user opens the object palette
- **THEN** built-in types `player-spawn`, `npc`, `chest`, and `trigger` are listed

### Requirement: Editing object properties

The system SHALL allow the user to select a placed object and edit its properties, which are persisted with the map.

#### Scenario: Editing an NPC's dialog
- **WHEN** the user selects an NPC object and sets its `dialog` property to "Hello, hero!"
- **THEN** the object's properties record that value and the map's unsaved-changes indicator is set

### Requirement: Moving and deleting objects

The system SHALL allow the user to drag a selected object to a different grid cell and to delete it via a keyboard shortcut or toolbar action.

#### Scenario: Dragging an object
- **WHEN** the user drags an object from (5, 7) to (8, 9)
- **THEN** the object's position is updated to (8, 9) on the entity layer

#### Scenario: Deleting an object
- **WHEN** the user selects an object and presses Delete or Backspace
- **THEN** the object is removed from the entity layer

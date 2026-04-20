## ADDED Requirements

### Requirement: Loading a tileset image

The system SHALL allow the user to import a PNG image as a tileset and specify its tile size (width and height in pixels) and optional margin/spacing between tiles.

#### Scenario: Importing a valid tileset
- **WHEN** the user selects a PNG file and enters tile size 16×16 with margin 0 and spacing 0
- **THEN** the system loads the image, computes columns = floor(imageWidth / 16) and rows = floor(imageHeight / 16), and makes the sliced tiles available in the palette

#### Scenario: Rejecting invalid tile dimensions
- **WHEN** the user enters a tile size larger than the image, or non-positive values
- **THEN** the system SHALL reject the import with a clear error message and not modify the current project

### Requirement: Tile palette display

The system SHALL display all tiles from the loaded tileset in a scrollable palette panel, rendered at their native pixel size (optionally scaled up for readability).

#### Scenario: Palette reflects the loaded tileset
- **WHEN** a tileset with N tiles is loaded
- **THEN** the palette displays all N tiles in row-major order matching their position in the source image

### Requirement: Selecting the active tile

The system SHALL let the user select a single tile from the palette to use for subsequent paint operations, and visually indicate which tile is selected.

#### Scenario: Clicking a palette tile selects it
- **WHEN** the user clicks tile index i in the palette
- **THEN** tile i becomes the active tile and the palette highlights it

### Requirement: Stable tile identity

Each tile in a tileset SHALL have a stable integer index derived from its row-major position (index = row × columns + column) so that saved maps reference the same visual tiles across sessions.

#### Scenario: Reloading a saved map preserves tile identity
- **WHEN** a map is saved referencing tile index 42 and later reloaded with the same tileset
- **THEN** cells previously painted with tile 42 still resolve to the same image region

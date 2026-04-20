## ADDED Requirements

### Requirement: Map grid canvas

The system SHALL render a fixed-size rectangular grid of tile cells on a pannable, zoomable canvas, where each cell is the same pixel size as the active tileset's tile size.

#### Scenario: Opening a new map renders an empty grid
- **WHEN** the user creates a new map with dimensions W × H and tile size T
- **THEN** the canvas displays a W-by-H grid of empty cells, each T × T pixels, with visible grid lines at 100% zoom

#### Scenario: Panning and zooming
- **WHEN** the user drags with the pan tool or scrolls the mouse wheel
- **THEN** the view translates or scales smoothly while the grid and any painted tiles remain pixel-aligned to their cells

### Requirement: Brush tool paints the active tile

The system SHALL provide a brush tool that, while active, paints the currently selected tile into any cell the user clicks or drags over.

#### Scenario: Click paints a single cell
- **WHEN** the brush tool is active, a tile is selected in the palette, and the user clicks cell (x, y)
- **THEN** cell (x, y) on the active tile layer is set to the selected tile and re-renders

#### Scenario: Drag paints multiple cells
- **WHEN** the user holds the mouse button and drags across cells
- **THEN** every cell the cursor enters is painted with the active tile

### Requirement: Eraser tool clears cells

The system SHALL provide an eraser tool that removes the painted tile from any cell the user clicks or drags over.

#### Scenario: Erasing a painted cell
- **WHEN** the eraser tool is active and the user clicks a painted cell
- **THEN** that cell is cleared back to the empty state

### Requirement: Fill tool flood-fills contiguous regions

The system SHALL provide a fill (bucket) tool that replaces all contiguous cells sharing the same tile value as the clicked cell with the active tile.

#### Scenario: Filling an empty region
- **WHEN** the user clicks an empty cell with the fill tool and a tile is selected
- **THEN** all 4-connected empty cells reachable from that cell become the selected tile

#### Scenario: Fill does not cross tile boundaries
- **WHEN** the user fills a region bordered by a different tile
- **THEN** the fill stops at those boundary cells and does not overwrite them

### Requirement: Undo and redo

The system SHALL maintain an undo/redo history of all tile-painting and erase operations, accessible via keyboard shortcuts (Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z) and toolbar buttons.

#### Scenario: Undo reverses the last paint action
- **WHEN** the user paints a cell and then presses Ctrl/Cmd+Z
- **THEN** the cell reverts to its prior value

#### Scenario: Redo re-applies an undone action
- **WHEN** the user undoes an action and then presses Ctrl/Cmd+Shift+Z
- **THEN** the undone action is re-applied

### Requirement: Multiple tile layers

The system SHALL support at least two stacked tile layers (e.g., "ground" and "decoration") that render in order and can be toggled visible/hidden independently.

#### Scenario: Painting targets the active layer only
- **WHEN** layer "decoration" is active and the user paints a cell
- **THEN** only the decoration layer for that cell is modified; the ground layer below is unchanged

#### Scenario: Hidden layers do not render
- **WHEN** the user toggles a layer's visibility off
- **THEN** that layer's tiles are hidden on the canvas but retained in the map data

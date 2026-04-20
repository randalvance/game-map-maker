# Map export schema (v1)

The editor exports a map as a single JSON document. Game engines consume it directly. The same schema is used for both **save/load** of in-progress projects and **map export** for runtime use; v1 does not split the two.

## Top-level fields

| Field | Type | Notes |
|---|---|---|
| `version` | `integer` | Currently `1`. Loaders MUST refuse versions newer than they understand. |
| `width` | `integer ≥ 0` | Map width in cells. |
| `height` | `integer ≥ 0` | Map height in cells. |
| `tileSize` | `integer > 0` | Display tile size in pixels (used for rendering hints). |
| `tileset` | `object` | See **Tileset** below. |
| `layers` | `array<TileLayer>` | One or more tile layers, rendered bottom-to-top in array order. |
| `entities` | `array<GameObject>` | Free-form game objects (NPCs, spawns, triggers). |
| `collision` | `array<boolean>` | Length MUST equal `width × height`. `true` = walkable, `false` = blocked. Indexed row-major: `i = y × width + x`. |

## Tileset

```json
{
  "src": "<filename or data URL>",
  "tileWidth": 16,
  "tileHeight": 16,
  "margin": 0,
  "spacing": 0
}
```

Tiles are sliced from `src` row-major, left-to-right, top-to-bottom, accounting for `margin` (outer border) and `spacing` (between tiles). Tile indices in layers refer to this row-major position; `-1` means "no tile."

## TileLayer

```json
{
  "id": "uuid-string",
  "name": "ground",
  "visible": true,
  "tiles": [-1, 0, 0, -1, ...]
}
```

`tiles.length` MUST equal `width × height`. Index `-1` denotes an empty cell.

## GameObject

```json
{
  "id": "uuid-string",
  "type": "npc",
  "x": 5,
  "y": 7,
  "properties": {
    "dialog": "Hello, hero!",
    "loot": "gold"
  }
}
```

`properties` values are JSON primitives: string, number, or boolean. The set of expected properties per `type` is defined by the editor's object registry, but the schema does not enforce it — engines should treat unknown properties as opaque.

## Versioning policy

- The `version` field is REQUIRED.
- Loaders MUST reject any document whose `version > CURRENT_SCHEMA_VERSION` with a clear error.
- Loaders MAY apply documented migrations for older versions. v1 has no predecessor.
- Schema changes SHALL bump the version and document a migration path.

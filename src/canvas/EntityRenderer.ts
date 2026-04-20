import { Container, Graphics, Text } from "pixi.js";
import type { GameObject } from "@/model/types";
import { getObjectType } from "@/objects/registry";

export type EntityMarker = {
  container: Container;
  body: Graphics;
  label: Text;
  selection: Graphics;
};

export function buildEntityMarker(tileSize: number): EntityMarker {
  const container = new Container();
  const body = new Graphics();
  const label = new Text({
    text: "",
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(10, Math.floor(tileSize * 0.55)),
      fill: 0xffffff,
      fontWeight: "700",
    },
  });
  label.anchor.set(0.5);
  const selection = new Graphics();
  container.addChild(body, label, selection);
  return { container, body, label, selection };
}

export function syncMarker(
  marker: EntityMarker,
  entity: GameObject,
  tileSize: number,
  selected: boolean,
): void {
  const def = getObjectType(entity.type);
  const color = def ? parseHex(def.color) : 0xffffff;
  const glyph = def?.glyph ?? "?";
  const pad = Math.max(2, Math.floor(tileSize * 0.1));

  marker.body.clear();
  marker.body.roundRect(
    pad,
    pad,
    tileSize - pad * 2,
    tileSize - pad * 2,
    Math.max(2, tileSize * 0.15),
  );
  marker.body.fill({ color, alpha: 0.95 });
  marker.body.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.4 });
  marker.body.stroke();

  marker.label.text = glyph;
  marker.label.x = tileSize / 2;
  marker.label.y = tileSize / 2;

  marker.selection.clear();
  if (selected) {
    marker.selection.roundRect(
      0,
      0,
      tileSize,
      tileSize,
      Math.max(3, tileSize * 0.18),
    );
    marker.selection.setStrokeStyle({ width: 2, color: 0xfafafa, alpha: 0.9 });
    marker.selection.stroke();
  }

  marker.container.x = entity.x * tileSize;
  marker.container.y = entity.y * tileSize;
}

export function syncEntityLayer(
  parent: Container,
  markers: Map<string, EntityMarker>,
  entities: readonly GameObject[],
  tileSize: number,
  selectedId: string | null,
): void {
  const seen = new Set<string>();
  for (const entity of entities) {
    seen.add(entity.id);
    let marker = markers.get(entity.id);
    if (!marker) {
      marker = buildEntityMarker(tileSize);
      parent.addChild(marker.container);
      markers.set(entity.id, marker);
    }
    syncMarker(marker, entity, tileSize, entity.id === selectedId);
  }
  for (const [id, marker] of markers) {
    if (seen.has(id)) continue;
    parent.removeChild(marker.container);
    marker.container.destroy({ children: true });
    markers.delete(id);
  }
}

function parseHex(value: string): number {
  const raw = value.replace("#", "");
  return parseInt(raw, 16);
}

import type { ObjectPropertyValue } from "@/model/types";

export type PropertyType = "string" | "number" | "boolean";

export type PropertySchema = {
  key: string;
  label: string;
  type: PropertyType;
  default: ObjectPropertyValue;
};

export type ObjectTypeDefinition = {
  type: string;
  label: string;
  color: string; // hex string used as the marker color in the editor
  glyph: string; // single-character marker label
  properties: PropertySchema[];
};

const definitions: ObjectTypeDefinition[] = [
  {
    type: "player-spawn",
    label: "Player Spawn",
    color: "#4ade80",
    glyph: "P",
    properties: [
      { key: "facing", label: "Facing", type: "string", default: "down" },
    ],
  },
  {
    type: "npc",
    label: "NPC",
    color: "#60a5fa",
    glyph: "N",
    properties: [
      { key: "npcId", label: "NPC ID", type: "string", default: "" },
      { key: "dialog", label: "Dialog", type: "string", default: "" },
      { key: "blocking", label: "Blocks movement", type: "boolean", default: true },
    ],
  },
  {
    type: "chest",
    label: "Chest",
    color: "#facc15",
    glyph: "C",
    properties: [
      { key: "lootTable", label: "Loot table", type: "string", default: "" },
      { key: "locked", label: "Locked", type: "boolean", default: false },
      { key: "keyId", label: "Key ID", type: "string", default: "" },
    ],
  },
  {
    type: "trigger",
    label: "Trigger",
    color: "#f472b6",
    glyph: "T",
    properties: [
      { key: "event", label: "Event name", type: "string", default: "" },
      { key: "once", label: "Fire once", type: "boolean", default: true },
    ],
  },
];

const byType = new Map(definitions.map((d) => [d.type, d]));

export function listObjectTypes(): ObjectTypeDefinition[] {
  return definitions;
}

export function getObjectType(type: string): ObjectTypeDefinition | null {
  return byType.get(type) ?? null;
}

export function defaultPropertiesFor(
  type: string,
): Record<string, ObjectPropertyValue> {
  const def = getObjectType(type);
  if (!def) return {};
  const out: Record<string, ObjectPropertyValue> = {};
  for (const p of def.properties) out[p.key] = p.default;
  return out;
}

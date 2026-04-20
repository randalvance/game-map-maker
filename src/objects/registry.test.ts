import { describe, expect, it } from "vitest";
import {
  defaultPropertiesFor,
  getObjectType,
  listObjectTypes,
} from "./registry";

describe("object registry", () => {
  it("exposes the four built-in types", () => {
    const types = listObjectTypes().map((d) => d.type);
    expect(types).toEqual(
      expect.arrayContaining(["player-spawn", "npc", "chest", "trigger"]),
    );
  });

  it("getObjectType returns null for unknown types", () => {
    expect(getObjectType("dragon")).toBeNull();
  });

  it("defaultPropertiesFor returns the schema defaults", () => {
    const npcProps = defaultPropertiesFor("npc");
    expect(npcProps).toMatchObject({
      npcId: "",
      dialog: "",
      blocking: true,
    });
  });

  it("defaultPropertiesFor returns {} for unknown types", () => {
    expect(defaultPropertiesFor("dragon")).toEqual({});
  });
});

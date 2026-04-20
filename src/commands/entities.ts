import type { Command } from "./Command";
import type { GameObject, MapProject, ObjectPropertyValue } from "@/model/types";

export class AddEntityCommand implements Command {
  readonly label = "Add object";
  constructor(readonly entity: GameObject) {}
  apply(p: MapProject): MapProject {
    return { ...p, entities: [...p.entities, this.entity] };
  }
  invert(p: MapProject): MapProject {
    return { ...p, entities: p.entities.filter((e) => e.id !== this.entity.id) };
  }
}

export class DeleteEntityCommand implements Command {
  readonly label = "Delete object";
  private snapshot: GameObject | null = null;
  constructor(readonly entityId: string) {}
  apply(p: MapProject): MapProject {
    this.snapshot = p.entities.find((e) => e.id === this.entityId) ?? null;
    return { ...p, entities: p.entities.filter((e) => e.id !== this.entityId) };
  }
  invert(p: MapProject): MapProject {
    if (!this.snapshot) return p;
    return { ...p, entities: [...p.entities, this.snapshot] };
  }
}

export class MoveEntityCommand implements Command {
  readonly label = "Move object";
  constructor(
    readonly entityId: string,
    readonly from: { x: number; y: number },
    readonly to: { x: number; y: number },
  ) {}
  apply(p: MapProject): MapProject {
    return this.patch(p, this.to);
  }
  invert(p: MapProject): MapProject {
    return this.patch(p, this.from);
  }
  private patch(p: MapProject, pos: { x: number; y: number }): MapProject {
    return {
      ...p,
      entities: p.entities.map((e) =>
        e.id === this.entityId ? { ...e, x: pos.x, y: pos.y } : e,
      ),
    };
  }
}

export class UpdateEntityPropertiesCommand implements Command {
  readonly label = "Edit object";
  constructor(
    readonly entityId: string,
    readonly prev: Record<string, ObjectPropertyValue>,
    readonly next: Record<string, ObjectPropertyValue>,
  ) {}
  apply(p: MapProject): MapProject {
    return this.patch(p, this.next);
  }
  invert(p: MapProject): MapProject {
    return this.patch(p, this.prev);
  }
  private patch(
    p: MapProject,
    props: Record<string, ObjectPropertyValue>,
  ): MapProject {
    return {
      ...p,
      entities: p.entities.map((e) =>
        e.id === this.entityId ? { ...e, properties: { ...props } } : e,
      ),
    };
  }
}

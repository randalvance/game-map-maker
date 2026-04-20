import type { Command } from "./Command";
import { indexOf } from "@/model/grid";
import type { MapProject } from "@/model/types";

export type CollisionEdit = {
  x: number;
  y: number;
  next: boolean;
  prev: boolean;
};

export class ToggleCollisionCommand implements Command {
  readonly label = "Toggle collision";
  constructor(readonly edits: CollisionEdit[]) {}

  apply(project: MapProject): MapProject {
    return this.patch(project, "next");
  }

  invert(project: MapProject): MapProject {
    return this.patch(project, "prev");
  }

  private patch(project: MapProject, pick: "next" | "prev"): MapProject {
    const collision = project.collision.slice();
    for (const e of this.edits) {
      collision[indexOf(e.x, e.y, project.width)] = e[pick];
    }
    return { ...project, collision };
  }
}

import type { Command } from "./Command";
import { indexOf } from "@/model/grid";
import type { MapProject, TileIndex } from "@/model/types";

export type CellEdit = {
  x: number;
  y: number;
  next: TileIndex;
  prev: TileIndex;
};

export class PaintCellsCommand implements Command {
  readonly label = "Paint cells";
  constructor(
    readonly layerId: string,
    readonly edits: CellEdit[],
  ) {}

  apply(project: MapProject): MapProject {
    return this.patch(project, (_prev, next) => next);
  }

  invert(project: MapProject): MapProject {
    return this.patch(project, (prev) => prev);
  }

  private patch(
    project: MapProject,
    pick: (prev: TileIndex, next: TileIndex) => TileIndex,
  ): MapProject {
    const { width } = project;
    const target = project.layers.find((l) => l.id === this.layerId);
    if (!target) return project;

    const nextTiles = target.tiles.slice();
    for (const edit of this.edits) {
      const i = indexOf(edit.x, edit.y, width);
      nextTiles[i] = pick(edit.prev, edit.next);
    }

    return {
      ...project,
      layers: project.layers.map((l) =>
        l.id === this.layerId ? { ...l, tiles: nextTiles } : l,
      ),
    };
  }
}

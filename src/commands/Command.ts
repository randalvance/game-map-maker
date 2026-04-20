import type { MapProject } from "@/model/types";

export interface Command {
  readonly label: string;
  apply(project: MapProject): MapProject;
  invert(project: MapProject): MapProject;
}

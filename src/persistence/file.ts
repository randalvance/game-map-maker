import type { MapProject } from "@/model/types";
import { deserializeProject, serializeProject } from "./serialize";

export function downloadProject(project: MapProject, filename = "map.json"): void {
  const blob = new Blob([serializeProject(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<MapProject> {
  const text = await file.text();
  return deserializeProject(text);
}

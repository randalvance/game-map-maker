import type { MapProject } from "@/model/types";
import { isCloudConfigured, uploadTilesetImage } from "./blobClient";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * If the project's tileset is still embedded as a `data:` URL and cloud
 * storage is available, upload the image and return a new project with
 * `tileset.src` rewritten to the resulting Blob URL.
 *
 * Returns the original project untouched when no migration is needed
 * or when cloud storage is not configured.
 */
export async function migrateTilesetIfNeeded(
  project: MapProject,
): Promise<MapProject> {
  const src = project.tileset.src;
  if (!src.startsWith("data:")) return project;
  if (!(await isCloudConfigured())) return project;

  const blob = await dataUrlToBlob(src);
  const url = await uploadTilesetImage(blob);

  return {
    ...project,
    tileset: { ...project.tileset, src: url },
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./blobClient", () => ({
  isCloudConfigured: vi.fn(),
  uploadTilesetImage: vi.fn(),
}));

import { isCloudConfigured, uploadTilesetImage } from "./blobClient";
import { migrateTilesetIfNeeded } from "./migrate";
import { createNewProject } from "@/model/project";
import type { MapProject } from "@/model/types";
import { CloudStorageError } from "./types";

function withTilesetSrc(src: string): MapProject {
  const p = createNewProject(2, 2);
  return { ...p, tileset: { ...p.tileset, src } };
}

const SAMPLE_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
const REMOTE_URL = "https://blob.example.com/tilesets/abc.png";

afterEach(() => {
  vi.clearAllMocks();
});

describe("migrateTilesetIfNeeded", () => {
  it("returns the same project untouched when tileset src is already an https URL", async () => {
    vi.mocked(isCloudConfigured).mockResolvedValue(true);
    const project = withTilesetSrc("https://example.com/x.png");
    const out = await migrateTilesetIfNeeded(project);
    expect(out).toBe(project);
    expect(uploadTilesetImage).not.toHaveBeenCalled();
  });

  it("returns the same project untouched when tileset src is empty", async () => {
    vi.mocked(isCloudConfigured).mockResolvedValue(true);
    const project = withTilesetSrc("");
    const out = await migrateTilesetIfNeeded(project);
    expect(out).toBe(project);
    expect(uploadTilesetImage).not.toHaveBeenCalled();
  });

  it("leaves a dataURL project unchanged when cloud is not configured", async () => {
    vi.mocked(isCloudConfigured).mockResolvedValue(false);
    const project = withTilesetSrc(SAMPLE_DATA_URL);
    const out = await migrateTilesetIfNeeded(project);
    expect(out).toBe(project);
    expect(out.tileset.src).toBe(SAMPLE_DATA_URL);
    expect(uploadTilesetImage).not.toHaveBeenCalled();
  });

  it("uploads and rewrites tileset.src when cloud is configured", async () => {
    vi.mocked(isCloudConfigured).mockResolvedValue(true);
    vi.mocked(uploadTilesetImage).mockResolvedValue(REMOTE_URL);
    const project = withTilesetSrc(SAMPLE_DATA_URL);

    const out = await migrateTilesetIfNeeded(project);

    expect(out).not.toBe(project);
    expect(out.tileset.src).toBe(REMOTE_URL);
    // original is untouched (immutability)
    expect(project.tileset.src).toBe(SAMPLE_DATA_URL);
    expect(uploadTilesetImage).toHaveBeenCalledTimes(1);
  });

  it("propagates upload failures so the caller can abort the save", async () => {
    vi.mocked(isCloudConfigured).mockResolvedValue(true);
    vi.mocked(uploadTilesetImage).mockRejectedValue(
      new CloudStorageError("network", "connection refused"),
    );
    const project = withTilesetSrc(SAMPLE_DATA_URL);
    await expect(migrateTilesetIfNeeded(project)).rejects.toMatchObject({
      kind: "network",
    });
    // project state is untouched
    expect(project.tileset.src).toBe(SAMPLE_DATA_URL);
  });
});

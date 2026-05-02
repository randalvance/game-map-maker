import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => {
  class FakeRectangle {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
    ) {}
  }
  class FakeTexture {
    public source: unknown;
    public frame: unknown;
    public width = 64;
    public height = 32;
    constructor(opts?: { source?: unknown; frame?: unknown }) {
      this.source = opts?.source ?? { id: "src" };
      this.frame = opts?.frame ?? null;
    }
  }
  return {
    Rectangle: FakeRectangle,
    Texture: FakeTexture,
    Assets: {
      load: vi.fn(),
    },
  };
});

import { Assets } from "pixi.js";
import { loadTileset, TilesetLoadError } from "./loadTileset";

afterEach(() => {
  vi.clearAllMocks();
});

const mockTextureOk = () => {
  const fake = {
    width: 64,
    height: 32,
    source: { id: "src" },
  };
  vi.mocked(Assets.load).mockResolvedValueOnce(fake as never);
};

describe("loadTileset (URL source)", () => {
  it("loads from a URL and stores the URL as meta.src", async () => {
    mockTextureOk();
    const url = "https://example.com/tilesets/abc.png";

    const loaded = await loadTileset(url, { tileWidth: 16, tileHeight: 16 });

    expect(loaded.meta.src).toBe(url);
    expect(loaded.cols).toBe(4);
    expect(loaded.rows).toBe(2);
    expect(loaded.tileTextures.length).toBe(8);
  });

  it("passes crossOrigin: 'anonymous' to Assets.load when the source is a URL", async () => {
    mockTextureOk();
    const url = "https://example.com/tilesets/xyz.png";
    await loadTileset(url, { tileWidth: 16, tileHeight: 16 });
    expect(Assets.load).toHaveBeenCalledWith(
      expect.objectContaining({
        src: url,
        loadParser: "loadTextures",
        data: { crossOrigin: "anonymous" },
      }),
    );
  });

  it("wraps URL fetch failures as TilesetLoadError with helpful message", async () => {
    vi.mocked(Assets.load).mockRejectedValueOnce(new Error("CORS blocked"));
    const url = "https://example.com/missing.png";
    await expect(
      loadTileset(url, { tileWidth: 16, tileHeight: 16 }),
    ).rejects.toMatchObject({
      name: "TilesetLoadError",
      message: expect.stringContaining(url),
    });
  });
});

describe("loadTileset (Blob source)", () => {
  it("converts Blob to data URL and stores it as meta.src", async () => {
    mockTextureOk();
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });

    const loaded = await loadTileset(blob, { tileWidth: 16, tileHeight: 16 });

    expect(loaded.meta.src.startsWith("data:")).toBe(true);
    expect(loaded.tileTextures.length).toBe(8);
  });

  it("wraps Blob load failures as TilesetLoadError without URL phrasing", async () => {
    vi.mocked(Assets.load).mockRejectedValueOnce(new Error("invalid PNG"));
    const blob = new Blob([new Uint8Array([0])], { type: "image/png" });
    const promise = loadTileset(blob, { tileWidth: 16, tileHeight: 16 });
    await expect(promise).rejects.toBeInstanceOf(TilesetLoadError);
    await promise.catch((err: Error) => {
      expect(err.message).toMatch(/parse tileset/);
    });
  });
});

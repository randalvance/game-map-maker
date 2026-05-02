import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import {
  _resetCloudConfiguredCache,
  extractProjectId,
  fetchProjectJson,
  isCloudConfigured,
  uploadProjectJson,
  uploadTilesetImage,
} from "./blobClient";
import { CloudStorageError } from "./types";

const VALID_UUID = "8e6f9c5a-1b2c-4d5e-9f0a-1b2c3d4e5f60";
const PROJECT_URL = `https://blob.example.com/projects/${VALID_UUID}.json`;
const TILESET_URL = "https://blob.example.com/tilesets/aaa.png";

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  _resetCloudConfiguredCache();
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isCloudConfigured", () => {
  it("returns true when HEAD probe responds 2xx", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));
    expect(await isCloudConfigured()).toBe(true);
  });

  it("returns false on 503", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await isCloudConfigured()).toBe(false);
  });

  it("returns false on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await isCloudConfigured()).toBe(false);
  });

  it("caches the answer for the rest of the session", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await isCloudConfigured();
    await isCloudConfigured();
    await isCloudConfigured();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("uploadTilesetImage (via /api/blob/upload proxy)", () => {
  it("POSTs to /api/blob/upload with the right headers and returns the URL", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: TILESET_URL }), { status: 200 }),
    );
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });

    const url = await uploadTilesetImage(blob);
    expect(url).toBe(TILESET_URL);

    const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/api/blob/upload");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("image/png");
    expect(headers["x-blob-pathname"]).toMatch(/^tilesets\/[0-9a-f]{64}\.png$/);
  });

  it("rejects non-PNG blobs with forbidden-key", async () => {
    const blob = new Blob([new Uint8Array([0])], { type: "image/jpeg" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "forbidden-key",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("identical blob content yields identical pathname", async () => {
    fetchSpy.mockImplementation(
      async () => new Response(JSON.stringify({ url: TILESET_URL }), { status: 200 }),
    );
    const bytes = new Uint8Array([10, 20, 30, 40]);
    const blob1 = new Blob([bytes], { type: "image/png" });
    const blob2 = new Blob([bytes], { type: "image/png" });
    await uploadTilesetImage(blob1);
    await uploadTilesetImage(blob2);
    const headers1 = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    const headers2 = (fetchSpy.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(headers1["x-blob-pathname"]).toBe(headers2["x-blob-pathname"]);
  });

  it("maps 413 responses to too-large", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: "too-large", message: "exceeds 10 MB" }), {
        status: 413,
      }),
    );
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "too-large",
    });
  });

  it("maps 503 responses to not-configured", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "not-configured",
    });
  });

  it("maps 400 responses to forbidden-key by reading the kind from the body", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ kind: "forbidden-key", message: "bad pathname" }),
        { status: 400 },
      ),
    );
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "forbidden-key",
    });
  });

  it("network errors surface as kind=network", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("connection refused"));
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("uploadProjectJson (via /api/blob/upload proxy)", () => {
  it("POSTs to /api/blob/upload with projects/<id>.json pathname", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: PROJECT_URL }), { status: 200 }),
    );
    const url = await uploadProjectJson("{}", VALID_UUID);
    expect(url).toBe(PROJECT_URL);
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/api/blob/upload");
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-blob-pathname"]).toBe(`projects/${VALID_UUID}.json`);
  });

  it("rejects a non-UUIDv4 projectId before calling fetch", async () => {
    await expect(uploadProjectJson("{}", "not-a-uuid")).rejects.toMatchObject({
      kind: "forbidden-key",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("extractProjectId", () => {
  it("returns the UUID for a bare ID", () => {
    expect(extractProjectId(VALID_UUID)).toBe(VALID_UUID);
  });

  it("extracts the UUID from a full URL", () => {
    expect(extractProjectId(PROJECT_URL)).toBe(VALID_UUID);
  });

  it("returns null for non-UUID input", () => {
    expect(extractProjectId("nope")).toBeNull();
    expect(extractProjectId("https://x/projects/123.json")).toBeNull();
  });
});

describe("fetchProjectJson", () => {
  it("fetches directly when a full URL is provided", async () => {
    fetchSpy.mockResolvedValueOnce(new Response('{"version":2}', { status: 200 }));
    const text = await fetchProjectJson(PROJECT_URL);
    expect(text).toBe('{"version":2}');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(PROJECT_URL);
  });

  it("resolves an ID to a URL via /api/blob/resolve and fetches", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: PROJECT_URL }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('{"v":2}', { status: 200 }));
    const text = await fetchProjectJson(VALID_UUID);
    expect(text).toBe('{"v":2}');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toContain("/api/blob/resolve?id=");
    expect(fetchSpy.mock.calls[1][0]).toBe(PROJECT_URL);
  });

  it("maps resolve 404 to not-found", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(fetchProjectJson(VALID_UUID)).rejects.toMatchObject({
      kind: "not-found",
    });
  });

  it("maps resolve 503 to not-configured", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(fetchProjectJson(VALID_UUID)).rejects.toMatchObject({
      kind: "not-configured",
    });
  });

  it("maps blob fetch 404 to not-found", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: PROJECT_URL }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(fetchProjectJson(VALID_UUID)).rejects.toMatchObject({
      kind: "not-found",
    });
  });

  it("rejects junk input with forbidden-key", async () => {
    await expect(fetchProjectJson("not-a-uuid-or-url")).rejects.toMatchObject({
      kind: "forbidden-key",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("network errors surface as kind=network with cause", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("connection refused"));
    await expect(fetchProjectJson(PROJECT_URL)).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("CloudStorageError", () => {
  it("preserves cause when provided", () => {
    const root = new Error("root cause");
    const err = new CloudStorageError("network", "wrapper", { cause: root });
    expect(err.kind).toBe("network");
    expect(err.cause).toBe(root);
  });
});

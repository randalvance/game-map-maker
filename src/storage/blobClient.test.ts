import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

vi.mock("@vercel/blob/client", () => ({
  upload: vi.fn(),
}));

import { upload } from "@vercel/blob/client";
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

describe("uploadTilesetImage", () => {
  it("uploads a PNG and returns the public URL", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
    vi.mocked(upload).mockResolvedValueOnce({
      url: TILESET_URL,
      pathname: "tilesets/abc.png",
      contentType: "image/png",
      contentDisposition: "inline",
    } as never);
    const url = await uploadTilesetImage(blob);
    expect(url).toBe(TILESET_URL);

    const call = vi.mocked(upload).mock.calls[0];
    expect(call[0]).toMatch(/^tilesets\/[0-9a-f]{64}\.png$/);
    expect(call[2]).toMatchObject({
      access: "public",
      handleUploadUrl: "/api/blob/sign",
      contentType: "image/png",
    });
  });

  it("rejects non-PNG blobs with forbidden-key", async () => {
    const blob = new Blob([new Uint8Array([0])], { type: "image/jpeg" });
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "forbidden-key",
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it("identical blob content yields identical pathname", async () => {
    const bytes = new Uint8Array([10, 20, 30, 40]);
    const blob1 = new Blob([bytes], { type: "image/png" });
    const blob2 = new Blob([bytes], { type: "image/png" });
    vi.mocked(upload).mockResolvedValue({
      url: TILESET_URL,
      pathname: "x",
      contentType: "image/png",
      contentDisposition: "inline",
    } as never);
    await uploadTilesetImage(blob1);
    await uploadTilesetImage(blob2);
    const path1 = vi.mocked(upload).mock.calls[0][0];
    const path2 = vi.mocked(upload).mock.calls[1][0];
    expect(path1).toBe(path2);
  });

  it("classifies size errors as too-large", async () => {
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    vi.mocked(upload).mockRejectedValueOnce(
      new Error("Upload exceeds maximum size 10485760"),
    );
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "too-large",
    });
  });

  it("classifies forbidden-pathname errors as forbidden-key", async () => {
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    vi.mocked(upload).mockRejectedValueOnce(
      new Error("pathname not permitted"),
    );
    await expect(uploadTilesetImage(blob)).rejects.toMatchObject({
      kind: "forbidden-key",
    });
  });
});

describe("uploadProjectJson", () => {
  it("uploads JSON to projects/<id>.json", async () => {
    vi.mocked(upload).mockResolvedValueOnce({
      url: PROJECT_URL,
      pathname: `projects/${VALID_UUID}.json`,
      contentType: "application/json",
      contentDisposition: "inline",
    } as never);
    const url = await uploadProjectJson("{}", VALID_UUID);
    expect(url).toBe(PROJECT_URL);
    const call = vi.mocked(upload).mock.calls[0];
    expect(call[0]).toBe(`projects/${VALID_UUID}.json`);
    expect(call[2]).toMatchObject({
      access: "public",
      contentType: "application/json",
    });
  });

  it("rejects a non-UUIDv4 projectId before calling upload", async () => {
    await expect(uploadProjectJson("{}", "not-a-uuid")).rejects.toMatchObject({
      kind: "forbidden-key",
    });
    expect(upload).not.toHaveBeenCalled();
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

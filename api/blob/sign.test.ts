// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

vi.mock("@vercel/blob/client", () => ({
  handleUpload: vi.fn(),
}));

import { handleUpload } from "@vercel/blob/client";
import handler from "./sign";

type Mocked = ReturnType<typeof makeRes>;

function makeReq(
  method: string,
  body: unknown = undefined,
  headers: Record<string, string> = { host: "test.local" },
): VercelRequest {
  return {
    method,
    body,
    headers,
    url: "/api/blob/sign",
  } as unknown as VercelRequest;
}

function makeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

const ORIGINAL_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL_TOKEN;
  vi.clearAllMocks();
});

describe("HEAD probe", () => {
  it("returns 503 when token is not configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = makeRes();
    await handler(makeReq("HEAD"), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
    expect(res.ended).toBe(true);
  });

  it("returns 200 when token is configured", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
    const res = makeRes();
    await handler(makeReq("HEAD"), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
  });
});

describe("method enforcement", () => {
  it("rejects GET with 405 and Allow header", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
    const res = makeRes();
    await handler(makeReq("GET"), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe("POST, HEAD");
  });
});

describe("POST without token", () => {
  it("returns 503 with not-configured kind", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = makeRes();
    await handler(
      makeReq("POST", {
        type: "blob.generate-client-token",
        payload: {
          pathname: "tilesets/abc.png",
          callbackUrl: "https://example.com/api/blob/sign",
          clientPayload: null,
          multipart: false,
        },
      }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ kind: "not-configured" });
  });
});

describe("POST with disallowed pathname", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
  });

  it("returns 400 forbidden-key when handleUpload calls into onBeforeGenerateToken with bad pathname", async () => {
    let invokedValidator = false;
    vi.mocked(handleUpload).mockImplementation(async (opts) => {
      invokedValidator = true;
      // Simulate the SDK invoking the validator with a bad pathname.
      await opts.onBeforeGenerateToken("not-allowed/file.png", null, false);
      return { type: "blob.generate-client-token" } as never;
    });

    const res = makeRes();
    await handler(
      makeReq("POST", { type: "blob.generate-client-token", payload: {} }),
      res as unknown as VercelResponse,
    );
    expect(invokedValidator).toBe(true);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ kind: "forbidden-key" });
  });

  it("accepts a well-formed tileset pathname", async () => {
    const goodPath = `tilesets/${"a".repeat(64)}.png`;
    let returnedOptions: unknown = undefined;
    vi.mocked(handleUpload).mockImplementation(async (opts) => {
      returnedOptions = await opts.onBeforeGenerateToken(goodPath, null, false);
      return { type: "blob.generate-client-token", clientToken: "tkn" } as never;
    });

    const res = makeRes();
    await handler(
      makeReq("POST", { type: "blob.generate-client-token", payload: {} }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(returnedOptions).toMatchObject({
      allowedContentTypes: ["image/png"],
      maximumSizeInBytes: 10 * 1024 * 1024,
      cacheControlMaxAge: 31_536_000,
      addRandomSuffix: false,
    });
  });

  it("project pathname yields JSON content type and 2 MB cap", async () => {
    const goodPath = "projects/8e6f9c5a-1b2c-4d5e-9f0a-1b2c3d4e5f60.json";
    let returnedOptions: unknown = undefined;
    vi.mocked(handleUpload).mockImplementation(async (opts) => {
      returnedOptions = await opts.onBeforeGenerateToken(goodPath, null, false);
      return { type: "blob.generate-client-token", clientToken: "tkn" } as never;
    });
    const res = makeRes();
    await handler(
      makeReq("POST", { type: "blob.generate-client-token", payload: {} }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(returnedOptions).toMatchObject({
      allowedContentTypes: ["application/json"],
      maximumSizeInBytes: 2 * 1024 * 1024,
      cacheControlMaxAge: 0,
    });
  });
});

describe("response never includes the server token", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_secret_token";
  });

  it("only returns the SDK's signed-URL response", async () => {
    const goodPath = `tilesets/${"a".repeat(64)}.png`;
    vi.mocked(handleUpload).mockImplementation(async (opts) => {
      await opts.onBeforeGenerateToken(goodPath, null, false);
      return {
        type: "blob.generate-client-token",
        clientToken: "client_only_signed_token",
      } as never;
    });

    const res = makeRes() as Mocked;
    await handler(
      makeReq("POST", { type: "blob.generate-client-token", payload: {} }),
      res as unknown as VercelResponse,
    );
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("vercel_blob_secret_token");
  });
});

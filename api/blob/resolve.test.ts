// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

vi.mock("@vercel/blob", () => ({
  head: vi.fn(),
}));

import { head } from "@vercel/blob";
import handler from "./resolve";

const VALID_UUID = "8e6f9c5a-1b2c-4d5e-9f0a-1b2c3d4e5f60";

function makeReq(
  method: string,
  query: Record<string, string | string[]> = {},
): VercelRequest {
  return {
    method,
    query,
    headers: { host: "test.local" },
    url: "/api/blob/resolve",
  } as unknown as VercelRequest;
}

function makeRes() {
  return {
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
}

const ORIGINAL_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL_TOKEN;
  vi.clearAllMocks();
});

describe("method enforcement", () => {
  it("rejects POST with 405 and Allow header", async () => {
    const res = makeRes();
    await handler(makeReq("POST"), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe("GET");
  });
});

describe("config gating", () => {
  it("returns 503 when token is missing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = makeRes();
    await handler(
      makeReq("GET", { id: VALID_UUID }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ kind: "not-configured" });
  });
});

describe("input validation", () => {
  it("rejects missing id with 400", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ kind: "forbidden-key" });
  });

  it("rejects non-UUID id with 400", async () => {
    const res = makeRes();
    await handler(
      makeReq("GET", { id: "not-a-uuid" }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe("happy path", () => {
  it("returns the URL from head() on success", async () => {
    vi.mocked(head).mockResolvedValueOnce({
      url: "https://blob.example.com/projects/x.json",
      pathname: `projects/${VALID_UUID}.json`,
      contentType: "application/json",
      contentDisposition: "inline",
      uploadedAt: new Date(),
      size: 100,
    } as never);
    const res = makeRes();
    await handler(
      makeReq("GET", { id: VALID_UUID }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      url: "https://blob.example.com/projects/x.json",
    });
  });

  it("maps not-found errors to 404", async () => {
    vi.mocked(head).mockRejectedValueOnce(new Error("Blob not found"));
    const res = makeRes();
    await handler(
      makeReq("GET", { id: VALID_UUID }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ kind: "not-found" });
  });

  it("returns 500 unknown for other errors", async () => {
    vi.mocked(head).mockRejectedValueOnce(new Error("internal"));
    const res = makeRes();
    await handler(
      makeReq("GET", { id: VALID_UUID }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ kind: "unknown" });
  });
});

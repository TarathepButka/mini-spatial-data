import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses JSON responses and sends credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(request<{ ok: boolean }>("/api/v1/example")).resolves.toEqual({
      ok: true,
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/example$/);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ credentials: "include" });
  });

  it("throws API error messages when available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid geometry" } }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }),
    );

    await expect(request("/api/v1/example")).rejects.toThrow(
      "Invalid geometry",
    );
  });

  it("falls back to status text for non-JSON errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );

    await expect(request("/api/v1/example")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

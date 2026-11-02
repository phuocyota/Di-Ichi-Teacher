import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { portalRequest } from "./portalApi.js";

beforeEach(() => {
  for (const key of ["localStorage", "sessionStorage"]) {
    const values = new Map();
    vi.stubGlobal(key, {
      getItem: (name) => values.get(name) ?? null,
      setItem: (name, value) => values.set(name, String(value)),
      removeItem: (name) => values.delete(name),
    });
  }
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("rejects non-JSON and unsuccessful wrapped responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("HTML response");
      },
    }),
  );
  await expect(portalRequest("/snapshot")).rejects.toThrow(
    "không đúng định dạng",
  );
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      success: false,
      error: { message: ["Sai lớp", "Sai nội dung"] },
    }),
  });
  await expect(
    portalRequest("/records", { method: "POST", body: {} }),
  ).rejects.toThrow("Sai lớp; Sai nội dung");
});

it("times out a stalled API and returns a retryable message", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ),
  );
  const request = expect(portalRequest("/snapshot")).rejects.toThrow(
    "phản hồi quá lâu",
  );
  await vi.advanceTimersByTimeAsync(15000);
  await request;
});

it("forwards unmount cancellation without converting it to a timeout", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Unmounted", "AbortError")),
          );
        }),
    ),
  );
  const controller = new AbortController();
  const request = expect(
    portalRequest("/snapshot", { signal: controller.signal }),
  ).rejects.toThrow("Unmounted");
  controller.abort();
  await request;
});

it("sends multipart uploads without a JSON content type and preserves the access token", async () => {
  sessionStorage.setItem(
    "diIchiTeacherSession",
    JSON.stringify({ accessToken: "isolated-test-token" }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: "file-1" } }),
    }),
  );
  const body = new FormData();
  body.append("file", new File(["content"], "test.txt"));
  await expect(
    portalRequest("/files", { method: "POST", body }),
  ).resolves.toEqual({ id: "file-1" });
  expect(fetch.mock.calls[0][1].headers).toEqual({
    Authorization: "Bearer isolated-test-token",
  });
  expect(fetch.mock.calls[0][1].body).toBe(body);
});

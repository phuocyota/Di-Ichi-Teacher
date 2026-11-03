import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import {
  startResourceUpdates,
  useResourceUpdates,
  RESOURCE_EVENT,
} from "./realtime.js";
vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("./authSession.js", () => ({ getAccessToken: () => "fresh-token" }));
let handlers, client, ack;
beforeEach(() => {
  vi.useFakeTimers();
  handlers = {};
  client = {
    on: vi.fn((event, fn) => {
      handlers[event] = fn;
    }),
    timeout: vi.fn(() => client),
    emit: vi.fn((_event, _payload, cb) => {
      ack = cb;
    }),
    disconnect: vi.fn(),
  };
  io.mockReturnValue(client);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it("coalesces updates and refetches after reconnect without delivering record payloads", () => {
  const listener = vi.fn();
  window.addEventListener(RESOURCE_EVENT, listener);
  const stop = startResourceUpdates();
  handlers.connect();
  ack(null, { ok: true, ready: true });
  vi.advanceTimersByTime(200);
  listener.mockClear();
  handlers["resources:changed"]({
    resource: "class-staff",
    studentName: "must-not-relay",
  });
  handlers["resources:changed"]({ resource: "schedule" });
  vi.advanceTimersByTime(200);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].detail).toEqual({
    resources: ["class-staff", "schedule"],
    resync: false,
  });
  handlers.disconnect();
  handlers.connect();
  ack(null, { ok: true, ready: true });
  vi.advanceTimersByTime(200);
  expect(listener.mock.calls.at(-1)[0].detail.resync).toBe(true);
  stop();
  window.removeEventListener(RESOURCE_EVENT, listener);
  expect(client.disconnect).toHaveBeenCalled();
});
it("defers a relevant refresh during editing and applies it when editing ends", async () => {
  const refresh = vi.fn();
  const { rerender } = renderHook(
    ({ enabled }) => useResourceUpdates(refresh, ["schedule"], enabled),
    { initialProps: { enabled: false } },
  );
  act(() =>
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["schedule"] } }),
    ),
  );
  expect(refresh).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await act(async () => {
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledOnce();
});
it("filters unrelated events but accepts a reconnect resync", async () => {
  const refresh = vi.fn();
  renderHook(() => useResourceUpdates(refresh, ["schedule"]));
  act(() =>
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["score"] } }),
    ),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(refresh).not.toHaveBeenCalled();
  act(() =>
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, {
        detail: { resources: ["*"], resync: true },
      }),
    ),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledOnce();
});

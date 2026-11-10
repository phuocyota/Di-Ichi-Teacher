import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import { getAccessToken } from "./authSession.js";
import {
  startResourceUpdates,
  useResourceUpdates,
  RESOURCE_EVENT,
  REALTIME_STATUS_EVENT,
} from "./realtime.js";
import { affectsResources, PORTAL_RESOURCES } from "./resourceUpdates.js";
vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("./authSession.js", () => ({
  getAccessToken: vi.fn(() => "fresh-token"),
}));
let handlers, client, ack;
beforeEach(() => {
  vi.useFakeTimers();
  handlers = {};
  getAccessToken.mockReturnValue("fresh-token");
  client = {
    connected: false,
    on: vi.fn((event, fn) => {
      handlers[event] = fn;
    }),
    off: vi.fn(),
    connect: vi.fn(() => {
      client.connected = true;
    }),
    timeout: vi.fn(() => client),
    emit: vi.fn((_event, _payload, cb) => {
      ack = cb;
    }),
    disconnect: vi.fn(() => {
      client.connected = false;
    }),
  };
  io.mockReturnValue(client);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it("coalesces names only, and resynchronizes after reconnect", () => {
  const listener = vi.fn();
  window.addEventListener(RESOURCE_EVENT, listener);
  const stop = startResourceUpdates();
  handlers.connect();
  ack(null, { data: { ok: true, ready: true } });
  vi.advanceTimersByTime(200);
  listener.mockClear();
  handlers["resources:changed"]({
    resource: "class-staff",
    studentName: "must-not-relay",
  });
  handlers["resources:changed"]({ resource: "schedule" });
  handlers["resources:changed"]({ resource: "../invalid" });
  vi.advanceTimersByTime(200);
  expect(listener).toHaveBeenCalledOnce();
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
it("retries a watch timeout without accepting acknowledgments from an old connection", () => {
  const stop = startResourceUpdates();
  handlers.connect();
  const stale = ack;
  ack(new Error("timeout"));
  const before = client.emit.mock.calls.length;
  vi.advanceTimersByTime(3000);
  expect(client.emit.mock.calls.length).toBe(before + 1);
  const current = ack;
  handlers.disconnect();
  stale(null, { ok: true, ready: true });
  current(null, { ok: true, ready: true });
  const listener = vi.fn();
  window.addEventListener(RESOURCE_EVENT, listener);
  handlers["resources:changed"]({ resource: "schedule" });
  vi.advanceTimersByTime(200);
  expect(listener).not.toHaveBeenCalled();
  stop();
  window.removeEventListener(RESOURCE_EVENT, listener);
});
it("falls back while the listener is unavailable and resyncs when it recovers", () => {
  const listener = vi.fn(),
    statuses = vi.fn();
  window.addEventListener(RESOURCE_EVENT, listener);
  window.addEventListener(REALTIME_STATUS_EVENT, statuses);
  const stop = startResourceUpdates();
  handlers.connect();
  ack(null, { ok: true, ready: false });
  vi.advanceTimersByTime(200);
  listener.mockClear();
  vi.advanceTimersByTime(30000);
  expect(listener).toHaveBeenCalledOnce();
  listener.mockClear();
  handlers["updates:status"]({ ready: true });
  vi.advanceTimersByTime(200);
  expect(listener).toHaveBeenCalledOnce();
  expect(statuses.mock.calls.at(-1)[0].detail).toBe("live");
  listener.mockClear();
  vi.advanceTimersByTime(30000);
  expect(listener).not.toHaveBeenCalled();
  stop();
  window.removeEventListener(RESOURCE_EVENT, listener);
  window.removeEventListener(REALTIME_STATUS_EVENT, statuses);
});
it("reconnects using the new token, disconnects on logout, and disposes auth listeners", () => {
  const stop = startResourceUpdates();
  const authenticate = io.mock.calls[0][1].auth,
    callback = vi.fn();
  getAccessToken.mockReturnValue("replacement-token");
  window.dispatchEvent(new Event("auth:changed"));
  authenticate(callback);
  expect(callback).toHaveBeenCalledWith({ token: "replacement-token" });
  expect(client.disconnect).toHaveBeenCalledOnce();
  expect(client.connect).toHaveBeenCalledTimes(2);
  getAccessToken.mockReturnValue(null);
  window.dispatchEvent(new Event("storage"));
  expect(client.disconnect).toHaveBeenCalledTimes(2);
  expect(client.connect).toHaveBeenCalledTimes(2);
  stop();
  getAccessToken.mockReturnValue("later");
  window.dispatchEvent(new Event("auth:changed"));
  expect(client.connect).toHaveBeenCalledTimes(2);
});
it("cancels queued invalidations and all timers on stop", () => {
  const listener = vi.fn();
  window.addEventListener(RESOURCE_EVENT, listener);
  const stop = startResourceUpdates();
  handlers.connect();
  ack(null, { ok: true, ready: true });
  stop();
  vi.advanceTimersByTime(60000);
  window.dispatchEvent(new Event("focus"));
  vi.advanceTimersByTime(200);
  expect(listener).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  window.removeEventListener(RESOURCE_EVENT, listener);
});
it("keeps one refresh running and merges events received during that request", async () => {
  let finish;
  const refresh = vi.fn().mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderHook(() => useResourceUpdates(refresh, ["schedule"]));
  const notify = () =>
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["schedule"] } }),
    );
  act(() => {
    notify();
    notify();
    notify();
  });
  expect(refresh).toHaveBeenCalledOnce();
  await act(async () => {
    finish();
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledTimes(2);
});
it("defers relevant changes while editing and drains them once editing ends", async () => {
  const refresh = vi.fn();
  const { rerender } = renderHook(
    ({ enabled }) => useResourceUpdates(refresh, ["schedule"], enabled),
    { initialProps: { enabled: false } },
  );
  act(() => {
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["schedule"] } }),
    );
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["schedule"] } }),
    );
  });
  expect(refresh).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await act(async () => {
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledOnce();
});
it("maps aggregate API events and ignores unrelated or malformed changes", async () => {
  expect(PORTAL_RESOURCES).toContain("room");
  expect(PORTAL_RESOURCES).toContain("lesson-library");
  expect(affectsResources({ resources: ["portal"] }, ["score"])).toBe(true);
  const refresh = vi.fn();
  renderHook(() => useResourceUpdates(refresh, ["schedule"]));
  act(() => {
    for (const detail of [null, {}, { resources: ["score"] }])
      window.dispatchEvent(new CustomEvent(RESOURCE_EVENT, { detail }));
  });
  expect(refresh).not.toHaveBeenCalled();
  act(() =>
    window.dispatchEvent(
      new CustomEvent(RESOURCE_EVENT, { detail: { resources: ["workspace"] } }),
    ),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledOnce();
});

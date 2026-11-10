import { act, cleanup, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createRealtimeSocket } from "../services/realtime.js";
import { useOnlineScheduleWatcher } from "./useOnlineScheduleWatcher.js";
vi.mock("../services/realtime.js", () => ({ createRealtimeSocket: vi.fn() }));
let handlers, client, ack;
beforeEach(() => {
  vi.useFakeTimers();
  handlers = {};
  client = {
    connected: false,
    on: vi.fn((name, fn) => {
      handlers[name] = fn;
    }),
    off: vi.fn(),
    timeout: vi.fn(() => client),
    emit: vi.fn((_name, _payload, callback) => {
      ack = callback;
    }),
    disconnect: vi.fn(),
  };
  createRealtimeSocket.mockReturnValue(client);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it("reloads meeting state after watch/reconnect and filters events by schedule", () => {
  const started = vi.fn(),
    reload = vi.fn();
  const { result, rerender } = renderHook(
    ({ ids }) => useOnlineScheduleWatcher(ids, started, reload),
    { initialProps: { ids: ["s2", "s1", "s1"] } },
  );
  client.connected = true;
  act(() => {
    handlers.connect();
    ack(null, { ok: true, scheduleIds: ["s1", "s2"], realtimeReady: true });
  });
  expect(result.current).toBe(true);
  expect(reload).toHaveBeenCalledOnce();
  act(() => handlers["classroom:started"]({ scheduleId: "other" }));
  expect(started).not.toHaveBeenCalled();
  act(() => handlers["classroom:started"]({ scheduleId: "s1" }));
  expect(started).toHaveBeenCalledOnce();
  rerender({ ids: ["s1", "s2"] });
  expect(createRealtimeSocket).toHaveBeenCalledOnce();
  act(() => {
    handlers.disconnect();
    handlers.connect();
    ack(null, { scheduleIds: ["s2", "s1"] });
  });
  expect(reload).toHaveBeenCalledTimes(2);
});
it("waits for database readiness and ignores stale/forged acknowledgements", () => {
  const started = vi.fn(),
    reload = vi.fn();
  const { result } = renderHook(() =>
    useOnlineScheduleWatcher(["s1"], started, reload),
  );
  client.connected = true;
  act(() => handlers.connect());
  const old = ack;
  act(() => {
    handlers.disconnect();
    old(null, { scheduleIds: ["s1"], realtimeReady: true });
  });
  expect(result.current).toBe(false);
  act(() => {
    handlers.connect();
    ack(null, { scheduleIds: ["other"] });
  });
  expect(result.current).toBe(false);
  act(() => {
    handlers.connect();
    ack(null, { scheduleIds: ["s1"], realtimeReady: false });
  });
  expect(result.current).toBe(false);
  act(() => {
    vi.advanceTimersByTime(3000);
    ack(null, { scheduleIds: ["s1"], realtimeReady: true });
  });
  expect(result.current).toBe(true);
  expect(reload).toHaveBeenCalledOnce();
});

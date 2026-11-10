import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLessonProgressSocket } from "./useLessonProgressSocket.js";
import { io } from "socket.io-client";
vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("../services/authSession.js", () => ({
  getAccessToken: () => "current-token",
}));
let handlers, client, acknowledge;
beforeEach(() => {
  vi.useFakeTimers();
  handlers = {};
  client = {
    connected: true,
    connect: vi.fn(),
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    timeout: vi.fn(() => client),
    emit: vi.fn((event, payload, ack) => {
      acknowledge = ack;
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
it("subscribes, coalesces events and resynchronizes after reconnect", () => {
  const refresh = vi.fn();
  const { result, unmount } = renderHook(() =>
    useLessonProgressSocket("p1", refresh),
  );
  expect(io).toHaveBeenCalledWith(
    expect.stringContaining("/lesson-progress"),
    expect.objectContaining({ transports: ["websocket"] }),
  );
  const auth = vi.fn();
  io.mock.calls.at(-1)[1].auth(auth);
  expect(auth).toHaveBeenCalledWith({ token: "current-token" });
  act(() => {
    handlers.connect();
    acknowledge(null, {
      success: true,
      data: { ok: true, ready: true, planId: "p1" },
    });
    vi.advanceTimersByTime(75);
  });
  expect(result.current).toBe("live");
  refresh.mockClear();
  act(() => {
    handlers["lesson-progress:changed"]({ planId: "other" });
    vi.advanceTimersByTime(100);
  });
  expect(refresh).not.toHaveBeenCalled();
  act(() => {
    handlers["lesson-progress:changed"]({ planId: "p1" });
    handlers["lesson-progress:changed"]({ planId: "p1" });
    vi.advanceTimersByTime(75);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  act(() => handlers.disconnect());
  expect(result.current).toBe("fallback");
  act(() => {
    handlers.connect();
    acknowledge(null, { ok: true, ready: true, planId: "p1" });
    vi.advanceTimersByTime(75);
  });
  expect(result.current).toBe("live");
  expect(refresh).toHaveBeenCalledTimes(2);
  unmount();
  expect(client.disconnect).toHaveBeenCalled();
});
it("shows fallback when the database listener is unavailable and recovers on its status event", () => {
  const refresh = vi.fn();
  const { result } = renderHook(() => useLessonProgressSocket("p1", refresh));
  act(() => {
    handlers.connect();
    acknowledge(null, { ok: true, ready: false, planId: "p1" });
    vi.advanceTimersByTime(75);
  });
  expect(result.current).toBe("fallback");
  refresh.mockClear();
  act(() => {
    handlers["lesson-progress:status"]({ ready: true });
    vi.advanceTimersByTime(75);
  });
  expect(result.current).toBe("live");
  expect(refresh).toHaveBeenCalledOnce();
});
it("rejects a failed subscription and ignores its events", () => {
  const refresh = vi.fn();
  const { result } = renderHook(() => useLessonProgressSocket("p1", refresh));
  act(() => {
    handlers.connect();
    acknowledge(null, { ok: false });
    vi.advanceTimersByTime(75);
  });
  expect(result.current).toBe("forbidden");
  refresh.mockClear();
  act(() => {
    handlers["lesson-progress:changed"]({ planId: "p1" });
    vi.advanceTimersByTime(100);
  });
  expect(refresh).not.toHaveBeenCalled();
});

it("retries timeouts, ignores stale acknowledgements and keeps the socket across callback changes", () => {
  const first = vi.fn(),
    second = vi.fn();
  const { result, rerender } = renderHook(
    ({ callback }) => useLessonProgressSocket("p1", callback),
    { initialProps: { callback: first } },
  );
  act(() => handlers.connect());
  const stale = acknowledge;
  act(() => acknowledge(new Error("timeout")));
  act(() => vi.advanceTimersByTime(3000));
  expect(client.emit.mock.calls.length).toBeGreaterThanOrEqual(2);
  const current = acknowledge;
  act(() => handlers.disconnect());
  act(() => current(null, { ok: true, ready: true, planId: "p1" }));
  expect(result.current).toBe("fallback");
  rerender({ callback: second });
  expect(io).toHaveBeenCalledOnce();
  act(() => {
    handlers.connect();
    stale(null, { ok: true, ready: true, planId: "p1" });
  });
  expect(result.current).toBe("fallback");
  act(() => {
    acknowledge(null, { ok: true, ready: true, planId: "p1" });
    vi.advanceTimersByTime(75);
  });
  expect(second).toHaveBeenCalledOnce();
  expect(first).not.toHaveBeenCalled();
});

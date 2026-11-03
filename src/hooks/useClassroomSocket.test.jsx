import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRealtimeSocket } from "../services/realtime.js";
import { useClassroomSocket } from "./useClassroomSocket.js";
vi.mock("../services/realtime.js", () => ({ createRealtimeSocket: vi.fn() }));
let handlers, client, ack;
beforeEach(() => {
  handlers = {};
  client = {
    on: vi.fn((event, fn) => {
      handlers[event] = fn;
    }),
    timeout: vi.fn(() => client),
    emit: vi.fn((_event, _payload, callback) => {
      if (callback) ack = callback;
    }),
    disconnect: vi.fn(),
  };
  createRealtimeSocket.mockReturnValue(client);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("resynchronizes the roster and board only after joining the room", () => {
  const onEvent = vi.fn();
  const { result } = renderHook(() =>
    useClassroomSocket({ scheduleId: "s1", onEvent }),
  );
  act(() => handlers.connect());
  expect(result.current.connected).toBe(false);
  act(() =>
    ack(null, { scheduleId: "s1", permissions: { canControlBoard: true } }),
  );
  expect(result.current.connected).toBe(true);
  expect(onEvent).toHaveBeenCalledWith(
    "classroom:resynced",
    expect.objectContaining({ scheduleId: "s1" }),
  );
  expect(client.emit).toHaveBeenCalledWith("board:snapshot-request", {
    scheduleId: "s1",
  });
  act(() => handlers.disconnect());
  expect(result.current.connected).toBe(false);
});
it("retains the socket across callback updates and filters events to its schedule", () => {
  const first = vi.fn(),
    second = vi.fn();
  const { rerender } = renderHook(
    ({ callback }) =>
      useClassroomSocket({ scheduleId: "s1", onEvent: callback }),
    { initialProps: { callback: first } },
  );
  rerender({ callback: second });
  expect(createRealtimeSocket).toHaveBeenCalledTimes(1);
  act(() => handlers["classroom:raise-hand"]({ scheduleId: "s-other" }));
  expect(second).not.toHaveBeenCalled();
  act(() =>
    handlers["classroom:raise-hand"]({ scheduleId: "s1", studentId: "st1" }),
  );
  expect(second).toHaveBeenCalledOnce();
});

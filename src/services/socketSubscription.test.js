import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { subscribeSocket } from "./socketSubscription.js";
let handlers, client, ack, ready, unavailable, rejected;
beforeEach(() => {
  vi.useFakeTimers();
  handlers = {};
  client = {
    connected: false,
    on: vi.fn((event, fn) => {
      handlers[event] = fn;
    }),
    off: vi.fn(),
    timeout: vi.fn(() => client),
    emit: vi.fn((_event, _payload, callback) => {
      ack = callback;
    }),
  };
  ready = vi.fn();
  unavailable = vi.fn();
  rejected = vi.fn();
});
afterEach(() => vi.useRealTimers());
function subscribe() {
  return subscribeSocket(client, {
    event: "classroom:join",
    payload: { scheduleId: "s1" },
    statusEvent: "classroom:transport-status",
    accept: (result) => result?.scheduleId === "s1",
    onReady: ready,
    onUnavailable: unavailable,
    onRejected: rejected,
  });
}
function connect() {
  client.connected = true;
  handlers.connect();
}
it("rejects late join acknowledgements after disconnect and after cleanup", () => {
  const stop = subscribe();
  connect();
  const old = ack;
  client.connected = false;
  handlers.disconnect();
  old(null, { scheduleId: "s1", realtimeReady: true });
  expect(ready).not.toHaveBeenCalled();
  connect();
  const current = ack;
  stop();
  current(null, { scheduleId: "s1" });
  expect(ready).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("retries timed-out joins and requests current permissions again after recovery", () => {
  const stop = subscribe();
  connect();
  ack(new Error("timeout"));
  vi.advanceTimersByTime(3000);
  expect(client.emit).toHaveBeenCalledTimes(2);
  ack(null, {
    data: {
      scheduleId: "s1",
      permissions: { canWriteBoard: false },
      realtimeReady: true,
    },
  });
  expect(ready).toHaveBeenCalledOnce();
  handlers["classroom:transport-status"]({ ready: false });
  expect(unavailable).toHaveBeenCalled();
  handlers["classroom:transport-status"]({ ready: true });
  expect(client.emit).toHaveBeenCalledTimes(3);
  ack(null, { scheduleId: "s1", permissions: { canWriteBoard: true } });
  expect(ready.mock.calls.at(-1)[0].permissions.canWriteBoard).toBe(true);
  stop();
});
it("does not mark a room live when the database listener is unavailable", () => {
  const stop = subscribe();
  connect();
  ack(null, { scheduleId: "s1", realtimeReady: false });
  expect(ready).not.toHaveBeenCalled();
  vi.advanceTimersByTime(3000);
  expect(client.emit).toHaveBeenCalledTimes(2);
  stop();
});
it("does not let an in-flight join overwrite a newer unavailable status", () => {
  const stop = subscribe();
  connect();
  const old = ack;
  handlers["classroom:transport-status"]({ ready: false });
  old(null, { scheduleId: "s1", realtimeReady: true });
  expect(ready).not.toHaveBeenCalled();
  stop();
});
it("handles denied subscriptions without treating the room as ready", () => {
  const stop = subscribe();
  connect();
  ack(null, { ok: false });
  expect(rejected).toHaveBeenCalledOnce();
  expect(ready).not.toHaveBeenCalled();
  vi.advanceTimersByTime(6000);
  expect(client.emit).toHaveBeenCalledOnce();
  stop();
});

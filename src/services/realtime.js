import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./apiConfig.js";
import { getAccessToken } from "./authSession.js";
import { startUpdates, affectsResources } from "./resourceUpdates.js";
import { bindSocketSession, disposeRealtimeSocket } from "./socketSession.js";
export { disposeRealtimeSocket } from "./socketSession.js";
export { PORTAL_RESOURCES } from "./resourceUpdates.js";
export const RESOURCE_EVENT = "diichi:resources-changed";
export const REALTIME_STATUS_EVENT = "diichi:realtime-status";
export function createRealtimeSocket(namespace) {
  const origin = new URL(
    import.meta.env.VITE_SOCKET_URL || API_BASE_URL,
    window.location.origin,
  ).origin;
  const client = io(`${origin}/${namespace}`, {
    path: import.meta.env.VITE_SOCKET_PATH || "/socket.io",
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (callback) => callback({ token: getAccessToken() }),
  });
  return bindSocketSession(client, getAccessToken);
}
export function startResourceUpdates() {
  const client = createRealtimeSocket("updates");
  const stop = startUpdates({
    client,
    target: window,
    document,
    eventName: RESOURCE_EVENT,
    canConnect: () => Boolean(getAccessToken()),
    onStatus: (status) =>
      window.dispatchEvent(
        new CustomEvent(REALTIME_STATUS_EVENT, { detail: status }),
      ),
  });
  return () => {
    stop();
    disposeRealtimeSocket(client);
  };
}
export function useUpdatesConnection() {
  const [status, setStatus] = useState("connecting");
  useEffect(() => {
    const changed = (event) => setStatus(event.detail);
    window.addEventListener(REALTIME_STATUS_EVENT, changed);
    const stop = startResourceUpdates();
    return () => {
      window.removeEventListener(REALTIME_STATUS_EVENT, changed);
      stop();
    };
  }, []);
  return status;
}
export function useResourceUpdates(callback, resources = [], enabled = true) {
  const current = useRef(callback),
    allowed = useRef(resources),
    canRun = useRef(enabled);
  const running = useRef(false),
    pending = useRef(null),
    mounted = useRef(false),
    drain = useRef(null);
  useEffect(() => {
    current.current = callback;
    allowed.current = resources;
    canRun.current = enabled;
  });
  useEffect(() => {
    mounted.current = true;
    const run = async () => {
      if (
        !mounted.current ||
        !canRun.current ||
        running.current ||
        !pending.current
      )
        return;
      running.current = true;
      const change = pending.current;
      pending.current = null;
      try {
        await current.current(change);
      } catch {
        /* The screen owns its API error state. */
      } finally {
        running.current = false;
        if (mounted.current && canRun.current && pending.current) void run();
      }
    };
    drain.current = run;
    const changed = (event) => {
      if (!affectsResources(event.detail, allowed.current)) return;
      pending.current = {
        resync: Boolean(pending.current?.resync || event.detail.resync),
        resources: [
          ...new Set([
            ...(pending.current?.resources || []),
            ...event.detail.resources,
          ]),
        ],
      };
      void run();
    };
    window.addEventListener(RESOURCE_EVENT, changed);
    return () => {
      mounted.current = false;
      pending.current = null;
      window.removeEventListener(RESOURCE_EVENT, changed);
    };
  }, []);
  useEffect(() => {
    if (enabled) void drain.current?.();
  }, [enabled]);
}

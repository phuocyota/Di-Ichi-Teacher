import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./apiConfig.js";
import { getAccessToken } from "./authSession.js";

export const RESOURCE_EVENT = "diichi:resources-changed";
export function createRealtimeSocket(namespace) {
  const origin = new URL(API_BASE_URL, window.location.origin).origin;
  return io(`${origin}/${namespace}`, {
    transports: ["websocket"],
    auth: (callback) => callback({ token: getAccessToken() }),
  });
}
export function startResourceUpdates() {
  const client = createRealtimeSocket("updates");
  let active = true,
    watching = false,
    live = false,
    flushTimer;
  const pending = new Set();
  const schedule = (resource) => {
    pending.add(resource);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      if (!active) return;
      const resources = [...pending];
      pending.clear();
      window.dispatchEvent(
        new CustomEvent(RESOURCE_EVENT, {
          detail: { resources, resync: resources.includes("*") },
        }),
      );
    }, 200);
  };
  client.on("connect", () => {
    watching = false;
    client.timeout(5000).emit("updates:watch", {}, (error, response) => {
      if (!active) return;
      const result = response?.data ?? response;
      watching = !error && result?.ok === true;
      live = watching && result.ready === true;
      if (watching) schedule("*");
    });
  });
  client.on("resources:changed", (event) => {
    if (watching && /^[a-z][a-z-]{0,63}$/.test(event?.resource || ""))
      schedule(event.resource);
  });
  client.on("updates:status", (event) => {
    live = watching && event?.ready === true;
    if (live) schedule("*");
  });
  client.on("disconnect", () => {
    watching = false;
    live = false;
  });
  client.on("connect_error", () => {
    live = false;
  });
  const onFocus = () => {
    if (!document.hidden) schedule("*");
  };
  const fallback = setInterval(() => {
    if (!live && !document.hidden) schedule("*");
  }, 30000);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
  return () => {
    active = false;
    clearTimeout(flushTimer);
    clearInterval(fallback);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    client.disconnect();
  };
}
export function useUpdatesConnection() {
  useEffect(() => startResourceUpdates(), []);
}
export function useResourceUpdates(callback, resources = [], enabled = true) {
  const current = useRef(callback),
    allowed = useRef(resources),
    canRun = useRef(enabled),
    pending = useRef(false);
  useEffect(() => {
    current.current = callback;
    allowed.current = resources;
    canRun.current = enabled;
  });
  useEffect(() => {
    const changed = (event) => {
      const change = event.detail;
      if (
        !change ||
        (!change.resync &&
          allowed.current.length &&
          !change.resources?.some((r) => allowed.current.includes(r)))
      )
        return;
      if (!canRun.current) {
        pending.current = true;
        return;
      }
      Promise.resolve()
        .then(() => current.current())
        .catch(() => {});
    };
    window.addEventListener(RESOURCE_EVENT, changed);
    return () => window.removeEventListener(RESOURCE_EVENT, changed);
  }, []);
  useEffect(() => {
    if (enabled && pending.current) {
      pending.current = false;
      Promise.resolve()
        .then(() => current.current())
        .catch(() => {});
    }
  }, [enabled]);
}

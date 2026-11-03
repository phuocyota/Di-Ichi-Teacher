import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../services/apiConfig.js";
import { getAccessToken } from "../services/authSession.js";

export function useLessonProgressSocket(planId, onRefresh) {
  const [status, setStatus] = useState("connecting");
  useEffect(() => {
    if (!planId) return;
    let active = true,
      watching = false,
      refreshTimer;
    const refresh = () => {
      if (!refreshTimer)
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          if (active) onRefresh();
        }, 75);
    };
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    const client = io(`${origin}/lesson-progress`, {
      // PM2 runs multiple workers; WebSocket transport does not need sticky polling sessions.
      transports: ["websocket"],
      auth: (callback) => callback({ token: getAccessToken() }),
    });
    setStatus("connecting");
    client.on("connect", () => {
      watching = false;
      client
        .timeout(5000)
        .emit("lesson-progress:watch", { planId }, (error, result) => {
          if (!active) return;
          result = result?.data ?? result;
          watching = !error && result?.ok === true && result.planId === planId;
          if (error) setStatus("fallback");
          else if (!watching) setStatus("forbidden");
          else setStatus(result.ready ? "live" : "fallback");
          // Fetch after joining to recover events missed while offline or loading.
          refresh();
        });
    });
    client.on("lesson-progress:changed", (event) => {
      if (watching && event?.planId === planId) refresh();
    });
    client.on("lesson-progress:status", (event) => {
      if (!watching) return;
      setStatus(event?.ready ? "live" : "fallback");
      if (event?.ready) refresh();
    });
    client.on("connect_error", () => {
      if (active) setStatus("fallback");
    });
    client.on("disconnect", () => {
      watching = false;
      if (active) setStatus("fallback");
    });
    return () => {
      active = false;
      clearTimeout(refreshTimer);
      client.disconnect();
    };
  }, [planId, onRefresh]);
  return status;
}

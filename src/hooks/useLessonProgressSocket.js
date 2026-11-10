import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "../services/realtime.js";
import { disposeRealtimeSocket } from "../services/socketSession.js";

export function useLessonProgressSocket(planId, onRefresh) {
  const [status, setStatus] = useState("connecting");
  const latest = useRef(onRefresh);
  useEffect(() => {
    latest.current = onRefresh;
  });
  useEffect(() => {
    if (!planId) return;
    let active = true,
      watching = false,
      generation = 0,
      refreshTimer,
      retryTimer;
    const refresh = () => {
      if (refreshTimer !== undefined) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (active) {
          try {
            Promise.resolve(latest.current()).catch(() => {});
          } catch {}
        }
      }, 75);
    };
    const client = createRealtimeSocket("lesson-progress");
    setStatus("connecting");
    const reset = () => {
      generation++;
      watching = false;
      clearTimeout(retryTimer);
      if (active) setStatus("fallback");
    };
    const watch = () => {
      reset();
      const attempt = generation;
      client
        .timeout(5000)
        .emit("lesson-progress:watch", { planId }, (error, response) => {
          if (!active || attempt !== generation) return;
          const result = response?.data ?? response;
          watching = !error && result?.ok === true && result.planId === planId;
          if (error) {
            setStatus("fallback");
            retryTimer = setTimeout(() => {
              if (active && client.connected) watch();
            }, 3000);
          } else if (!watching) setStatus("forbidden");
          else {
            setStatus(result.ready ? "live" : "fallback");
            refresh();
          }
        });
    };
    client.on("connect", watch);
    client.on("lesson-progress:changed", (event) => {
      if (watching && event?.planId === planId) refresh();
    });
    client.on("lesson-progress:status", (event) => {
      if (!watching) return;
      setStatus(event?.ready ? "live" : "fallback");
      if (event?.ready) refresh();
    });
    client.on("connect_error", reset);
    client.on("disconnect", reset);
    if (client.connected) watch();
    return () => {
      active = false;
      generation++;
      clearTimeout(refreshTimer);
      clearTimeout(retryTimer);
      disposeRealtimeSocket(client);
    };
  }, [planId]);
  return status;
}

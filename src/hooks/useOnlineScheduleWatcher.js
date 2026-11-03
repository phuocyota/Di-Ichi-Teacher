import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "../services/realtime.js";
export function useOnlineScheduleWatcher(scheduleIds, onStarted, onEnded) {
  const [connected, setConnected] = useState(false);
  const latest = useRef(onStarted);
  useEffect(() => {
    latest.current = onStarted;
  });
  const ended = useRef(onEnded);
  useEffect(() => { ended.current = onEnded; });
  const scheduleKey = [...new Set(scheduleIds)].sort().join(",");
  useEffect(() => {
    if (!scheduleKey) return;
    let active = true;
    const ids = scheduleKey.split(",");
    const client = createRealtimeSocket("classroom");
    client.on("connect", () =>
      client
        .timeout(5000)
        .emit("classroom:watch", { scheduleIds: ids }, (error, response) => {
          if (!active) return;
          const result = response?.data ?? response;
          setConnected(!error && result?.scheduleIds?.length === ids.length);
        }),
    );
    client.on("disconnect", () => {
      if (active) setConnected(false);
    });
    client.on("connect_error", () => {
      if (active) setConnected(false);
    });
    client.on("classroom:started", (event) => {
      if (ids.includes(event?.scheduleId)) latest.current?.(event);
    });
    client.on('classroom:ended', event => { if (ids.includes(event?.scheduleId)) ended.current?.(event); });
    return () => {
      active = false;
      client.disconnect();
      setConnected(false);
    };
  }, [scheduleKey]);
  return connected;
}

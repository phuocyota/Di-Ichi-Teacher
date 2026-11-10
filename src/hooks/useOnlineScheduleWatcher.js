import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "../services/realtime.js";
import { disposeRealtimeSocket } from "../services/socketSession.js";
import { subscribeSocket } from "../services/socketSubscription.js";
export function useOnlineScheduleWatcher(scheduleIds, onStarted, onEnded) {
  const [connected, setConnected] = useState(false);
  const latest = useRef({ onStarted, onEnded });
  useEffect(() => {
    latest.current = { onStarted, onEnded };
  });
  const scheduleKey = [...new Set(scheduleIds)]
    .filter(Boolean)
    .sort()
    .join(",");
  useEffect(() => {
    if (!scheduleKey) return;
    const ids = scheduleKey.split(",");
    const client = createRealtimeSocket("classroom");
    const stop = subscribeSocket(client, {
      event: "classroom:watch",
      payload: { scheduleIds: ids },
      statusEvent: "classroom:transport-status",
      accept: (result) =>
        Array.isArray(result?.scheduleIds) &&
        result.scheduleIds.length === ids.length &&
        ids.every((id) => result.scheduleIds.includes(id)),
      onUnavailable: () => setConnected(false),
      onReady: () => {
        setConnected(true);
        // Read actual meeting state after rejoining; start/end may have happened offline.
        latest.current.onEnded?.();
      },
    });
    client.on("classroom:started", (event) => {
      if (ids.includes(event?.scheduleId)) latest.current.onStarted?.(event);
    });
    client.on("classroom:ended", (event) => {
      if (ids.includes(event?.scheduleId)) latest.current.onEnded?.(event);
    });
    return () => {
      stop();
      disposeRealtimeSocket(client);
      setConnected(false);
    };
  }, [scheduleKey]);
  return connected;
}

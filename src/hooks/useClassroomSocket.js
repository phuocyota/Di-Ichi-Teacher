import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "../services/realtime.js";
import { disposeRealtimeSocket } from "../services/socketSession.js";
import { subscribeSocket } from "../services/socketSubscription.js";
export function useClassroomSocket({ scheduleId, onEvent }) {
  const [socket, setSocket] = useState(null),
    [connected, setConnected] = useState(false);
  const latest = useRef(onEvent);
  useEffect(() => {
    latest.current = onEvent;
  });
  useEffect(() => {
    if (!scheduleId) return;
    const client = createRealtimeSocket("classroom");
    setSocket(client);
    const unavailable = () => {
      client.classroomReady = false;
      setConnected(false);
    };
    const stop = subscribeSocket(client, {
      event: "classroom:join",
      payload: { scheduleId },
      statusEvent: "classroom:transport-status",
      accept: (result) => result?.scheduleId === scheduleId,
      onUnavailable: unavailable,
      onReady: (result) => {
        client.classroomReady = true;
        setConnected(true);
        latest.current?.("classroom:resynced", result);
        client.emit("board:snapshot-request", { scheduleId });
      },
    });
    client.on("classroom:ended", (event) => {
      if (event?.scheduleId === scheduleId) {
        stop();
        unavailable();
        latest.current?.("classroom:ended", event);
      }
    });
    for (const event of [
      "classroom:participant-joined",
      "classroom:participant-left",
      "classroom:raise-hand",
      "classroom:lower-hand",
      "classroom:permission-changed",
      "classroom:participant-kicked",
      "classroom:started",
    ]) {
      client.on(event, (payload) => {
        if (payload?.scheduleId === scheduleId)
          latest.current?.(event, payload);
      });
    }
    return () => {
      stop();
      disposeRealtimeSocket(client);
      setSocket(null);
      setConnected(false);
    };
  }, [scheduleId]);
  return { socket, connected };
}

import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "../services/realtime.js";
export const useClassroomSocket = ({ scheduleId, onEvent }) => {
  const [socket, setSocket] = useState(null),
    [connected, setConnected] = useState(false);
  const latest = useRef(onEvent);
  useEffect(() => {
    latest.current = onEvent;
  });
  useEffect(() => {
    if (!scheduleId) return;
    let active = true;
    const client = createRealtimeSocket("classroom");
    setSocket(client);
    const events = [
      "classroom:participant-joined",
      "classroom:participant-left",
      "classroom:raise-hand",
      "classroom:lower-hand",
      "classroom:permission-changed",
      "classroom:participant-kicked",
      "classroom:started",
    ];
    const join = () => {
      client.classroomReady = false;
      client
        .timeout(5000)
        .emit("classroom:join", { scheduleId }, (error, response) => {
          if (!active) return;
          const result = response?.data ?? response;
          const ready =
            !error &&
            result?.scheduleId === scheduleId &&
            result.realtimeReady !== false;
          client.classroomReady = ready;
          setConnected(ready);
          if (ready) {
            latest.current?.("classroom:resynced", result);
            client.emit("board:snapshot-request", { scheduleId });
          }
        });
    };
    client.on("connect", join);
    client.on("classroom:transport-status", (event) => {
      if (!active) return;
      if (!event?.ready) {
        client.classroomReady = false;
        setConnected(false);
      } else if (client.connected) join();
    });
    client.on("disconnect", () => {
      client.classroomReady = false;
      if (active) setConnected(false);
    });
    client.on("connect_error", () => {
      if (active) setConnected(false);
    });
    client.on("exception", () => {
      client.classroomReady = false;
      if (active) setConnected(false);
    });
    for (const event of events)
      client.on(event, (payload) => {
        if (payload?.scheduleId === scheduleId)
          latest.current?.(event, payload);
      });
    return () => {
      active = false;
      client.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [scheduleId]);
  return { socket, connected };
};

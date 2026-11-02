import React, { useCallback, useEffect, useRef, useState } from "react";
import { clearAuthSession } from "../services/authSession.js";
import "./portal.css";

import { PortalContext as Context } from "./portalStore.js";
import { portalRequest, validateSnapshot } from "../services/portalApi.js";
import { useScheduleReminders } from "./useScheduleReminders.js";
export function PortalProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const revision = useRef(0);
  useScheduleReminders(data);
  const reload = useCallback(async (signal) => {
    const request = ++revision.current;
    try {
      const next = validateSnapshot(
        await portalRequest("/snapshot", { signal }),
      );
      if (request === revision.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (request === revision.current && !signal?.aborted) setError(e.message);
      throw e;
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    // Refresh the teacher's timetable so reminders include newly created/changed lessons.
    if (data?.profile?.userType !== "TEACHER") return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "hidden" && !lock.current)
        reload(controller.signal).catch(() => {});
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [data?.profile?.userId, data?.profile?.userType, reload]);
  const act = async (path, options = {}) => {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await portalRequest(path, options);
      try {
        await reload();
        setNotice("Đã lưu thành công");
      } catch (e) {
        setError(`Đã lưu, nhưng chưa tải lại được dữ liệu: ${e.message}`);
      }
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const download = async (id) => {
    try {
      const { blob, name } = await portalRequest(`/files/${id}`, {
        download: true,
      });
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Context.Provider value={{ data, act, busy, download, reload, setError }}>
      <div className="portal-status" aria-live="polite">
        {error && (
          <div role="alert" className="portal-error">
            {error}{" "}
            <button onClick={() => reload().catch(() => {})}>Thử lại</button>
            <button
              onClick={() => {
                clearAuthSession();
                window.location.assign("/login");
              }}
            >
              Đăng xuất
            </button>
          </div>
        )}
        {notice && <div className="portal-notice">{notice}</div>}
      </div>
      {data
        ? children
        : !error && (
            <p className="portal-loading" role="status">
              Đang tải dữ liệu…
            </p>
          )}
    </Context.Provider>
  );
}

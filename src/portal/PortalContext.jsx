import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken, clearAuthSession } from "../services/authSession.js";
import "./portal.css";

import { PortalContext as Context } from "./portalStore.js";
const base = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
async function portalRequest(
  path,
  { method = "GET", body, signal, download = false } = {},
) {
  const form = body instanceof FormData;
  const response = await fetch(`${base}/portal${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(!form && body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  if (response.status === 401) {
    clearAuthSession();
    window.location.assign("/login");
  }
  if (download && response.ok)
    return {
      blob: await response.blob(),
      name: decodeURIComponent(
        response.headers.get("Content-Disposition")?.split("UTF-8''")[1] ||
          "tai-lieu",
      ),
    };
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      Array.isArray(payload?.message)
        ? payload.message.join("; ")
        : payload?.message || "Không thể kết nối máy chủ",
    );
  return payload?.data ?? payload;
}
export function PortalProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const revision = useRef(0);
  const reload = useCallback(async (signal) => {
    const request = ++revision.current;
    try {
      const next = await portalRequest("/snapshot", { signal });
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
            <button onClick={() => { clearAuthSession(); window.location.assign('/login'); }}>Đăng xuất</button>
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

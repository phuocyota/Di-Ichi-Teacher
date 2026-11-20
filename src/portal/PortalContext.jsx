import {
  useUpdatesConnection,
  useResourceUpdates,
  PORTAL_RESOURCES,
} from "../services/realtime.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { clearAuthSession } from "../services/authSession.js";
import { localizedLoginPath } from "../i18n/localeRouting.js";
import "./portal.css";

import { PortalContext as Context } from "./portalStore.js";
import { portalRequest, validateSnapshot } from "../services/portalApi.js";
import { useScheduleReminders } from "./useScheduleReminders.js";
import {
  LAYOUT_SECTIONS,
  mergeSnapshot,
  sectionsForChange,
} from "./portalSections.js";
import { SECTION_LOADERS, loadBase } from "./portalLoaders.js";
export function PortalProvider({ children }) {
  const realtimeStatus = useUpdatesConnection();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  // Mỗi màn đăng ký phần snapshot nó hiển thị; chỉ các phần đang được dùng mới được tải/tải lại.
  const consumers = useRef(new Map(LAYOUT_SECTIONS.map((section) => [section, 1])));
  const revision = useRef(0);
  const sectionRevision = useRef(new Map());
  const baseRevision = useRef(0);
  const dataRef = useRef(null);
  dataRef.current = data;
  useScheduleReminders(data);
  const activeSections = () => [...consumers.current.keys()];
  // Mỗi phần gọi route GET riêng (CRUD theo phạm vi giáo viên hoặc route portal tương ứng).
  const fetchSections = useCallback(
    async (sections, { signal, base: withBase = false } = {}) => {
      const list = [...new Set(sections)].sort();
      const request = ++revision.current;
      list.forEach((section) => sectionRevision.current.set(section, request));
      const loadingBase = withBase || !dataRef.current;
      try {
        const [baseData, ...parts] = await Promise.all([
          loadingBase ? loadBase(signal) : null,
          ...list.map((section) => SECTION_LOADERS[section](signal)),
        ]);
        const next = {
          profile: baseData?.profile ?? dataRef.current?.profile,
          classes: baseData?.classes ?? dataRef.current?.classes,
          files: parts.flatMap((part) => part.files ?? []),
        };
        for (const part of parts)
          for (const [key, value] of Object.entries(part))
            if (key !== "files") next[key] = value;
        validateSnapshot(next, list);
        // Bỏ phần đã có yêu cầu mới hơn đang chạy để phản hồi cũ không đè dữ liệu mới.
        const fresh = list.filter(
          (section) => sectionRevision.current.get(section) === request,
        );
        const base = loadingBase && request > baseRevision.current;
        if (base) baseRevision.current = request;
        setData((current) => mergeSnapshot(current, next, fresh, { base }));
        setError("");
      } catch (e) {
        if (!signal?.aborted) {
          const message = e.response?.data?.message ?? e.message;
          setError(Array.isArray(message) ? message.join("; ") : message);
        }
        throw e;
      }
    },
    [],
  );
  const reload = useCallback(
    (signal) => fetchSections(activeSections(), { signal, base: true }),
    [fetchSections],
  );
  const register = useCallback(
    (sections) => {
      const added = [];
      for (const section of sections) {
        const count = consumers.current.get(section) ?? 0;
        if (!count) added.push(section);
        consumers.current.set(section, count + 1);
      }
      // Mở màn: tải (hoặc làm mới) phần màn đó cần, không tải lại phần layout.
      if (added.length) fetchSections(added).catch(() => {});
      return () => {
        for (const section of sections) {
          const count = (consumers.current.get(section) ?? 1) - 1;
          if (count > 0) consumers.current.set(section, count);
          else consumers.current.delete(section);
        }
      };
    },
    [fetchSections],
  );
  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [reload]);
  useResourceUpdates(
    (change) => {
      const { sections, base } = sectionsForChange(change, activeSections());
      return sections.length || base
        ? fetchSections(sections, { base }).catch(() => {})
        : undefined;
    },
    PORTAL_RESOURCES,
    !busy,
  );
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
    <Context.Provider
      value={{
        data,
        act,
        busy,
        download,
        reload,
        register,
        setError,
        realtimeStatus,
      }}
    >
      <div className="portal-status" aria-live="polite">
        <p className={`portal-realtime is-${realtimeStatus}`}>
          {realtimeStatus === "live"
            ? "Đang đồng bộ trực tiếp"
            : realtimeStatus === "connecting"
              ? "Đang kết nối đồng bộ…"
              : "Đang kết nối lại · Tạm cập nhật mỗi 30 giây"}
        </p>
        {error && (
          <div role="alert" className="portal-error">
            {error}{" "}
            <button onClick={() => reload().catch(() => {})}>Thử lại</button>
            <button
              onClick={() => {
                clearAuthSession();
                window.location.assign(localizedLoginPath());
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

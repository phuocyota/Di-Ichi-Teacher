import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const WINDOW_MS = 15 * 60 * 1000;
export function dueTeacherSchedules(data, now = Date.now()) {
  if (data?.profile?.userType !== "TEACHER") return [];
  return (data.schedules || []).filter((s) => {
    const start = Date.parse(s.startAt);
    return (
      s.teacherId === data.profile.id &&
      !s.cancelledAt &&
      ["active", "upcoming", "makeup"].includes(s.status?.toLowerCase()) &&
      start > now &&
      start - now <= WINDOW_MS
    );
  });
}

/** UI-only reminders: no notification mutation or background delivery. */
export function useScheduleReminders(data) {
  const navigate = useNavigate();
  const seen = useRef(new Set());
  useEffect(() => {
    if (data?.profile?.userType !== "TEACHER") return;
    const storageKey =
      "teacher-schedule-reminders:" + (data.profile.userId || data.profile.id);
    let saved = [];
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(value))
        saved = value.filter((item) => typeof item === "string").slice(-200);
    } catch {
      /* Reminders still work if storage is unavailable. */
    }
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      for (const schedule of dueTeacherSchedules(data)) {
        const key = schedule.id + ":" + schedule.startAt;
        const accountKey = storageKey + ":" + key;
        if (seen.current.has(accountKey) || saved.includes(key)) continue;
        seen.current.add(accountKey);
        saved = [...saved, key].slice(-200);
        try {
          localStorage.setItem(storageKey, JSON.stringify(saved));
        } catch {
          /* Use in-memory deduplication. */
        }
        const className =
          data.classes?.find((c) => c.id === schedule.classId)?.name ||
          "Lớp học";
        const time = new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Bangkok",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(schedule.startAt));
        toast.info("Sắp đến giờ dạy: " + className, {
          id: accountKey,
          description: `Buổi học bắt đầu lúc ${time}. Còn khoảng ${Math.ceil((Date.parse(schedule.startAt) - Date.now()) / 60000)} phút, vui lòng chuẩn bị vào lớp.`,
          duration: 15000,
          action: {
            label: "Xem lịch dạy",
            onClick: () => navigate("/lich-giang-day"),
          },
        });
      }
    };
    tick();
    const timer = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [data, navigate]);
}

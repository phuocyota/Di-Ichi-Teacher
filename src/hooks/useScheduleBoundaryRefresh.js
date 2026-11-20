import { useEffect, useRef, useState } from "react";
import { useRealtimeStatus } from "../services/realtime.js";

const MAX_DELAY = 2147483647;

/**
 * Tải lại danh sách đúng lúc một buổi học tới giờ mở hoặc đóng, thay cho polling định kỳ.
 * Thay đổi dữ liệu đến qua socket; chỉ polling dự phòng khi kênh /updates không "live".
 */
export function useScheduleBoundaryRefresh(items, refresh, fallbackMs = 30000) {
  const latest = useRef(refresh);
  const [tick, setTick] = useState(0);
  const status = useRealtimeStatus();
  useEffect(() => {
    latest.current = refresh;
  });
  const key = (items || [])
    .flatMap((item) => [
      item.joinAvailableAt ?? item.startAt,
      item.joinClosesAt ?? item.endAt,
    ])
    .filter(Boolean)
    .join(",");
  useEffect(() => {
    const now = Date.now();
    const next = key
      .split(",")
      .map((value) => Date.parse(value))
      .filter((time) => Number.isFinite(time) && time > now)
      .sort((a, b) => a - b)[0];
    if (next === undefined) return undefined;
    // Trễ thêm 1 giây để giờ server chắc chắn đã qua mốc.
    const timer = setTimeout(() => {
      latest.current();
      setTick((value) => value + 1);
    }, Math.min(next - now + 1000, MAX_DELAY));
    return () => clearTimeout(timer);
  }, [key, tick]);
  useEffect(() => {
    if (status === "live") return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) latest.current();
    }, fallbackMs);
    return () => clearInterval(timer);
  }, [status, fallbackMs]);
  return status;
}

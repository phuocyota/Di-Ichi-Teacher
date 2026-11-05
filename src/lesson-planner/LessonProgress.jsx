import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "../routes/localizedRouter.jsx";
import { portalRequest } from "../services/portalApi.js";
import { useLessonProgressSocket } from "../hooks/useLessonProgressSocket.js";
import "./lesson-plan-list.css";

export default function LessonProgress() {
  const { planId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((v) => v + 1), []);
  const realtimeStatus = useLessonProgressSocket(planId, refresh);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    portalRequest(`/lesson-plans/${encodeURIComponent(planId)}/progress`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!Array.isArray(result?.items))
          throw new Error("Dữ liệu tiến độ không hợp lệ");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [planId, reload]);
  useEffect(() => {
    const refreshVisible = () => {
      if (!document.hidden) refresh();
    };
    const timer =
      realtimeStatus !== "live" && realtimeStatus !== "forbidden"
        ? setInterval(refreshVisible, 15000)
        : undefined;
    window.addEventListener("focus", refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
    };
  }, [realtimeStatus, refresh]);
  return (
    <section className="lesson-plan-list">
      <header className="lpl-header">
        <div>
          <h1>Tiến độ học sinh</h1>
          <p>{data?.title || "Giáo án đã chia sẻ"}</p>
        </div>
        <Link to="/giao-an">← Giáo án của tôi</Link>
        <button disabled={loading} onClick={() => setReload((v) => v + 1)}>
          Tải lại
        </button>
      </header>
      <p role="status">
        {realtimeStatus === "live"
          ? "Realtime đang kết nối · Tiến độ cập nhật ngay khi học sinh gửi đáp án."
          : realtimeStatus === "forbidden"
            ? "Không thể đăng ký realtime. Kiểm tra quyền truy cập giáo án hoặc đăng nhập lại."
            : realtimeStatus === "connecting"
              ? "Đang kết nối realtime…"
              : "Đang kết nối lại realtime · Tạm đồng bộ mỗi 15 giây."}
      </p>
      <p>
        Ghi nhận khi học sinh bấm Kiểm tra đáp án, ghép cặp, thứ tự hoặc phân
        nhóm. Mỗi cặp/thẻ tính một câu; mỗi bài sắp xếp tính một câu. Vòng quay,
        mở hộp và lật thẻ không tính vào số câu tự chấm.
      </p>
      <p>
        Kết quả lần làm lại thay thế lần trước. Khi giáo án được lưu thành bản
        mới, tiến độ được tính lại cho bản mới.
      </p>
      {loading && <p role="status">Đang tải tiến độ…</p>}
      {error && (
        <p role="alert" className="lpl-error">
          Không tải được tiến độ: {error}
        </p>
      )}
      {!error && data && (
        <div className="lpl-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã học sinh</th>
                <th>Học sinh</th>
                <th>Đã làm / Tổng câu</th>
                <th>Đúng</th>
                <th>Sai</th>
                <th>Trạng thái</th>
                <th>Lần làm gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>
                    {row.answered}/{row.total}
                  </td>
                  <td>{row.correct}</td>
                  <td>{row.incorrect}</td>
                  <td>
                    {!row.total
                      ? "Không có câu tự chấm"
                      : !row.answered
                        ? "Chưa làm"
                        : row.answered === row.total
                          ? "Đã làm hết"
                          : "Đang làm"}
                  </td>
                  <td>
                    {row.lastSubmittedAt
                      ? new Date(row.lastSubmittedAt).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && <p>Lớp chưa có học sinh ghi danh hiện tại.</p>}
        </div>
      )}
    </section>
  );
}

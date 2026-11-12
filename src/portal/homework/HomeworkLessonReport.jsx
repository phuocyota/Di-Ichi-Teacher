import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link, useParams } from "../../routes/localizedRouter.jsx";
import { portalRequest } from "../../services/portalApi.js";
import { useResourceUpdates } from "../../services/realtime.js";
import "./homework-report.css";
const labels = {
  unseen: "Chưa xem",
  viewed: "Đã xem, chưa làm",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  correct: "Đúng",
  incorrect: "Sai",
  unanswered: "Chưa trả lời",
};
const colors = {
  unseen: "#94a3b8",
  viewed: "#eab308",
  in_progress: "#3b82f6",
  completed: "#16a34a",
  correct: "#16a34a",
  incorrect: "#dc2626",
  unanswered: "#94a3b8",
};
const date = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
function Breakdown({ title, groups, total }) {
  return (
    <section className="portal-card">
      <h2>{title}</h2>
      {total ? (
        <>
          <div className="homework-report-chart" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={groups.map((g) => ({ ...g, label: labels[g.key] }))}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={80}
                >
                  {groups.map((g) => (
                    <Cell key={g.key} fill={colors[g.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul>
            {groups.map((g) => (
              <li key={g.key}>
                <span
                  className="homework-report-dot"
                  style={{ background: colors[g.key] }}
                />
                <span>{labels[g.key]}</span>
                <strong>
                  {g.count} · {g.percent}%
                </strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Chưa có học viên</p>
      )}
    </section>
  );
}
export default function HomeworkLessonReport() {
  const { homeworkId } = useParams();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true);
  useResourceUpdates(
    () => setRevision((r) => r + 1),
    ["portal", "homework", "enrollment"],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    portalRequest(`/homework/${encodeURIComponent(homeworkId)}/lesson/report`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (
          !Array.isArray(result?.items) ||
          !Array.isArray(result?.readiness) ||
          !Array.isArray(result?.results)
        )
          throw new Error("Dữ liệu báo cáo không hợp lệ");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [homeworkId, revision]);
  return (
    <section className="portal homework-lesson-report">
      <header className="portal-toolbar">
        <div>
          <h1>Đánh giá trước buổi học</h1>
          <p data-i18n-skip>{data?.title}</p>
        </div>
        <Link to="/ngan-hang-bai-tap">← Bài tập</Link>
        <button disabled={loading} onClick={() => setRevision((r) => r + 1)}>
          Tải lại
        </button>
      </header>
      {loading && <p role="status">Đang tải báo cáo…</p>}
      {error && <p role="alert">{error}</p>}
      {!error && data && (
        <>
          <p>
            Thống kê tính tới: <time>{date(data.asOf)}</time>
          </p>
          <p>
            Mốc trước buổi học / hạn chuẩn bị (lưu lúc giao):{" "}
            <time>{date(data.cutoffAt)}</time>
          </p>
          <p>
            Phần trăm chuẩn bị tính trên danh sách học viên tại lúc giao bài. Đã
            xem chỉ xác nhận học viên mở bài.
          </p>
          <div className="portal-grid">
            <Breakdown
              title="Tỷ lệ chuẩn bị bài"
              groups={data.readiness}
              total={data.totalStudents}
            />
            <Breakdown
              title="Kết quả tự chấm"
              groups={data.results}
              total={data.totalQuestions}
            />
          </div>
          <p>
            Điểm trung bình trên học viên đã làm:{" "}
            <strong>{data.averageScore ?? "—"}</strong> /100 ·{" "}
            <span>
              {data.scoredStudents}/{data.totalStudents}
            </span>
          </p>
          <p>
            Kết quả đúng, sai và chưa trả lời tính trên tổng số câu của tất cả
            học viên được giao bài; học viên chưa làm không được tính là làm
            sai.
          </p>
          <p>
            Điểm tạm tính khi chưa làm hết bài; điểm = số câu đúng / tổng câu ×
            100.
          </p>
          <div className="portal-table">
            <table>
              <thead>
                <tr>
                  {[
                    "Mã học viên",
                    "Học viên",
                    "Trạng thái chuẩn bị",
                    "Lần xem đầu",
                    "Đã làm / Tổng câu",
                    "Đúng",
                    "Sai",
                    "Điểm tự chấm",
                    "Lần trả lời gần nhất",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.studentId}>
                    <td data-i18n-skip>{row.code}</td>
                    <td data-i18n-skip>{row.name}</td>
                    <td>{labels[row.state]}</td>
                    <td>{date(row.firstViewedAt)}</td>
                    <td>
                      {row.answered}/{row.total}
                    </td>
                    <td>{row.correct}</td>
                    <td>{row.incorrect}</td>
                    <td>
                      {row.score ?? "—"}
                      {row.score != null && row.answered < row.total && (
                        <span> · Tạm tính</span>
                      )}
                    </td>
                    <td>{date(row.lastAnsweredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.items.length && <p>Chưa có học viên</p>}
        </>
      )}
    </section>
  );
}

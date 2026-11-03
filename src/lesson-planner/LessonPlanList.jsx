import { useResourceUpdates } from '../services/realtime.js';
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { portalRequest } from "../services/portalApi.js";
import "./lesson-plan-list.css";

const dateLabel = (raw) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", {
        timeZone: "Asia/Bangkok",
        dateStyle: "short",
        timeStyle: "short",
      });
};
const editorPath = (plan) =>
  (plan.editorMode === "elearning"
    ? "/soan-elearning/"
    : plan.editorMode === "activity"
      ? "/tao-hoat-dong/"
      : "/soan-giao-an/") + plan.id;
export default function LessonPlanList() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [classId, setClassId] = useState(""),
    [sort, setSort] = useState("updated");
  const [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useResourceUpdates(() => setRetry(v => v + 1), ['portal','class-staff','class','workspace'], !busy && !deleting);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    portalRequest("/lesson-plans", { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.items) || !Array.isArray(result.classes))
          throw new Error("Danh sách giáo án không hợp lệ");
        setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    const result = (data?.items || []).filter(
      (p) =>
        (!status || p.status === status) &&
        (!classId ||
          (classId === "unassigned" ? !p.classId : p.classId === classId)) &&
        (!term ||
          [
            p.title,
            p.subject,
            p.grade,
            data.classes.find((c) => c.id === p.classId)?.name,
          ].some((v) =>
            String(v || "")
              .toLocaleLowerCase("vi")
              .includes(term),
          )),
    );
    return result.sort((a, b) =>
      sort === "title"
        ? String(a.title).localeCompare(String(b.title), "vi")
        : (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) ||
          String(a.id).localeCompare(String(b.id)),
    );
  }, [data, search, status, classId, sort]);
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await portalRequest("/lesson-plans/" + deleting.id, {
        method: "DELETE",
      });
      if (result?.deleted !== true)
        throw new Error("Máy chủ chưa xác nhận giáo án đã được xóa");
      setData((prev) => ({
        ...prev,
        items: prev.items.filter((p) => p.id !== deleting.id),
      }));
      setDeleting(null);
      setNotice("Đã xóa giáo án");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="lesson-plan-list">
      <header className="lpl-header">
        <div>
          <p className="lpl-eyebrow">KHÔNG GIAN GIÁO VIÊN</p>
          <h1>Giáo án của tôi</h1>
          <p>
            Quản lý bản nháp và tiếp tục chuẩn bị cho những tiết học sắp tới.
          </p>
        </div>
        <div className="lpl-create-actions">
          <Link to="/soan-elearning">Tạo bài e-learning</Link>
          <Link className="lpl-primary" to="/soan-giao-an">
            + Soạn giáo án mới
          </Link>
        </div>
      </header>
      {notice && (
        <p role="status" className="lpl-notice">
          {notice}
        </p>
      )}
      {loading ? (
        <div className="lpl-empty" role="status">
          Đang tải danh sách giáo án…
        </div>
      ) : error && !data ? (
        <div role="alert" className="lpl-error">
          {error}
          <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
        </div>
      ) : (
        data && (
          <>
            <div className="lpl-stats">
              <div>
                <span>Tổng giáo án</span>
                <strong>{data.items.length}</strong>
              </div>
              <div>
                <span>Bản nháp</span>
                <strong>
                  {data.items.filter((p) => p.status === "draft").length}
                </strong>
              </div>
              <div>
                <span>Sẵn sàng</span>
                <strong>
                  {data.items.filter((p) => p.status === "ready").length}
                </strong>
              </div>
            </div>
            <div className="lpl-filters">
              <label>
                Tìm giáo án
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tên giáo án, môn học, lớp…"
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="ready">Sẵn sàng</option>
                </select>
              </label>
              <label>
                Lớp học
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Tất cả lớp</option>
                  <option value="unassigned">Chưa chọn lớp</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sắp xếp
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="updated">Cập nhật gần nhất</option>
                  <option value="title">Tên giáo án A–Z</option>
                </select>
              </label>
              <button onClick={() => setRetry((v) => v + 1)} disabled={busy}>
                Làm mới
              </button>
            </div>
            {error && !deleting && (
              <p role="alert" className="lpl-error">
                {error}
              </p>
            )}
            <div className="lpl-result-heading">
              <span>
                {items.length} giáo án
                {items.length !== data.items.length
                  ? " / " + data.items.length
                  : ""}
              </span>
            </div>
            {!items.length ? (
              <div className="lpl-empty">
                <span aria-hidden="true">▤</span>
                <h2>
                  {data.items.length
                    ? "Không tìm thấy giáo án phù hợp"
                    : "Chưa có giáo án đã lưu"}
                </h2>
                <p>
                  {data.items.length
                    ? "Thử đổi từ khóa hoặc bộ lọc."
                    : "Bắt đầu soạn và lưu nháp. Bạn có thể chọn lớp sau."}
                </p>
                {!data.items.length && (
                  <Link to="/soan-giao-an">Soạn giáo án đầu tiên →</Link>
                )}
              </div>
            ) : (
              <div className="lpl-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Giáo án</th>
                      <th>Lớp học</th>
                      <th>Trạng thái</th>
                      <th>Nội dung</th>
                      <th>Cập nhật</th>
                      <th>
                        <span className="lpl-sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link className="lpl-title" to={editorPath(p)}>
                            {p.title}
                          </Link>
                          <small>
                            {[p.subject, p.grade && "Khối " + p.grade]
                              .filter(Boolean)
                              .join(" · ") || "Chưa chọn môn học"}
                          </small>
                        </td>
                        <td>
                          {p.classId ? (
                            data.classes.find((c) => c.id === p.classId)
                              ?.name || "Lớp học"
                          ) : (
                            <span className="lpl-muted">Chưa chọn lớp</span>
                          )}
                        </td>
                        <td>
                          <span className={"lpl-badge lpl-" + p.status}>
                            {p.status === "ready" ? "Sẵn sàng" : "Bản nháp"}
                          </span>
                        </td>
                        <td>
                          <span>
                            {Number.isInteger(p.blockCount)
                              ? p.blockCount + " khối"
                              : "—"}
                          </span>
                          <small>
                            {Number.isFinite(p.duration)
                              ? p.duration + " phút"
                              : ""}
                          </small>
                        </td>
                        <td>
                          <time dateTime={p.updatedAt}>
                            {dateLabel(p.updatedAt)}
                          </time>
                        </td>
                        <td>
                          <div className="lpl-row-actions">
                            {p.classId && p.editorMode !== 'elearning' && <Link to={`/giao-an/${p.id}/tien-do`}>Tiến độ học sinh</Link>}
                            <Link
                              aria-label={"Mở giáo án " + p.title}
                              to={editorPath(p)}
                            >
                              Mở soạn
                            </Link>
                            <button
                              className="lpl-danger"
                              disabled={busy}
                              aria-label={"Xóa giáo án " + p.title}
                              onClick={() => {
                                setError("");
                                setDeleting(p);
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
      {deleting && (
        <div className="lpl-overlay">
          <section
            className="lpl-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label="Xóa giáo án"
          >
            <h2>Xóa “{deleting.title}”?</h2>
            <p>
              Giáo án sẽ bị xóa khỏi tài khoản của bạn. Thao tác này không thể
              hoàn tác.
            </p>
            {deleting.editorMode === "elearning" && (
              <p>
                Bài e-learning đã giao từ bản soạn này cũng sẽ được thu hồi khỏi
                lớp.
              </p>
            )}
            {error && (
              <p role="alert" className="lpl-error">
                {error}
              </p>
            )}
            <div>
              <button
                disabled={busy}
                onClick={() => {
                  setDeleting(null);
                  setError("");
                }}
              >
                Hủy
              </button>
              <button className="lpl-danger" disabled={busy} onClick={remove}>
                {busy ? "Đang xóa…" : "Xác nhận xóa"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

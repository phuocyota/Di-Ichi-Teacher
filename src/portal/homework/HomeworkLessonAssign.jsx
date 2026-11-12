import React, { useState } from "react";
import { portalRequest } from "../../services/portalApi.js";
import { usePortal } from "../portalStore.js";
export default function HomeworkLessonAssign() {
  const { data, act, busy } = usePortal();
  const [plans, setPlans] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    classId: "",
    lessonPlanId: "",
    scheduleId: "",
    deadline: "",
  });
  async function show() {
    setLoading(true);
    setError("");
    try {
      const result = await portalRequest("/lesson-plans");
      if (!Array.isArray(result?.items))
        throw new Error("Danh sách giáo án không hợp lệ");
      setPlans(result.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const saved = await act("/homework/lesson-plans", {
      method: "POST",
      body: {
        classId: form.classId,
        lessonPlanId: form.lessonPlanId,
        deadline: new Date(form.deadline).toISOString(),
        ...(form.scheduleId ? { scheduleId: form.scheduleId } : {}),
      },
    });
    if (saved) setPlans(null);
  }
  return (
    <section className="portal-card">
      <h2>Bài tập về nhà từ giáo án</h2>
      <p>
        Chọn giáo án của bạn để học viên làm trực tiếp và được chấm tự động.
      </p>
      <button disabled={busy || loading} onClick={show}>
        {loading ? "Đang tải giáo án…" : "Chọn giáo án giao về nhà"}
      </button>
      {error && <p role="alert">{error}</p>}
      {plans && (
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <label>
              Giáo án làm bài tập
              <select
                required
                value={form.lessonPlanId}
                onChange={(e) =>
                  setForm({ ...form, lessonPlanId: e.target.value })
                }
              >
                <option value="">Chọn giáo án</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            {!plans.length && (
              <p>
                Chưa có giáo án phù hợp. Soạn giáo án có câu tự chấm trước khi
                giao.
              </p>
            )}
            <label>
              Lớp nhận bài
              <select
                required
                value={form.classId}
                onChange={(e) =>
                  setForm({ ...form, classId: e.target.value, scheduleId: "" })
                }
              >
                <option value="">Chọn lớp</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buổi học chuẩn bị bài
              <select
                value={form.scheduleId}
                onChange={(e) =>
                  setForm({ ...form, scheduleId: e.target.value })
                }
              >
                <option value="">
                  Không gắn buổi học — thống kê tới hạn nộp
                </option>
                {data.schedules
                  .filter(
                    (s) =>
                      s.classId === form.classId &&
                      s.status !== "cancelled" &&
                      Date.parse(s.startAt) > Date.now(),
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.startAt).toLocaleString("vi-VN")}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Hạn chuẩn bị bài
              <input
                required
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
            <p>
              Đề bài được giữ theo bản giáo án lúc giao. Mỗi lần giao có kết quả
              riêng.
            </p>
            <div className="portal-actions">
              <button className="primary" disabled={busy || !plans.length}>
                Giao giáo án về nhà
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPlans(null)}
              >
                Hủy
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}

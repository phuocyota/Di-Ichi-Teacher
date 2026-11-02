import React, { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { portalRequest } from "../services/portalApi.js";
import {
  BLOCKS,
  createBlock,
  lessonTemplate,
  moveBlock,
  newPlan,
} from "./blocks.js";
import BlockPlayer from "./BlockPlayer.jsx";
import BlockFields from "./BlockFields.jsx";
import LessonAppearance, { LessonScene } from "./LessonAppearance.jsx";
import { normalizeAppearance, validatedImageBlob } from "./appearance.js";
import {
  ACTIVITY_TEMPLATES,
  createActivityTemplate,
} from "./activityTemplates.js";
import "./lesson-planner.css";

export default function LessonPlanner() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]),
    [saved, setSaved] = useState([]),
    [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false),
    [mode, setMode] = useState("edit"),
    [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState(null),
    [retry, setRetry] = useState(0);
  const [dragging, setDragging] = useState(false),
    [active, setActive] = useState(null),
    [playSession, setPlaySession] = useState(0);
  const [collapsed, setCollapsed] = useState({});
  const [motionPaused, setMotionPaused] = useState(false);
  const lock = useRef(false);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPlan(null);
    Promise.all([
      portalRequest("/lesson-plans", { signal: controller.signal }),
      planId
        ? portalRequest("/lesson-plans/" + planId, {
            signal: controller.signal,
          })
        : Promise.resolve(null),
    ])
      .then(([data, detail]) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.items) || !Array.isArray(data.classes))
          throw new Error("Dữ liệu giáo án không hợp lệ");
        if (planId && (!detail?.id || !Array.isArray(detail.blocks)))
          throw new Error("Nội dung giáo án không hợp lệ");
        setSaved(data.items);
        setClasses(data.classes);
        setPlan(
          detail
            ? {
                ...detail,
                classId: detail.classId || "",
                appearance: normalizeAppearance(detail.appearance),
              }
            : newPlan(data.classes[0]?.id),
        );
        setDirty(false);
        setCollapsed({});
        setMode("edit");
        setActive(null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry, planId]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = (change) => {
    if (lock.current) return;
    setPlan((p) => ({ ...p, ...change }));
    setDirty(true);
    setNotice("");
    setError("");
  };
  const updateBlocks = (blocks) => update({ blocks });
  const add = (type, index = plan.blocks.length) => {
    if (plan.blocks.length >= 100) {
      setError("Mỗi giáo án tối đa 100 khối");
      return;
    }
    const b = createBlock(type),
      next = [...plan.blocks];
    next.splice(index, 0, b);
    updateBlocks(next);
    setActive(b.id);
  };
  const drop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (lock.current) return;
    try {
      const data = JSON.parse(
        e.dataTransfer.getData("application/x-lesson-block"),
      );
      if (data.kind === "new" && BLOCKS[data.type]) add(data.type, index);
      else if (
        data.kind === "template" &&
        ACTIVITY_TEMPLATES.some((t) => t.id === data.id)
      )
        insertTemplate(data.id, index);
      else if (data.kind === "move")
        updateBlocks(moveBlock(plan.blocks, data.id, index));
    } catch {
      /* Ignore unrelated drag data. */
    }
  };
  const drag = (e, data) => {
    e.dataTransfer.setData("application/x-lesson-block", JSON.stringify(data));
    e.dataTransfer.effectAllowed = data.kind === "move" ? "move" : "copy";
    setDragging(true);
  };
  const insertTemplate = (id, index = plan.blocks.length) => {
    if (lock.current) return;
    const blocks = createActivityTemplate(id);
    if (plan.blocks.length + blocks.length > 100) {
      setError("Mỗi giáo án tối đa 100 khối");
      return;
    }
    const next = [...plan.blocks];
    next.splice(index, 0, ...blocks);
    updateBlocks(next);
    setActive(blocks[0].id);
    setNotice(
      "Đã thêm mẫu " +
        ACTIVITY_TEMPLATES.find((t) => t.id === id).english +
        ". Sửa nội dung cho phù hợp bài dạy rồi lưu giáo án.",
    );
  };
  const guard = (action) => {
    if (lock.current) return;
    if (dirty)
      setConfirm({
        title: "Giáo án có thay đổi chưa lưu. Bỏ thay đổi và tiếp tục?",
        action,
      });
    else action();
  };
  const doWork = async (work) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const open = (id) => {
    if (!lock.current) navigate("/soan-giao-an/" + id);
  };
  const save = (status = plan.status) =>
    doWork(async () => {
      if (status === "ready" && (!plan.title.trim() || !plan.classId))
        throw new Error(
          "Nhập tên giáo án và chọn lớp trước khi đánh dấu sẵn sàng",
        );
      const payload = Object.fromEntries(
        Object.keys(newPlan()).map((k) => [k, plan[k]]),
      );
      payload.classId = plan.classId || null;
      payload.status = status;
      const data = await portalRequest(
        "/lesson-plans" + (plan.id ? "/" + plan.id : ""),
        { method: plan.id ? "PUT" : "POST", body: payload },
      );
      if (!data.id || !Array.isArray(data.blocks))
        throw new Error("Máy chủ chưa xác nhận giáo án đã lưu");
      setPlan({
        ...data,
        classId: data.classId || "",
        appearance: normalizeAppearance(data.appearance),
      });
      setDirty(false);
      setNotice("Đã lưu giáo án vào tài khoản của bạn");
      setSaved((prev) => [
        {
          id: data.id,
          title: data.title,
          classId: data.classId,
          status: data.status,
          subject: data.subject,
          updatedAt: data.updatedAt,
        },
        ...prev.filter((p) => p.id !== data.id),
      ]);
    });
  const uploadBackground = (file) =>
    doWork(async () => {
      const blob = await validatedImageBlob(file);
      const body = new FormData();
      body.append("file", new File([blob], file.name, { type: blob.type }));
      setDirty(true);
      const uploaded = await portalRequest("/files", { method: "POST", body });
      if (!uploaded?.id)
        throw new Error("Máy chủ chưa xác nhận ảnh nền đã tải lên");
      setPlan((prev) => ({
        ...prev,
        appearance: {
          ...normalizeAppearance(prev.appearance),
          background: "image",
          backgroundFileId: uploaded.id,
          backgroundImage: "",
        },
      }));
      setNotice(
        "Đã tải ảnh nền. Bấm Lưu nháp hoặc Lưu giáo án để lưu giao diện này.",
      );
    });
  const fresh = () => {
    if (planId) {
      if (!lock.current) navigate("/soan-giao-an");
      return;
    }
    guard(() => {
      setPlan(newPlan(classes[0]?.id));
      setDirty(false);
      setMode("edit");
      setError("");
      setNotice("");
      setActive(null);
    });
  };
  const total = plan?.blocks.reduce((sum, b) => sum + b.minutes, 0) || 0;
  if (loading)
    return (
      <div className="lesson-planner lp-loading" role="status">
        Đang tải không gian soạn giáo án…
      </div>
    );
  if (!plan)
    return (
      <div className="lesson-planner">
        <div role="alert" className="lp-error">
          {error || "Chưa tải được giáo án"}{" "}
          <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
        </div>
      </div>
    );
  return (
    <section
      className={"lesson-planner " + (mode === "present" ? "lp-present" : "")}
      aria-busy={busy}
    >
      <header className="lp-top">
        <div>
          <p className="lp-eyebrow">XƯỞNG GIÁO ÁN</p>
          <h1>Soạn giáo án tương tác</h1>
          <p>Kéo thả các khối nội dung và tạo bài tập cho tiết học.</p>
        </div>
        <button className="lp-button" disabled={busy} onClick={fresh}>
          + Giáo án mới
        </button>
      </header>
      <div className="lp-actionbar">
        <div className="lp-mode" role="group" aria-label="Chế độ giáo án">
          {[
            ["edit", "Soạn giáo án"],
            ["preview", "Chơi thử"],
            ["present", "Trình chiếu"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setPlaySession((v) => v + 1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="lp-save-actions">
          {mode !== "edit" &&
            (plan.appearance?.decorations ||
              (plan.appearance?.mascot &&
                plan.appearance.mascot !== "none" &&
                plan.appearance.mascotMotion !== "none") ||
              (plan.appearance?.animation &&
                plan.appearance.animation !== "none")) && (
              <button
                aria-pressed={motionPaused}
                onClick={() => setMotionPaused((v) => !v)}
              >
                {motionPaused ? "Bật hiệu ứng" : "Tạm dừng hiệu ứng"}
              </button>
            )}
          <Link className="lp-back-list" to="/giao-an">
            Danh sách giáo án
          </Link>
          <span className={dirty ? "lp-unsaved" : "lp-muted"}>
            {dirty
              ? "● Có thay đổi chưa lưu"
              : plan.id
                ? "✓ Đã lưu"
                : "Giáo án mới"}
          </span>
          <button disabled={busy} onClick={() => window.print()}>
            In / lưu PDF
          </button>
          <button disabled={busy} onClick={() => save("draft")}>
            Lưu nháp
          </button>
          <button className="lp-primary" disabled={busy} onClick={() => save()}>
            {busy ? "Đang xử lý…" : "Lưu giáo án"}
          </button>
        </div>
      </div>
      {error && (
        <div className="lp-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="lp-notice" role="status">
          {notice}
        </div>
      )}
      {!classes.length && (
        <p className="lp-notice">
          Bạn chưa được phân công lớp. Bạn vẫn có thể lưu nháp vào tài khoản và
          chọn lớp sau.
        </p>
      )}
      <div className="lp-workspace">
        <aside className="lp-sidebar">
          <section className="lp-activity-templates">
            <h2>Mẫu hoạt động</h2>
            <p className="lp-muted">
              Có sẵn nội dung minh họa. Bấm hoặc kéo mẫu vào giáo án rồi chỉnh
              sửa.
            </p>
            <div>
              {ACTIVITY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  disabled={busy || mode !== "edit"}
                  draggable
                  onDragStart={(e) => drag(e, { kind: "template", id: t.id })}
                  onDragEnd={() => setDragging(false)}
                  onClick={() => insertTemplate(t.id)}
                  aria-label={"Thêm mẫu " + t.english}
                >
                  <span className={"lp-tool-icon lp-tool-" + t.color}>
                    {t.icon}
                  </span>
                  <span>
                    <strong>{t.english}</strong>
                    <small>{t.name}</small>
                    <span className="lp-template-description">
                      {t.description}
                    </span>
                  </span>
                  <span aria-hidden="true">+</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>Hộp công cụ</h2>
            <p className="lp-muted">Kéo khối vào trang hoặc bấm để thêm.</p>
            <div className="lp-palette">
              {Object.entries(BLOCKS).map(([type, meta]) => (
                <button
                  key={type}
                  draggable
                  disabled={busy || mode !== "edit"}
                  onDragStart={(e) => drag(e, { kind: "new", type })}
                  onDragEnd={() => setDragging(false)}
                  onClick={() => add(type)}
                >
                  <span className={"lp-tool-icon lp-tool-" + type}>
                    {meta.icon}
                  </span>
                  <span>
                    <strong>{meta.label}</strong>
                    <small>{meta.hint}</small>
                  </span>
                  <span>+</span>
                </button>
              ))}
            </div>
            <button
              className="lp-template"
              disabled={busy || mode !== "edit"}
              onClick={() => {
                const blocks = lessonTemplate();
                if (plan.blocks.length + blocks.length > 100)
                  return setError("Mỗi giáo án tối đa 100 khối");
                update({ blocks: [...plan.blocks, ...blocks] });
              }}
            >
              + Thêm khung tiết học 45 phút
            </button>
            <p className="lp-hint">
              Khung có chỗ trống để giáo viên bổ sung, không tự viết nội dung
              chuyên môn.
            </p>
            <Link
              to="/thu-vien-bai-giang"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-library-link"
            >
              Mở thư viện bài giảng ↗
            </Link>
          </section>
          <section className="lp-saved">
            <h2>
              Giáo án của tôi <span>{saved.length}</span>
            </h2>
            <input
              aria-label="Tìm giáo án đã lưu"
              placeholder="Tìm giáo án…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {saved
              .filter((s) =>
                s.title
                  ?.toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((s) => (
                <button
                  key={s.id}
                  disabled={busy}
                  className={s.id === plan.id ? "lp-current" : ""}
                  onClick={() => open(s.id)}
                >
                  <strong>{s.title}</strong>
                  <small>
                    {s.status === "ready" ? "Sẵn sàng" : "Bản nháp"} ·{" "}
                    {classes.find((c) => c.id === s.classId)?.name ||
                      "Chưa chọn lớp"}
                  </small>
                </button>
              ))}
            {!saved.length && (
              <p className="lp-hint">Giáo án đã lưu sẽ xuất hiện tại đây.</p>
            )}
          </section>
        </aside>
        <div className="lp-main">
          {mode === "edit" ? (
            <>
              <section className="lp-settings">
                <div className="lp-settings-title">
                  <h2>Thông tin bài dạy</h2>
                  <span>
                    {plan.blocks.length} khối · {total}/{plan.duration} phút
                  </span>
                </div>
                <fieldset disabled={busy}>
                  <label>
                    Tên giáo án *
                    <input
                      maxLength={300}
                      value={plan.title}
                      placeholder="Ví dụ: Khám phá phân số"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                  </label>
                  <div className="lp-three">
                    <label>
                      Lớp học (không bắt buộc khi lưu nháp)
                      <select
                        value={plan.classId}
                        onChange={(e) => update({ classId: e.target.value })}
                      >
                        <option value="">Chọn lớp</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Môn học
                      <input
                        maxLength={200}
                        value={plan.subject}
                        onChange={(e) => update({ subject: e.target.value })}
                      />
                    </label>
                    <label>
                      Khối lớp
                      <input
                        maxLength={100}
                        value={plan.grade}
                        onChange={(e) => update({ grade: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="lp-three">
                    <label>
                      Thời lượng (phút)
                      <input
                        type="number"
                        min={5}
                        max={480}
                        value={plan.duration}
                        onChange={(e) =>
                          update({ duration: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Ngày dạy
                      <input
                        type="date"
                        value={plan.teachingDate}
                        onChange={(e) =>
                          update({ teachingDate: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Trạng thái
                      <select
                        value={plan.status}
                        onChange={(e) => update({ status: e.target.value })}
                      >
                        <option value="draft">Bản nháp</option>
                        <option value="ready">Sẵn sàng</option>
                      </select>
                    </label>
                  </div>
                </fieldset>
                {total > plan.duration && (
                  <p className="lp-bad">
                    Các khối đang vượt thời lượng bài dạy{" "}
                    {total - plan.duration} phút.
                  </p>
                )}
              </section>
              <LessonAppearance
                value={plan.appearance}
                disabled={busy}
                onChange={(appearance) => update({ appearance })}
                onUpload={uploadBackground}
              />
              <div
                className={"lp-canvas " + (dragging ? "lp-dragging" : "")}
                onDragEnd={() => setDragging(false)}
              >
                {!plan.blocks.length && (
                  <div
                    className="lp-empty"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => drop(e, 0)}
                  >
                    <span>＋</span>
                    <h2>Bắt đầu với một khối</h2>
                    <p>
                      Kéo nội dung, hình ảnh hoặc trò chơi từ hộp công cụ vào
                      đây.
                    </p>
                    <button onClick={() => add("text")}>
                      Thêm khối nội dung
                    </button>
                  </div>
                )}
                {plan.blocks.map((b, i) => (
                  <React.Fragment key={b.id}>
                    <div
                      className="lp-drop-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, i)}
                    >
                      <span>Thả khối vào đây</span>
                    </div>
                    <article
                      className={
                        "lp-block " +
                        (active === b.id ? "lp-block-active " : "") +
                        (collapsed[b.id] ? "lp-block-collapsed" : "")
                      }
                      onFocus={() => setActive(b.id)}
                    >
                      <header>
                        <div>
                          <button
                            className="lp-drag-handle"
                            draggable
                            aria-label={"Kéo khối " + (i + 1)}
                            onDragStart={(e) =>
                              drag(e, { kind: "move", id: b.id })
                            }
                            onDragEnd={() => setDragging(false)}
                          >
                            ⠿
                          </button>
                          <span className={"lp-tool-icon lp-tool-" + b.type}>
                            {BLOCKS[b.type]?.icon}
                          </span>
                          <div className="lp-block-identity">
                            <span className="lp-block-index">Khối {i + 1}</span>
                            <strong>{BLOCKS[b.type]?.label}</strong>
                            {collapsed[b.id] && (
                              <span
                                className="lp-block-summary"
                                title={b.title}
                              >
                                {b.title || "Chưa có tiêu đề"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="lp-block-actions">
                          <button
                            className="lp-collapse-toggle"
                            aria-label={
                              (collapsed[b.id]
                                ? "Mở rộng khối "
                                : "Thu gọn khối ") +
                              (i + 1)
                            }
                            title={
                              collapsed[b.id] ? "Mở rộng khối" : "Thu gọn khối"
                            }
                            aria-expanded={!collapsed[b.id]}
                            aria-controls={"lp-block-fields-" + b.id}
                            onClick={() =>
                              setCollapsed((prev) => ({
                                ...prev,
                                [b.id]: !prev[b.id],
                              }))
                            }
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="m6 15 6-6 6 6" />
                            </svg>
                            <span>
                              {collapsed[b.id] ? "Mở rộng" : "Thu gọn"}
                            </span>
                          </button>
                          <button
                            disabled={busy || i === 0}
                            aria-label={"Đưa khối " + (i + 1) + " lên"}
                            onClick={() =>
                              updateBlocks(moveBlock(plan.blocks, b.id, i - 1))
                            }
                          >
                            ↑
                          </button>
                          <button
                            disabled={busy || i === plan.blocks.length - 1}
                            aria-label={"Đưa khối " + (i + 1) + " xuống"}
                            onClick={() =>
                              updateBlocks(moveBlock(plan.blocks, b.id, i + 2))
                            }
                          >
                            ↓
                          </button>
                          <button
                            disabled={busy || plan.blocks.length >= 100}
                            aria-label={"Sao chép khối " + (i + 1)}
                            onClick={() => {
                              const next = [...plan.blocks];
                              next.splice(i + 1, 0, {
                                ...structuredClone(b),
                                id: crypto.randomUUID(),
                              });
                              updateBlocks(next);
                            }}
                          >
                            ⧉
                          </button>
                          <button
                            className="lp-danger"
                            disabled={busy}
                            aria-label={"Xóa khối " + (i + 1)}
                            onClick={() =>
                              setConfirm({
                                title: "Xóa khối này khỏi giáo án?",
                                action: () =>
                                  updateBlocks(
                                    plan.blocks.filter((v) => v.id !== b.id),
                                  ),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      </header>
                      <fieldset
                        id={"lp-block-fields-" + b.id}
                        hidden={Boolean(collapsed[b.id])}
                        disabled={busy}
                      >
                        <BlockFields
                          block={b}
                          change={(change) =>
                            updateBlocks(
                              plan.blocks.map((v) =>
                                v.id === b.id ? { ...v, ...change } : v,
                              ),
                            )
                          }
                        />
                      </fieldset>
                    </article>
                  </React.Fragment>
                ))}
                {plan.blocks.length > 0 && (
                  <div
                    className="lp-drop-zone lp-drop-last"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => drop(e, plan.blocks.length)}
                  >
                    <button onClick={() => add("text")}>
                      + Thêm khối nội dung
                    </button>
                    <span>Hoặc kéo khối vào đây</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <LessonScene appearance={plan.appearance} paused={motionPaused}>
              <div className="lp-play-area">
                <header>
                  <span className="lp-eyebrow">
                    {mode === "present" ? "TRÌNH CHIẾU" : "CHƠI THỬ BÀI HỌC"}
                  </span>
                  <h2>{plan.title || "Giáo án chưa đặt tên"}</h2>
                  <p>
                    {[
                      plan.subject,
                      plan.grade && "Khối " + plan.grade,
                      plan.duration + " phút",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="lp-hint">
                    Hoạt động chơi thử không ghi điểm học sinh. Bấm “Làm lại” để
                    khởi động lại từng bài.
                  </p>
                </header>
                {!plan.blocks.length && (
                  <div className="lp-empty">
                    Thêm các khối ở chế độ soạn giáo án để bắt đầu.
                  </div>
                )}
                {plan.blocks.map((b, i) => (
                  <div
                    className="lp-animated-block"
                    key={b.id + "-" + playSession}
                    style={{ "--lp-enter-delay": Math.min(i, 6) * 60 + "ms" }}
                  >
                    <BlockPlayer block={b} />
                  </div>
                ))}
              </div>
            </LessonScene>
          )}
          <footer className="lp-footer">
            <span>
              {plan.id
                ? "Giáo án riêng của bạn · Bản " + plan.revision
                : "Chưa lưu vào tài khoản"}
            </span>
            <div>
              <button
                disabled={busy || !plan.id}
                onClick={() =>
                  guard(() => {
                    setPlan({
                      ...structuredClone(plan),
                      id: undefined,
                      revision: 0,
                      title: plan.title + " (bản sao)",
                      status: "draft",
                      blocks: plan.blocks.map((b) => ({
                        ...b,
                        id: crypto.randomUUID(),
                      })),
                    });
                    setDirty(true);
                    setMode("edit");
                    setNotice(
                      "Đã tạo bản sao để chỉnh sửa. Bấm Lưu giáo án để lưu bản mới.",
                    );
                  })
                }
              >
                Nhân bản giáo án
              </button>
              <button
                className="lp-danger"
                disabled={busy || !plan.id}
                onClick={() =>
                  setConfirm({
                    title:
                      "Xóa giáo án đã lưu? Thao tác này không thể hoàn tác.",
                    action: () =>
                      doWork(async () => {
                        await portalRequest("/lesson-plans/" + plan.id, {
                          method: "DELETE",
                        });
                        setSaved((prev) =>
                          prev.filter((p) => p.id !== plan.id),
                        );
                        setPlan(newPlan(classes[0]?.id));
                        setDirty(false);
                        setNotice("Đã xóa giáo án");
                        setMode("edit");
                      }),
                  })
                }
              >
                Xóa giáo án
              </button>
            </div>
          </footer>
        </div>
      </div>
      <section className="lp-print">
        <h1>{plan.title || "Giáo án"}</h1>
        <p>
          {classes.find((c) => c.id === plan.classId)?.name} · {plan.subject} ·{" "}
          {plan.duration} phút
          {plan.teachingDate ? " · " + plan.teachingDate : ""}
        </p>
        {plan.status === "draft" && (
          <p>BẢN NHÁP — cần giáo viên rà soát trước khi sử dụng.</p>
        )}
        {plan.blocks.map((b) => (
          <BlockPlayer key={b.id} block={b} print />
        ))}
      </section>
      {(confirm || blocker.state === "blocked") && (
        <div className="lp-overlay">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Xác nhận thay đổi"
            className="lp-confirm"
          >
            <h2>
              {confirm?.title || "Rời trang và bỏ các thay đổi chưa lưu?"}
            </h2>
            <p>Những thay đổi chưa lưu sẽ không có trong bản đã lưu.</p>
            <div>
              <button
                disabled={busy}
                onClick={() => {
                  setConfirm(null);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Hủy
              </button>
              <button
                disabled={busy}
                className="lp-primary"
                onClick={() => {
                  if (blocker.state === "blocked") {
                    blocker.proceed();
                    return;
                  }
                  const action = confirm.action;
                  setConfirm(null);
                  action();
                }}
              >
                Tiếp tục
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

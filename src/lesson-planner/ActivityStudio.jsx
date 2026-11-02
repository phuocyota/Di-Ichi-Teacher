import React, { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { portalRequest } from "../services/portalApi.js";
import {
  ACTIVITY_TEMPLATES,
  createActivityTemplate,
} from "./activityTemplates.js";
import { BLOCKS, createBlock, newPlan } from "./blocks.js";
import { clampLayout, moveLayout } from "./activityLayout.js";
import BlockFields from "./BlockFields.jsx";
import BlockPlayer from "./BlockPlayer.jsx";
import SlidePresentation from "./SlidePresentation.jsx";
import { normalizeAppearance } from "./appearance.js";
import { validatedImageBlob } from "./appearance.js";
import LessonAppearance, { LessonScene } from "./LessonAppearance.jsx";
import {
  createPage,
  normalizeElearning,
  duplicatePage,
  movePage,
} from "./elearningPages.js";
import "./lesson-planner.css";
import "./activity-studio.css";

export default function ActivityStudio() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [savedId, setSavedId] = useState(null);
  const [presenting, setPresenting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState(null),
    [classes, setClasses] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [session, setSession] = useState(0),
    [confirm, setConfirm] = useState(null);
  const [fitZoom, setFitZoom] = useState(1),
    [zoomSetting, setZoomSetting] = useState("fit");
  const [pageId, setPageId] = useState(null),
    [propertiesTab, setPropertiesTab] = useState("object"),
    [visited, setVisited] = useState([]),
    [motionPaused, setMotionPaused] = useState(false);
  const viewport = useRef(null);
  const stage = useRef(null),
    gesture = useRef(null),
    lock = useRef(false);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (savedId && !dirty) {
      if (savedId !== planId)
        navigate("/soan-elearning/" + savedId, { replace: true });
      setSavedId(null);
    }
  }, [savedId, dirty, planId, navigate]);
  useEffect(() => {
    const element = viewport.current;
    if (!element || loading) return;
    const measure = () =>
      setFitZoom(
        Math.min(1, Math.max(0.2, ((element.clientWidth || 1002) - 2) / 1000)),
      );
    measure();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [loading, preview]);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    setPlan(null);
    Promise.all([
      portalRequest("/lesson-plans", { signal: c.signal }),
      planId
        ? portalRequest("/lesson-plans/" + planId, { signal: c.signal })
        : Promise.resolve(null),
      portalRequest("/elearning", { signal: c.signal }),
    ])
      .then(([options, record, published]) => {
        if (c.signal.aborted) return;
        if (!Array.isArray(options.classes))
          throw new Error("Danh sách lớp không hợp lệ");
        if (planId && (!record?.id || !Array.isArray(record.blocks)))
          throw new Error("Không tải được hoạt động");
        setClasses(options.classes);
        setCourses(published.items || []);
        const content = normalizeElearning(record);
        setPlan({
          ...newPlan(),
          ...record,
          editorMode: "elearning",
          classId: record?.classId || "",
          appearance: normalizeAppearance(record?.appearance),
          ...content,
        });
        setPageId(content.pages[0].id);
        setVisited([]);
        setPropertiesTab("object");
        setDirty(false);
        setSelected(null);
        setPreview(false);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [planId, retry]);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const edit = (change) => {
    if (lock.current) return;
    setPlan((p) => ({ ...p, ...change }));
    setDirty(true);
    setNotice("");
    setError("");
  };
  const editBlock = (id, change) =>
    edit({
      blocks: plan.blocks.map((b) => (b.id === id ? { ...b, ...change } : b)),
    });
  const insert = (kind, id, point) => {
    const blocks =
      kind === "template" ? createActivityTemplate(id) : [createBlock(id)];
    if (
      plan.blocks.filter((b) => b.pageId === pageId).length + blocks.length >
        30 ||
      plan.blocks.length + blocks.length > 100
    ) {
      setError("Mỗi trang hỗ trợ tối đa 30 đối tượng");
      return;
    }
    const placed = blocks.map((b, i) => ({
      ...b,
      pageId,
      layout: clampLayout(
        blocks.length > 1
          ? { x: i * 330 + 10, y: 35, width: 310, height: 580 }
          : {
              x: point?.x ?? 50 + (plan.blocks.length % 4) * 30,
              y: point?.y ?? 45 + (plan.blocks.length % 4) * 30,
              width: ["text", "heading", "image"].includes(b.type) ? 420 : 500,
              height: ["text", "heading"].includes(b.type) ? 220 : 500,
            },
      ),
    }));
    edit({ blocks: [...plan.blocks, ...placed] });
    setSelected(placed[0].id);
    setPropertiesTab("object");
  };
  const drop = (e) => {
    e.preventDefault();
    if (busy || preview) return;
    try {
      const data = JSON.parse(
        e.dataTransfer.getData("application/x-activity-studio"),
      );
      const r = stage.current.getBoundingClientRect();
      const point = {
        x: ((e.clientX - r.left) / r.width) * 1000,
        y: ((e.clientY - r.top) / r.height) * 700,
      };
      if (
        data.kind === "template" &&
        ACTIVITY_TEMPLATES.some((t) => t.id === data.id)
      )
        insert(data.kind, data.id, point);
      else if (
        data.kind === "block" &&
        ["text", "heading", "image", "video"].includes(data.id)
      )
        insert(data.kind, data.id, point);
    } catch {
      /* Ignore unrelated drag content. */
    }
  };
  const start = (e, b, resize = false) => {
    if (busy || preview || e.button !== 0) return;
    e.preventDefault();
    setSelected(b.id);
    const r = stage.current.getBoundingClientRect();
    gesture.current = {
      id: b.id,
      x: e.clientX,
      y: e.clientY,
      layout: b.layout,
      width: r.width,
      height: r.height,
      resize,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const g = gesture.current;
    if (!g || preview || busy) return;
    editBlock(g.id, {
      layout: moveLayout(
        g.layout,
        ((e.clientX - g.x) / g.width) * 1000,
        ((e.clientY - g.y) / g.height) * 700,
        g.resize,
      ),
    });
  };
  const stop = () => {
    gesture.current = null;
  };
  const keyboard = (e, b, resize = false) => {
    const dirs = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!dirs[e.key] || busy || preview) return;
    e.preventDefault();
    const [x, y] = dirs[e.key];
    editBlock(b.id, {
      layout: moveLayout(
        b.layout,
        x * (e.shiftKey ? 1 : 10),
        y * (e.shiftKey ? 1 : 10),
        resize,
      ),
    });
  };
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...Object.fromEntries(Object.keys(newPlan()).map((k) => [k, plan[k]])),
        editorMode: "elearning",
        pages: plan.pages,
        title: plan.title.trim() || "Hoạt động chưa đặt tên",
        classId: plan.classId || null,
        status: "draft",
      };
      const result = await portalRequest(
        "/lesson-plans" + (plan.id ? "/" + plan.id : ""),
        { method: plan.id ? "PUT" : "POST", body: payload },
      );
      if (!result?.id || !Array.isArray(result.blocks))
        throw new Error("Máy chủ chưa xác nhận đã lưu");
      setPlan({
        ...result,
        classId: result.classId || "",
        appearance: normalizeAppearance(result.appearance),
        ...normalizeElearning(result),
      });
      setDirty(false);
      setSavedId(result.id);
      setNotice(
        "Đã lưu bài e-learning vào tài khoản. Mở lại từ Giáo án của tôi.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const active = plan?.blocks.find((b) => b.id === selected);
  const publishedCourse = courses.find((c) => c.sourceId === plan?.id);
  const publish = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await portalRequest("/elearning/publish/" + plan.id, {
        method: "POST",
        body: { revision: plan.revision },
      });
      setCourses((prev) => [
        ...prev.filter((c) => c.sourceId !== plan.id),
        { ...result, sourceId: plan.id, published: true },
      ]);
      setNotice("Đã giao bài cho lớp. Học sinh mở trong mục Bài học.");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await portalRequest("/elearning/" + publishedCourse.id, {
        method: "DELETE",
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === publishedCourse.id ? { ...c, published: false } : c,
        ),
      );
      setNotice("Đã thu hồi bài khỏi lớp. Bản soạn vẫn được giữ.");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const currentPage = plan?.pages.find((p) => p.id === pageId);
  const pageIndex = plan?.pages.findIndex((p) => p.id === pageId) ?? 0;
  const pageBlocks = plan?.blocks.filter((b) => b.pageId === pageId) || [];
  const changePage = (id) => {
    gesture.current = null;
    setPageId(id);
    setSelected(null);
    if (preview)
      setVisited((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const addPage = () => {
    if (busy) return;
    if (plan.pages.length >= 20)
      return setError("Mỗi bài hỗ trợ tối đa 20 trang");
    const page = createPage("Trang " + (plan.pages.length + 1));
    edit({ pages: [...plan.pages, page] });
    changePage(page.id);
  };
  const copyPage = () => {
    if (busy) return;
    const count = pageBlocks.length;
    if (plan.pages.length >= 20 || plan.blocks.length + count > 100)
      return setError("Bài học tối đa 20 trang và 100 đối tượng");
    const result = duplicatePage(plan.pages, plan.blocks, pageId);
    edit({ pages: result.pages, blocks: result.blocks });
    changePage(result.pageId);
  };
  const uploadBackground = async (file) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const blob = await validatedImageBlob(file),
        body = new FormData();
      body.append("file", new File([blob], file.name, { type: blob.type }));
      const result = await portalRequest("/files", { method: "POST", body });
      if (!result?.id) throw new Error("Máy chủ chưa xác nhận ảnh đã tải");
      setPlan((prev) => ({
        ...prev,
        appearance: {
          ...normalizeAppearance(prev.appearance),
          background: "image",
          backgroundImage: "",
          backgroundFileId: result.id,
        },
      }));
      setDirty(true);
      setNotice("Đã tải ảnh nền. Bấm lưu để lưu bài e-learning.");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const zoom = zoomSetting === "fit" ? fitZoom : Number(zoomSetting);
  if (loading)
    return (
      <div className="as-loading" role="status">
        Đang tải công cụ kéo thả…
      </div>
    );
  if (!plan)
    return (
      <div className="as-error" role="alert">
        {error}
        <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
      </div>
    );
  return (
    <section className="activity-studio lesson-planner">
      {presenting && (
        <SlidePresentation
          plan={plan}
          startIndex={pageIndex}
          onClose={() => setPresenting(false)}
        />
      )}
      <header className="as-top">
        <div>
          <p>BỘ SOẠN BÀI E-LEARNING</p>
          <h1>Soạn bài e-learning</h1>
        </div>
        <div>
          <Link to="/giao-an">Bài đã lưu</Link>
          <button disabled={busy} onClick={() => setPresenting(true)}>
            Trình chiếu
          </button>
          <button
            aria-pressed={preview}
            onClick={() => {
              setPreview((v) => !v);
              setSession((v) => v + 1);
              setVisited([pageId]);
            }}
          >
            {preview ? "Quay lại chỉnh sửa" : "Xem trước bài học"}
          </button>
          <button className="lp-primary" disabled={busy} onClick={save}>
            {busy ? "Đang lưu…" : "Lưu bài e-learning"}
          </button>
          <button
            disabled={busy || dirty || !plan.id || !plan.classId}
            title="Lưu bài và chọn lớp trước khi giao"
            onClick={() =>
              setConfirm({
                title: publishedCourse?.published
                  ? "Giao lại bản mới? Tiến độ xem trang của bản cũ sẽ được đặt lại."
                  : "Giao bài này cho học sinh trong lớp đã chọn?",
                action: publish,
              })
            }
          >
            {publishedCourse?.published ? "Giao lại bản mới" : "Giao cho lớp"}
          </button>
          {publishedCourse?.published && (
            <button
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: "Thu hồi bài đã giao khỏi lớp?",
                  action: withdraw,
                })
              }
            >
              Thu hồi bài
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="as-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="as-notice" role="status">
          {notice}
        </p>
      )}
      <div className="as-info">
        <label>
          Tên bài e-learning
          <input
            value={plan.title}
            maxLength={300}
            disabled={busy}
            onChange={(e) => edit({ title: e.target.value })}
            placeholder="Đặt tên bài tập của bạn"
          />
        </label>
        <label>
          Lớp học (có thể chọn sau)
          <select
            value={plan.classId}
            disabled={busy}
            onChange={(e) => edit({ classId: e.target.value })}
          >
            <option value="">Chưa chọn lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span className="as-save-state">
          {dirty ? "● Có thay đổi chưa lưu" : plan.id ? "✓ Đã lưu" : "Bản mới"}
        </span>
      </div>
      <div className={"as-workspace " + (preview ? "as-preview" : "")}>
        {!preview && (
          <aside className="as-palette">
            <section className="as-pages">
              <h2>
                Trang bài học <span>{plan.pages.length}</span>
              </h2>
              {plan.pages.map((p, i) => (
                <button
                  key={p.id}
                  disabled={busy}
                  aria-current={p.id === pageId ? "page" : undefined}
                  onClick={() => changePage(p.id)}
                >
                  <span>{i + 1}</span>
                  <strong>{p.title || "Trang chưa đặt tên"}</strong>
                  <small>
                    {plan.blocks.filter((b) => b.pageId === p.id).length} đối
                    tượng
                  </small>
                </button>
              ))}
              <div className="as-page-actions">
                <button disabled={busy} onClick={addPage}>
                  + Thêm trang
                </button>
                <button disabled={busy} onClick={copyPage}>
                  Nhân bản trang
                </button>
              </div>
              <div className="as-page-actions">
                <button
                  disabled={busy || pageIndex === 0}
                  onClick={() =>
                    edit({ pages: movePage(plan.pages, pageId, -1) })
                  }
                >
                  ↑ Lên
                </button>
                <button
                  disabled={busy || pageIndex === plan.pages.length - 1}
                  onClick={() =>
                    edit({ pages: movePage(plan.pages, pageId, 1) })
                  }
                >
                  ↓ Xuống
                </button>
                <button
                  className="lp-danger"
                  disabled={busy || plan.pages.length === 1}
                  onClick={() =>
                    setConfirm({
                      title: "Xóa trang và toàn bộ nội dung trong trang?",
                      action: () => {
                        const pages = plan.pages.filter((p) => p.id !== pageId);
                        edit({
                          pages,
                          blocks: plan.blocks.filter(
                            (b) => b.pageId !== pageId,
                          ),
                        });
                        changePage(pages[Math.max(0, pageIndex - 1)].id);
                      },
                    })
                  }
                >
                  Xóa trang
                </button>
              </div>
            </section>
            <h2>Chọn mẫu</h2>
            <p>Kéo mẫu vào trang hoặc bấm để thêm.</p>
            {ACTIVITY_TEMPLATES.map((t) => (
              <button
                disabled={busy}
                key={t.id}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "application/x-activity-studio",
                    JSON.stringify({ kind: "template", id: t.id }),
                  )
                }
                onClick={() => insert("template", t.id)}
              >
                <span className={"lp-tool-icon lp-tool-" + t.color}>
                  {t.icon}
                </span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.english}</small>
                </span>
              </button>
            ))}
            <h2 className="as-add-heading">Thêm vào trang</h2>
            {["heading", "text", "image", "video"].map((type) => (
              <button
                key={type}
                disabled={busy}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "application/x-activity-studio",
                    JSON.stringify({ kind: "block", id: type }),
                  )
                }
                onClick={() => insert("block", type)}
              >
                {BLOCKS[type].icon}　{BLOCKS[type].label}
              </button>
            ))}
          </aside>
        )}
        <div className="as-canvas-panel">
          <div className="as-canvas-bar">
            <span>{preview ? "CHẾ ĐỘ CHƠI THỬ" : "TRANG SOẠN TRỰC QUAN"}</span>
            <span>
              Trang {pageIndex + 1}/{plan.pages.length} · {pageBlocks.length}{" "}
              đối tượng
            </span>
            <label className="as-zoom">
              Thu phóng
              <select
                value={zoomSetting}
                onChange={(e) => setZoomSetting(e.target.value)}
              >
                <option value="fit">Vừa khung</option>
                <option value="1">100%</option>
                <option value="0.75">75%</option>
                <option value="0.5">50%</option>
              </select>
            </label>
          </div>
          <p className="as-hint">
            {preview
              ? "Kéo đáp án, chọn câu trả lời và kiểm tra kết quả trực tiếp. Kết quả chơi thử không ghi vào sổ điểm."
              : "Kéo thanh đầu khối để di chuyển. Kéo góc dưới bên phải để đổi kích thước. Phím mũi tên dịch 10 đơn vị; giữ Shift để dịch 1 đơn vị."}
          </p>
          <div className="as-canvas-scroll" ref={viewport}>
            <div
              className="as-stage-sizing"
              style={{ width: 1000 * zoom, height: 700 * zoom }}
            >
              <div
                ref={stage}
                style={{ transform: `scale(${zoom})` }}
                className={"as-stage " + (!preview ? "as-stage-grid" : "")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={drop}
                onPointerMove={move}
                onPointerUp={stop}
                onPointerCancel={stop}
                onLostPointerCapture={stop}
              >
                <LessonScene
                  appearance={plan.appearance}
                  paused={!preview || motionPaused}
                  className="as-stage-scene"
                >
                  {!pageBlocks.length && (
                    <div className="as-stage-empty">
                      <span>＋</span>
                      <h2>Kéo mẫu vào đây để bắt đầu</h2>
                      <p>
                        Bạn có thể thêm chữ, ảnh và nhiều hoạt động trên cùng
                        một trang.
                      </p>
                    </div>
                  )}
                  {(preview ? plan.blocks : pageBlocks).map((b, i) => (
                    <article
                      hidden={b.pageId !== pageId}
                      key={b.id + "-" + session}
                      className={
                        "as-object " +
                        (selected === b.id && !preview
                          ? "as-object-selected"
                          : "")
                      }
                      style={{
                        left: b.layout.x / 10 + "%",
                        top: b.layout.y / 7 + "%",
                        width: b.layout.width / 10 + "%",
                        height: b.layout.height / 7 + "%",
                        zIndex: i + 1,
                      }}
                      onClick={() => {
                        if (!preview) {
                          setSelected(b.id);
                          setPropertiesTab("object");
                        }
                      }}
                    >
                      {!preview && (
                        <button
                          className="as-object-handle"
                          disabled={busy}
                          aria-label={"Di chuyển đối tượng " + (i + 1)}
                          onPointerDown={(e) => start(e, b)}
                          onKeyDown={(e) => keyboard(e, b)}
                        >
                          <span>⠿ {BLOCKS[b.type]?.label}</span>
                          <small>{i + 1}</small>
                        </button>
                      )}
                      <div className="as-object-content" inert={!preview}>
                        {(b.type !== "video" ||
                          !preview ||
                          b.pageId === pageId) && <BlockPlayer block={b} />}
                      </div>
                      {!preview && (
                        <button
                          className="as-resize"
                          disabled={busy}
                          aria-label={"Đổi kích thước đối tượng " + (i + 1)}
                          onPointerDown={(e) => start(e, b, true)}
                          onKeyDown={(e) => keyboard(e, b, true)}
                        >
                          ⌟
                        </button>
                      )}
                    </article>
                  ))}
                </LessonScene>
              </div>
            </div>
          </div>
          {preview && (
            <div className="as-player-navigation">
              <button
                disabled={pageIndex <= 0}
                onClick={() => changePage(plan.pages[pageIndex - 1].id)}
              >
                ← Trang trước
              </button>
              <div>
                <strong>{currentPage?.title}</strong>
                <span>
                  Đã mở {visited.length}/{plan.pages.length} trang
                </span>
              </div>
              <button
                disabled={pageIndex >= plan.pages.length - 1}
                onClick={() => changePage(plan.pages[pageIndex + 1].id)}
              >
                Trang sau →
              </button>
              <button
                aria-pressed={motionPaused}
                onClick={() => setMotionPaused((v) => !v)}
              >
                {motionPaused ? "Bật hiệu ứng" : "Tạm dừng hiệu ứng"}
              </button>
            </div>
          )}
        </div>
        {!preview && (
          <aside className="as-properties">
            <div className="as-property-tabs">
              <button
                aria-pressed={propertiesTab === "object"}
                onClick={() => setPropertiesTab("object")}
              >
                Đối tượng
              </button>
              <button
                aria-pressed={propertiesTab === "page"}
                onClick={() => setPropertiesTab("page")}
              >
                Trang & giao diện
              </button>
            </div>
            {propertiesTab === "page" ? (
              <>
                <label>
                  Tên trang
                  <input
                    maxLength={200}
                    value={currentPage?.title || ""}
                    disabled={busy}
                    onChange={(e) =>
                      edit({
                        pages: plan.pages.map((p) =>
                          p.id === pageId ? { ...p, title: e.target.value } : p,
                        ),
                      })
                    }
                  />
                </label>
                <LessonAppearance
                  value={plan.appearance}
                  disabled={busy}
                  onChange={(appearance) => edit({ appearance })}
                  onUpload={uploadBackground}
                />
                <p className="as-hint">
                  Giao diện nền và nhân vật áp dụng cho toàn bài.
                </p>
              </>
            ) : (
              <>
                <h2>Chỉnh sửa đối tượng</h2>
                {active ? (
                  <>
                    <p className="as-hint">
                      {BLOCKS[active.type]?.label} · Thay đổi hiển thị ngay trên
                      trang.
                    </p>
                    <fieldset disabled={busy}>
                      <BlockFields
                        block={active}
                        change={(change) => editBlock(active.id, change)}
                      />
                      <div className="as-position-fields">
                        {[
                          ["x", "Vị trí ngang"],
                          ["y", "Vị trí dọc"],
                          ["width", "Chiều rộng"],
                          ["height", "Chiều cao"],
                        ].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <input
                              type="number"
                              value={active.layout[key]}
                              onChange={(e) =>
                                editBlock(active.id, {
                                  layout: clampLayout({
                                    ...active.layout,
                                    [key]: Number(e.target.value),
                                  }),
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <div className="as-object-actions">
                        <button
                          onClick={() => {
                            if (
                              pageBlocks.length >= 30 ||
                              plan.blocks.length >= 100
                            )
                              return setError(
                                "Mỗi trang hỗ trợ tối đa 30 đối tượng",
                              );
                            const copy = {
                              ...structuredClone(active),
                              id: crypto.randomUUID(),
                              layout: moveLayout(active.layout, 20, 20),
                            };
                            edit({ blocks: [...plan.blocks, copy] });
                            setSelected(copy.id);
                          }}
                        >
                          Nhân bản
                        </button>
                        <button
                          className="lp-danger"
                          onClick={() =>
                            setConfirm({
                              title: "Xóa đối tượng đã chọn?",
                              action: () => {
                                edit({
                                  blocks: plan.blocks.filter(
                                    (b) => b.id !== active.id,
                                  ),
                                });
                                setSelected(null);
                              },
                            })
                          }
                        >
                          Xóa đối tượng
                        </button>
                      </div>
                    </fieldset>
                  </>
                ) : (
                  <p className="as-hint">
                    Bấm một đối tượng trên trang để sửa câu hỏi, đáp án hoặc
                    hình ảnh.
                  </p>
                )}
              </>
            )}
          </aside>
        )}
      </div>
      {(confirm || blocker.state === "blocked") && (
        <div className="lp-overlay">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Xác nhận thay đổi"
            className="lp-confirm"
          >
            <h2>{confirm?.title || "Rời trang và bỏ thay đổi chưa lưu?"}</h2>
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
                className="lp-primary"
                disabled={busy}
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

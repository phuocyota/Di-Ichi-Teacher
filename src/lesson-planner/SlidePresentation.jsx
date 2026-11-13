import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LessonScene } from "./LessonAppearance.jsx";
import BlockPlayer from "./BlockPlayer.jsx";
import "./slide-presentation.css";

export default function SlidePresentation({
  plan,
  onClose,
  startIndex = 0,
  embedded = false,
  slideIndex,
  onSlideChange,
  navigationLocked = false,
}) {
  const canvasMode = Boolean(plan.pages?.length);
  const slides = canvasMode ? plan.pages : plan.blocks;
  const [index, setIndex] = useState(
    Math.min(startIndex, Math.max(0, slides.length - 1)),
  );
  const [paused, setPaused] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [message, setMessage] = useState(""),
    [scale, setScale] = useState(1);
  const root = useRef(null),
    viewport = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  const active = Math.min(slideIndex ?? index, Math.max(0, slides.length - 1));
  const changeIndex = (next) => {
    if (navigationLocked) return;
    if (onSlideChange) onSlideChange(next);
    else setIndex(next);
  };
  useEffect(() => {
    if (embedded) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const node = root.current;
    const keydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key === "Tab") {
        const controls = [
          ...node.querySelectorAll(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],video[controls],[tabindex="0"]',
          ),
        ].filter((el) => !el.closest("[hidden]"));
        const first = controls[0],
          last = controls.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        return;
      }
      // Keep game, media and form keyboard controls available inside the slide.
      if (e.target.closest(".lp-slide-content")) return;
      if (["ArrowRight", "PageDown"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    const changed = () => setFullscreen(document.fullscreenElement === node);
    node.addEventListener("keydown", keydown);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      node.removeEventListener("keydown", keydown);
      document.removeEventListener("fullscreenchange", changed);
      if (document.fullscreenElement === node)
        document.exitFullscreen?.().catch(() => {});
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [slides.length, embedded]);
  useEffect(() => {
    const el = viewport.current;
    if (!canvasMode || !el) return;
    const measure = () =>
      setScale(
        Math.max(0.1, Math.min(el.clientWidth / 1000, el.clientHeight / 700)),
      );
    measure();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [canvasMode]);
  useEffect(() => {
    if (!embedded) return;
    const node = root.current;
    const changed = () => setFullscreen(document.fullscreenElement === node);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      if (document.fullscreenElement === node)
        document.exitFullscreen?.().catch(() => {});
    };
  }, [embedded]);
  const toggleFullscreen = async () => {
    setMessage("");
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else if (root.current.requestFullscreen)
        await root.current.requestFullscreen();
      else throw new Error();
    } catch {
      setMessage(
        "Trình duyệt chưa bật được toàn màn hình. Bạn vẫn có thể trình chiếu trong cửa sổ này.",
      );
    }
  };
  const presentation = (
    <section
      className={`lesson-planner lp-slides${embedded ? " lp-slides-embedded" : ""}`}
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label="Trình chiếu bài học"
      tabIndex={-1}
      ref={root}
    >
      <header className="lp-slides-toolbar">
        <div>
          <span>TRÌNH CHIẾU</span>
          <h1>{plan.title || "Bài học"}</h1>
        </div>
        <div>
          <button aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
            {paused ? "Bật hiệu ứng" : "Tạm dừng hiệu ứng"}
          </button>
          <button onClick={toggleFullscreen}>
            {fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          </button>
          {!embedded && <button onClick={onClose}>Đóng trình chiếu</button>}
        </div>
      </header>
      {message && (
        <p className="lp-slides-message" role="status">
          {message}
        </p>
      )}
      <div
        className={
          "lp-slide-viewport " + (canvasMode ? "lp-slide-canvas-viewport" : "")
        }
        ref={viewport}
      >
        {!slides.length ? (
          <p className="lp-slides-empty">
            Chưa có nội dung để trình chiếu. Thêm game hoặc khối nội dung vào
            bài học.
          </p>
        ) : canvasMode ? (
          <div style={{ width: 1000 * scale, height: 700 * scale }}>
            <div
              className="lp-slide-canvas"
              style={{ transform: `scale(${scale})` }}
            >
              <LessonScene
                appearance={plan.appearance}
                paused={paused}
                className="lp-slide-scene"
              >
                {plan.blocks.map((b) => (
                  <article
                    key={b.id}
                    hidden={b.pageId !== slides[active].id}
                    className="lp-slide-content lp-slide-object lp-animated-block"
                    style={{
                      left: b.layout?.x || 0,
                      top: b.layout?.y || 0,
                      width: b.layout?.width || 400,
                      height: b.layout?.height || 300,
                    }}
                  >
                    {(b.type !== "video" || b.pageId === slides[active].id) && (
                      <BlockPlayer block={b} />
                    )}
                  </article>
                ))}
              </LessonScene>
            </div>
          </div>
        ) : (
          <LessonScene
            appearance={plan.appearance}
            paused={paused}
            className="lp-slide-scene"
          >
            {slides.map((b, i) => (
              <article
                key={b.id}
                hidden={i !== active}
                className="lp-slide-content lp-slide-single lp-animated-block"
              >
                {(b.type !== "video" || i === active) && (
                  <BlockPlayer block={b} />
                )}
              </article>
            ))}
          </LessonScene>
        )}
      </div>
      <footer className="lp-slides-navigation">
        <button
          disabled={navigationLocked || active === 0 || !slides.length}
          onClick={() => changeIndex(active - 1)}
        >
          ← Slide trước
        </button>
        <div aria-live="polite">
          <strong>
            {slides.length ? `Slide ${active + 1}/${slides.length}` : "0 slide"}
          </strong>
          <span>{slides[active]?.title || ""}</span>
        </div>
        <button
          disabled={
            navigationLocked || active >= slides.length - 1 || !slides.length
          }
          onClick={() => changeIndex(active + 1)}
        >
          Slide sau →
        </button>
      </footer>
    </section>
  );
  return embedded ? presentation : createPortal(presentation, document.body);
}

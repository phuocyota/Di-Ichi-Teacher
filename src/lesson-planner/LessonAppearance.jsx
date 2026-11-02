import React, { useEffect, useState } from "react";
import { portalRequest } from "../services/portalApi.js";
import {
  ANIMATIONS,
  MASCOTS,
  BACKGROUNDS,
  normalizeAppearance,
  safeBackgroundUrl,
  validatedImageBlob,
} from "./appearance.js";
import "./lesson-appearance.css";
import LessonMascot from "./LessonMascot.jsx";

export function LessonScene({
  appearance: raw,
  children,
  className = "",
  mini = false,
  paused = false,
}) {
  const a = normalizeAppearance(raw);
  const [image, setImage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setError("");
    setImage("");
    setLoading(false);
    if (a.background === "image" && a.backgroundFileId) {
      setLoading(true);
      portalRequest("/files/" + a.backgroundFileId, {
        download: true,
        signal: controller.signal,
      })
        .then((result) => validatedImageBlob(result.blob))
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setImage(objectUrl);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    } else if (a.background === "image" && a.backgroundImage) {
      const url = safeBackgroundUrl(a.backgroundImage);
      if (url) setImage(url);
      else setError("Liên kết ảnh nền không hợp lệ");
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [a.background, a.backgroundFileId, a.backgroundImage]);
  return (
    <div
      className={
        "lp-scene lp-scene-" +
        a.background +
        " " +
        (mini ? "lp-scene-mini " : "") +
        className +
        (a.mascot !== "none" ? " lp-scene-has-mascot" : "")
      }
      data-animation={a.animation}
      data-paused={paused}
      data-mascot-side={a.mascotSide}
      style={{ "--lp-background-opacity": a.opacity / 100 }}
    >
      <div className="lp-scene-backdrop" aria-hidden="true">
        {image && (
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() =>
              setError(
                "Không tải được ảnh nền. Kiểm tra liên kết hoặc quyền truy cập ảnh.",
              )
            }
          />
        )}
      </div>
      {a.decorations && (
        <div className="lp-scene-decorations" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} />
          ))}
        </div>
      )}
      {a.mascot !== "none" && (
        <div className="lp-scene-mascot">
          <LessonMascot type={a.mascot} motion={a.mascotMotion} />
        </div>
      )}
      <div className="lp-scene-content">
        {loading && (
          <p className="lp-scene-status" role="status">
            Đang tải ảnh nền…
          </p>
        )}
        {error && (
          <p className="lp-scene-error" role="alert">
            {error}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export default function LessonAppearance({
  value,
  onChange,
  onUpload,
  disabled,
}) {
  const a = normalizeAppearance(value);
  return (
    <section className="lp-appearance-settings">
      <header>
        <div>
          <h2>Giao diện bài học</h2>
          <p>Nền và hiệu ứng dùng khi chơi thử / trình chiếu.</p>
        </div>
      </header>
      <fieldset disabled={disabled}>
        <div
          className="lp-background-options"
          role="group"
          aria-label="Chọn nền bài học"
        >
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              aria-pressed={a.background === b.id}
              onClick={() => onChange({ ...a, background: b.id })}
            >
              <span
                className={"lp-background-swatch lp-scene-" + b.id}
                aria-hidden="true"
              />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
        {a.background === "image" && (
          <div className="lp-background-image-input">
            <label>
              Liên kết ảnh nền
              <input
                type="url"
                maxLength={4000}
                value={a.backgroundImage}
                placeholder="https://…"
                onChange={(e) =>
                  onChange({
                    ...a,
                    backgroundImage: e.target.value,
                    backgroundFileId: null,
                  })
                }
              />
            </label>
            <label className="lp-background-upload">
              Hoặc tải ảnh từ máy
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUpload(file);
                }}
              />
            </label>
            <p className="lp-hint">
              PNG, JPEG, WebP hoặc GIF · Tối đa 10 MB
              {a.backgroundFileId ? " · Đang dùng ảnh đã tải lên" : ""}
            </p>
            {(a.backgroundImage || a.backgroundFileId) && (
              <button
                onClick={() =>
                  onChange({
                    ...a,
                    backgroundImage: "",
                    backgroundFileId: null,
                  })
                }
              >
                Gỡ ảnh nền
              </button>
            )}
          </div>
        )}
        <div className="lp-appearance-controls">
          <label>
            Độ rõ của nền: {a.opacity}%
            <input
              type="range"
              min="0"
              max="100"
              value={a.opacity}
              onChange={(e) =>
                onChange({ ...a, opacity: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Hiệu ứng xuất hiện khối
            <select
              value={a.animation}
              onChange={(e) => onChange({ ...a, animation: e.target.value })}
            >
              {ANIMATIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="lp-decoration-toggle">
          <input
            type="checkbox"
            aria-label="Chuyển động trang trí nhẹ trên nền"
            checked={a.decorations}
            onChange={(e) => onChange({ ...a, decorations: e.target.checked })}
          />
          <span className="lp-switch-track" aria-hidden="true">
            <span />
          </span>
          <span className="lp-switch-label">
            Chuyển động trang trí nhẹ trên nền
          </span>
          <span className="lp-switch-state" aria-hidden="true">
            {a.decorations ? "Bật" : "Tắt"}
          </span>
        </label>
        <div className="lp-mascot-settings">
          <h3>Nhân vật đồng hành</h3>
          <p className="lp-hint">
            Chọn một nhân vật trang trí cho phần mở đầu bài học.
          </p>
          <div
            className="lp-mascot-options"
            role="group"
            aria-label="Chọn nhân vật"
          >
            {MASCOTS.map((m) => (
              <button
                key={m.id}
                aria-pressed={a.mascot === m.id}
                onClick={() => onChange({ ...a, mascot: m.id })}
              >
                {m.id === "none" ? (
                  <span className="lp-mascot-empty" aria-hidden="true">
                    —
                  </span>
                ) : (
                  <LessonMascot type={m.id} />
                )}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          {a.mascot !== "none" && (
            <div className="lp-appearance-controls">
              <label>
                Vị trí nhân vật
                <select
                  value={a.mascotSide}
                  onChange={(e) =>
                    onChange({ ...a, mascotSide: e.target.value })
                  }
                >
                  <option value="left">Bên trái</option>
                  <option value="right">Bên phải</option>
                </select>
              </label>
              <label>
                Chuyển động nhân vật
                <select
                  value={a.mascotMotion}
                  onChange={(e) =>
                    onChange({ ...a, mascotMotion: e.target.value })
                  }
                >
                  <option value="none">Đứng yên</option>
                  <option value="float">Nhún nhẹ</option>
                  <option value="wave">Vẫy tay</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </fieldset>
      <div className="lp-appearance-demo">
        <span>Xem trước giao diện</span>
        <LessonScene appearance={a} mini>
          <div className="lp-animated-block" key={a.animation}>
            <strong>Câu hỏi khởi động</strong>
            <p>Bạn đã sẵn sàng khám phá bài học hôm nay?</p>
            <span className="lp-demo-chip">Bắt đầu bài học</span>
          </div>
        </LessonScene>
      </div>
      <p className="lp-hint">
        Các khối vẫn giữ nền rõ để dễ đọc. Có thể chọn “Không hiệu ứng” và tắt
        trang trí để giảm chuyển động.
      </p>
    </section>
  );
}

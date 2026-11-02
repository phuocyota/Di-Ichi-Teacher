import React, { useState } from "react";
import { BLOCKS, mediaUrl, youtubeEmbed } from "./blocks.js";
import ActivityGame, { ActivityPrint } from "./ActivityGames.jsx";

function Quiz({ block: b }) {
  const [chosen, setChosen] = useState(null),
    [checked, setChecked] = useState(false);
  const valid =
    b.options.length >= 2 &&
    b.options.every((o) => o.trim()) &&
    b.answer < b.options.length;
  return (
    <div className="lp-game">
      <p>{b.body}</p>
      {!valid ? (
        <p className="lp-muted">
          Thêm ít nhất hai lựa chọn và chọn đáp án đúng trong trình soạn.
        </p>
      ) : (
        <>
          <div role="radiogroup" aria-label={b.title || "Chọn đáp án"}>
            {b.options.map((o, i) => (
              <label
                className={
                  "lp-choice " +
                  (checked
                    ? i === b.answer
                      ? "lp-correct"
                      : chosen === i
                        ? "lp-incorrect"
                        : ""
                    : "")
                }
                key={i}
              >
                <input
                  type="radio"
                  name={b.id}
                  checked={chosen === i}
                  disabled={checked}
                  onChange={() => setChosen(i)}
                />
                <span>{String.fromCharCode(65 + i)}.</span> {o}
              </label>
            ))}
          </div>
          <div className="lp-game-actions">
            <button
              disabled={chosen === null || checked}
              onClick={() => setChecked(true)}
            >
              Kiểm tra đáp án
            </button>
            <button
              onClick={() => {
                setChosen(null);
                setChecked(false);
              }}
            >
              Làm lại
            </button>
          </div>
          {checked && (
            <p
              role="status"
              className={chosen === b.answer ? "lp-good" : "lp-bad"}
            >
              {chosen === b.answer
                ? "Chính xác!"
                : "Chưa đúng. Đáp án đúng: " + b.options[b.answer]}
            </p>
          )}
        </>
      )}
    </div>
  );
}
function Matching({ block: b }) {
  const [selected, setSelected] = useState(null),
    [matches, setMatches] = useState({}),
    [checked, setChecked] = useState(false);
  const right = b.pairs.map((p, i) => ({ ...p, index: i })).reverse();
  const connect = (target, source = selected) => {
    if (
      source === null ||
      !Number.isInteger(source) ||
      source < 0 ||
      source >= b.pairs.length ||
      checked
    )
      return;
    setMatches((prev) => ({
      ...Object.fromEntries(
        Object.entries(prev).filter(
          ([s, t]) => t !== target && Number(s) !== source,
        ),
      ),
      [source]: target,
    }));
    setSelected(null);
  };
  const score = Object.entries(matches).filter(
    ([s, t]) => Number(s) === t,
  ).length;
  return (
    <div className="lp-game">
      <p>
        {b.body ||
          "Kéo thẻ bên trái vào ô bên phải. Bạn cũng có thể bấm chọn lần lượt hai thẻ."}
      </p>
      {b.pairs.length < 2 ||
      b.pairs.some((p) => !p.left.trim() || !p.right.trim()) ? (
        <p className="lp-muted">
          Hoàn thiện ít nhất hai cặp nội dung trong trình soạn.
        </p>
      ) : (
        <>
          <div className="lp-matching">
            <div>
              {b.pairs.map((p, i) => (
                <button
                  draggable={!checked}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "text/lesson-match",
                      JSON.stringify({ blockId: b.id, index: i }),
                    )
                  }
                  key={i}
                  disabled={checked}
                  className={selected === i ? "lp-selected" : ""}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                >
                  {p.left}
                  {matches[i] !== undefined && (
                    <small> → {b.pairs[matches[i]]?.right}</small>
                  )}
                </button>
              ))}
            </div>
            <div>
              {right.map((p) => (
                <button
                  key={p.index}
                  disabled={checked}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const source = JSON.parse(
                        e.dataTransfer.getData("text/lesson-match"),
                      );
                      if (source.blockId === b.id)
                        connect(p.index, source.index);
                    } catch {
                      /* Ignore drags from other exercises. */
                    }
                  }}
                  onClick={() => connect(p.index)}
                  className={
                    checked
                      ? matches[p.index] === p.index
                        ? "lp-correct"
                        : "lp-incorrect"
                      : ""
                  }
                >
                  {p.right}
                </button>
              ))}
            </div>
          </div>
          <div className="lp-game-actions">
            <button
              disabled={
                Object.keys(matches).length !== b.pairs.length || checked
              }
              onClick={() => setChecked(true)}
            >
              Kiểm tra ghép cặp
            </button>
            <button
              onClick={() => {
                setMatches({});
                setSelected(null);
                setChecked(false);
              }}
            >
              Làm lại
            </button>
          </div>
          {checked && (
            <p
              role="status"
              className={score === b.pairs.length ? "lp-good" : "lp-bad"}
            >
              Đúng {score}/{b.pairs.length} cặp.
            </p>
          )}
        </>
      )}
    </div>
  );
}
function Ordering({ block: b }) {
  const [order, setOrder] = useState(() =>
      b.sequence.map((_, i) => i).reverse(),
    ),
    [checked, setChecked] = useState(false);
  const move = (from, to) => {
    if (
      checked ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      from >= order.length ||
      to < 0 ||
      to >= order.length
    )
      return;
    setOrder((prev) => {
      const n = [...prev],
        [v] = n.splice(from, 1);
      n.splice(to, 0, v);
      return n;
    });
  };
  const correct = order.every((v, i) => v === i);
  return (
    <div className="lp-game">
      <p>
        {b.body || "Kéo các thẻ hoặc dùng nút lên/xuống để đưa về đúng thứ tự."}
      </p>
      {b.sequence.length < 2 || b.sequence.some((s) => !s.trim()) ? (
        <p className="lp-muted">
          Hoàn thiện ít nhất hai bước trong trình soạn.
        </p>
      ) : (
        <>
          <ol className="lp-order">
            {order.map((index, i) => (
              <li
                key={index}
                draggable={!checked}
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "text/lesson-order",
                    JSON.stringify({ blockId: b.id, index: i }),
                  )
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const source = JSON.parse(
                      e.dataTransfer.getData("text/lesson-order"),
                    );
                    if (source.blockId === b.id) move(source.index, i);
                  } catch {
                    /* Ignore drags from other exercises. */
                  }
                }}
              >
                <span>
                  {i + 1}. {b.sequence[index]}
                </span>
                <div>
                  <button
                    aria-label={"Đưa bước " + (i + 1) + " lên"}
                    disabled={checked || i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Đưa bước " + (i + 1) + " xuống"}
                    disabled={checked || i === order.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="lp-game-actions">
            <button disabled={checked} onClick={() => setChecked(true)}>
              Kiểm tra thứ tự
            </button>
            <button
              onClick={() => {
                setOrder(b.sequence.map((_, i) => i).reverse());
                setChecked(false);
              }}
            >
              Làm lại
            </button>
          </div>
          {checked && (
            <p role="status" className={correct ? "lp-good" : "lp-bad"}>
              {correct
                ? "Thứ tự chính xác!"
                : "Chưa đúng. Hãy làm lại và sắp xếp các bước."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export default function BlockPlayer({ block: b, print = false }) {
  const url = mediaUrl(b.url),
    embed = youtubeEmbed(b.url);
  return (
    <article className={"lp-play-block lp-play-" + b.type}>
      <div className="lp-play-caption">
        <span>{BLOCKS[b.type]?.label}</span>
        {b.minutes > 0 && <span>{b.minutes} phút</span>}
      </div>
      {b.title && <h3>{b.title}</h3>}
      {b.type === "text" || b.type === "heading" ? (
        <p className="lp-prose">{b.body}</p>
      ) : b.type === "image" ? (
        url ? (
          <>
            <img
              src={url}
              alt={b.title || b.body || "Hình minh họa"}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.alt =
                  "Không tải được ảnh. Kiểm tra liên kết và quyền truy cập.";
              }}
            />
            <p>{b.body}</p>
          </>
        ) : (
          <p className="lp-muted">Chưa có liên kết hình ảnh.</p>
        )
      ) : b.type === "video" ? (
        url ? (
          <>
            {print ? (
              <p>Video: {url}</p>
            ) : embed ? (
              <iframe
                title={b.title || "Video bài học"}
                src={embed}
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media; picture-in-picture"
              />
            ) : (
              <video
                controls
                preload="metadata"
                src={url}
                onError={(e) => {
                  e.currentTarget.setAttribute(
                    "aria-label",
                    "Không phát được video. Kiểm tra URL và định dạng.",
                  );
                }}
              >
                Trình duyệt không hỗ trợ video.
              </video>
            )}
            <p>{b.body}</p>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Mở nguồn video ↗
            </a>
          </>
        ) : (
          <p className="lp-muted">Chưa có liên kết video.</p>
        )
      ) : print &&
        ["wheel", "group-sort", "open-box", "memory"].includes(b.type) ? (
        <ActivityPrint block={b} />
      ) : print ? (
        <div className="lp-print-activity">
          <p>{b.body}</p>
          {b.type === "quiz"
            ? b.options.map((o, i) => <p key={i}>☐ {o}</p>)
            : b.type === "matching"
              ? b.pairs.map((p, i) => <p key={i}>{p.left} — __________</p>)
              : [...b.sequence].reverse().map((s, i) => <p key={i}>☐ {s}</p>)}
        </div>
      ) : b.type === "quiz" ? (
        <Quiz block={b} />
      ) : b.type === "matching" ? (
        <Matching block={b} />
      ) : b.type === "ordering" ? (
        <Ordering block={b} />
      ) : (
        <ActivityGame block={b} />
      )}
    </article>
  );
}

import React, { useEffect, useRef, useState } from "react";

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function RandomWheel({ block: b }) {
  const isShow = b.wheelTheme === "show";
  const [lights, setLights] = useState(true);
  const [excluded, setExcluded] = useState([]),
    [winner, setWinner] = useState(null),
    [running, setRunning] = useState(false),
    [rotation, setRotation] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const entries = b.sequence
    .map((label, index) => ({ label, index }))
    .filter((e) => !excluded.includes(e.index));
  const valid = b.sequence.length >= 2 && b.sequence.every((s) => s.trim());
  const colors = isShow
    ? [
        "#da5d75",
        "#638bd7",
        "#51ad99",
        "#e6b443",
        "#a378ca",
        "#e18d5e",
        "#5c9fca",
        "#d76b9f",
      ]
    : ["#5279d6", "#b47ad2", "#4ba395", "#e0ab43", "#d57a8f", "#649dc5"];
  const background = entries.length
    ? `conic-gradient(${entries.map((_, i) => `${colors[i % colors.length]} ${(i * 360) / entries.length}deg ${((i + 1) * 360) / entries.length}deg`).join(",")})`
    : "#e2e8f0";
  const spin = () => {
    if (running || !entries.length) return;
    const index = Math.floor(Math.random() * entries.length),
      selected = entries[index];
    const target = (360 - ((index + 0.5) * 360) / entries.length) % 360;
    setWinner(null);
    setRunning(true);
    setRotation(
      (prev) => prev + 360 * 5 + ((target - (prev % 360) + 360) % 360),
    );
    timer.current = setTimeout(() => {
      setWinner(selected);
      setRunning(false);
      timer.current = null;
    }, 1800);
  };
  return (
    <div
      className={
        "lp-game lp-wheel-game" +
        (isShow ? " lp-wheel-show" : "") +
        (!lights ? " lp-wheel-no-lights" : "")
      }
    >
      <p>{b.body}</p>
      {!valid ? (
        <p className="lp-muted">Thêm ít nhất hai lựa chọn cho vòng quay.</p>
      ) : (
        <>
          <div className="lp-wheel-layout">
            <div className="lp-wheel-stage">
              {isShow && (
                <div className="lp-wheel-bulbs" aria-hidden="true">
                  {Array.from({ length: 20 }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        transform: `rotate(${i * 18}deg) translateY(-145px)`,
                        animationDelay: `${i % 2 ? "-0.7s" : "0s"}`,
                      }}
                    />
                  ))}
                </div>
              )}
              <span className="lp-wheel-pointer" aria-hidden="true">
                ▼
              </span>
              <div
                className="lp-wheel"
                aria-hidden="true"
                style={{ background, transform: `rotate(${rotation}deg)` }}
              >
                {entries.map((e, i) => (
                  <span
                    key={e.index}
                    style={{
                      width: isShow
                        ? Math.min(
                            62,
                            Math.max(
                              22,
                              Math.floor(
                                ((2 * Math.PI * 104) / entries.length) * 0.78,
                              ),
                            ),
                          )
                        : undefined,
                      marginLeft: isShow
                        ? -Math.min(
                            62,
                            Math.max(
                              22,
                              Math.floor(
                                ((2 * Math.PI * 104) / entries.length) * 0.78,
                              ),
                            ),
                          ) / 2
                        : undefined,
                      transform: `rotate(${((i + 0.5) * 360) / entries.length}deg) translateY(-${isShow ? 104 : 92}px) rotate(-${((i + 0.5) * 360) / entries.length}deg)`,
                    }}
                  >
                    {isShow && entries.length <= 12
                      ? e.label.replace(/\s*điểm$/iu, "").length > 14
                        ? e.label.replace(/\s*điểm$/iu, "").slice(0, 12) + "…"
                        : e.label.replace(/\s*điểm$/iu, "")
                      : i + 1}
                  </span>
                ))}
              </div>
              <span className="lp-wheel-center" aria-hidden="true">
                ★
              </span>
            </div>
            <ol className="lp-wheel-entries">
              {entries.map((e) => (
                <li key={e.index}>{e.label}</li>
              ))}
            </ol>
          </div>
          <div className="lp-game-actions">
            {isShow && (
              <button
                aria-pressed={!lights}
                onClick={() => setLights((v) => !v)}
              >
                {lights ? "Tắt hiệu ứng đèn" : "Bật hiệu ứng đèn"}
              </button>
            )}
            <button onClick={spin} disabled={running || !entries.length}>
              {running ? "Đang quay…" : "Quay vòng"}
            </button>
            <button
              disabled={running || !winner}
              onClick={() => {
                setExcluded((prev) => [...prev, winner.index]);
                setWinner(null);
                setRotation(0);
              }}
            >
              Loại lựa chọn vừa quay
            </button>
            <button
              disabled={running}
              onClick={() => {
                setExcluded([]);
                setWinner(null);
                setRotation(0);
              }}
            >
              Khôi phục tất cả
            </button>
          </div>
          {winner && (
            <p role="status" className="lp-wheel-result">
              Được chọn: <strong>{winner.label}</strong>
            </p>
          )}
          {!entries.length && (
            <p role="status">Đã hết lựa chọn. Khôi phục để quay lại.</p>
          )}
        </>
      )}
    </div>
  );
}

export function GroupSort({ block: b }) {
  const groups = [...new Set(b.pairs.map((p) => p.right.trim()))];
  const [selected, setSelected] = useState(null),
    [assignments, setAssignments] = useState({}),
    [checked, setChecked] = useState(false);
  const valid =
    groups.length >= 2 &&
    b.pairs.length >= 2 &&
    b.pairs.every((p) => p.left.trim() && p.right.trim());
  const assign = (index, group) => {
    if (
      checked ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= b.pairs.length ||
      !groups.includes(group)
    )
      return;
    setAssignments((prev) => ({ ...prev, [index]: group }));
    setSelected(null);
  };
  const score = b.pairs.filter(
    (p, i) => assignments[i] === p.right.trim(),
  ).length;
  const item = (p, i) => (
    <button
      key={i}
      draggable={!checked}
      disabled={checked}
      aria-pressed={selected === i}
      className={
        (selected === i ? "lp-selected " : "") +
        (checked
          ? assignments[i] === p.right.trim()
            ? "lp-correct"
            : "lp-incorrect"
          : "")
      }
      onClick={() => setSelected(i)}
      onDragStart={(e) =>
        e.dataTransfer.setData(
          "text/lesson-group",
          JSON.stringify({ blockId: b.id, index: i }),
        )
      }
    >
      {p.left}
    </button>
  );
  return (
    <div className="lp-game">
      <p>{b.body || "Kéo thẻ vào nhóm, hoặc chọn thẻ rồi bấm nút của nhóm."}</p>
      {!valid ? (
        <p className="lp-muted">
          Nhập ít nhất hai nhóm và hai thẻ có nhóm đúng.
        </p>
      ) : (
        <>
          <div className="lp-group-bank" aria-label="Thẻ chưa phân nhóm">
            {b.pairs.map((p, i) =>
              assignments[i] === undefined ? item(p, i) : null,
            )}
            {Object.keys(assignments).length === b.pairs.length && (
              <p className="lp-hint">Đã phân nhóm tất cả các thẻ.</p>
            )}
          </div>
          <div className="lp-groups">
            {groups.map((group) => (
              <section
                key={group}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const source = JSON.parse(
                      e.dataTransfer.getData("text/lesson-group"),
                    );
                    if (source.blockId === b.id) assign(source.index, group);
                  } catch {
                    /* Ignore other exercises. */
                  }
                }}
              >
                <button
                  className="lp-group-title"
                  disabled={checked || selected === null}
                  onClick={() => assign(selected, group)}
                >
                  Đưa vào nhóm: {group}
                </button>
                <div>
                  {b.pairs.map((p, i) =>
                    assignments[i] === group ? item(p, i) : null,
                  )}
                </div>
              </section>
            ))}
          </div>
          <div className="lp-game-actions">
            <button
              disabled={
                checked || Object.keys(assignments).length !== b.pairs.length
              }
              onClick={() => setChecked(true)}
            >
              Kiểm tra phân nhóm
            </button>
            <button
              onClick={() => {
                setAssignments({});
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
              Đúng {score}/{b.pairs.length} thẻ.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function OpenBox({ block: b }) {
  const [opened, setOpened] = useState([]),
    [answers, setAnswers] = useState([]);
  const valid =
    b.pairs.length >= 2 &&
    b.pairs.every((p) => p.left.trim() && p.right.trim());
  return (
    <div className="lp-game">
      <p>{b.body}</p>
      {!valid ? (
        <p className="lp-muted">Nhập ít nhất hai câu hỏi kèm đáp án.</p>
      ) : (
        <>
          <div className="lp-boxes">
            {b.pairs.map((p, i) => (
              <article
                key={i}
                className={opened.includes(i) ? "lp-box-open" : ""}
              >
                <button
                  className="lp-box-face"
                  disabled={opened.includes(i)}
                  aria-label={
                    opened.includes(i)
                      ? `Câu hỏi hộp ${i + 1}`
                      : `Mở hộp ${i + 1}`
                  }
                  onClick={() => setOpened((prev) => [...prev, i])}
                >
                  {opened.includes(i) ? (
                    p.left
                  ) : (
                    <>
                      <span aria-hidden="true">▣</span>Hộp {i + 1}
                    </>
                  )}
                </button>
                {opened.includes(i) &&
                  (answers.includes(i) ? (
                    <p className="lp-box-answer">{p.right}</p>
                  ) : (
                    <button onClick={() => setAnswers((prev) => [...prev, i])}>
                      Hiện đáp án hộp {i + 1}
                    </button>
                  ))}
              </article>
            ))}
          </div>
          <div className="lp-game-actions">
            <button
              onClick={() => {
                setOpened([]);
                setAnswers([]);
              }}
            >
              Đóng tất cả hộp
            </button>
            <span className="lp-muted">
              Đã mở {opened.length}/{b.pairs.length} hộp
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function makeDeck(pairs) {
  return shuffle(
    pairs.flatMap((p, i) => [
      { key: i + "-L", pair: i, label: p.left },
      { key: i + "-R", pair: i, label: p.right },
    ]),
  );
}
export function MemoryPairs({ block: b }) {
  const [deck, setDeck] = useState(() => makeDeck(b.pairs)),
    [flipped, setFlipped] = useState([]),
    [matched, setMatched] = useState([]),
    [turns, setTurns] = useState(0);
  useEffect(() => {
    if (flipped.length !== 2) return;
    const timer = setTimeout(() => setFlipped([]), 1000);
    return () => clearTimeout(timer);
  }, [flipped]);
  const valid =
    b.pairs.length >= 2 &&
    b.pairs.every((p) => p.left.trim() && p.right.trim());
  const flip = (card) => {
    if (
      flipped.length === 2 ||
      flipped.includes(card.key) ||
      matched.includes(card.pair)
    )
      return;
    if (flipped.length === 1) {
      setTurns((v) => v + 1);
      if (deck.find((c) => c.key === flipped[0]).pair === card.pair) {
        setMatched((prev) => [...prev, card.pair]);
        setFlipped([]);
        return;
      }
    }
    setFlipped((prev) => [...prev, card.key]);
  };
  return (
    <div className="lp-game">
      <p>{b.body}</p>
      {!valid ? (
        <p className="lp-muted">Nhập ít nhất hai cặp thẻ để chơi.</p>
      ) : (
        <>
          <p className="lp-memory-score" role="status">
            Đã tìm {matched.length}/{b.pairs.length} cặp · {turns} lượt
            {matched.length === b.pairs.length ? " · Hoàn thành!" : ""}
          </p>
          <div className="lp-memory-grid">
            {deck.map((card, i) => {
              const visible =
                flipped.includes(card.key) || matched.includes(card.pair);
              return (
                <button
                  key={card.key}
                  disabled={
                    matched.includes(card.pair) ||
                    flipped.includes(card.key) ||
                    flipped.length === 2
                  }
                  className={
                    (visible ? "lp-memory-face " : "") +
                    (matched.includes(card.pair) ? "lp-memory-matched" : "")
                  }
                  aria-label={visible ? card.label : `Lật thẻ ${i + 1}`}
                  onClick={() => flip(card)}
                >
                  {visible ? card.label : <span aria-hidden="true">?</span>}
                </button>
              );
            })}
          </div>
          {flipped.length === 2 && (
            <p className="lp-bad">
              Hai thẻ chưa khớp. Ghi nhớ vị trí, thẻ sẽ tự úp lại.
            </p>
          )}
          <div className="lp-game-actions">
            <button
              onClick={() => {
                setDeck(makeDeck(b.pairs));
                setFlipped([]);
                setMatched([]);
                setTurns(0);
              }}
            >
              Chơi lại
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ActivityGame({ block }) {
  if (block.type === "wheel") return <RandomWheel block={block} />;
  if (block.type === "group-sort") return <GroupSort block={block} />;
  if (block.type === "open-box") return <OpenBox block={block} />;
  if (block.type === "memory") return <MemoryPairs block={block} />;
  return null;
}

export function ActivityPrint({ block: b }) {
  return (
    <div className="lp-print-activity">
      <p>{b.body}</p>
      {b.type === "wheel" ? (
        b.sequence.map((s, i) => (
          <p key={i}>
            {i + 1}. {s}
          </p>
        ))
      ) : b.type === "group-sort" ? (
        <>
          <p>Nhóm: {[...new Set(b.pairs.map((p) => p.right))].join(" / ")}</p>
          {b.pairs.map((p, i) => (
            <p key={i}>{p.left} → __________</p>
          ))}
        </>
      ) : b.type === "open-box" ? (
        b.pairs.map((p, i) => (
          <p key={i}>
            Hộp {i + 1}: {p.left}
          </p>
        ))
      ) : (
        <div className="lp-print-memory">
          {b.pairs
            .flatMap((p) => [p.left, p.right])
            .reverse()
            .map((label, i) => (
              <span key={i}>{label}</span>
            ))}
        </div>
      )}
    </div>
  );
}

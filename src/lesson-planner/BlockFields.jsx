import React from "react";

export default function BlockFields({ block: b, change }) {
  const pairLabels =
    b.type === "group-sort"
      ? ["Nội dung", "Nhóm đúng"]
      : b.type === "open-box"
        ? ["Câu hỏi", "Đáp án ẩn"]
        : ["Vế trái", "Vế phải"];
  const field = (key, label, multiline = false, placeholder = "") => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          maxLength={10000}
          value={b[key]}
          onChange={(e) => change({ [key]: e.target.value })}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={b[key]}
          maxLength={key === "url" ? 4000 : 200}
          onChange={(e) => change({ [key]: e.target.value })}
          placeholder={placeholder}
        />
      )}
    </label>
  );
  return (
    <div className="lp-block-fields">
      <div className="lp-two">
        {field("title", b.type === "quiz" ? "Câu hỏi" : "Tiêu đề khối")}
        <label>
          Thời lượng (phút)
          <input
            type="number"
            min={0}
            max={480}
            value={b.minutes}
            onChange={(e) => change({ minutes: Number(e.target.value) })}
          />
        </label>
      </div>
      {b.type === "image" || b.type === "video"
        ? field(
            "url",
            b.type === "image" ? "Liên kết hình ảnh" : "Liên kết video",
            false,
            b.type === "video"
              ? "https://youtube.com/watch?v=… hoặc URL video trực tiếp"
              : "https://…",
          )
        : null}
      {field(
        "body",
        ["heading", "text"].includes(b.type) ? "Nội dung" : "Hướng dẫn / mô tả",
        true,
      )}
      {b.type === "quiz" && (
        <fieldset>
          <legend>Lựa chọn — đánh dấu đáp án đúng</legend>
          {b.options.map((o, i) => (
            <div className="lp-option-edit" key={i}>
              <input
                type="radio"
                aria-label={"Đáp án đúng " + (i + 1)}
                name={"answer-" + b.id}
                checked={b.answer === i}
                onChange={() => change({ answer: i })}
              />
              <input
                aria-label={"Lựa chọn " + (i + 1)}
                maxLength={1000}
                value={o}
                placeholder={"Lựa chọn " + (i + 1)}
                onChange={(e) =>
                  change({
                    options: b.options.map((v, j) =>
                      j === i ? e.target.value : v,
                    ),
                  })
                }
              />
              <button
                disabled={b.options.length <= 2}
                aria-label={"Xóa lựa chọn " + (i + 1)}
                onClick={() =>
                  change({
                    options: b.options.filter((_, j) => j !== i),
                    answer:
                      b.answer === i
                        ? 0
                        : b.answer > i
                          ? b.answer - 1
                          : b.answer,
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            disabled={b.options.length >= 12}
            onClick={() => change({ options: [...b.options, ""] })}
          >
            + Thêm lựa chọn
          </button>
        </fieldset>
      )}
      {["matching", "memory", "open-box", "group-sort"].includes(b.type) && (
        <fieldset>
          <legend>
            {b.type === "group-sort"
              ? "Nội dung và nhóm đúng (ít nhất hai nhóm)"
              : b.type === "open-box"
                ? "Câu hỏi trong hộp và đáp án"
                : "Các cặp đúng"}
          </legend>
          {b.pairs.map((p, i) => (
            <div className="lp-pair-edit" key={i}>
              <input
                aria-label={pairLabels[0] + " cặp " + (i + 1)}
                placeholder={pairLabels[0]}
                maxLength={1000}
                value={p.left}
                onChange={(e) =>
                  change({
                    pairs: b.pairs.map((v, j) =>
                      i === j ? { ...v, left: e.target.value } : v,
                    ),
                  })
                }
              />
              <span>↔</span>
              <input
                aria-label={pairLabels[1] + " cặp " + (i + 1)}
                placeholder={pairLabels[1]}
                maxLength={1000}
                value={p.right}
                onChange={(e) =>
                  change({
                    pairs: b.pairs.map((v, j) =>
                      i === j ? { ...v, right: e.target.value } : v,
                    ),
                  })
                }
              />
              <button
                disabled={b.pairs.length <= 2}
                aria-label={"Xóa cặp " + (i + 1)}
                onClick={() =>
                  change({ pairs: b.pairs.filter((_, j) => j !== i) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            disabled={b.pairs.length >= 12}
            onClick={() =>
              change({ pairs: [...b.pairs, { left: "", right: "" }] })
            }
          >
            + Thêm cặp
          </button>
        </fieldset>
      )}
      {["ordering", "wheel"].includes(b.type) && (
        <fieldset>
          <legend>
            {b.type === "wheel"
              ? "Các lựa chọn trên vòng quay"
              : "Các bước theo thứ tự đúng"}
          </legend>
          {b.sequence.map((s, i) => (
            <div className="lp-option-edit" key={i}>
              <span>{i + 1}.</span>
              <input
                aria-label={
                  (b.type === "wheel" ? "Lựa chọn quay " : "Bước đúng ") +
                  (i + 1)
                }
                maxLength={1000}
                value={s}
                onChange={(e) =>
                  change({
                    sequence: b.sequence.map((v, j) =>
                      i === j ? e.target.value : v,
                    ),
                  })
                }
              />
              <button
                disabled={b.sequence.length <= 2}
                aria-label={"Xóa bước " + (i + 1)}
                onClick={() =>
                  change({ sequence: b.sequence.filter((_, j) => j !== i) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            disabled={b.sequence.length >= 20}
            onClick={() => change({ sequence: [...b.sequence, ""] })}
          >
            {b.type === "wheel" ? "+ Thêm lựa chọn quay" : "+ Thêm bước"}
          </button>
          <p className="lp-hint">
            {b.type === "wheel"
              ? "Các lựa chọn có xác suất được chọn như nhau. Có thể loại lựa chọn đã quay trong chế độ chơi thử."
              : "Các bước sẽ được đảo thứ tự khi chơi thử."}
          </p>
        </fieldset>
      )}
      {b.type === "wheel" && (
        <label>
          Kiểu vòng quay
          <select
            value={b.wheelTheme || "classic"}
            onChange={(e) => change({ wheelTheme: e.target.value })}
          >
            <option value="classic">Vòng quay ngẫu nhiên</option>
            <option value="show">Chiếc nón kỳ diệu</option>
          </select>
        </label>
      )}
    </div>
  );
}

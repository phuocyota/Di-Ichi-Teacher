import { defaultAppearance } from "./appearance.js";
export const BLOCKS = {
  heading: { label: "Tiêu đề", icon: "H", hint: "Chia phần của giáo án" },
  text: { label: "Nội dung", icon: "¶", hint: "Mục tiêu, hướng dẫn, ghi chú" },
  image: { label: "Hình ảnh", icon: "▧", hint: "Ảnh minh họa từ liên kết" },
  video: { label: "Video", icon: "▶", hint: "YouTube hoặc tệp video" },
  quiz: { label: "Trắc nghiệm", icon: "?", hint: "Câu hỏi một đáp án đúng" },
  matching: { label: "Ghép cặp", icon: "⇄", hint: "Kéo thẻ để ghép hai cột" },
  ordering: {
    label: "Sắp xếp",
    icon: "↕",
    hint: "Đưa các bước về đúng thứ tự",
  },
  wheel: {
    label: "Vòng quay ngẫu nhiên",
    icon: "◉",
    hint: "Quay chọn câu hỏi hoặc nhiệm vụ",
  },
  "group-sort": {
    label: "Phân nhóm",
    icon: "▦",
    hint: "Kéo nội dung vào đúng nhóm",
  },
  "open-box": {
    label: "Mở hộp bí mật",
    icon: "▣",
    hint: "Mở câu hỏi và khám phá đáp án",
  },
  memory: {
    label: "Lật thẻ tìm cặp",
    icon: "▥",
    hint: "Ghi nhớ và tìm hai thẻ tương ứng",
  },
};
export function createBlock(type) {
  if (!BLOCKS[type]) throw new Error("Loại khối không hợp lệ");
  return {
    id: crypto.randomUUID(),
    type,
    title: "",
    body: "",
    minutes: 0,
    url: "",
    options: type === "quiz" ? ["", ""] : [],
    answer: 0,
    pairs: ["matching", "group-sort", "open-box", "memory"].includes(type)
      ? [
          { left: "", right: "" },
          { left: "", right: "" },
        ]
      : [],
    sequence: ["ordering", "wheel"].includes(type) ? ["", ""] : [],
  };
}
export function moveBlock(blocks, id, slot) {
  const from = blocks.findIndex((b) => b.id === id);
  if (from < 0) return blocks;
  const next = [...blocks],
    [block] = next.splice(from, 1);
  next.splice(
    Math.max(0, Math.min(next.length, slot > from ? slot - 1 : slot)),
    0,
    block,
  );
  return next;
}
export function newPlan(classId = "") {
  return {
    appearance: defaultAppearance(),
    classId,
    title: "",
    subject: "",
    grade: "",
    duration: 45,
    teachingDate: "",
    status: "draft",
    blocks: [],
    revision: 0,
  };
}
export function lessonTemplate() {
  return [
    {
      ...createBlock("text"),
      title: "Mục tiêu bài học",
      body: "Sau bài học, học sinh có thể:\n• [Kiến thức cần đạt]\n• [Kỹ năng cần thực hành]\n• [Sản phẩm hoặc biểu hiện quan sát được]",
    },
    {
      ...createBlock("text"),
      title: "Khởi động",
      minutes: 5,
      body: "Giáo viên: [Câu hỏi gợi mở hoặc tình huống xuất phát]\nHọc sinh: [Chia sẻ dự đoán, kinh nghiệm]\nSản phẩm: [Ý kiến hoặc câu trả lời ban đầu]",
    },
    {
      ...createBlock("text"),
      title: "Khám phá kiến thức",
      minutes: 15,
      body: "Giáo viên: [Giao nhiệm vụ và học liệu]\nHọc sinh: [Quan sát, thảo luận, trình bày]\nĐánh giá: [Tiêu chí và cách phản hồi]",
    },
    {
      ...createBlock("text"),
      title: "Luyện tập",
      minutes: 15,
      body: "[Thêm khối trắc nghiệm, ghép cặp hoặc sắp xếp để tổ chức luyện tập.]",
    },
    {
      ...createBlock("text"),
      title: "Vận dụng và kết thúc",
      minutes: 10,
      body: "Vận dụng: [Nhiệm vụ gắn với tình huống thực tế]\nCủng cố: [Nội dung trọng tâm]\nBài tập về nhà: [Nhiệm vụ phù hợp]\nĐiều chỉnh sau bài dạy: [Ghi nhận và bổ sung]",
    },
  ];
}
export function mediaUrl(raw) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function youtubeEmbed(raw) {
  try {
    const u = new URL(raw);
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
              u.hostname,
            )
          ? u.searchParams.get("v") ||
            u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
          : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? "https://www.youtube-nocookie.com/embed/" + id
      : "";
  } catch {
    return "";
  }
}

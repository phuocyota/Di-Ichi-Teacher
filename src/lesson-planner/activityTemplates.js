import { createBlock } from "./blocks.js";

export const ACTIVITY_TEMPLATES = [
  {
    id: "quiz",
    name: "Trắc nghiệm tương tác",
    english: "Quiz",
    description: "Ba câu hỏi mẫu, lựa chọn và đáp án có sẵn.",
    icon: "?",
    color: "quiz",
  },
  {
    id: "matching",
    name: "Nối cặp kiến thức",
    english: "Match Up",
    description: "Nối phân số với cách đọc tương ứng.",
    icon: "⇄",
    color: "matching",
  },
  {
    id: "wheel",
    name: "Vòng quay ngẫu nhiên",
    english: "Random Wheel",
    description: "Quay chọn nhiệm vụ khởi động hoặc ôn tập.",
    icon: "◉",
    color: "wheel",
  },
  {
    id: "lucky-wheel",
    name: "Chiếc nón kỳ diệu",
    english: "Lucky Wheel",
    description: "Vòng quay sân khấu với ô điểm và phần thưởng sửa được.",
    icon: "★",
    color: "wheel",
  },
  {
    id: "group-sort",
    name: "Phân loại nội dung",
    english: "Group Sort",
    description: "Kéo các thẻ vào hai nhóm đã chuẩn bị.",
    icon: "▦",
    color: "group-sort",
  },
  {
    id: "open-box",
    name: "Mở hộp bí mật",
    english: "Open the Box",
    description: "Mở từng hộp câu hỏi, sau đó hiện đáp án.",
    icon: "▣",
    color: "open-box",
  },
  {
    id: "memory",
    name: "Lật thẻ tìm cặp",
    english: "Matching Pairs",
    description: "Lật và ghi nhớ vị trí các cặp thẻ.",
    icon: "▥",
    color: "memory",
  },
];
const fractionPairs = () => [
  { left: "1/2", right: "Một phần hai" },
  { left: "1/3", right: "Một phần ba" },
  { left: "3/4", right: "Ba phần tư" },
];
export function createActivityTemplate(id) {
  const block = (type, values) => ({
    ...createBlock(type),
    minutes: 5,
    ...values,
  });
  switch (id) {
    case "quiz":
      return [
        block("quiz", {
          title: "Trong phân số 3/4, mẫu số là số nào?",
          body: "Chọn một đáp án rồi bấm kiểm tra.",
          minutes: 3,
          options: ["3", "4", "7"],
          answer: 1,
        }),
        block("quiz", {
          title:
            "Một chiếc bánh chia 4 phần bằng nhau. Ăn 1 phần là ăn bao nhiêu chiếc bánh?",
          minutes: 3,
          options: ["1/4", "4/1", "3/4"],
          answer: 0,
        }),
        block("quiz", {
          title: "Phân số nào bằng 1/2?",
          minutes: 4,
          options: ["1/3", "2/3", "2/4"],
          answer: 2,
        }),
      ];
    case "matching":
      return [
        block("matching", {
          title: "Nối phân số với cách đọc",
          body: "Kéo thẻ bên trái vào ô bên phải hoặc bấm chọn hai thẻ tương ứng.",
          pairs: fractionPairs(),
        }),
      ];
    case "wheel":
      return [
        block("wheel", {
          title: "Vòng quay ôn tập phân số",
          body: "Quay vòng để chọn một nhiệm vụ và trả lời trước lớp.",
          sequence: [
            "Đọc phân số 3/4",
            "Nêu tử số của 2/5",
            "Nêu mẫu số của 4/7",
            "Vẽ hình biểu diễn 1/2",
            "Tìm một phân số bằng 1/2",
            "Nêu một ví dụ về phân số trong cuộc sống",
          ],
        }),
      ];
    case "lucky-wheel":
      return [
        block("wheel", {
          title: "Chiếc nón kỳ diệu",
          body: "Trả lời câu hỏi của giáo viên rồi quay để chọn điểm hoặc phần thưởng trong trò chơi. Điểm chơi thử không được ghi vào sổ điểm.",
          wheelTheme: "show",
          sequence: [
            "100 điểm",
            "200 điểm",
            "300 điểm",
            "Thêm lượt",
            "400 điểm",
            "Mất lượt",
            "500 điểm",
            "Một tràng pháo tay",
          ],
        }),
      ];
    case "group-sort":
      return [
        block("group-sort", {
          title: "Phân loại phân số",
          body: "Đưa mỗi phân số vào nhóm phù hợp rồi kiểm tra.",
          pairs: [
            { left: "1/2", right: "Nhỏ hơn 1" },
            { left: "3/4", right: "Nhỏ hơn 1" },
            { left: "2/3", right: "Nhỏ hơn 1" },
            { left: "5/4", right: "Lớn hơn 1" },
            { left: "7/3", right: "Lớn hơn 1" },
            { left: "4/3", right: "Lớn hơn 1" },
          ],
        }),
      ];
    case "open-box":
      return [
        block("open-box", {
          title: "Hộp bí mật về phân số",
          body: "Chọn một hộp, trả lời câu hỏi rồi bấm hiện đáp án để đối chiếu.",
          pairs: [
            {
              left: "Phân số 2/5 có tử số là bao nhiêu?",
              right: "Tử số là 2.",
            },
            {
              left: "Phân số 3/7 có mẫu số là bao nhiêu?",
              right: "Mẫu số là 7.",
            },
            { left: "Đọc phân số 4/9.", right: "Bốn phần chín." },
            {
              left: "Một nửa chiếc bánh viết bằng phân số nào?",
              right: "1/2.",
            },
          ],
        }),
      ];
    case "memory":
      return [
        block("memory", {
          title: "Tìm cặp phân số và cách đọc",
          body: "Lật hai thẻ để tìm phân số và cách đọc tương ứng. Ghi nhớ các thẻ chưa khớp.",
          pairs: fractionPairs(),
        }),
      ];
    default:
      throw new Error("Không tìm thấy mẫu hoạt động");
  }
}

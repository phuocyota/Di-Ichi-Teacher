// Các phần dữ liệu cổng giáo viên; mỗi phần đọc qua route GET riêng (xem portalLoaders.js).
export const PORTAL_SECTIONS = [
  "courses",
  "students",
  "enrollments",
  "schedules",
  "homework",
  "submissions",
  "scores",
  "certificates",
  "records",
  "notifications",
  "documents",
];

// Header (thông báo), Sidebar (lịch hôm nay, số học sinh) và nhắc lịch dạy luôn hiển thị.
export const LAYOUT_SECTIONS = ["notifications", "schedules", "students"];

const CLASS_VIEW = ["students", "enrollments"];
const RECORD_VIEW = ["records", "documents", "schedules", ...CLASS_VIEW];

/** Phần dữ liệu từng màn PortalScreen cần; màn không có trong bảng dùng màn học liệu. */
export function sectionsForMode(mode, teacher) {
  const classView = [
    "courses",
    "schedules",
    "homework",
    "submissions",
    "scores",
    ...RECORD_VIEW,
  ];
  const sections = {
    dashboard: teacher
      ? ["homework", "submissions", "notifications", "schedules"]
      : ["homework", "notifications", "schedules", "records"],
    profile: [],
    // "classes" và "courses" dùng chung màn lớp học có các tab học sinh/điểm danh/bài tập/kết quả.
    classes: classView,
    courses: classView,
    schedules: ["schedules", "records", ...CLASS_VIEW],
    homework: ["homework", "submissions", "records", ...CLASS_VIEW],
    grading: ["homework", "submissions", "records", ...CLASS_VIEW],
    progress: ["scores", "homework", "submissions", "records", ...CLASS_VIEW],
    certificates: ["certificates"],
    achievements: ["records"],
  }[mode];
  return [...new Set(sections ?? RECORD_VIEW)];
}

// Tài nguyên thay đổi (từ /updates) -> phần snapshot cần tải lại. Không có trong bảng: tải lại mọi phần đang dùng.
const RESOURCE_SECTIONS = {
  schedule: ["schedules", "records"],
  "attendance-record": ["records"],
  homework: ["homework", "submissions"],
  "homework-submission": ["submissions"],
  score: ["scores"],
  notification: ["notifications"],
  document: ["documents"],
  "class-document": ["documents"],
  "student-certificate": ["certificates"],
  student: ["students"],
  enrollment: ["enrollments", "students"],
  room: ["schedules"],
  "class-room": ["schedules"],
  "class-weekly-schedule": ["schedules"],
  // Màn portal giáo viên không hiển thị học liệu thư viện hay tài chính.
  "lesson-library": [],
  "finance-transaction": [],
  payment: [],
  "debt-schedule": [],
  portal: ["records", "homework", "submissions", "scores", "notifications"],
  workspace: ["schedules", "records", "notifications"],
};

/**
 * Phần đang dùng bị ảnh hưởng bởi thay đổi; `base` = cần tải lại hồ sơ và danh sách lớp.
 * Không có phần nào và base=false nghĩa là không cần gọi API.
 */
export function sectionsForChange(change, active) {
  const resources = change?.resources ?? [];
  if (change?.resync || resources.includes("*"))
    return { sections: [...active], base: true };
  const affected = new Set();
  for (const resource of resources) {
    const mapped = RESOURCE_SECTIONS[resource];
    // Lớp, khóa học, nhân sự... đổi thì profile/classes đổi: tải lại toàn bộ phần đang dùng.
    if (!mapped) return { sections: [...active], base: true };
    mapped.forEach((section) => affected.add(section));
  }
  return {
    sections: [...active].filter((section) => affected.has(section)),
    base: false,
  };
}

/** Gộp phản hồi một phần vào dữ liệu hiện có; files hợp nhất theo id vì đến từ nhiều phần. */
export function mergeSnapshot(current, next, sections, { base = true } = {}) {
  const files = new Map((current?.files ?? []).map((file) => [file.id, file]));
  for (const file of next.files ?? []) files.set(file.id, file);
  const merged = {
    ...current,
    // Chỉ nhận profile/classes từ phản hồi mới nhất đã áp dụng.
    profile: base || !current ? next.profile : current.profile,
    classes: base || !current ? next.classes : current.classes,
    files: [...files.values()],
  };
  for (const section of sections) {
    merged[section] = next[section];
    if (section === "documents") merged.classDocuments = next.classDocuments;
  }
  return merged;
}

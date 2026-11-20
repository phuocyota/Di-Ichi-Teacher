import { api } from "../services/api.js";
import { portalRequest } from "../services/portalApi.js";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Đọc hết các trang của route GET CRUD; backend tự lọc theo lớp được phân công của giáo viên. */
export async function listAll(path, params = {}, signal) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await api.get(path, {
      params: { ...params, page, size: PAGE_SIZE },
      signal,
    });
    const data = Array.isArray(result?.data) ? result.data : [];
    rows.push(...data);
    if (!data.length || rows.length >= Number(result?.total ?? 0)) return rows;
  }
  throw new Error(`Dữ liệu ${path} quá lớn, vui lòng lọc bớt.`);
}

const byTime = (key, direction = 1) => (a, b) =>
  direction * (Date.parse(a[key] ?? 0) - Date.parse(b[key] ?? 0));

/** Mỗi phần dữ liệu màn hình gọi đúng route GET của nó. Trả về các khóa sẽ gộp vào data. */
export const SECTION_LOADERS = {
  courses: async (signal) => ({ courses: await listAll("/course", {}, signal) }),
  students: async (signal) => ({
    students: await listAll("/student", {}, signal),
  }),
  enrollments: async (signal) => ({
    enrollments: await listAll("/enrollment", { isCurrent: true }, signal),
  }),
  schedules: async (signal) => ({
    schedules: (await listAll("/schedule", {}, signal))
      .map((s) => ({
        id: s.id,
        classId: s.classId,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        lessonNote: s.lessonNote,
        room: s.room,
        teacher: s.teacher,
      }))
      .sort(byTime("startAt")),
  }),
  homework: async (signal) => ({
    homework: (await listAll("/homework", {}, signal)).sort(
      byTime("deadline", -1),
    ),
  }),
  submissions: async (signal) => ({
    submissions: await listAll("/homework-submission", {}, signal),
  }),
  scores: async (signal) => ({ scores: await listAll("/score", {}, signal) }),
  // Chứng chỉ chỉ hiển thị ở cổng học viên.
  certificates: async () => ({ certificates: [] }),
  notifications: async (signal) => ({
    notifications: (await listAll("/notification", {}, signal))
      .sort(byTime("createdAt", -1))
      .slice(0, 100),
  }),
  // Bài giảng, quiz, học liệu, điểm danh không có route CRUD: dùng route portal tương ứng.
  records: async (signal) => {
    const { records, files } = await portalRequest("/records", { signal });
    return { records, files };
  },
  documents: async (signal) => {
    const [documents, classDocuments] = await Promise.all([
      listAll("/document", {}, signal),
      listAll("/class-document", {}, signal),
    ]);
    return {
      documents,
      classDocuments,
      files: documents
        .filter((d) => d.fileId)
        .map((d) => ({ id: d.fileId, fileName: d.fileName })),
    };
  },
};

/** Phần nền luôn tải: hồ sơ (route portal) và lớp được phân công (GET /class). */
export async function loadBase(signal) {
  const [profile, classes] = await Promise.all([
    portalRequest("/profile", { signal }),
    listAll("/class", {}, signal),
  ]);
  return { profile, classes };
}

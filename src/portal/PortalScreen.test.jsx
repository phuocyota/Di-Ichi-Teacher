import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalProvider } from "./PortalContext.jsx";
import { PortalScreen } from "./PortalScreen.jsx";
import { CLOSED_TIMEKEEPING_MESSAGE, dayVN, readTimekeeping, saveTimekeeping, timekeepingBlockReason } from './teachingTimekeeping.js';

const empty = () => ({
  profile: {
    id: "student-1",
    userId: "user-1",
    name: "API User",
    email: "api@test.local",
    userType: "STUDENT",
  },
  classes: [],
  courses: [],
  students: [],
  enrollments: [],
  schedules: [],
  homework: [],
  submissions: [],
  scores: [],
  certificates: [],
  records: [],
  notifications: [],
  documents: [],
  classDocuments: [],
});
const ok = (data) => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, data }),
});
function mount(mode) {
  return render(
    <MemoryRouter>
      <PortalProvider>
        <PortalScreen mode={mode} />
      </PortalProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    removeItem: vi.fn(),
  });
  vi.stubGlobal("sessionStorage", {
    getItem: vi.fn(() => null),
    removeItem: vi.fn(),
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(empty())));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("API portal screens", () => {
  it("rejects malformed successful responses and recovers through retry", async () => {
    fetch.mockResolvedValue(ok({ profile: { name: "Broken" } }));
    mount("dashboard");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dữ liệu portal không đúng định dạng",
    );
    fetch.mockResolvedValue(ok(empty()));
    fireEvent.click(screen.getByText("Thử lại"));
    expect(await screen.findByText("Tổng quan học tập")).toBeInTheDocument();
  });
  it("surfaces nested API errors instead of displaying empty fixture data", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "Không có quyền truy cập" } }),
    });
    mount("classes");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không có quyền truy cập",
    );
  });
  it.each(
    [
      "dashboard",
      "classes",
      "courses",
      "schedules",
      "homework",
      "grading",
      "quiz",
      "exam",
      "lesson",
      "material",
      "progress",
      "certificates",
      "achievements",
      "profile",
    ].flatMap((mode) => ["TEACHER", "STUDENT"].map((role) => [mode, role])),
  )(
    "renders %s for %s with an empty API response without fixtures or crashes",
    async (mode, role) => {
      const data = empty();
      data.profile.userType = role;
      fetch.mockResolvedValue(ok(data));
      mount(mode);
      await waitFor(() =>
        expect(screen.queryByText("Đang tải dữ liệu…")).not.toBeInTheDocument(),
      );
      expect(fetch.mock.calls[0][0]).toMatch(/\/portal\/snapshot$/);
      expect(
        screen.queryByText(
          /Minh Anh|Cô Linh|Explorer English|Past Simple Story/,
        ),
      ).not.toBeInTheDocument();
    },
  );
  it("shows a retryable error and never falls back to demo data", async () => {
    fetch.mockRejectedValue(new Error("API unavailable"));
    mount("dashboard");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "API unavailable",
    );
    expect(screen.queryByText("API User")).not.toBeInTheDocument();
    fetch.mockResolvedValue(ok(empty()));
    fireEvent.click(screen.getByText("Thử lại"));
    expect(await screen.findByText("Tổng quan học tập")).toBeInTheDocument();
  });
  it("submits homework text to the API and displays the reloaded submission", async () => {
    const data = empty();
    data.homework = [
      {
        id: "homework-1",
        classId: "class-1",
        title: "API Homework",
        deadline: "2027-01-01",
        status: "assigned",
      },
    ];
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "POST") {
        expect(url).toMatch(/\/homework\/homework-1\/submissions$/);
        expect(JSON.parse(options.body)).toEqual({
          fileIds: [],
          note: "My persisted answer",
        });
        data.submissions = [
          {
            id: "submission-1",
            homeworkId: "homework-1",
            submittedAt: "2026-10-29",
          },
        ];
        data.records = [
          {
            id: "meta-1",
            kind: "submission-files",
            parentId: "submission-1",
            content: { text: "My persisted answer" },
          },
        ];
        return ok({ id: "submission-1" });
      }
      return ok(structuredClone(data));
    });
    mount("homework");
    fireEvent.change(await screen.findByLabelText("Bài làm"), {
      target: { value: "My persisted answer" },
    });
    fireEvent.click(screen.getByText("Gửi bài cho giáo viên"));
    expect(await screen.findByText("My persisted answer")).toBeInTheDocument();
    expect(
      screen.getByText("Đang chờ giáo viên chấm/trả bài."),
    ).toBeInTheDocument();
  });
  it("includes teacher exams in the student quiz list", async () => {
    const data = empty();
    data.records = [
      {
        id: "exam-1",
        kind: "exam",
        content: { title: "Exam from teacher", duration: 15, questions: [] },
      },
    ];
    fetch.mockResolvedValue(ok(data));
    mount("quiz");
    expect(await screen.findByText("Exam from teacher")).toBeInTheDocument();
  });
});

function teacherData() {
  const data = empty();
  data.profile = {
    ...data.profile,
    id: "teacher-1",
    userType: "TEACHER",
    name: "Giáo viên API",
  };
  data.classes = [
    { id: "class-1", name: "Lớp từ API", code: "CLASS-1", status: "active" },
  ];
  data.students = [
    { id: "student-1", name: "Học sinh API", code: "STUDENT-1" },
  ];
  data.enrollments = [
    {
      id: "enrollment-1",
      classId: "class-1",
      studentId: "student-1",
      isCurrent: true,
    },
  ];
  return data;
}

describe('Teacher timetable and provisional timekeeping', () => {
  function setupSchedule(status = 'active', day = dayVN()) {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: vi.fn(success => success({ coords: { latitude: 10.7326, longitude: 106.7199, accuracy: 8 }, timestamp: Date.now() })),
    } });
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => storage.get(key) || null),
      setItem: vi.fn((key, value) => storage.set(key, value)),
      removeItem: vi.fn(key => storage.delete(key)),
    });
    const data = teacherData();
    data.schedules = [{ id: 'session-1', classId: 'class-1', startAt: `${day}T00:00:00+07:00`, endAt: `${day}T23:59:59+07:00`, periods: 2, status }];
    fetch.mockResolvedValue(ok(data));
    return data;
  }
  it('saves separate check-in/out locations, persists after remount and hides students', async () => {
    setupSchedule();
    const view = mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã check-in'));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    await new Promise(resolve => setTimeout(resolve, 5));
    navigator.geolocation.getCurrentPosition.mockImplementation(success => success({ coords: { latitude: 10.733, longitude: 106.72, accuracy: 12 }, timestamp: Date.now() }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-out' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã check-out'));
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeDisabled();
    expect(readTimekeeping('user-1')['session-1']).toMatchObject({ source: 'teacher-local', checkIn: expect.any(String), checkOut: expect.any(String) });
    expect(readTimekeeping('user-1')['session-1'].checkInEvidence).toMatchObject({ latitude: 10.7326, longitude: 106.7199, accuracy: 8, capturedAt: expect.any(String) });
    expect(readTimekeeping('user-1')['session-1'].checkOutEvidence).toMatchObject({ latitude: 10.733, longitude: 106.72, accuracy: 12 });
    expect(screen.getByRole('link', { name: 'Xem vị trí Check-in trên bản đồ ↗' })).toHaveAttribute('href', expect.stringContaining('10.7326%2C106.7199'));
    expect(fetch.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
    view.unmount();
    mount('schedules');
    expect(await screen.findByText('Đã chấm công đầy đủ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeDisabled();
    expect(screen.queryByLabelText('Điểm danh Học sinh API')).not.toBeInTheDocument();
    expect(screen.getByText('10.733000, 106.720000')).toBeInTheDocument();
    expect(readTimekeeping('another-teacher')).toEqual({});
  });
  it('disables cancelled lessons and dates outside today', async () => {
    setupSchedule('cancelled');
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    expect(screen.queryByLabelText('Điểm danh Học sinh API')).not.toBeInTheDocument();
    cleanup();
    setupSchedule('upcoming', '2027-01-05');
    mount('schedules');
    fireEvent.change(await screen.findByLabelText('Chọn tuần giảng dạy'), { target: { value: '2027-01-05' } });
    fireEvent.click(screen.getByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    expect(screen.getByText('Chỉ có thể check-in/check-out cho buổi dạy hôm nay.')).toBeInTheDocument();
  });
  it('reports storage failures without showing a successful check-in', async () => {
    setupSchedule();
    localStorage.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được chấm công');
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('validates sequence, duplicate operations and Vietnam date boundaries', () => {
    const data = setupSchedule();
    const schedule = data.schedules[0];
    const now = Date.parse(`${dayVN()}T10:00:00+07:00`);
    expect(() => saveTimekeeping('user-1', schedule, 'checkOut', now)).toThrow('Cần check-in');
    expect(() => saveTimekeeping('user-1', schedule, 'checkIn', now)).toThrow('Cần lấy vị trí');
    saveTimekeeping('user-1', schedule, 'checkIn', now, { latitude: 10.7326, longitude: 106.7199, accuracy: 8, capturedAt: new Date(now).toISOString() });
    expect(() => saveTimekeeping('user-1', schedule, 'checkIn', now + 1000)).toThrow('đã được ghi nhận');
    expect(() => saveTimekeeping('user-1', schedule, 'checkOut', now - 1000)).toThrow('phải sau check-in');
    expect(dayVN('2026-11-03T18:00:00Z')).toBe('2026-11-04');
  });
  it.each([1, 2, 3])('does not save attendance when geolocation fails with code %s', async code => {
    setupSchedule();
    navigator.geolocation.getCurrentPosition.mockImplementation((_success, fail) => fail({ code }));
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/vị trí/);
    expect(readTimekeeping('user-1')).toEqual({});
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeEnabled();
  });
  it('locks duplicate clicks and discards location results after the dialog is closed', async () => {
    setupSchedule();
    let resolveLocation;
    navigator.geolocation.getCurrentPosition.mockImplementation(success => { resolveLocation = success; });
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đang lấy vị trí');
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng chi tiết lịch dạy' }));
    resolveLocation({ coords: { latitude: 10.7326, longitude: 106.7199, accuracy: 8 }, timestamp: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(readTimekeeping('user-1')).toEqual({});
    fireEvent.click(screen.getByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeEnabled();
  });
  it.each(['checkIn', 'checkOut'])('blocks %s after the class ends and directs the teacher to admin', async action => {
    const data = setupSchedule();
    const schedule = data.schedules[0];
    const end = Date.parse(`${dayVN()}T10:00:00+07:00`);
    schedule.endAt = new Date(end).toISOString();
    const evidence = { latitude: 10.7326, longitude: 106.7199, accuracy: 8, capturedAt: new Date(end - 60000).toISOString() };
    if (action === 'checkOut') saveTimekeeping('user-1', schedule, 'checkIn', end - 60000, evidence);
    const before = readTimekeeping('user-1');
    expect(timekeepingBlockReason(schedule, end)).toBe('');
    expect(timekeepingBlockReason(schedule, end + 1)).toBe(CLOSED_TIMEKEEPING_MESSAGE);
    expect(() => saveTimekeeping('user-1', schedule, action, end + 1, evidence)).toThrow(CLOSED_TIMEKEEPING_MESSAGE);
    expect(readTimekeeping('user-1')).toEqual(before);
    vi.spyOn(Date, 'now').mockReturnValue(end + 1);
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeDisabled();
    expect(screen.getByText(CLOSED_TIMEKEEPING_MESSAGE)).toBeInTheDocument();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
  it('rejects a pending location result if the class ends before it arrives', async () => {
    const data = setupSchedule();
    let now = Date.parse(`${dayVN()}T10:00:00+07:00`);
    data.schedules[0].endAt = new Date(now + 5000).toISOString();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    let resolveLocation;
    navigator.geolocation.getCurrentPosition.mockImplementation(success => { resolveLocation = success; });
    mount('schedules');
    fireEvent.click(await screen.findByRole('button', { name: /Xem lịch dạy Lớp từ API/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    now += 5001;
    resolveLocation({ coords: { latitude: 10.7326, longitude: 106.7199, accuracy: 8 }, timestamp: now });
    expect(await screen.findByRole('alert')).toHaveTextContent(CLOSED_TIMEKEEPING_MESSAGE);
    expect(readTimekeeping('user-1')).toEqual({});
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe("Teacher API workflows", () => {
  it("creates homework through the API and displays the reloaded record", async () => {
    const data = teacherData();
    let writes = 0;
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "POST") {
        writes++;
        expect(url).toMatch(/\/portal\/homework$/);
        const body = JSON.parse(options.body);
        expect(body).toMatchObject({
          classId: "class-1",
          title: "Bài tập mới API",
          note: "Nội dung bài tập",
        });
        expect(Number.isFinite(Date.parse(body.deadline))).toBe(true);
        data.homework.push({ ...body, id: "homework-1", status: "assigned" });
        return ok(data.homework[0]);
      }
      return ok(structuredClone(data));
    });
    mount("homework");
    fireEvent.click(await screen.findByText("Giao bài tập"));
    fireEvent.change(screen.getByLabelText("Lớp học"), {
      target: { value: "class-1" },
    });
    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: { value: "Bài tập mới API" },
    });
    fireEvent.change(screen.getByLabelText("Hạn nộp"), {
      target: { value: "2027-01-05T18:30" },
    });
    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: { value: "Nội dung bài tập" },
    });
    fireEvent.click(screen.getByText("Lưu"));
    expect(await screen.findByText("Bài tập mới API")).toBeInTheDocument();
    expect(writes).toBe(1);
  });
  it("searches grading by student name, blocks fractional grades, and reloads returned grades", async () => {
    const data = teacherData();
    data.homework = [
      { id: "homework-1", classId: "class-1", title: "Bài tập API" },
    ];
    data.submissions = [
      {
        id: "submission-1",
        studentId: "student-1",
        homeworkId: "homework-1",
        score: null,
      },
    ];
    let writes = 0;
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "PATCH") {
        writes++;
        expect(url).toMatch(/\/submissions\/submission-1\/grade$/);
        expect(JSON.parse(options.body)).toEqual({
          score: 85,
          note: "Đã kiểm tra",
          returned: true,
        });
        data.submissions[0] = {
          ...data.submissions[0],
          score: 85,
          markedBy: "teacher-1",
          note: "Đã kiểm tra",
        };
        data.records = [
          {
            id: "meta-1",
            kind: "submission-files",
            parentId: "submission-1",
            content: { returned: true },
          },
        ];
        return ok(data.submissions[0]);
      }
      return ok(structuredClone(data));
    });
    mount("grading");
    await screen.findByText("Học sinh API · Bài tập API");
    fireEvent.change(screen.getByLabelText("Tìm kiếm"), {
      target: { value: "Học sinh API" },
    });
    expect(screen.getByText("Học sinh API · Bài tập API")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Điểm /100"), {
      target: { value: "85.5" },
    });
    expect(screen.getByText("Lưu và trả bài")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Điểm /100"), {
      target: { value: "85" },
    });
    fireEvent.change(screen.getByLabelText("Nhận xét"), {
      target: { value: "Đã kiểm tra" },
    });
    fireEvent.click(screen.getByText("Lưu và trả bài"));
    expect(await screen.findByText("Đã trả bài")).toBeInTheDocument();
    expect(writes).toBe(1);
  });
  it("persists attendance and shows the saved status after snapshot reload", async () => {
    const data = teacherData();
    data.schedules = [
      {
        id: "schedule-1",
        classId: "class-1",
        startAt: "2027-01-05T10:00:00Z",
        endAt: "2027-01-05T11:00:00Z",
        status: "upcoming",
      },
    ];
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "PATCH") {
        expect(url).toMatch(/\/schedules\/schedule-1\/attendance$/);
        expect(JSON.parse(options.body)).toEqual({
          studentId: "student-1",
          status: "late",
        });
        data.records = [
          {
            id: "attendance-1",
            kind: "attendance",
            ownerId: "student-1",
            parentId: "schedule-1",
            content: { status: "late" },
          },
        ];
        return ok(data.records[0]);
      }
      return ok(structuredClone(data));
    });
    mount("classes");
    fireEvent.click(await screen.findByRole('button', { name: 'Xem lớp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Điểm danh', exact: true }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Điểm danh', exact: true }).at(-1));
    fireEvent.change(screen.getByLabelText("Điểm danh Học sinh API"), {
      target: { value: "late" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Điểm danh Học sinh API")).toHaveValue(
        "late",
      ),
    );
  });
  it("shows an empty search state and clears class filters", async () => {
    fetch.mockResolvedValue(ok(teacherData()));
    mount("classes");
    await screen.findByRole("heading", { name: "Lớp từ API" });
    fireEvent.change(screen.getByLabelText("Tìm kiếm"), {
      target: { value: "Không có lớp này" },
    });
    expect(
      screen.getByText("Không có lớp học phù hợp với bộ lọc."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Xóa bộ lọc"));
    expect(
      screen.getByRole("heading", { name: "Lớp từ API" }),
    ).toBeInTheDocument();
  });
  it("searches learning results by student and rejects manual scores above maxScore", async () => {
    const data = teacherData();
    let writes = 0;
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "POST") {
        writes++;
        expect(url).toMatch(/\/portal\/scores$/);
        const body = JSON.parse(options.body);
        expect(body).toMatchObject({
          classId: "class-1",
          studentId: "student-1",
          teacherId: "teacher-1",
          score: 8,
          maxScore: 10,
        });
        data.scores = [{ ...body, id: "score-1" }];
        return ok(data.scores[0]);
      }
      return ok(structuredClone(data));
    });
    mount("progress");
    fireEvent.click(await screen.findByText("Thêm điểm số"));
    fireEvent.change(screen.getByLabelText("Lớp học"), {
      target: { value: "class-1" },
    });
    fireEvent.change(screen.getByLabelText("Học sinh"), {
      target: { value: "student-1" },
    });
    fireEvent.change(screen.getByLabelText("Tên bài kiểm tra"), {
      target: { value: "Điểm API" },
    });
    fireEvent.change(screen.getByLabelText("Môn / kỹ năng"), {
      target: { value: "Reading" },
    });
    fireEvent.change(screen.getByLabelText("Thang điểm"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Điểm"), {
      target: { value: "11" },
    });
    fireEvent.submit(screen.getByText("Lưu điểm").closest("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Điểm phải nằm trong khoảng",
    );
    expect(writes).toBe(0);
    fireEvent.change(screen.getByLabelText("Điểm"), { target: { value: "8" } });
    fireEvent.submit(screen.getByText("Lưu điểm").closest("form"));
    expect(await screen.findByText("Điểm API: 8/10")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tìm kiếm"), {
      target: { value: "Không có học sinh này" },
    });
    expect(screen.queryByText("Học sinh API")).not.toBeInTheDocument();
    expect(writes).toBe(1);
  });
  it("creates an exam using the existing record contract and scheduling fields", async () => {
    const data = teacherData();
    fetch.mockImplementation(async (url, options) => {
      if (options.method === "POST") {
        expect(url).toMatch(/\/portal\/records$/);
        const body = JSON.parse(options.body);
        expect(body).toMatchObject({
          classId: "class-1",
          kind: "exam",
          content: {
            title: "Đề API",
            duration: 15,
            published: true,
            questions: [
              { prompt: "Câu API", options: ["A", "B", "C", "D"], answer: 0 },
            ],
          },
        });
        expect(Date.parse(body.content.opensAt)).toBeLessThan(
          Date.parse(body.content.closesAt),
        );
        data.records = [{ ...body, id: "exam-1" }];
        return ok(data.records[0]);
      }
      return ok(structuredClone(data));
    });
    mount("exam");
    fireEvent.click(await screen.findByText("Tạo ngân hàng đề thi"));
    fireEvent.change(screen.getByLabelText("Lớp học"), {
      target: { value: "class-1" },
    });
    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: { value: "Đề API" },
    });
    fireEvent.change(screen.getByLabelText("Câu 1"), {
      target: { value: "Câu API" },
    });
    for (const option of ["A", "B", "C", "D"])
      fireEvent.change(screen.getByLabelText("Đáp án " + option), {
        target: { value: option },
      });
    fireEvent.change(screen.getByLabelText("Mở bài lúc"), {
      target: { value: "2027-01-05T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Đóng bài lúc"), {
      target: { value: "2027-01-05T09:00" },
    });
    fireEvent.click(screen.getByText("Lưu"));
    expect(await screen.findByText("Đề API")).toBeInTheDocument();
  });
});

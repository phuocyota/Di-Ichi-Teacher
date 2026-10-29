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
  vi.unstubAllGlobals();
});

describe("API portal screens", () => {
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

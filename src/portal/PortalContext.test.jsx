import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalProvider } from "./PortalContext.jsx";
import { usePortal, usePortalSections } from "./portalStore.js";
import { mergeSnapshot, sectionsForChange, sectionsForMode } from "./portalSections.js";

globalThis.React = React;
const mocks = vi.hoisted(() => ({ onChange: null }));
vi.mock("../services/realtime.js", () => ({
  PORTAL_RESOURCES: [],
  useUpdatesConnection: () => "live",
  useResourceUpdates: (callback) => {
    mocks.onChange = callback;
  },
}));
vi.mock("./useScheduleReminders.js", () => ({ useScheduleReminders: () => {} }));

const profile = { id: "staff-1", name: "Cô A", userType: "TEACHER" };
const row = (id) => ({ id });
const api = vi.hoisted(() => ({ get: vi.fn() }));
const portal = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../services/api.js", () => ({ api }));
vi.mock("../services/portalApi.js", async (importOriginal) => ({
  ...(await importOriginal()),
  portalRequest: (...args) => portal.request(...args),
}));
// Mỗi route GET trả một dòng; tên route ghi lại để kiểm tra màn gọi đúng API.
const routes = () => api.get.mock.calls.map(([path]) => path);
const portalRoutes = () => portal.request.mock.calls.map(([path]) => path);

function Screen({ sections }) {
  const ready = usePortalSections(sections);
  const { data } = usePortal();
  return <p>{ready ? `ready:${sections.map((s) => data[s].length).join(",")}` : "loading"}</p>;
}
beforeEach(() => {
  api.get.mockImplementation(async (path) => ({
    page: 1,
    size: 100,
    total: 1,
    data: [{ id: `${path.slice(1)}-1`, name: "Lớp 1", classId: "class-1" }],
  }));
  portal.request.mockImplementation(async (path) =>
    path === "/profile"
      ? profile
      : { records: [{ id: "r1", kind: "lesson", content: {} }], files: [] },
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PortalProvider gọi route GET tương ứng từng màn", () => {
  it("layout gọi GET /notification, /schedule, /student; màn bài tập gọi /homework, /homework-submission", async () => {
    render(
      <PortalProvider>
        <Screen sections={["homework", "submissions"]} />
      </PortalProvider>,
    );
    await screen.findByText("ready:1,1");
    expect(portalRoutes()).toEqual(["/profile"]);
    expect(routes().sort()).toEqual(
      ["/class", "/notification", "/schedule", "/student", "/homework", "/homework-submission"].sort(),
    );
    expect(api.get).toHaveBeenCalledWith("/schedule", expect.objectContaining({ params: { page: 1, size: 100 } }));

    vi.clearAllMocks();
    await act(async () => mocks.onChange({ resources: ["score"], resync: false }));
    expect(api.get).not.toHaveBeenCalled();

    await act(async () => mocks.onChange({ resources: ["homework-submission"], resync: false }));
    expect(routes()).toEqual(["/homework-submission"]);

    vi.clearAllMocks();
    await act(async () => mocks.onChange({ resources: ["class"], resync: false }));
    expect(portalRoutes()).toEqual(["/profile"]);
    expect(routes()).toContain("/class");
  });

  it("records dùng route portal; đọc hết các trang của route CRUD", async () => {
    api.get.mockImplementation(async (path, { params }) => ({
      page: params.page,
      size: 100,
      total: path === "/student" ? 150 : 1,
      data: path === "/student"
        ? Array.from({ length: params.page === 1 ? 100 : 50 }, (_, i) => ({ id: `s-${params.page}-${i}` }))
        : [{ id: `${path.slice(1)}-1`, name: "Lớp 1" }],
    }));
    render(
      <PortalProvider>
        <Screen sections={["records", "students"]} />
      </PortalProvider>,
    );
    await screen.findByText("ready:1,150");
    expect(portalRoutes()).toEqual(expect.arrayContaining(["/profile", "/records"]));
    expect(api.get.mock.calls.filter(([path]) => path === "/student").map(([, o]) => o.params.page)).toEqual([1, 2]);
  });

  it("rời màn thì ngừng đồng bộ phần của màn đó", async () => {
    const view = render(
      <PortalProvider>
        <Screen sections={["scores"]} />
      </PortalProvider>,
    );
    await screen.findByText("ready:1");
    view.rerender(
      <PortalProvider>
        <p>Thư viện</p>
      </PortalProvider>,
    );
    vi.clearAllMocks();
    await act(async () => mocks.onChange({ resources: ["score"], resync: false }));
    expect(api.get).not.toHaveBeenCalled();
    await act(async () => mocks.onChange({ resources: ["notification"], resync: false }));
    await waitFor(() => expect(routes()).toEqual(["/notification"]));
  });
});

describe("portalSections", () => {
  it("map màn hình và tài nguyên sang phần snapshot", () => {
    expect(sectionsForMode("profile", true)).toEqual([]);
    expect(sectionsForMode("grading", true)).toEqual(
      expect.arrayContaining(["homework", "submissions", "records", "students", "enrollments"]),
    );
    expect(sectionsForMode("lesson", true)).toEqual(expect.arrayContaining(["records", "documents"]));
    const active = ["notifications", "schedules", "records"];
    expect(sectionsForChange({ resources: ["schedule"] }, active)).toEqual({ sections: ["schedules", "records"], base: false });
    expect(sectionsForChange({ resources: ["payment"] }, active)).toEqual({ sections: [], base: false });
    expect(sectionsForChange({ resources: ["class"] }, active)).toEqual({ sections: active, base: true });
  });

  it("gộp phản hồi một phần, giữ phần khác và hợp nhất files", () => {
    const current = { profile, classes: [], homework: [row("h1")], files: [{ id: "f1" }] };
    const next = { profile, classes: [row("c1")], submissions: [row("s1")], files: [{ id: "f2" }] };
    const merged = mergeSnapshot(current, next, ["submissions"]);
    expect(merged.homework).toEqual([row("h1")]);
    expect(merged.submissions).toEqual([row("s1")]);
    expect(merged.files.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(mergeSnapshot(current, next, [], { base: false }).classes).toEqual([]);
  });
});

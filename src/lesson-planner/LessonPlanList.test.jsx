import React from "react";
import { transferableAbortController } from "node:util";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { portalRequest } from "../services/portalApi.js";
import LessonPlanList from "./LessonPlanList.jsx";
import LessonPlanner from "./LessonPlanner.jsx";
vi.mock("../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
let items;
const classes = [
  { id: "c1", name: "Lớp 6A" },
  { id: "c2", name: "Lớp 7A" },
];
beforeEach(() => {
  vi.stubGlobal(
    "AbortController",
    class {
      constructor() {
        return transferableAbortController();
      }
    },
  );
  items = [
    {
      id: "p1",
      title: "Phân số",
      classId: "c1",
      subject: "Toán",
      grade: "6",
      status: "ready",
      duration: 45,
      blockCount: 3,
      updatedAt: "2026-11-02T02:00:00Z",
    },
    {
      id: "p2",
      title: "Từ vựng",
      classId: null,
      subject: "Tiếng Anh",
      grade: "7",
      status: "draft",
      duration: 30,
      blockCount: 0,
      updatedAt: "2026-11-02T03:00:00Z",
    },
  ];
  portalRequest.mockReset();
  portalRequest.mockImplementation(async (path, options) => {
    if (path === "/lesson-plans") return { classes, items };
    if (options?.method === "DELETE") {
      items = items.filter((p) => !path.endsWith(p.id));
      return { deleted: true };
    }
    const plan = items.find((p) => path.endsWith(p.id));
    if (plan) return { ...plan, blocks: [], revision: 1, teachingDate: "" };
    throw new Error("Không tìm thấy giáo án");
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(path = "/vn/giao-an") {
  const router = createMemoryRouter(
    [
      { path: "/vn/giao-an", element: <LessonPlanList /> },
      { path: "/vn/soan-giao-an", element: <LessonPlanner /> },
      { path: "/vn/soan-giao-an/:planId", element: <LessonPlanner /> },
    ],
    { initialEntries: [path] },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}
it("lists actual saved plans including unassigned drafts and filters by title, status and class", async () => {
  mount();
  await screen.findByRole("link", { name: "Phân số" });
  expect(screen.getByRole("link", { name: "Từ vựng" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Trạng thái"), {
    target: { value: "draft" },
  });
  expect(
    screen.queryByRole("link", { name: "Phân số" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Lớp học"), {
    target: { value: "unassigned" },
  });
  expect(screen.getByRole("link", { name: "Từ vựng" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tìm giáo án"), {
    target: { value: "Không khớp" },
  });
  expect(
    screen.getByText("Không tìm thấy giáo án phù hợp"),
  ).toBeInTheDocument();
});
it("opens a saved plan from its own URL and supports loading that URL directly", async () => {
  const view = mount();
  fireEvent.click(
    await screen.findByRole("link", { name: "Mở giáo án Phân số" }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Tên giáo án *")).toHaveValue("Phân số"),
  );
  expect(view.router.state.location.pathname).toBe("/vn/soan-giao-an/p1");
  view.unmount();
  mount("/vn/soan-giao-an/p2");
  await waitFor(() =>
    expect(screen.getByLabelText("Tên giáo án *")).toHaveValue("Từ vựng"),
  );
  expect(
    screen.getByLabelText("Lớp học (không bắt buộc khi lưu nháp)"),
  ).toHaveValue("");
});
it("shows an empty state with a create action and retries a failed API request", async () => {
  items = [];
  portalRequest.mockRejectedValueOnce(new Error("Mất kết nối"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("Chưa có giáo án đã lưu")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Soạn giáo án đầu tiên →" }),
  ).toHaveAttribute("href", "/vn/soan-giao-an");
});
it("confirms deletion and updates the list only after the API succeeds", async () => {
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Xóa giáo án Phân số" }),
  );
  const dialog = screen.getByRole("alertdialog");
  expect(portalRequest.mock.calls.some(([, o]) => o?.method === "DELETE")).toBe(
    false,
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận xóa" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Đã xóa giáo án");
  expect(
    screen.queryByRole("link", { name: "Phân số" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Từ vựng" })).toBeInTheDocument();
});
it("keeps the plan visible and reports an API error when deletion fails", async () => {
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Xóa giáo án Phân số" }),
  );
  portalRequest.mockRejectedValueOnce(new Error("Không thể xóa"));
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Xác nhận xóa",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Không thể xóa");
  expect(screen.getByRole("link", { name: "Phân số" })).toBeInTheDocument();
});

import React from "react";
import { transferableAbortController } from "node:util";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ActivityStudio from "./ActivityStudio.jsx";
import { portalRequest } from "../services/portalApi.js";
import { clampLayout, moveLayout } from "./activityLayout.js";
import { createActivityTemplate } from "./activityTemplates.js";
import { newPlan } from "./blocks.js";
vi.mock("../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
let saved;
beforeEach(() => {
  saved = null;
  vi.stubGlobal(
    "AbortController",
    class {
      constructor() {
        return transferableAbortController();
      }
    },
  );
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("DragEvent", MouseEvent);
  portalRequest.mockReset();
  portalRequest.mockImplementation(async (path, options) => {
    if (path === "/elearning") return { items: [] };
    if (path === "/lesson-plans" && !options?.method)
      return { classes: [], items: [] };
    if (options?.method === "POST" || options?.method === "PUT") {
      saved = {
        ...options.body,
        id: "studio-1",
        revision: options.body.revision + 1,
      };
      return saved;
    }
    if (path === "/lesson-plans/studio-1" && saved) return saved;
    throw new Error("Không tải được hoạt động");
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(path = "/tao-hoat-dong") {
  const router = createMemoryRouter(
    [
      { path: "/soan-elearning/:planId", element: <ActivityStudio /> },
      { path: "/tao-hoat-dong", element: <ActivityStudio /> },
      { path: "/tao-hoat-dong/:planId", element: <ActivityStudio /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}
it("inserts a dragged template at the drop point and moves/resizes with keyboard and pointer", async () => {
  const { container } = mount();
  await screen.findByLabelText("Tên bài e-learning");
  const canvas = container.querySelector(".as-stage");
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 1000,
    height: 700,
    right: 1000,
    bottom: 700,
  });
  const store = new Map(),
    dataTransfer = {
      setData: (k, v) => store.set(k, v),
      getData: (k) => store.get(k) || "",
    };
  fireEvent.dragStart(
    screen.getByRole("button", { name: /Nối cặp kiến thức/ }),
    { dataTransfer },
  );
  fireEvent.drop(canvas, { dataTransfer, clientX: 100, clientY: 70 });
  expect(screen.getByLabelText("Vị trí ngang")).toHaveValue(100);
  fireEvent.keyDown(
    screen.getByRole("button", { name: "Di chuyển đối tượng 1" }),
    { key: "ArrowRight" },
  );
  expect(screen.getByLabelText("Vị trí ngang")).toHaveValue(110);
  fireEvent.keyDown(
    screen.getByRole("button", { name: "Đổi kích thước đối tượng 1" }),
    { key: "ArrowRight" },
  );
  expect(screen.getByLabelText("Chiều rộng")).toHaveValue(510);
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Di chuyển đối tượng 1" }),
    { button: 0, clientX: 100, clientY: 70, pointerId: 1 },
  );
  fireEvent.pointerMove(canvas, { clientX: 140, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
  expect(screen.getByLabelText("Vị trí ngang")).toHaveValue(150);
  expect(screen.getByLabelText("Vị trí dọc")).toHaveValue(100);
});
it("saves actual layout and content without requiring an assigned class", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Tên bài e-learning"), {
    target: { value: "Bài tập nối cặp" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Nối cặp kiến thức/ }));
  fireEvent.change(screen.getByLabelText("Vị trí ngang"), {
    target: { value: "120" },
  });
  fireEvent.change(screen.getByLabelText("Vế trái cặp 1"), {
    target: { value: "Một nửa" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu bài e-learning" }));
  await waitFor(() =>
    expect(
      screen.getByText(
        "Đã lưu bài e-learning vào tài khoản. Mở lại từ Giáo án của tôi.",
      ),
    ).toBeInTheDocument(),
  );
  expect(saved.editorMode).toBe("elearning");
  expect(saved.classId).toBeNull();
  expect(saved.blocks[0].layout.x).toBe(120);
  expect(saved.blocks[0].pairs[0].left).toBe("Một nửa");
});
it("runs interactive content in preview while hiding the teacher movement handles", async () => {
  mount();
  await screen.findByLabelText("Tên bài e-learning");
  fireEvent.click(screen.getByRole("button", { name: /Nối cặp kiến thức/ }));
  fireEvent.click(screen.getByRole("button", { name: "Xem trước bài học" }));
  expect(
    screen.queryByRole("button", { name: "Di chuyển đối tượng 1" }),
  ).not.toBeInTheDocument();
  for (const [left, right] of [
    ["1/2", "Một phần hai"],
    ["1/3", "Một phần ba"],
    ["3/4", "Ba phần tư"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: left }));
    fireEvent.click(screen.getByRole("button", { name: right }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra ghép cặp" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đúng 3/3 cặp");
});
it("restores positions from a direct activity URL", async () => {
  saved = {
    ...newPlan(),
    id: "studio-1",
    editorMode: "activity",
    title: "Bố cục đã lưu",
    blocks: createActivityTemplate("matching").map((b) => ({
      ...b,
      layout: { x: 180, y: 90, width: 520, height: 500 },
    })),
  };
  mount("/tao-hoat-dong/studio-1");
  expect(await screen.findByLabelText("Tên bài e-learning")).toHaveValue(
    "Bố cục đã lưu",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Di chuyển đối tượng 1" }),
  );
  expect(screen.getByLabelText("Vị trí ngang")).toHaveValue(180);
  expect(screen.getByLabelText("Chiều rộng")).toHaveValue(520);
});
it("keeps unsaved content on API failure and does not claim the save succeeded", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Tên bài e-learning"), {
    target: { value: "Giữ lại bản đang soạn" },
  });
  portalRequest.mockRejectedValueOnce(new Error("Không thể lưu"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu bài e-learning" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu");
  expect(screen.getByLabelText("Tên bài e-learning")).toHaveValue(
    "Giữ lại bản đang soạn",
  );
  expect(saved).toBeNull();
});
it("clamps moves and resizing to the actual saved page bounds", () => {
  expect(clampLayout({ x: 999, y: 699, width: 300, height: 200 })).toEqual({
    x: 700,
    y: 500,
    width: 300,
    height: 200,
  });
  expect(
    moveLayout({ x: 700, y: 500, width: 300, height: 200 }, 200, 100),
  ).toEqual({ x: 700, y: 500, width: 300, height: 200 });
  expect(
    moveLayout({ x: 20, y: 20, width: 200, height: 200 }, -999, -999, true),
  ).toEqual({ x: 20, y: 20, width: 160, height: 100 });
});
it("creates, copies and reorders pages, keeps objects on their own page, and restores the saved pages", async () => {
  const view = mount();
  await screen.findByLabelText("Tên bài e-learning");
  fireEvent.click(screen.getByRole("button", { name: /Nối cặp kiến thức/ }));
  fireEvent.click(screen.getByRole("button", { name: "+ Thêm trang" }));
  expect(
    screen.queryByRole("button", { name: "Di chuyển đối tượng 1" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Lật thẻ tìm cặp/ }));
  fireEvent.click(screen.getByRole("button", { name: "Nhân bản trang" }));
  fireEvent.click(screen.getByRole("button", { name: "↑ Lên" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu bài e-learning" }));
  await waitFor(() => expect(saved?.pages).toHaveLength(3));
  expect(saved.pages[1].title).toContain("bản sao");
  expect(new Set(saved.blocks.map((b) => b.id)).size).toBe(3);
  expect(new Set(saved.blocks.map((b) => b.pageId)).size).toBe(3);
  view.unmount();
  mount("/soan-elearning/studio-1");
  await screen.findByLabelText("Tên bài e-learning");
  fireEvent.click(screen.getByRole("button", { name: "Xem trước bài học" }));
  fireEvent.click(screen.getByRole("button", { name: "Trang sau →" }));
  expect(screen.getByText(/Đã mở 2\/3 trang/)).toBeInTheDocument();
});
it("requires a saved assigned class before publishing and supports withdrawing the published snapshot", async () => {
  const base = portalRequest.getMockImplementation();
  portalRequest.mockImplementation((path, options) => {
    if (path === "/lesson-plans" && !options?.method)
      return Promise.resolve({
        classes: [{ id: "class-a", name: "Lớp A" }],
        items: [],
      });
    if (path.startsWith("/elearning/publish/"))
      return Promise.resolve({ id: "course-a", version: 1 });
    if (path === "/elearning/course-a" && options?.method === "DELETE")
      return Promise.resolve({ withdrawn: true });
    return base(path, options);
  });
  mount();
  await screen.findByLabelText("Tên bài e-learning");
  expect(screen.getByRole("button", { name: "Giao cho lớp" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Lớp học (có thể chọn sau)"), {
    target: { value: "class-a" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Nối cặp kiến thức/ }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu bài e-learning" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Giao cho lớp" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Giao cho lớp" }));
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("button", { name: "Thu hồi bài" });
  expect(portalRequest).toHaveBeenCalledWith("/elearning/publish/studio-1", {
    method: "POST",
    body: { revision: 1 },
  });
  fireEvent.click(screen.getByRole("button", { name: "Thu hồi bài" }));
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục" }));
  await screen.findByText("Đã thu hồi bài khỏi lớp. Bản soạn vẫn được giữ.");
});

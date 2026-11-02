import React from "react";
import { transferableAbortController } from "node:util";
import "@testing-library/jest-dom/vitest";
import {
  act,
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
import LessonPlanner from "./LessonPlanner.jsx";
import BlockPlayer from "./BlockPlayer.jsx";
import { createBlock, moveBlock } from "./blocks.js";
import { ACTIVITY_TEMPLATES } from "./activityTemplates.js";
vi.mock("../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
let records, classes, count;
beforeEach(() => {
  // React Router uses Node's Request in jsdom; pair it with a Node signal.
  vi.stubGlobal(
    "AbortController",
    class {
      constructor() {
        return transferableAbortController();
      }
    },
  );
  records = [];
  classes = [{ id: "class-1", name: "Lớp 6A" }];
  count = 0;
  portalRequest.mockReset();
  portalRequest.mockImplementation(async (path, options) => {
    if (path === "/lesson-plans" && !options?.method)
      return { classes, items: records };
    if (options?.method === "POST" || options?.method === "PUT") {
      const data = {
        ...options.body,
        id: "plan-" + ++count,
        revision: options.body.revision + 1,
        updatedAt: "2026-11-02T08:00:00Z",
      };
      records = [data];
      return data;
    }
    if (path.startsWith("/lesson-plans/")) return records[0];
    throw new Error("Unexpected API call");
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  const router = createMemoryRouter([
    { path: "/", element: <LessonPlanner /> },
    { path: "/soan-giao-an/:planId", element: <LessonPlanner /> },
    { path: "/soan-giao-an", element: <LessonPlanner /> },
    { path: "/other", element: <p>Other page</p> },
  ]);
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}
const ready = async () => screen.findByLabelText("Tên giáo án *");

it("adds content by drag and drop and reorders blocks without losing content", async () => {
  const { container } = mount();
  await ready();
  const values = new Map(),
    dataTransfer = {
      setData: (k, v) => values.set(k, v),
      getData: (k) => values.get(k) || "",
      effectAllowed: "",
    };
  fireEvent.dragStart(screen.getByText("Nội dung").closest("button"), {
    dataTransfer,
  });
  fireEvent.drop(container.querySelector(".lp-empty"), { dataTransfer });
  let blocks = container.querySelectorAll(".lp-block");
  expect(blocks).toHaveLength(1);
  fireEvent.change(within(blocks[0]).getByLabelText("Tiêu đề khối"), {
    target: { value: "Mục tiêu" },
  });
  fireEvent.click(screen.getByText("Trắc nghiệm").closest("button"));
  blocks = container.querySelectorAll(".lp-block");
  fireEvent.change(within(blocks[1]).getByLabelText("Câu hỏi"), {
    target: { value: "1 + 1 = ?" },
  });
  fireEvent.dragStart(
    within(blocks[1]).getByRole("button", { name: "Kéo khối 2" }),
    { dataTransfer },
  );
  fireEvent.drop(container.querySelector(".lp-drop-zone"), { dataTransfer });
  blocks = container.querySelectorAll(".lp-block");
  expect(within(blocks[0]).getByLabelText("Câu hỏi")).toHaveValue("1 + 1 = ?");
  fireEvent.click(
    within(blocks[0]).getByRole("button", { name: "Đưa khối 1 xuống" }),
  );
  expect(
    within(container.querySelectorAll(".lp-block")[0]).getByLabelText(
      "Tiêu đề khối",
    ),
  ).toHaveValue("Mục tiêu");
});

it("persists block data and order to the API and reopens the saved version", async () => {
  const { container } = mount();
  const title = await ready();
  fireEvent.change(title, { target: { value: "Phân số" } });
  fireEvent.click(screen.getByText("Trắc nghiệm").closest("button"));
  const block = container.querySelector(".lp-block");
  fireEvent.change(within(block).getByLabelText("Câu hỏi"), {
    target: { value: "1 + 1 = ?" },
  });
  fireEvent.change(within(block).getByLabelText("Lựa chọn 1"), {
    target: { value: "1" },
  });
  fireEvent.change(within(block).getByLabelText("Lựa chọn 2"), {
    target: { value: "2" },
  });
  fireEvent.click(within(block).getByLabelText("Đáp án đúng 2"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu giáo án" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu giáo án");
  expect(portalRequest).toHaveBeenCalledWith(
    "/lesson-plans",
    expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        title: "Phân số",
        classId: "class-1",
        blocks: [
          expect.objectContaining({
            type: "quiz",
            answer: 1,
            options: ["1", "2"],
          }),
        ],
      }),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Phân số.*Bản nháp/ }));
  await waitFor(() =>
    expect(screen.getByLabelText("Câu hỏi")).toHaveValue("1 + 1 = ?"),
  );
});

it("keeps unsaved content and shows the server error on failed save", async () => {
  mount();
  fireEvent.change(await ready(), { target: { value: "Bài chưa lưu" } });
  portalRequest.mockRejectedValueOnce(new Error("Lưu thất bại"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu giáo án" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Lưu thất bại");
  expect(screen.getByLabelText("Tên giáo án *")).toHaveValue("Bài chưa lưu");
  expect(screen.getByText("● Có thay đổi chưa lưu")).toBeInTheDocument();
  expect(
    screen.queryByText("Đã lưu giáo án vào tài khoản của bạn"),
  ).not.toBeInTheDocument();
});

it("warns before navigating away from edits and allows cancelling", async () => {
  const { router } = mount();
  fireEvent.change(await ready(), { target: { value: "Changed" } });
  await act(async () => {
    await router.navigate("/other");
  });
  expect(await screen.findByRole("alertdialog")).toHaveTextContent("Rời trang");
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  expect(screen.getByLabelText("Tên giáo án *")).toHaveValue("Changed");
  await act(async () => {
    await router.navigate("/other");
  });
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  expect(await screen.findByText("Other page")).toBeInTheDocument();
});

it("saves and reopens an incomplete draft without a class assignment", async () => {
  classes = [];
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText("Tên giáo án *"), {
    target: { value: "Bản nháp riêng" },
  });
  expect(screen.getByRole("button", { name: "Lưu nháp" })).toBeEnabled();
  expect(screen.getByText(/Bạn chưa được phân công lớp/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu giáo án");
  expect(portalRequest).toHaveBeenCalledWith(
    "/lesson-plans",
    expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        classId: null,
        status: "draft",
        title: "Bản nháp riêng",
        blocks: [],
      }),
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Bản nháp riêng.*Chưa chọn lớp/ }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Tên giáo án *")).toHaveValue(
      "Bản nháp riêng",
    ),
  );
  expect(
    screen.getByLabelText("Lớp học (không bắt buộc khi lưu nháp)"),
  ).toHaveValue("");
});

it("requires a class for ready plans while the draft action saves as draft", async () => {
  classes = [];
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText("Tên giáo án *"), {
    target: { value: "Bài học" },
  });
  fireEvent.change(screen.getByLabelText("Trạng thái"), {
    target: { value: "ready" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu giáo án" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("chọn lớp");
  expect(
    portalRequest.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu giáo án");
  expect(portalRequest).toHaveBeenCalledWith(
    "/lesson-plans",
    expect.objectContaining({
      body: expect.objectContaining({ status: "draft", classId: null }),
    }),
  );
});

it("grades a quiz in preview and resets the interaction", () => {
  render(
    <BlockPlayer
      block={{
        ...createBlock("quiz"),
        title: "1 + 1?",
        options: ["1", "2"],
        answer: 1,
      }}
    />,
  );
  fireEvent.click(screen.getByRole("radio", { name: "B. 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra đáp án" }));
  expect(screen.getByRole("status")).toHaveTextContent("Chính xác!");
  fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Kiểm tra đáp án" }),
  ).toBeDisabled();
});

it("supports accessible click-to-match and reports the actual matching score", () => {
  render(
    <BlockPlayer
      block={{
        ...createBlock("matching"),
        pairs: [
          { left: "Cat", right: "Mèo" },
          { left: "Dog", right: "Chó" },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cat" }));
  fireEvent.click(screen.getByRole("button", { name: "Mèo" }));
  fireEvent.click(screen.getByRole("button", { name: "Dog" }));
  fireEvent.click(screen.getByRole("button", { name: "Chó" }));
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra ghép cặp" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đúng 2/2 cặp");
});

it("accepts drag-to-match and movable ordering steps", () => {
  const matching = {
    ...createBlock("matching"),
    pairs: [
      { left: "Cat", right: "Mèo" },
      { left: "Dog", right: "Chó" },
    ],
  };
  const { unmount } = render(<BlockPlayer block={matching} />);
  fireEvent.drop(screen.getByRole("button", { name: "Mèo" }), {
    dataTransfer: {
      getData: () => JSON.stringify({ blockId: matching.id, index: 0 }),
    },
  });
  fireEvent.drop(screen.getByRole("button", { name: "Chó" }), {
    dataTransfer: {
      getData: () => JSON.stringify({ blockId: matching.id, index: 1 }),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra ghép cặp" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đúng 2/2 cặp");
  unmount();
  render(
    <BlockPlayer
      block={{
        ...createBlock("ordering"),
        sequence: ["Chuẩn bị", "Thực hiện"],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Đưa bước 2 lên" }));
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra thứ tự" }));
  expect(screen.getByRole("status")).toHaveTextContent("Thứ tự chính xác!");
});

it("never interprets user text as HTML and removes executable media URLs", () => {
  const { container } = render(
    <BlockPlayer
      block={{ ...createBlock("text"), body: "<script>alert(1)</script>" }}
    />,
  );
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
});

it("keeps block identifiers stable when moving to the end", () => {
  const first = createBlock("text"),
    second = createBlock("quiz"),
    third = createBlock("image");
  expect(moveBlock([first, second, third], first.id, 3)).toEqual([
    second,
    third,
    first,
  ]);
});

it("saves and restores the lesson background and animation, and pauses preview motion", async () => {
  const { container } = mount();
  fireEvent.change(await ready(), { target: { value: "Bài học sinh động" } });
  fireEvent.click(screen.getByRole("button", { name: "Xanh lá" }));
  fireEvent.change(screen.getByLabelText("Hiệu ứng xuất hiện khối"), {
    target: { value: "slide" },
  });
  fireEvent.click(screen.getByLabelText("Chuyển động trang trí nhẹ trên nền"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu giáo án");
  expect(portalRequest).toHaveBeenCalledWith(
    "/lesson-plans",
    expect.objectContaining({
      body: expect.objectContaining({
        appearance: expect.objectContaining({
          background: "mint",
          animation: "slide",
          decorations: true,
        }),
      }),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Chơi thử" }));
  expect(container.querySelector(".lp-scene-mint")).toHaveAttribute(
    "data-animation",
    "slide",
  );
  fireEvent.click(screen.getByRole("button", { name: "Tạm dừng hiệu ứng" }));
  expect(container.querySelector(".lp-scene-mint")).toHaveAttribute(
    "data-paused",
    "true",
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Bài học sinh động.*Bản nháp/ }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Hiệu ứng xuất hiện khối")).toHaveValue(
      "slide",
    ),
  );
  expect(screen.getByRole("button", { name: "Xanh lá" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("inserts all default activity templates, edits them and saves the new block types", async () => {
  const { container } = mount();
  fireEvent.change(await ready(), { target: { value: "Bài học với sáu mẫu" } });
  for (const template of ACTIVITY_TEMPLATES)
    fireEvent.click(
      screen.getByRole("button", { name: "Thêm mẫu " + template.english }),
    );
  expect(container.querySelectorAll(".lp-block")).toHaveLength(9);
  expect(
    [...container.querySelectorAll(".lp-block-index")].map(
      (el) => el.textContent,
    ),
  ).toEqual(Array.from({ length: 9 }, (_, i) => "Khối " + (i + 1)));
  const first = container.querySelector(".lp-block");
  fireEvent.change(within(first).getByLabelText("Câu hỏi"), {
    target: { value: "Câu hỏi đã chỉnh sửa" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() =>
    expect(portalRequest).toHaveBeenCalledWith(
      "/lesson-plans",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: "wheel" }),
            expect.objectContaining({ type: "group-sort" }),
            expect.objectContaining({ type: "open-box" }),
            expect.objectContaining({ type: "memory" }),
            expect.objectContaining({ title: "Câu hỏi đã chỉnh sửa" }),
          ]),
        }),
      }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Chơi thử" }));
  expect(
    await screen.findAllByRole("button", { name: "Quay vòng" }),
  ).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Mở hộp 1" })).toBeInTheDocument();
});

it("drags a default template into the canvas without replacing existing content", async () => {
  const { container } = mount();
  await ready();
  fireEvent.click(screen.getByText("Nội dung").closest("button"));
  const values = new Map(),
    dataTransfer = {
      setData: (k, v) => values.set(k, v),
      getData: (k) => values.get(k) || "",
      effectAllowed: "",
    };
  fireEvent.dragStart(
    screen.getByRole("button", { name: "Thêm mẫu Random Wheel" }),
    { dataTransfer },
  );
  fireEvent.drop(container.querySelector(".lp-drop-last"), { dataTransfer });
  expect(container.querySelectorAll(".lp-block")).toHaveLength(2);
  expect(
    within(container.querySelectorAll(".lp-block")[1]).getByLabelText(
      "Lựa chọn quay 1",
    ),
  ).toHaveValue("Đọc phân số 3/4");
});

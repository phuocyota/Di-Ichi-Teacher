import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import SlidePresentation from "./SlidePresentation.jsx";
import { newPlan, createBlock } from "./blocks.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const plan = () => ({
  ...newPlan(),
  title: "Bài học phân số",
  blocks: [
    {
      ...createBlock("quiz"),
      title: "Chọn kết quả",
      options: ["Một", "Hai"],
      answer: 1,
    },
    { ...createBlock("text"), title: "Ghi nhớ", body: "Nội dung slide hai" },
  ],
});
it("shows one slide at a time, preserves answers on return and releases page scrolling on close", () => {
  const previous = document.body.style.overflow;
  const view = render(<SlidePresentation plan={plan()} onClose={() => {}} />);
  const dialog = screen.getByRole("dialog", { name: "Trình chiếu bài học" });
  expect(document.body.style.overflow).toBe("hidden");
  expect(screen.getByRole("button", { name: "← Slide trước" })).toBeDisabled();
  expect(
    screen.queryByRole("heading", { name: "Ghi nhớ" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "B. Hai" }));
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra đáp án" }));
  fireEvent.click(screen.getByRole("button", { name: "Slide sau →" }));
  expect(within(dialog).getByText("Slide 2/2")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Ghi nhớ" })).toBeInTheDocument();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Slide sau →" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "← Slide trước" }));
  expect(screen.getByRole("radio", { name: "B. Hai" })).toBeChecked();
  view.unmount();
  expect(document.body.style.overflow).toBe(previous);
});
it("supports navigation shortcuts without taking arrow keys from games, and Escape closes", () => {
  const close = vi.fn();
  render(<SlidePresentation plan={plan()} onClose={close} />);
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(screen.getByRole("radio", { name: "A. Một" }), {
    key: "ArrowRight",
  });
  expect(screen.getByText("Slide 1/2")).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: "ArrowRight" });
  expect(screen.getByText("Slide 2/2")).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: "ArrowLeft" });
  expect(screen.getByText("Slide 1/2")).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});
it("opens the selected e-learning page with its layout and unmounts offscreen videos", () => {
  const p = plan();
  p.pages = [
    { id: "p1", title: "Mở đầu" },
    { id: "p2", title: "Bài tập" },
  ];
  p.blocks = p.blocks.map((b, i) => ({
    ...b,
    pageId: "p" + (i + 1),
    layout: { x: 100, y: 50, width: 500, height: 400 },
  }));
  p.blocks.push({
    ...createBlock("video"),
    pageId: "p1",
    url: "https://example.org/demo.mp4",
    layout: { x: 0, y: 0, width: 300, height: 200 },
  });
  render(<SlidePresentation plan={p} startIndex={1} onClose={() => {}} />);
  expect(screen.getByText("Slide 2/2")).toBeInTheDocument();
  expect(
    screen
      .getByRole("heading", { name: "Ghi nhớ" })
      .closest(".lp-slide-object"),
  ).toHaveStyle({
    left: "100px",
    top: "50px",
    width: "500px",
    height: "400px",
  });
  expect(document.querySelector("video")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "← Slide trước" }));
  expect(document.querySelector("video")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Slide sau →" }));
  expect(document.querySelector("video")).toBeNull();
});
it("allows empty slideshows to close and falls back when fullscreen is unavailable", async () => {
  const close = vi.fn();
  render(
    <SlidePresentation plan={{ ...newPlan(), blocks: [] }} onClose={close} />,
  );
  expect(
    screen.getByText(/Chưa có nội dung để trình chiếu/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Slide sau →" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Toàn màn hình" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "vẫn có thể trình chiếu",
  );
  fireEvent.click(screen.getByRole("button", { name: "Đóng trình chiếu" }));
  expect(close).toHaveBeenCalledOnce();
});

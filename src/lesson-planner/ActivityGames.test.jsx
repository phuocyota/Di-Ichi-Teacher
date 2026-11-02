import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  GroupSort,
  MemoryPairs,
  OpenBox,
  RandomWheel,
} from "./ActivityGames.jsx";
import { createBlock } from "./blocks.js";
import {
  ACTIVITY_TEMPLATES,
  createActivityTemplate,
} from "./activityTemplates.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("provides six editable templates with independent identifiers and sample content", () => {
  expect(ACTIVITY_TEMPLATES).toHaveLength(7);
  const ids = [];
  for (const template of ACTIVITY_TEMPLATES) {
    const blocks = createActivityTemplate(template.id);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.title).toBeTruthy();
      ids.push(b.id);
    }
  }
  expect(new Set(ids).size).toBe(ids.length);
  const first = createActivityTemplate("memory");
  first[0].pairs[0].left = "Changed";
  expect(createActivityTemplate("memory")[0].pairs[0].left).toBe("1/2");
});

it("selects a real wheel entry, excludes it from later spins and restores choices", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  render(
    <RandomWheel
      block={{
        ...createBlock("wheel"),
        sequence: ["Nhiệm vụ A", "Nhiệm vụ B"],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Quay vòng" }));
  expect(screen.getByRole("button", { name: "Đang quay…" })).toBeDisabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByRole("status")).toHaveTextContent("Nhiệm vụ A");
  fireEvent.click(
    screen.getByRole("button", { name: "Loại lựa chọn vừa quay" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Quay vòng" }));
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByRole("status")).toHaveTextContent("Nhiệm vụ B");
  fireEvent.click(
    screen.getByRole("button", { name: "Loại lựa chọn vừa quay" }),
  );
  expect(screen.getByRole("button", { name: "Quay vòng" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Khôi phục tất cả" }));
  expect(screen.getByRole("button", { name: "Quay vòng" })).toBeEnabled();
});

it("clears the pending spin when the preview closes", () => {
  vi.useFakeTimers();
  const { unmount } = render(
    <RandomWheel block={{ ...createBlock("wheel"), sequence: ["A", "B"] }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Quay vòng" }));
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("plays the lucky-wheel template and returns the authored prize under the pointer", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const b = createActivityTemplate("lucky-wheel")[0];
  const { container } = render(<RandomWheel block={b} />);
  expect(container.querySelector(".lp-wheel-show")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tắt hiệu ứng đèn" }));
  expect(container.querySelector(".lp-wheel-no-lights")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quay vòng" }));
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByRole("status")).toHaveTextContent("100 điểm");
});

it("supports click and drag group assignment and scores according to authored groups", () => {
  const b = {
    ...createBlock("group-sort"),
    pairs: [
      { left: "2", right: "Số chẵn" },
      { left: "3", right: "Số lẻ" },
    ],
  };
  render(<GroupSort block={b} />);
  fireEvent.click(screen.getByRole("button", { name: "2" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Đưa vào nhóm: Số chẵn" }),
  );
  fireEvent.drop(
    screen
      .getByRole("button", { name: "Đưa vào nhóm: Số lẻ" })
      .closest("section"),
    {
      dataTransfer: {
        getData: () => JSON.stringify({ blockId: b.id, index: 1 }),
      },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra phân nhóm" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đúng 2/2 thẻ");
  fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
  expect(
    screen.getByRole("button", { name: "Kiểm tra phân nhóm" }),
  ).toBeDisabled();
});

it("does not accept a group drag from another exercise or count wrong groups as correct", () => {
  const b = {
    ...createBlock("group-sort"),
    pairs: [
      { left: "2", right: "Số chẵn" },
      { left: "3", right: "Số lẻ" },
    ],
  };
  render(<GroupSort block={b} />);
  fireEvent.drop(
    screen
      .getByRole("button", { name: "Đưa vào nhóm: Số lẻ" })
      .closest("section"),
    {
      dataTransfer: {
        getData: () => JSON.stringify({ blockId: "another", index: 0 }),
      },
    },
  );
  expect(
    screen.getByRole("button", { name: "Kiểm tra phân nhóm" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "2" }));
  fireEvent.click(screen.getByRole("button", { name: "Đưa vào nhóm: Số lẻ" }));
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Đưa vào nhóm: Số chẵn" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra phân nhóm" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đúng 0/2 thẻ");
});

it("hides box questions and answers until requested and resets the opened boxes", () => {
  render(
    <OpenBox
      block={{
        ...createBlock("open-box"),
        pairs: [
          { left: "Câu hỏi một", right: "Đáp án bí mật" },
          { left: "Câu hỏi hai", right: "Đáp án hai" },
        ],
      }}
    />,
  );
  expect(screen.queryByText("Câu hỏi một")).not.toBeInTheDocument();
  expect(screen.queryByText("Đáp án bí mật")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mở hộp 1" }));
  expect(screen.getByText("Câu hỏi một")).toBeInTheDocument();
  expect(screen.queryByText("Đáp án bí mật")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Hiện đáp án hộp 1" }));
  expect(screen.getByText("Đáp án bí mật")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Đóng tất cả hộp" }));
  expect(screen.queryByText("Đáp án bí mật")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mở hộp 1" })).toBeEnabled();
});

it("plays memory pairs without exposing hidden labels, counts turns and can restart", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.99999);
  render(
    <MemoryPairs
      block={{
        ...createBlock("memory"),
        pairs: [
          { left: "A", right: "Một" },
          { left: "B", right: "Hai" },
        ],
      }}
    />,
  );
  expect(screen.queryByText("Một")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 3" }));
  expect(screen.getByRole("status")).toHaveTextContent("0/2 cặp · 1 lượt");
  expect(screen.getByRole("button", { name: "Lật thẻ 2" })).toBeDisabled();
  act(() => vi.advanceTimersByTime(999));
  expect(screen.getByRole("button", { name: "A" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "B" })).toBeDisabled();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("button", { name: "Lật thẻ 1" })).toBeEnabled();
  expect(screen.queryByText("A")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 2" }));
  expect(screen.getByRole("status")).toHaveTextContent("1/2 cặp · 2 lượt");
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByRole("button", { name: "Một" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 4" }));
  expect(screen.getByRole("status")).toHaveTextContent("Hoàn thành!");
  fireEvent.click(screen.getByRole("button", { name: "Chơi lại" }));
  expect(screen.getByRole("status")).toHaveTextContent("0/2 cặp · 0 lượt");
});
it("cancels a pending mismatch timer on restart and unmount", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.99999);
  const view = render(
    <MemoryPairs
      block={{
        ...createBlock("memory"),
        pairs: [
          { left: "A", right: "One" },
          { left: "B", right: "Two" },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 3" }));
  act(() => vi.advanceTimersByTime(500));
  fireEvent.click(screen.getByRole("button", { name: "Chơi lại" }));
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 1" }));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ 3" }));
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

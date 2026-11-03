import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import LessonProgress from "./LessonProgress.jsx";
import { portalRequest } from "../services/portalApi.js";
import { useLessonProgressSocket } from "../hooks/useLessonProgressSocket.js";
vi.mock("../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
vi.mock("../hooks/useLessonProgressSocket.js", () => ({
  useLessonProgressSocket: vi.fn(() => "live"),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const mount = () =>
  render(
    <MemoryRouter initialEntries={["/giao-an/p1/tien-do"]}>
      <Routes>
        <Route path="/giao-an/:planId/tien-do" element={<LessonProgress />} />
      </Routes>
    </MemoryRouter>,
  );
it("shows completed questions, correct, incorrect and students who have not started", async () => {
  portalRequest.mockResolvedValue({
    title: "Phân số",
    items: [
      {
        studentId: "s1",
        code: "HS01",
        name: "An",
        total: 6,
        answered: 4,
        correct: 3,
        incorrect: 1,
        lastSubmittedAt: "2026-11-02T08:00:00Z",
      },
      {
        studentId: "s2",
        code: "HS02",
        name: "Bình",
        total: 6,
        answered: 0,
        correct: 0,
        incorrect: 0,
        lastSubmittedAt: null,
      },
    ],
  });
  mount();
  expect(await screen.findByText("4/6")).toBeInTheDocument();
  expect(screen.getByText("0/6")).toBeInTheDocument();
  expect(screen.getByText("Đang làm")).toBeInTheDocument();
  expect(screen.getByText("Chưa làm")).toBeInTheDocument();
  expect(portalRequest).toHaveBeenCalledWith(
    "/lesson-plans/p1/progress",
    expect.any(Object),
  );
});
it("shows an API error and lets the teacher retry", async () => {
  portalRequest
    .mockRejectedValueOnce(new Error("Mất kết nối"))
    .mockResolvedValue({ title: "Bài học", items: [] });
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
  fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
  expect(
    await screen.findByText("Lớp chưa có học sinh ghi danh hiện tại."),
  ).toBeInTheDocument();
});
it("refreshes the report immediately when the realtime hook receives an event", async () => {
  const row = {
    studentId: "s1",
    code: "HS01",
    name: "An",
    total: 6,
    answered: 4,
    correct: 3,
    incorrect: 1,
  };
  portalRequest
    .mockResolvedValueOnce({ title: "Bài học", items: [row] })
    .mockResolvedValue({
      title: "Bài học",
      items: [{ ...row, answered: 6, correct: 5 }],
    });
  mount();
  expect(await screen.findByText("4/6")).toBeInTheDocument();
  act(() => useLessonProgressSocket.mock.calls.at(-1)[1]());
  expect(await screen.findByText("6/6")).toBeInTheDocument();
  expect(screen.getByText("Đã làm hết")).toBeInTheDocument();
});

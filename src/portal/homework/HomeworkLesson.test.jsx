import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PortalContext } from "../portalStore.js";
import { portalRequest } from "../../services/portalApi.js";
import HomeworkLessonAssign from "./HomeworkLessonAssign.jsx";
import HomeworkLessonReport from "./HomeworkLessonReport.jsx";
vi.mock("../../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
vi.mock("../../services/realtime.js", () => ({ useResourceUpdates() {} }));
vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }) => <div>{children}</div>, PieChart: ({ children }) => <div>{children}</div>, Pie: () => <div>Chart</div>, Cell: () => null, Tooltip: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => { portalRequest.mockReset(); });
it("assigns an owned lesson plan with class, deadline and optional session through the existing mutation lock", async () => {
  portalRequest.mockResolvedValue({ items: [{ id: 'plan-1', title: 'My lesson', editorMode: 'lesson' }, { id: 'course', title: 'My activity lesson', editorMode: 'activity' }] });
  const act = vi.fn().mockResolvedValue({ id: 'hw-1' });
  render(<PortalContext.Provider value={{ data: { classes: [{ id: 'class-1', name: 'Class 1' }], schedules: [] }, busy: false, act }}><HomeworkLessonAssign /></PortalContext.Provider>);
  fireEvent.click(screen.getByText('Chọn giáo án giao về nhà'));
  fireEvent.change(await screen.findByLabelText('Giáo án làm bài tập'), { target: { value: 'plan-1' } });
  expect(screen.getByText('My activity lesson')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lớp nhận bài'), { target: { value: 'class-1' } });
  fireEvent.change(screen.getByLabelText('Hạn chuẩn bị bài'), { target: { value: '2027-01-01T10:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Giao giáo án về nhà' }));
  await waitFor(() => expect(act).toHaveBeenCalledOnce());
  expect(act.mock.calls[0][0]).toBe('/homework/lesson-plans');
  expect(act.mock.calls[0][1].body).toMatchObject({ classId: 'class-1', lessonPlanId: 'plan-1' });
  expect(act.mock.calls[0][1].body).not.toHaveProperty('score');
  expect(screen.queryByLabelText('Giáo án làm bài tập')).not.toBeInTheDocument();
});
it("shows recoverable API errors instead of a fabricated plan list", async () => {
  portalRequest.mockRejectedValue(new Error('Không tải được giáo án'));
  render(<PortalContext.Provider value={{ data: { classes: [], schedules: [] }, busy: false }}><HomeworkLessonAssign /></PortalContext.Provider>);
  fireEvent.click(screen.getByText('Chọn giáo án giao về nhà'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được giáo án');
  expect(screen.queryByLabelText('Giáo án làm bài tập')).not.toBeInTheDocument();
});
function reportPage() { render(<MemoryRouter initialEntries={['/bai-tap/hw-1/bao-cao']}><Routes><Route path='/bai-tap/:homeworkId/bao-cao' element={<HomeworkLessonReport />} /></Routes></MemoryRouter>); }
it("renders pre-class percentages, explicit denominators and each student's view and score", async () => {
  portalRequest.mockResolvedValue({ title: 'Before class', asOf: '2026-11-12T07:00:00Z', cutoffAt: '2026-11-12T08:00:00Z', totalStudents: 2, totalQuestions: 4, scoredStudents: 1, averageScore: 50, readiness: [{ key: 'unseen', count: 1, percent: 50 }, { key: 'completed', count: 1, percent: 50 }], results: [{ key: 'correct', count: 1, percent: 25 }, { key: 'incorrect', count: 1, percent: 25 }, { key: 'unanswered', count: 2, percent: 50 }], items: [{ studentId: 's1', name: 'API student', code: 'S1', state: 'completed', firstViewedAt: '2026-11-12T06:00:00Z', answered: 2, total: 2, correct: 1, incorrect: 1, score: 50 }] });
  reportPage();
  await screen.findByText('API student');
  expect(screen.getByText('Tỷ lệ chuẩn bị bài')).toBeInTheDocument();
  expect(screen.getByText('Kết quả tự chấm')).toBeInTheDocument();
  expect(screen.getAllByText('1 · 50%')).toHaveLength(2);
  expect(screen.getByText('2 · 50%')).toBeInTheDocument();
  expect(screen.getByText(/học viên chưa làm không được tính là làm sai/)).toBeInTheDocument();
  expect(portalRequest.mock.calls[0][0]).toBe('/homework/hw-1/lesson/report');
});
it("handles an empty class without a fake chart and retries failed report requests", async () => {
  portalRequest.mockRejectedValueOnce(new Error('Report unavailable'));
  reportPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Report unavailable');
  portalRequest.mockResolvedValue({ title: 'Empty', totalStudents: 0, totalQuestions: 0, readiness: [], results: [], items: [], scoredStudents: 0, averageScore: null });
  fireEvent.click(screen.getByText('Tải lại'));
  await screen.findAllByText('Chưa có học viên');
  expect(screen.queryByText('Chart')).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

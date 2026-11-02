import React from "react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import {
  dueTeacherSchedules,
  useScheduleReminders,
} from "./useScheduleReminders.js";
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));
const now = Date.parse("2026-11-02T03:00:00Z");
const data = () => ({
  profile: { id: "teacher-1", userId: "user-1", userType: "TEACHER" },
  classes: [{ id: "class-1", name: "Lớp Demo" }],
  schedules: [
    {
      id: "lesson-1",
      classId: "class-1",
      teacherId: "teacher-1",
      startAt: new Date(now + 16 * 60000).toISOString(),
      status: "upcoming",
    },
  ],
});
function Watcher({ data }) {
  useScheduleReminders(data);
  return null;
}
const mount = (d) =>
  render(
    <MemoryRouter>
      <Watcher data={d} />
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  });
  toast.info.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("shows a reminder at 15 minutes before the assigned lesson and does not repeat it", () => {
  const d = data();
  mount(d);
  expect(toast.info).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(60000));
  expect(toast.info).toHaveBeenCalledOnce();
  expect(toast.info.mock.calls[0][0]).toContain("Lớp Demo");
  expect(toast.info.mock.calls[0][1].description).toContain("15 phút");
  act(() => vi.advanceTimersByTime(60000));
  expect(toast.info).toHaveBeenCalledOnce();
  cleanup();
  mount(d);
  expect(toast.info).toHaveBeenCalledOnce();
});
it("does not notify for another teacher, cancelled/started lessons, inactive statuses or students", () => {
  const d = data();
  d.schedules[0].startAt = new Date(now + 600000).toISOString();
  for (const changes of [
    { teacherId: "other" },
    { cancelledAt: new Date().toISOString() },
    { status: "cancelled" },
    { status: "checked" },
    { startAt: new Date(now).toISOString() },
  ])
    expect(
      dueTeacherSchedules(
        { ...d, schedules: [{ ...d.schedules[0], ...changes }] },
        now,
      ),
    ).toHaveLength(0);
  expect(
    dueTeacherSchedules(
      { ...d, profile: { ...d.profile, userType: "STUDENT" } },
      now,
    ),
  ).toHaveLength(0);
});
it("follows changed schedules and allows a new reminder when the start time changes", () => {
  const d = data();
  d.schedules[0].startAt = new Date(now + 600000).toISOString();
  const view = mount(d);
  expect(toast.info).toHaveBeenCalledOnce();
  const moved = {
    ...d,
    schedules: [
      { ...d.schedules[0], startAt: new Date(now + 20 * 60000).toISOString() },
    ],
  };
  view.rerender(
    <MemoryRouter>
      <Watcher data={moved} />
    </MemoryRouter>,
  );
  act(() => vi.advanceTimersByTime(5 * 60000));
  expect(toast.info).toHaveBeenCalledTimes(2);
});
it("cleans up reminder checks after leaving the teacher interface", () => {
  const view = mount(data());
  view.unmount();
  act(() => vi.advanceTimersByTime(2 * 60000));
  expect(toast.info).not.toHaveBeenCalled();
});

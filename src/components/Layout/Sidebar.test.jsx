import React, { useState } from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { PortalContext } from "../../portal/portalStore.js";
import { Sidebar } from "./Sidebar.jsx";

afterEach(cleanup);
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <PortalContext.Provider value={{ data: { schedules: [], students: [] } }}>
        <button onClick={() => setOpen(true)}>Mở menu kiểm thử</button>
        <Sidebar open={open} onClose={() => setOpen(false)} />
      </PortalContext.Provider>
    </MemoryRouter>
  );
}
it("traps mobile navigation focus, closes on Escape, restores focus and body scrolling", () => {
  render(<Harness />);
  const trigger = screen.getByText("Mở menu kiểm thử");
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Menu giáo viên" });
  const close = within(dialog).getByRole("button", { name: "Đóng menu" });
  expect(close).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(within(dialog).getByText("Đăng xuất")).toHaveFocus();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(trigger).toHaveFocus();
});

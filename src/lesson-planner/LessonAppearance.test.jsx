import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LessonAppearance, { LessonScene } from "./LessonAppearance.jsx";
import {
  defaultAppearance,
  normalizeAppearance,
  safeBackgroundUrl,
  validatedImageBlob,
} from "./appearance.js";
import { portalRequest } from "../services/portalApi.js";
vi.mock("../services/portalApi.js", () => ({ portalRequest: vi.fn() }));
beforeEach(() => {
  const OriginalURL = globalThis.URL;
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = vi.fn(() => "blob:private-background");
      static revokeObjectURL = vi.fn();
    },
  );
  portalRequest.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("offers background and motion controls without modifying content blocks", () => {
  const change = vi.fn(),
    upload = vi.fn();
  render(
    <LessonAppearance
      value={defaultAppearance()}
      onChange={change}
      onUpload={upload}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Xanh lá" }));
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ background: "mint" }),
  );
  fireEvent.change(screen.getByLabelText("Hiệu ứng xuất hiện khối"), {
    target: { value: "slide" },
  });
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ animation: "slide" }),
  );
  fireEvent.click(screen.getByLabelText("Chuyển động trang trí nhẹ trên nền"));
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ decorations: true }),
  );
});

it("shows an authenticated background from a private file and revokes its object URL on close", async () => {
  portalRequest.mockResolvedValue({
    blob: new NodeBlob([Buffer.from("89504e470d0a1a0a", "hex")]),
    name: "background.png",
  });
  const { container, unmount } = render(
    <LessonScene
      appearance={{
        ...defaultAppearance(),
        background: "image",
        backgroundFileId: "file-1",
      }}
    >
      <p>Lesson</p>
    </LessonScene>,
  );
  await waitFor(() =>
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "blob:private-background",
    ),
  );
  expect(portalRequest).toHaveBeenCalledWith(
    "/files/file-1",
    expect.objectContaining({ download: true }),
  );
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-background");
});

it("reports a private-file error instead of substituting an invented background", async () => {
  portalRequest.mockRejectedValue(new Error("Không có quyền xem ảnh"));
  const { container } = render(
    <LessonScene
      appearance={{
        ...defaultAppearance(),
        background: "image",
        backgroundFileId: "other-file",
      }}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Không có quyền xem ảnh",
  );
  expect(container.querySelector("img")).toBeNull();
});

it("rejects executable background links and validates file bytes and size", async () => {
  expect(safeBackgroundUrl("javascript:alert(1)")).toBe("");
  expect(safeBackgroundUrl("https://user:password@example.org/a.png")).toBe("");
  await expect(
    validatedImageBlob(
      new NodeBlob(["<html>Not an image</html>"], { type: "image/png" }),
    ),
  ).rejects.toThrow("Chỉ hỗ trợ ảnh");
  const png = await validatedImageBlob(
    new NodeBlob([Buffer.from("89504e470d0a1a0a", "hex")]),
  );
  expect(png.type).toBe("image/png");
  await expect(validatedImageBlob({ size: 11 * 1024 * 1024 })).rejects.toThrow(
    "10 MB",
  );
});

it("retains readable content while a scene is paused and supplies defaults for older plans", () => {
  expect(normalizeAppearance(undefined)).toEqual(defaultAppearance());
  const { container } = render(
    <LessonScene
      paused
      appearance={{
        ...defaultAppearance(),
        background: "night",
        animation: "zoom",
        decorations: true,
      }}
    >
      <div className="lp-animated-block">Visible content</div>
    </LessonScene>,
  );
  expect(container.querySelector(".lp-scene")).toHaveAttribute(
    "data-paused",
    "true",
  );
  expect(container.querySelector(".lp-scene")).toHaveAttribute(
    "data-animation",
    "zoom",
  );
  expect(screen.getByText("Visible content")).toBeInTheDocument();
});

it("selects a mascot and renders its saved side and motion without blocking lesson content", () => {
  const change = vi.fn();
  const { rerender, container } = render(
    <LessonAppearance
      value={defaultAppearance()}
      onChange={change}
      onUpload={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Mèo học trò" }));
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ mascot: "cat" }),
  );
  const value = {
    ...defaultAppearance(),
    mascot: "cat",
    mascotSide: "left",
    mascotMotion: "wave",
  };
  rerender(
    <LessonAppearance value={value} onChange={change} onUpload={vi.fn()} />,
  );
  expect(screen.getByLabelText("Vị trí nhân vật")).toHaveValue("left");
  expect(screen.getByLabelText("Chuyển động nhân vật")).toHaveValue("wave");
  expect(container.querySelector(".lp-scene-has-mascot")).toHaveAttribute(
    "data-mascot-side",
    "left",
  );
  expect(
    container.querySelector(".lp-scene-mascot .lp-mascot-art"),
  ).toHaveAttribute("data-motion", "wave");
  fireEvent.click(screen.getByRole("button", { name: "Không có" }));
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ mascot: "none" }),
  );
});

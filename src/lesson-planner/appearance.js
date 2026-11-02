export const BACKGROUNDS = [
  { id: "paper", label: "Trang sáng" },
  { id: "sky", label: "Bầu trời" },
  { id: "mint", label: "Xanh lá" },
  { id: "peach", label: "Ấm áp" },
  { id: "night", label: "Vũ trụ" },
  { id: "image", label: "Ảnh riêng" },
];
export const MASCOTS = [
  { id: "none", label: "Không có" },
  { id: "robot", label: "Robot vui vẻ" },
  { id: "cat", label: "Mèo học trò" },
  { id: "astronaut", label: "Phi hành gia" },
];
export const ANIMATIONS = [
  { id: "none", label: "Không hiệu ứng" },
  { id: "fade", label: "Hiện dần" },
  { id: "slide", label: "Trượt nhẹ lên" },
  { id: "zoom", label: "Phóng nhẹ" },
];
export const defaultAppearance = () => ({
  background: "paper",
  backgroundImage: "",
  backgroundFileId: null,
  opacity: 100,
  animation: "none",
  decorations: false,
  mascot: "none",
  mascotSide: "right",
  mascotMotion: "float",
});
export function normalizeAppearance(value) {
  const result = { ...defaultAppearance(), ...value };
  if (!BACKGROUNDS.some((b) => b.id === result.background))
    result.background = "paper";
  if (!ANIMATIONS.some((a) => a.id === result.animation))
    result.animation = "none";
  result.opacity = Number.isFinite(result.opacity)
    ? Math.min(100, Math.max(0, result.opacity))
    : 100;
  result.decorations = result.decorations === true;
  if (!["none", "robot", "cat", "astronaut"].includes(result.mascot))
    result.mascot = "none";
  if (!["left", "right"].includes(result.mascotSide))
    result.mascotSide = "right";
  if (!["none", "float", "wave"].includes(result.mascotMotion))
    result.mascotMotion = "none";
  return result;
}
export function safeBackgroundUrl(raw) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export async function validatedImageBlob(file) {
  if (!file?.size || file.size > 10 * 1024 * 1024)
    throw new Error("Chọn ảnh từ 1 byte đến 10 MB");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
  const ascii = String.fromCharCode(...bytes);
  const type = hex.startsWith("89504e470d0a1a0a")
    ? "image/png"
    : hex.startsWith("ffd8ff")
      ? "image/jpeg"
      : ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP"
        ? "image/webp"
        : /^GIF8[79]a/.test(ascii)
          ? "image/gif"
          : "";
  if (!type) throw new Error("Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc GIF");
  return new Blob([file], { type });
}

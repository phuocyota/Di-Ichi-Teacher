export const STAGE_WIDTH = 1000,
  STAGE_HEIGHT = 700;
export function clampLayout(value = {}) {
  const finite = (n, fallback) =>
    Number.isFinite(n) ? Math.round(n) : fallback;
  const width = Math.max(160, Math.min(STAGE_WIDTH, finite(value.width, 460)));
  const height = Math.max(
    100,
    Math.min(STAGE_HEIGHT, finite(value.height, 440)),
  );
  return {
    x: Math.max(0, Math.min(STAGE_WIDTH - width, finite(value.x, 30))),
    y: Math.max(0, Math.min(STAGE_HEIGHT - height, finite(value.y, 40))),
    width,
    height,
  };
}
export function moveLayout(layout, dx, dy, resize = false) {
  const current = clampLayout(layout);
  return clampLayout(
    resize
      ? {
          ...current,
          width: Math.max(
            160,
            Math.min(STAGE_WIDTH - current.x, current.width + dx),
          ),
          height: Math.max(
            100,
            Math.min(STAGE_HEIGHT - current.y, current.height + dy),
          ),
        }
      : { ...current, x: current.x + dx, y: current.y + dy },
  );
}
export function normalizeActivityBlocks(blocks = []) {
  return blocks.map((b, i) => ({
    ...b,
    layout: clampLayout(
      b.layout || {
        x: 30 + (i % 3) * 300,
        y: 40 + Math.floor(i / 3) * 35,
        width: 280,
        height: 520,
      },
    ),
  }));
}

import { normalizeActivityBlocks } from "./activityLayout.js";
export function createPage(title = "Trang mới") {
  return { id: crypto.randomUUID(), title };
}
export function normalizeElearning(record) {
  const pages = record?.pages?.length
    ? record.pages.map((p) => ({ ...p }))
    : [createPage("Trang 1")];
  const ids = new Set(pages.map((p) => p.id));
  const blocks = normalizeActivityBlocks(record?.blocks).map((b) => ({
    ...b,
    pageId: ids.has(b.pageId) ? b.pageId : pages[0].id,
  }));
  return { pages, blocks };
}
export function duplicatePage(pages, blocks, id) {
  const index = pages.findIndex((p) => p.id === id);
  if (index < 0) return { pages, blocks, pageId: pages[0]?.id };
  const page = {
    ...pages[index],
    id: crypto.randomUUID(),
    title: pages[index].title.slice(0, 190) + " (bản sao)",
  };
  const next = [...pages];
  next.splice(index + 1, 0, page);
  return {
    pages: next,
    blocks: [
      ...blocks,
      ...blocks
        .filter((b) => b.pageId === id)
        .map((b) => ({
          ...structuredClone(b),
          id: crypto.randomUUID(),
          pageId: page.id,
        })),
    ],
    pageId: page.id,
  };
}
export function movePage(pages, id, direction) {
  const from = pages.findIndex((p) => p.id === id),
    to = from + direction;
  if (from < 0 || to < 0 || to >= pages.length) return pages;
  const next = [...pages];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

import { createContext, useContext, useEffect } from "react";
export const PortalContext = createContext(null);
export const usePortal = () => useContext(PortalContext);

/**
 * Màn hình khai báo phần snapshot nó cần; provider chỉ tải và đồng bộ các phần đang được dùng.
 * Trả về true khi mọi phần đã có dữ liệu.
 */
export function usePortalSections(sections) {
  const portal = usePortal();
  const key = [...new Set(sections)].sort().join(",");
  const register = portal?.register;
  useEffect(
    () => register?.(key ? key.split(",") : []),
    [key, register],
  );
  return Boolean(
    portal?.data &&
      (key ? key.split(",") : []).every(
        (section) => portal.data[section] !== undefined,
      ),
  );
}

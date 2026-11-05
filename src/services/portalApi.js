import { clearAuthSession, getAccessToken } from "./authSession.js";
import { API_BASE_URL } from "./apiConfig.js";
import { localizedLoginPath } from '../i18n/localeRouting.js';

const base = API_BASE_URL;

export async function portalRequest(
  path,
  { method = "GET", body, signal, download = false } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    body instanceof FormData || download ? 120000 : 15000,
  );
  try {
    const form = body instanceof FormData;
    const response = await fetch(`${base}/portal${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        ...(!form && body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    if (response.status === 401) {
      clearAuthSession();
      window.location.assign(localizedLoginPath());
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    if (download && response.ok) {
      const encoded = response.headers
        .get("Content-Disposition")
        ?.split("UTF-8''")[1];
      let name = "tai-lieu";
      if (encoded) {
        try {
          name = decodeURIComponent(encoded);
        } catch {
          /* Use safe fallback filename. */
        }
      }
      return { blob: await response.blob(), name };
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const message = payload?.error?.message || payload?.message;
      throw new Error(
        Array.isArray(message)
          ? message.join("; ")
          : message || "Không thể kết nối máy chủ",
      );
    }
    if (payload == null)
      throw new Error("Máy chủ trả về dữ liệu không đúng định dạng");
    return payload?.data ?? payload;
  } catch (error) {
    if (timedOut)
      throw new Error("Máy chủ phản hồi quá lâu. Vui lòng thử lại.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function validateSnapshot(data) {
  const arrays = [
    "classes",
    "courses",
    "students",
    "enrollments",
    "schedules",
    "homework",
    "submissions",
    "scores",
    "certificates",
    "records",
    "notifications",
    "documents",
    "classDocuments",
  ];
  if (
    !data ||
    typeof data.profile?.name !== "string" ||
    !["TEACHER", "STUDENT"].includes(data.profile.userType) ||
    arrays.some(
      (key) =>
        !Array.isArray(data[key]) ||
        data[key].some(
          (row) =>
            !row || typeof row !== "object" || typeof row.id !== "string",
        ),
    ) ||
    data.classes.some((row) => typeof row.name !== "string") ||
    data.records.some((row) => !row.content || typeof row.content !== "object")
  ) {
    throw new Error(
      "Dữ liệu portal không đúng định dạng. Vui lòng thử lại hoặc liên hệ quản trị viên.",
    );
  }
  return data;
}

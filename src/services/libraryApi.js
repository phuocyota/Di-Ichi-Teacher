import { getAccessToken, clearAuthSession } from './authSession.js'
import { API_BASE_URL } from './apiConfig.js'
const BASE = API_BASE_URL.replace(/\/$/, '')

export async function libraryRequest(path = '', { method = 'GET', body, signal, file = false } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, body instanceof FormData || file ? 180000 : 20000);
  try {
    const response = await fetch(BASE + '/lesson-library' + path, {
      method, signal: controller.signal,
      headers: { Authorization: 'Bearer ' + getAccessToken(), ...(!(body instanceof FormData) && body ? { 'Content-Type': 'application/json' } : {}) },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) { clearAuthSession(); window.location.assign('/login'); throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); }
    if (file && response.ok) return response.blob();
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      const message = result?.error?.message || result?.message;
      throw new Error(Array.isArray(message) ? message.join('; ') : message || (response.status === 403 ? 'Bạn không có quyền truy cập nội dung này' : 'Không thể tải thư viện bài giảng'));
    }
    if (result == null) throw new Error('Dữ liệu thư viện không hợp lệ');
    return result.data ?? result;
  } catch (error) {
    if (error.name === 'AbortError' && !signal?.aborted) throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

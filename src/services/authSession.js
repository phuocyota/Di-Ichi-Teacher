export const AUTH_SESSION_KEY = 'diIchiTeacherSession'

export const subscribeAuthSession = (listener) => {
  window.addEventListener('auth:changed', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('auth:changed', listener)
    window.removeEventListener('storage', listener)
  }
}

export const getAuthSession = () => {
  const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    clearAuthSession()
    return null
  }
}

export const getAccessToken = () => getAuthSession()?.accessToken || ''

export const saveAuthSession = (session, rememberLogin = false) => {
  const target = rememberLogin ? localStorage : sessionStorage
  const other = rememberLogin ? sessionStorage : localStorage
  other.removeItem(AUTH_SESSION_KEY)
  target.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event('auth:changed'))
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_KEY)
  sessionStorage.removeItem(AUTH_SESSION_KEY)
  window.dispatchEvent(new Event('auth:changed'))
}

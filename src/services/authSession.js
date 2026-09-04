export const AUTH_SESSION_KEY = 'diIchiTeacherSession'

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
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_KEY)
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

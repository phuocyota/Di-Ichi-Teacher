export const localeFromPath = (pathname = '') => /^\/(en|vn)(?=\/|$)/.exec(pathname)?.[1] || null;
export const languageForLocale = locale => locale === 'en' ? 'en' : 'vi';
export function preferredLocale() {
  try { return localStorage.getItem('di-ichi-language') === 'en' ? 'en' : 'vn'; }
  catch { return 'vn'; }
}
export function localizedPath(target, locale = localeFromPath(window.location.pathname) || preferredLocale()) {
  const prefix = locale === 'en' ? 'en' : 'vn';
  const localize = path => {
    if (!path.startsWith('/') || path.startsWith('//')) return path;
    return `/${prefix}${path.replace(/^\/(en|vn|vi)(?=\/|\?|#|$)/, '') || '/'}`;
  };
  return typeof target === 'string' ? localize(target)
    : { ...target, ...(target.pathname ? { pathname: localize(target.pathname) } : {}) };
}
export const localizedLoginPath = () => localizedPath('/login');

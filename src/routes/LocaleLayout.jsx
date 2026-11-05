import React, { useLayoutEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import i18n from '../i18n/i18n.js';
import { languageForLocale, localizedPath, preferredLocale } from '../i18n/localeRouting.js';

export function LocaleLayout({ locale }) {
  useLayoutEffect(() => {
    const language = languageForLocale(locale);
    if (i18n.language !== language) i18n.changeLanguage(language);
    try { localStorage.setItem('di-ichi-language', language); } catch { /* The URL still determines the language. */ }
    document.documentElement.lang = language;
  }, [locale]);
  return <Outlet />;
}
export function LegacyLocaleRedirect() {
  const location = useLocation();
  return <Navigate replace state={location.state} to={localizedPath({
    pathname: location.pathname === '/' ? '/login' : location.pathname,
    search: location.search,
    hash: location.hash,
  }, preferredLocale())} />;
}

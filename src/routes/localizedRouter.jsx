/* oxlint-disable react/only-export-components -- This router facade intentionally exports components and navigation hooks together. */
import React, { forwardRef, useCallback } from 'react';
import { Link as RouterLink, NavLink as RouterNavLink, Navigate as RouterNavigate, useLocation, useNavigate as useRouterNavigate } from 'react-router-dom';
import { localeFromPath, localizedPath, preferredLocale } from '../i18n/localeRouting.js';

export * from 'react-router-dom';

function useLocalize() {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname) || preferredLocale();
  return useCallback(target => localizedPath(target, locale), [locale]);
}
export const Link = forwardRef(function LocalizedLink({ to, ...props }, ref) {
  const localize = useLocalize();
  return <RouterLink {...props} ref={ref} to={localize(to)} />;
});
export const NavLink = forwardRef(function LocalizedNavLink({ to, ...props }, ref) {
  const localize = useLocalize();
  return <RouterNavLink {...props} ref={ref} to={localize(to)} />;
});
export function Navigate({ to, ...props }) {
  const localize = useLocalize();
  return <RouterNavigate {...props} to={localize(to)} />;
}
export function useNavigate() {
  const navigate = useRouterNavigate();
  const localize = useLocalize();
  return useCallback((to, options) => typeof to === 'number' ? navigate(to) : navigate(localize(to), options), [navigate, localize]);
}

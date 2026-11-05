import React from 'react';
import { transferableAbortController } from 'node:util';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appRoutes } from './appRoutes.jsx';
import i18n from '../i18n/i18n.js';
import { I18nDomTranslator } from '../i18n/I18nDomTranslator.jsx';
import { localizedLoginPath, localizedPath } from '../i18n/localeRouting.js';

let router;
globalThis.React = React;
const snapshot = {
  profile: { id: 't1', userId: 'u1', name: 'Teacher Demo', userType: 'TEACHER' },
  classes: [], courses: [], students: [], enrollments: [], schedules: [], homework: [],
  submissions: [], scores: [], certificates: [], records: [], notifications: [], documents: [], classDocuments: [],
};
function mount(path) {
  router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(<I18nextProvider i18n={i18n}><I18nDomTranslator /><RouterProvider router={router} /></I18nextProvider>);
}
beforeEach(async () => {
  vi.stubGlobal('AbortController', class { constructor() { return transferableAbortController(); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  await i18n.changeLanguage('vi');
  localStorage.setItem('diIchiTeacherSession', JSON.stringify({ accessToken: 'test-token' }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: snapshot }) }));
});
afterEach(() => {
  cleanup(); router?.dispose(); vi.unstubAllGlobals();
  localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/');
});

describe('Locale routes', () => {
  it('opens English directly, keeps query/hash on language switch and restores language on Back', async () => {
    mount('/en/lich-giang-day?week=2026-11-02#calendar');
    expect(await screen.findByRole('heading', { name: 'Teaching schedule' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('link', { name: 'My lesson plans' })).toHaveAttribute('href', '/en/giao-an');
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'vi' } });
    await waitFor(() => expect(router.state.location.pathname).toBe('/vn/lich-giang-day'));
    expect(router.state.location.search).toBe('?week=2026-11-02');
    expect(router.state.location.hash).toBe('#calendar');
    expect(await screen.findByRole('heading', { name: 'Lịch giảng dạy' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('vi');
    await act(() => router.navigate(-1));
    expect(await screen.findByRole('heading', { name: 'Teaching schedule' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByRole('link', { name: 'My classes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/en/lop-hoc-cua-toi'));
  });
  it('keeps English on login redirects and preserves the requested lesson and filters', async () => {
    localStorage.removeItem('diIchiTeacherSession');
    mount('/en/soan-giao-an/plan-1?draft=1#block-2');
    expect(await screen.findByRole('heading', { name: 'Teacher login' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/en/login');
    expect(router.state.location.state.from).toBe('/en/soan-giao-an/plan-1?draft=1#block-2');
  });
  it('redirects legacy bookmarks to Vietnamese and retains their query and hash', async () => {
    mount('/lich-giang-day?week=2026-11-02#calendar');
    expect(await screen.findByRole('heading', { name: 'Lịch giảng dạy' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/vn/lich-giang-day');
    expect(router.state.location.search).toBe('?week=2026-11-02');
    expect(router.state.location.hash).toBe('#calendar');
  });
  it('uses the saved language for the root entry and localizes expired-session redirects', async () => {
    localStorage.setItem('di-ichi-language', 'en');
    mount('/');
    expect(await screen.findByRole('heading', { name: 'Teacher login' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/en/login');
    window.history.replaceState({}, '', '/en/lich-giang-day');
    expect(localizedLoginPath()).toBe('/en/login');
    window.history.replaceState({}, '', '/vn/lich-giang-day');
    expect(localizedLoginPath()).toBe('/vn/login');
  });
  it('replaces prefixes without changing IDs and leaves relative and external targets intact', () => {
    expect(localizedPath('/vn/giao-an/plan-1/tien-do?class=c1#scores', 'en')).toBe('/en/giao-an/plan-1/tien-do?class=c1#scores');
    expect(localizedPath({ pathname: '/en/login', search: '?next=1', hash: '#form' }, 'vn')).toEqual({ pathname: '/vn/login', search: '?next=1', hash: '#form' });
    for (const path of ['../lesson', '#scores', '?week=1', 'https://example.com', '//example.com']) expect(localizedPath(path, 'en')).toBe(path);
  });
  it.each(['en', 'vn'])('registers every existing page and dynamic route under /%s', locale => {
    const paths = ['login', 'dashboard', 'thu-vien-bai-giang', 'soan-giao-an', 'soan-giao-an/p1', 'giao-an', 'giao-an/p1/tien-do', 'tao-hoat-dong', 'tao-hoat-dong/p1', 'soan-elearning', 'soan-elearning/p1', 'lich-giang-day', 'lop-hoc-cua-toi', 'ngan-hang-bai-tap', 'ngan-hang-de-thi', 'cham-diem', 'ket-qua-hoc-tap', 'ho-so-ca-nhan', 'lop-hoc-online', 'lop-hoc-online/s1'];
    for (const path of paths) {
      const matches = matchRoutes(appRoutes, `/${locale}/${path}`);
      expect(matches.at(-1).route.path).not.toBe('*');
      expect(matches[0].route.path).toBe(`/${locale}`);
    }
  });
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { I18nDomTranslator } from './I18nDomTranslator.jsx';

const { i18n } = vi.hoisted(() => ({ i18n: {
  language: 'vi',
  getResource: (_language, _namespace, kind) => kind === 'exact' ? { 'Chưa chấm công': 'Not checked in', 'Đã check-in': 'Checked in' } : {},
} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n }) }));
afterEach(() => { cleanup(); i18n.language = 'vi'; });
const View = ({ status, label }) => <><I18nDomTranslator /><button aria-label={label}>{status}</button></>;

describe('DOM translation of React updates', () => {
  it.each(['vi', 'en'])('preserves changing timekeeping text and accessible labels in %s', async language => {
    i18n.language = language;
    const view = render(<View status="Chưa chấm công" label="Lịch ngày 04/11" />);
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent(language === 'vi' ? 'Chưa chấm công' : 'Not checked in'));
    view.rerender(<View status="Đã check-in" label="Lịch ngày 05/11" />);
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent(language === 'vi' ? 'Đã check-in' : 'Checked in');
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Lịch ngày 05/11');
    });
  });
  it('restores the latest source text when returning to Vietnamese', async () => {
    i18n.language = 'en';
    const view = render(<View status="Chưa chấm công" label="Lịch" />);
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Not checked in'));
    view.rerender(<View status="Đã check-in" label="Lịch" />);
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Checked in'));
    i18n.language = 'vi';
    view.rerender(<View status="Đã check-in" label="Lịch" />);
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Đã check-in'));
  });
});

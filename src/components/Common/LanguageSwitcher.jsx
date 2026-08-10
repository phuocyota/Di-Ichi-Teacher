import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, t } = useTranslation()

  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-orange-50">
      <Languages size={18} className="text-orange-600" />
      {!compact && <span>{t('language.label')}</span>}
      <select
        className="bg-transparent text-sm font-black outline-none"
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        aria-label={t('language.label')}
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  )
}

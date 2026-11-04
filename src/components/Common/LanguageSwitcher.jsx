import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { languageForLocale, localeFromPath, localizedPath } from '../../i18n/localeRouting.js'

export const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <label data-i18n-skip className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-orange-50">
      <Languages size={18} className="text-orange-600" />
      {!compact && <span>{t('language.label')}</span>}
      <select
        className="teacher-select-compact bg-transparent text-sm font-black outline-none"
        value={languageForLocale(localeFromPath(location.pathname) || (i18n.language === 'en' ? 'en' : 'vn'))}
        onChange={(event) => navigate(localizedPath({ pathname: location.pathname, search: location.search, hash: location.hash }, event.target.value === 'en' ? 'en' : 'vn'), { state: location.state })}
        aria-label={t('language.label')}
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  )
}

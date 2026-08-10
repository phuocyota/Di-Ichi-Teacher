const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const translateText = (value, i18n) => {
  if (!value || i18n.language === 'vi') return value

  const exact = i18n.getResource(i18n.language, 'translation', 'exact') || {}
  const phrases = i18n.getResource(i18n.language, 'translation', 'phrases') || {}
  const trimmed = value.trim()

  if (exact[trimmed]) {
    return value.replace(trimmed, exact[trimmed])
  }

  return Object.entries(phrases)
    .sort(([first], [second]) => second.length - first.length)
    .reduce((translated, [source, target]) => translated.replace(new RegExp(escapeRegExp(source), 'g'), target), value)
}

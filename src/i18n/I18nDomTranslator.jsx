import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { translateText } from './translateText.js'

const textAttributes = ['aria-label', 'placeholder', 'title']

const shouldSkip = (node) => {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return !element || Boolean(element.closest('script, style, code, pre, [data-i18n-skip]'))
}

const translateNode = (node, i18n) => {
  if (node.nodeType === Node.TEXT_NODE) {
    if (shouldSkip(node) || !node.nodeValue.trim()) return

    if (!node.__i18nOriginalText) {
      node.__i18nOriginalText = node.nodeValue
    }

    const translated = translateText(node.__i18nOriginalText, i18n)
    if (node.nodeValue !== translated) {
      node.nodeValue = translated
    }
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE || shouldSkip(node)) return

  textAttributes.forEach((attribute) => {
    const value = node.getAttribute(attribute)
    if (!value) return

    const originalAttribute = `data-i18n-original-${attribute}`
    const original = node.getAttribute(originalAttribute) || value
    const translated = translateText(original, i18n)

    node.setAttribute(originalAttribute, original)
    if (value !== translated) {
      node.setAttribute(attribute, translated)
    }
  })

  node.childNodes.forEach((child) => translateNode(child, i18n))
}

export const I18nDomTranslator = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    const translatePage = () => translateNode(document.body, i18n)
    translatePage()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => translateNode(node, i18n))
        if (mutation.type === 'characterData') {
          translateNode(mutation.target, i18n)
        }
        if (mutation.type === 'attributes') {
          translateNode(mutation.target, i18n)
        }
      })
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: textAttributes,
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [i18n, i18n.language])

  return null
}

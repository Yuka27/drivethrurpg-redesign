import { useTranslation } from 'react-i18next'

/**
 * "core_rulebook" -> "Core rulebook": a genre, product type, rule system or
 * format in words, from listing:facets; without one, `fallback` (the API's
 * label) or the value tidied.
 */
export function useFacetLabel() {
  const { t } = useTranslation('listing')
  return (
    facet: 'genre' | 'type' | 'system' | 'format',
    value: string,
    fallback?: string,
  ) =>
    t(`facets.${facet}.${value}`, {
      defaultValue: fallback ?? value.replaceAll('_', ' '),
    })
}

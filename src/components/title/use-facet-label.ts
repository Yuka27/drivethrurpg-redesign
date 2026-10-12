import { useTranslation } from 'react-i18next'

/**
 * "core_rulebook" -> "Core rulebook": a product type, rule system or format in
 * words, from listing:facets, or the API's value tidied when there is none.
 */
export function useFacetLabel() {
  const { t } = useTranslation('listing')
  return (facet: 'genre' | 'type' | 'system' | 'format', value: string) =>
    t(`facets.${facet}.${value}`, { defaultValue: value.replaceAll('_', ' ') })
}

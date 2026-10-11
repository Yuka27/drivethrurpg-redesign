/**
 * One value of a filter facet, as both the library and the API's facets give
 * them. No count when the source has none (price bands, languages).
 */
export type FacetOption = { value: string; label: string; count?: number }

// card network names are never translated
const BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
}

/** "visa" -> "Visa"; unknown brands are capitalized as they come. */
export const brandName = (brand: string) =>
  BRANDS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1)

// GET /titles/{id}/preview test data, shaped like the v4.2 mock API's answer.
import type { PreviewEdition, TitlePreview } from '@/api/titles'
import { usd } from '@/test/api'

export const pdfEdition = (
  overrides: Partial<PreviewEdition> = {},
): PreviewEdition => ({
  sku: 'sku_pdf',
  format: 'pdf',
  label: 'PDF',
  price: usd(2499),
  listPrice: usd(2999),
  onSale: true,
  default: true,
  note: 'Instant download',
  stock: 'in_stock',
  stockNote: null,
  shipsFrom: null,
  includesPdf: true,
  ...overrides,
})

export const printEdition = (
  overrides: Partial<PreviewEdition> = {},
): PreviewEdition => ({
  sku: 'sku_print',
  format: 'print_pdf',
  label: 'Hardcover + PDF',
  price: usd(4999),
  listPrice: usd(5499),
  onSale: true,
  default: false,
  note: 'Hardcover ships in 2-3 days, PDF included instantly',
  stock: 'low_stock',
  stockNote: 'Only 3 left',
  shipsFrom: 'US',
  includesPdf: true,
  ...overrides,
})

/** Monster Manual Expanded, more or less: two editions, three samples of five. */
export const previewOf = (
  id: string,
  overrides: Partial<TitlePreview> = {},
): TitlePreview => ({
  id,
  title: `Title ${id}`,
  publisher: { id: 'pub_dms_guild', name: 'DMs Guild creators' },
  cover: { url: `/img/covers/${id}.jpg`, alt: `Title ${id} cover` },
  type: 'bestiary',
  ruleSystemName: 'D&D 5E',
  genres: ['Fantasy'],
  rating: { average: 4.7, count: 214 },
  pageCount: 256,
  languageLabel: 'English',
  releaseDate: '2025-07-22',
  humanCreated: true,
  instantDownload: true,
  shortDescription: 'Four hundred monsters for fifth edition.',
  available: true,
  upcoming: false,
  owned: false,
  inWishlist: false,
  editions: [pdfEdition(), printEdition()],
  previewPages: [
    { url: '/img/pages/one.jpg', alt: 'Contents' },
    { url: '/img/pages/two.jpg', alt: 'The aboleth' },
    { url: '/img/pages/three.jpg', alt: 'The beholder' },
  ],
  previewPageTotal: 5,
  sampleFileUrl: '/files/sample.pdf',
  sampleFile: {
    url: '/files/sample.pdf',
    pageCount: 12,
    sizeMb: 10.6,
    format: 'pdf',
  },
  ...overrides,
})

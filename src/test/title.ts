// The product page's test data: one title ("Vaesen") and its API, faked.
import type { TitleDetail } from '@/api/titles'
import { mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'

export const usd = (amount: number) => ({ amount, currency: 'USD' })

export const vaesen: TitleDetail = {
  id: 'ttl_vaesen',
  title: 'Vaesen: City of My Nightmares',
  publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
  cover: { url: '/img/vaesen.jpg', alt: 'Vaesen cover' },
  type: 'adventure',
  ruleSystem: 'year_zero',
  formats: ['pdf', 'print_pdf'],
  price: usd(1999),
  listPrice: usd(1999),
  onSale: false,
  rating: { average: 4.8, count: 141 },
  owned: false,
  inWishlist: false,
  textLanguage: 'en',
  description: 'A city of nightmares.\n\nSecond paragraph.',
  authors: [{ id: 'aut_1', name: 'Nils Karlén' }],
  releaseDate: '2023-11-21',
  pageCount: 208,
  fileSizeMb: 52,
  language: 'en',
  isbn: null,
  contentFlags: { aiGenerated: false },
  editions: [
    {
      sku: 'sku_pdf',
      format: 'pdf',
      label: 'PDF',
      price: usd(1999),
      stock: 'in_stock',
      shipsFrom: null,
      includesPdf: true,
    },
    {
      sku: 'sku_print',
      format: 'print_pdf',
      label: 'Hardcover + PDF',
      price: usd(4499),
      stock: 'in_stock',
      shipsFrom: 'SE',
      includesPdf: true,
    },
    {
      sku: 'sku_box',
      format: 'print',
      label: 'Box set',
      price: usd(9999),
      stock: 'out_of_stock',
      shipsFrom: 'SE',
      includesPdf: false,
    },
  ],
  available: true,
  availableLanguages: ['en', 'pl'],
}

const review = (
  id: string,
  rating: number,
  createdAt: string,
  verifiedOwner = false,
) => ({
  id,
  author: { displayName: `Reader ${id}` },
  rating,
  title: `Review ${id}`,
  body: `Body ${id}`,
  createdAt,
  verifiedOwner,
})

export function mockTitle(
  overrides: Record<string, Handler> = {},
  me: Handler = { body: user },
) {
  return mockApi({
    'GET /me': me,
    'GET /titles/ttl_vaesen': { body: vaesen },
    'GET /titles/ttl_vaesen/reviews': {
      body: {
        items: [
          review('r1', 5, '2026-08-15T10:00:00Z', true),
          review('r2', 4, '2026-07-14T10:00:00Z'),
          review('r3', 3, '2026-06-01T10:00:00Z'),
          review('r4', 5, '2026-05-01T10:00:00Z'),
          review('r5', 5, '2026-04-01T10:00:00Z'),
        ],
        total: 5,
        histogram: [0, 0, 1, 1, 3],
      },
    },
    'GET /titles/ttl_vaesen/discussions': {
      body: {
        items: [
          {
            id: 'thr_1',
            title: 'Printed copy quality?',
            author: { displayName: 'Davos S.' },
            replyCount: 7,
            createdAt: '2026-09-12T14:00:00Z',
            lastReplyAt: '2026-10-05T17:00:00Z',
          },
        ],
        total: 1,
      },
    },
    'GET /titles/ttl_vaesen/similar': {
      body: [
        {
          ...vaesen,
          id: 'ttl_coriolis',
          title: 'Coriolis: The Flowers of Algorab',
          price: usd(2799),
        },
      ],
    },
    'GET /titles/ttl_vaesen/samples': {
      body: {
        previewPages: [
          { url: '/img/p1.jpg', alt: 'Map of the city' },
          { url: '/img/p2.jpg', alt: '' },
        ],
        sampleFileUrl: '/files/sample.pdf',
      },
    },
    'GET /publishers/pub_free_league': {
      body: {
        id: 'pub_free_league',
        name: 'Free League Publishing',
        logo: null,
        titleCount: 187,
        following: false,
      },
    },
    ...overrides,
  })
}

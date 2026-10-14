import { describe, expect, it } from 'vite-plus/test'

import { HomeSchema, TitleDetailSchema, TitlePreviewSchema } from './titles'
import { vaesen } from '@/test/title'

/** GET /home as the v4.1 mock API sends it (trimmed). */
const home = {
  hero: [
    {
      id: 'bn_1',
      title: 'Autumn of Horror sale',
      subtitle: 'Up to 30% off Vaesen, Coriolis and more',
      cta: 'Shop the sale',
      link: '/titles?onSale=true',
      image: {
        url: '/img/hero/hero-autumn-of-horror.jpg',
        alt: 'Autumn of Horror sale',
      },
      contentSide: 'right',
      autoplayMs: 6000,
    },
  ],
  heroOptions: {
    autoplay: true,
    intervalMs: 6000,
    pauseOnHover: true,
    contentSide: ['left', 'right'],
  },
  promos: [
    {
      id: 'promo_horror',
      label: 'Seasonal sale',
      discountLabel: 'Up to 30% off',
      title: 'Autumn of Horror',
      subtitle: 'Vaesen, Coriolis and more',
      art: { url: '/img/promos/autumn-of-horror.jpg', alt: '' },
      link: '/titles?onSale=true&genre=horror',
      endsAt: '2026-10-31T23:59:00Z',
    },
  ],
  publishers: [
    {
      id: 'pub_cubicle7',
      name: 'Cubicle 7 Entertainment',
      logo: {
        url: '/img/publishers/pub_cubicle7.png',
        alt: 'Cubicle 7 Entertainment logo',
      },
      titleCount: 214,
      following: true,
    },
  ],
  sections: [{ id: 'new', title: 'New releases', titles: [] }],
}

describe('HomeSchema', () => {
  it('reads the v4.1 home: carousel, promos, publishers', () => {
    const parsed = HomeSchema.parse(home)

    expect(parsed.heroOptions).toEqual({
      autoplay: true,
      intervalMs: 6000,
      pauseOnHover: true,
      contentSide: ['left', 'right'],
    })
    expect(parsed.hero[0]).toMatchObject({
      contentSide: 'right',
      autoplayMs: 6000,
    })
    expect(parsed.promos[0]).toMatchObject({
      title: 'Autumn of Horror',
      discountLabel: 'Up to 30% off',
      art: { url: '/img/promos/autumn-of-horror.jpg', alt: '' },
      endsAt: '2026-10-31T23:59:00Z',
    })

    expect(parsed.hero[0]?.image).toEqual({
      url: '/img/hero/hero-autumn-of-horror.jpg',
      alt: 'Autumn of Horror sale',
    })
    expect(parsed.publishers).toEqual([
      {
        id: 'pub_cubicle7',
        name: 'Cubicle 7 Entertainment',
        logo: {
          url: '/img/publishers/pub_cubicle7.png',
          alt: 'Cubicle 7 Entertainment logo',
        },
        titleCount: 214,
        following: true,
      },
    ])
    expect(parsed.sections.map((section) => section.id)).toEqual(['new'])
  })

  it('keeps hasRealLogo when a publisher has it', () => {
    const parsed = HomeSchema.parse({
      ...home,
      publishers: [{ ...home.publishers[0], hasRealLogo: true }],
    })
    expect(parsed.publishers[0]?.hasRealLogo).toBe(true)
  })

  it('ignores keys it does not know instead of failing', () => {
    expect(() =>
      HomeSchema.parse({ ...home, campaigns: [{ id: 'x' }], version: 4 }),
    ).not.toThrow()
  })

  it('reads a v4 home: no carousel options, copy on the left', () => {
    const { heroOptions: _, ...v4 } = home
    const parsed = HomeSchema.parse({
      ...v4,
      hero: [
        { ...home.hero[0], contentSide: undefined, autoplayMs: undefined },
      ],
    })
    expect(parsed.heroOptions).toBeNull()
    expect(parsed.hero[0]).toMatchObject({
      contentSide: 'left',
      autoplayMs: null,
    })
  })

  it('drops a broken slide, keeping the others', () => {
    const parsed = HomeSchema.parse({
      ...home,
      hero: [{ id: 'bn_0' }, ...home.hero],
      heroOptions: 'fast',
    })
    expect(parsed.hero.map((slide) => slide.id)).toEqual(['bn_1'])
    expect(parsed.heroOptions).toBeNull()
  })

  it('keeps the banner when another part is missing or malformed', () => {
    const parsed = HomeSchema.parse({
      hero: home.hero,
      sections: 'not a list',
    })
    expect(parsed.hero).toHaveLength(1)
    expect(parsed.sections).toEqual([])
    expect(parsed.publishers).toEqual([])
  })
})

describe('TitleDetailSchema', () => {
  it('reads what the title can be followed through, in order', () => {
    const parsed = TitleDetailSchema.parse({
      ...vaesen,
      followTargets: [
        ...vaesen.followTargets,
        // a kind this app does not know yet: left out
        { type: 'author', id: 'aut_1', name: 'Nils', following: false },
      ],
    })
    expect(parsed.followTargets.map((target) => target.type)).toEqual([
      'publisher',
      'product_line',
      'rule_system',
      'genre',
    ])
    expect(parsed.genreRefs).toEqual([
      { id: 'horror', name: 'Horror', following: false },
    ])
    expect(parsed.productLineRef).toEqual({
      id: 'pl_vaesen',
      name: 'Vaesen',
      following: true,
    })
  })

  it('reads a title from before v4.1 without them', () => {
    const {
      followTargets: _targets,
      genreRefs: _genres,
      productLineRef: _line,
      ...older
    } = vaesen
    const parsed = TitleDetailSchema.parse(older)
    expect(parsed.followTargets).toEqual([])
    expect(parsed.genreRefs).toEqual([])
    expect(parsed.productLineRef).toBeNull()
  })
})

/** GET /titles/{id}/preview?pages=3 as the v4.2 mock API answers it */
const eberronPreview = {
  id: 'ttl_exploring_eberron',
  title: 'Exploring Eberron',
  publisher: { id: 'pub_visionary', name: 'Visionary Production and Design' },
  cover: {
    url: '/img/covers/exploring-eberron.jpg',
    alt: 'Exploring Eberron cover',
  },
  type: 'setting',
  ruleSystem: 'd20_5e',
  ruleSystemName: 'D&D 5E',
  genres: ['Fantasy'],
  rating: { average: 4.9, count: 502 },
  pageCount: 320,
  language: 'en',
  languageLabel: 'English',
  releaseDate: '2022-07-19',
  humanCreated: true,
  instantDownload: true,
  shortDescription:
    'A setting for d20 5e, built around a road nobody remembers building.',
  available: true,
  upcoming: false,
  owned: true,
  inWishlist: true,
  editions: [
    {
      sku: 'sku_exploring_eberron_pdf',
      format: 'pdf',
      label: 'PDF',
      price: { amount: 1999, currency: 'USD' },
      stock: 'in_stock',
      shipsFrom: null,
      includesPdf: true,
      listPrice: { amount: 1999, currency: 'USD' },
      onSale: false,
      default: true,
      note: 'Instant download',
      stockNote: null,
    },
  ],
  previewPages: [
    {
      url: '/img/pages/eberron-contents.jpg',
      alt: 'Page spread: contents and the Map of the Planes',
    },
    {
      url: '/img/pages/eberron-faiths.jpg',
      alt: 'Page spread: Faiths of Eberron',
    },
    {
      url: '/img/pages/eberron-character-options.jpg',
      alt: 'Page spread: Character Options',
    },
  ],
  previewPageTotal: 4,
  sampleFileUrl: '/files/sample.pdf',
  originalLanguage: 'en',
  textLanguage: 'en',
  availableLanguages: ['en', 'pl'],
}
const monsterManualEditions = [
  {
    sku: 'sku_monster_manual_expanded_pdf',
    format: 'pdf',
    label: 'PDF',
    price: { amount: 2499, currency: 'USD' },
    stock: 'in_stock',
    shipsFrom: null,
    includesPdf: true,
    listPrice: { amount: 2999, currency: 'USD' },
    onSale: true,
    default: true,
    note: 'Instant download',
    stockNote: null,
  },
  {
    sku: 'sku_monster_manual_expanded_print_pdf',
    format: 'print_pdf',
    label: 'Hardcover + PDF',
    price: { amount: 4999, currency: 'USD' },
    stock: 'low_stock',
    shipsFrom: 'UK',
    includesPdf: true,
    listPrice: { amount: 5499, currency: 'USD' },
    onSale: true,
    default: false,
    note: 'Hardcover ships in 2-3 days, PDF included instantly',
    stockNote: 'Only 3 left',
  },
]

describe('TitlePreviewSchema', () => {
  it('reads the v4.2 preview', () => {
    const parsed = TitlePreviewSchema.parse(eberronPreview)

    expect(parsed).toMatchObject({
      id: 'ttl_exploring_eberron',
      publisher: {
        id: 'pub_visionary',
        name: 'Visionary Production and Design',
      },
      ruleSystemName: 'D&D 5E',
      genres: ['Fantasy'],
      languageLabel: 'English',
      humanCreated: true,
      instantDownload: true,
      owned: true,
      previewPageTotal: 4,
    })
    expect(parsed.previewPages).toHaveLength(3)
    expect(parsed.editions[0]).toMatchObject({
      default: true,
      note: 'Instant download',
    })
    // what the panel does not use stays out
    expect(parsed).not.toHaveProperty('availableLanguages')
  })

  it('reads editions on sale and low in stock', () => {
    const parsed = TitlePreviewSchema.parse({
      ...eberronPreview,
      editions: monsterManualEditions,
    })
    expect(
      parsed.editions.map((edition) => [
        edition.label,
        edition.stock,
        edition.stockNote,
      ]),
    ).toEqual([
      ['PDF', 'in_stock', null],
      ['Hardcover + PDF', 'low_stock', 'Only 3 left'],
    ])
    expect(parsed.editions[1]?.listPrice).toEqual({
      amount: 5499,
      currency: 'USD',
    })
  })

  it('leaves out a broken edition or page, and reads a title without samples', () => {
    const parsed = TitlePreviewSchema.parse({
      ...eberronPreview,
      editions: [{ sku: 'broken' }, ...eberronPreview.editions],
      previewPages: [{ alt: 'no url' }],
      previewPageTotal: undefined,
      sampleFileUrl: undefined,
    })
    expect(parsed.editions).toHaveLength(1)
    expect(parsed.previewPages).toEqual([])
    expect(parsed.previewPageTotal).toBe(0)
    expect(parsed.sampleFileUrl).toBeNull()
  })
})

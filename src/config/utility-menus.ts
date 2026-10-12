// The utility menus (Community, Information, Support): the header's nav row,
// the mobile menu's "More" and the product page's sticky menu. The real pages
// live on the main site, outside this redesign; TODO_URL marks the hrefs still
// to fill in, as in footer.ts. Brand names stay literal (label), UI text is a
// translation key in common.json (labelKey).
import { TODO_URL } from './footer'
import type { FooterLink, FooterTextKey } from './footer'

export type UtilityMenu = {
  key: 'community' | 'information' | 'support'
  titleKey: FooterTextKey
  links: Array<FooterLink>
}

export const utilityMenus: Array<UtilityMenu> = [
  {
    key: 'community',
    titleKey: 'nav.groups.community',
    links: [
      {
        label: 'Dungeon Masters Guild (D&D)',
        href: 'https://www.dmsguild.com',
        external: true,
      },
      {
        label: 'Pathfinder Infinite',
        href: 'https://www.pathfinderinfinite.com',
        external: true,
      },
      {
        label: 'Starfinder Infinite',
        href: 'https://www.starfinderinfinite.com',
        external: true,
      },
      { label: 'Miskatonic Repository', href: TODO_URL, external: true },
      {
        label: 'Storytellers Vault',
        href: 'https://www.storytellersvault.com',
        external: true,
      },
    ],
  },
  {
    key: 'information',
    titleKey: 'nav.groups.information',
    links: [
      { labelKey: 'nav.links.about', href: TODO_URL },
      { labelKey: 'nav.links.imprint', href: TODO_URL },
      { labelKey: 'nav.links.blog', href: TODO_URL },
      { labelKey: 'nav.links.productReviews', href: TODO_URL },
    ],
  },
  {
    key: 'support',
    titleKey: 'nav.groups.support',
    links: [
      { labelKey: 'nav.links.faq', href: TODO_URL },
      { labelKey: 'nav.links.contact', href: TODO_URL },
      { labelKey: 'nav.links.suggestion', href: TODO_URL },
    ],
  },
]

/** An external link opens in a new tab, as in the footer. */
export const linkTarget = (link: FooterLink) =>
  link.external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : ({} as Record<string, never>)

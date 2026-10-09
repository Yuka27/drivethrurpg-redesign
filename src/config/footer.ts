// All footer content in one typed file. Every item is a link.
// TODO_URL marks hrefs I could not verify: search the repo for it and fill them in.
// UI text is a translation key (labelKey, in common.json); brand and product names
// (Roll20, Demiplane, DriveThruComics, "Cyberpunk RED Nexus"…) stay literal (label).
import type { ParseKeys } from 'i18next'

import drivethrucomics from '@/assets/logos/drivethrucomics.webp'
import drivethrufiction from '@/assets/logos/drivethrufiction.webp'
import drivethrucards from '@/assets/logos/drivethrucards.webp'
import dungeonMastersGuild from '@/assets/logos/dungeon-masters-guild.webp'
import storytellersVault from '@/assets/logos/storytellers-vault.webp'
import wargameVault from '@/assets/logos/wargame-vault.webp'
import pathfinderInfinite from '@/assets/logos/pathfinder-infinite.webp'

export const TODO_URL = '#'

export type FooterTextKey = ParseKeys<'common'>

/** A literal name (brands, products) or a translation key (UI text), never both. */
export type FooterLabel =
  | { label: string; labelKey?: never }
  | { labelKey: FooterTextKey; label?: never }

export type FooterLink = FooterLabel & {
  href: string
  /** external links open in a new tab with rel="noopener noreferrer" */
  external?: boolean
}

export type BrandLink = {
  /** brand name: alt text, never translated */
  label: string
  href: string
  external?: boolean
  logo: string
  width: number
  height: number
}

/** Sister-site logos in the strip above the footer (order = left to right). */
export const brandLinks: BrandLink[] = [
  {
    label: 'DriveThruComics',
    href: 'https://www.drivethrucomics.com',
    external: true,
    logo: drivethrucomics,
    width: 160,
    height: 24,
  },
  {
    label: 'DriveThruFiction',
    href: 'https://www.drivethrufiction.com',
    external: true,
    logo: drivethrufiction,
    width: 160,
    height: 24,
  },
  {
    label: 'DriveThruCards',
    href: 'https://www.drivethrucards.com',
    external: true,
    logo: drivethrucards,
    width: 150,
    height: 24,
  },
  {
    label: 'Dungeon Masters Guild',
    href: 'https://www.dmsguild.com',
    external: true,
    logo: dungeonMastersGuild,
    width: 225,
    height: 24,
  },
  {
    label: 'Storytellers Vault',
    href: 'https://www.storytellersvault.com',
    external: true,
    logo: storytellersVault,
    width: 140,
    height: 24,
  },
  {
    label: 'Wargame Vault',
    href: 'https://www.wargamevault.com',
    external: true,
    logo: wargameVault,
    width: 118,
    height: 24,
  },
  {
    label: 'Pathfinder Infinite',
    href: 'https://www.pathfinderinfinite.com',
    external: true,
    logo: pathfinderInfinite,
    width: 82,
    height: 24,
  },
]

/** Row of small links next to the newsletter form. */
export const legalLinks: FooterLink[] = [
  { labelKey: 'footer.legal.privacyPolicy', href: TODO_URL },
  { labelKey: 'footer.legal.bugBounty', href: TODO_URL },
  { labelKey: 'footer.legal.productRss', href: TODO_URL },
  { labelKey: 'footer.legal.newsletterRss', href: TODO_URL },
]

export type LinkGroup = {
  /** brand name, never translated */
  title: string
  titleHref?: string
  links: FooterLink[]
  /** show only the first N links, rest behind "+M more systems" / "Show less" */
  previewCount?: number
  /** plural key for the "+M more" button, called with { count: hidden links } */
  moreKey?: FooterTextKey
}

export const linkGroups: LinkGroup[] = [
  {
    title: 'Roll20',
    titleHref: 'https://roll20.net',
    links: [
      { label: 'Roll20 Tabletop', href: 'https://roll20.net', external: true },
      { label: 'Roll20 Characters', href: TODO_URL, external: true },
      {
        label: 'Roll20 Marketplace',
        href: 'https://marketplace.roll20.net',
        external: true,
      },
      { label: 'Roll20 Compendium', href: TODO_URL, external: true },
    ],
  },
  {
    title: 'Demiplane',
    titleHref: 'https://www.demiplane.com',
    previewCount: 3,
    moreKey: 'footer.moreSystems', // count is computed from the list: 15 systems - 3 shown = 12
    links: [
      'Pathfinder',
      'Cyberpunk RED',
      'Daggerheart',
      'Vampire: The Masquerade',
      'Marvel Multiverse RPG',
      'Cosmere RPG',
      'Starfinder 2e',
      'Traveller',
      'Alien: RPG',
      'DC20',
      'Fallout RPG',
      'Candela Obscura',
      'Hunter: The Reckoning',
      'Mutant: Year Zero',
      'Scion 2e',
    ].map((name) => ({
      label: `${name} Nexus`,
      href: TODO_URL,
      external: true,
    })),
  },
  {
    title: 'Dungeon Scrawl',
    titleHref: 'https://dungeonscrawl.com',
    links: [
      {
        labelKey: 'footer.dungeonScrawl.createMaps',
        href: 'https://dungeonscrawl.com',
        external: true,
      },
      {
        labelKey: 'footer.dungeonScrawl.createMap',
        href: 'https://app.dungeonscrawl.com',
        external: true,
      },
    ],
  },
]

export const socialLinks: FooterLink[] = [
  { label: 'Facebook', href: TODO_URL, external: true },
  { label: 'Twitter', href: TODO_URL, external: true },
  { label: 'Bluesky', href: TODO_URL, external: true },
  { label: 'TikTok', href: TODO_URL, external: true },
  { label: 'YouTube', href: TODO_URL, external: true },
]

export const copyrightKey: FooterTextKey = 'footer.copyright'

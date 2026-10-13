import { Link } from '@tanstack/react-router'
import { InfoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { assetUrl } from '@/api/client'
import { useLibrary } from '@/api/library'
import { useMe } from '@/api/me'
import { useTitleFacets, useTitles } from '@/api/titles'
import { useWishlist } from '@/api/wishlist'
import { DealBadges } from '@/components/title/deal-badges'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

/** Three groups of four. */
const GROUPS = 3
const PER_GROUP = 4

/** A group: the genres with the most titles, or rule systems without genres. */
type Group = { facet: 'genre' | 'system'; value: string; label: string }

/**
 * "Featured for you" (signed in) or "Popular this week" (guests): the three
 * genres with the most titles, four bestsellers each, and why each group is
 * there. Without genre data the groups are the three biggest rule systems.
 */
export function FeaturedForYou() {
  const { t } = useTranslation('home')
  const facetLabel = useFacetLabel()
  const signedIn = Boolean(useMe().data)
  const facets = useTitleFacets({})
  const counts = useOwnedCounts(signedIn)

  if (facets.isPending) return <FeaturedSkeleton />
  const genres = [...(facets.data?.genres ?? [])].sort(
    (a, b) => b.count - a.count,
  )
  const groups: Array<Group> = (
    genres.length > 0
      ? genres.map((g) => ({ facet: 'genre' as const, ...g }))
      : (facets.data?.ruleSystems ?? []).map((s) => ({
          facet: 'system' as const,
          ...s,
        }))
  )
    .slice(0, GROUPS)
    .map(({ facet, value, label }) => ({
      facet,
      value,
      // systems have our names ("D20 / 5e"); genres the API's ("Sci-Fi")
      label: facet === 'system' ? facetLabel('system', value) : label,
    }))
  if (groups.length === 0) return null

  return (
    <section aria-labelledby="featured" className="flex flex-col gap-4">
      <SectionHeading
        id="featured"
        action={signedIn ? <WhyPopover /> : undefined}
      >
        {t(signedIn ? 'featured' : 'popular')}
      </SectionHeading>
      <ul className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <FeaturedGroup
            key={group.value}
            group={group}
            reason={groupReason(t, group, signedIn ? counts : undefined)}
          />
        ))}
      </ul>
    </section>
  )
}

type Counts = {
  owned: (group: Group) => number
  wished: (group: Group) => number
}

/**
 * How many of a group's titles the user owns and has wished for, from the
 * library and wishlist lists (one cached request each, shared with their pages).
 */
function useOwnedCounts(signedIn: boolean): Counts {
  const library = useLibrary(signedIn).data ?? []
  const wishlist = useWishlist(signedIn).data?.items ?? []
  const matches = (
    item: { genre: string | null; ruleSystem: string | null },
    group: Group,
  ) => (group.facet === 'genre' ? item.genre : item.ruleSystem) === group.value
  return {
    owned: (group) => library.filter((item) => matches(item, group)).length,
    wished: (group) => wishlist.filter((item) => matches(item, group)).length,
  }
}

/** "Because you own 3 Horror titles", "…on your wishlist", "Popular in Horror". */
function groupReason(
  t: ReturnType<typeof useTranslation<'home'>>['t'],
  group: Group,
  counts: Counts | undefined,
) {
  const owned = counts?.owned(group) ?? 0
  if (owned > 0)
    return t('groupReason.owned', { count: owned, genre: group.label })
  if ((counts?.wished(group) ?? 0) > 0) return t('groupReason.wishlist')
  return t('groupReason.popular', { genre: group.label })
}

/** Signed in only: where the groups come from, and the way to change it. */
function WhyPopover() {
  const { t } = useTranslation('home')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
          <InfoIcon aria-hidden />
          <span className="max-sm:sr-only">{t('why.button')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-2 text-sm">
        <p>{t('why.text')}</p>
        <Link
          to="/account/preferences"
          className="font-semibold text-primary-text hover:underline"
        >
          {t('why.link')}
        </Link>
      </PopoverContent>
    </Popover>
  )
}

function FeaturedGroup({ group, reason }: { group: Group; reason: string }) {
  const query = useTitles(
    { [group.facet]: group.value },
    { sort: 'bestselling', page: 1, pageSize: PER_GROUP },
  )
  const titles = query.data?.items

  return (
    <li className="flex flex-col gap-1 overflow-hidden rounded-xl border border-muted bg-card pt-2">
      <div className="px-4">
        <h3 className="font-sans text-base leading-6 font-medium">
          <Link
            to="/titles"
            search={{ [group.facet]: group.value }}
            className="hover:underline"
          >
            {group.label}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
      {query.isPending && <CoverSkeletons />}
      <ul aria-label={group.label} className="grid grid-cols-2">
        {(titles ?? []).map((title) => (
          <li key={title.id}>
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              className="group flex flex-col"
            >
              <span className="relative block h-[185px] bg-muted">
                {title.cover && (
                  <img
                    src={assetUrl(title.cover.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-b from-transparent from-33% to-card/80"
                />
                <DealBadges
                  title={title}
                  tone="primary"
                  className="absolute bottom-2 left-2"
                />
              </span>
              <span className="truncate px-3 py-2 text-xs text-muted-foreground group-hover:text-foreground">
                {title.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Four covers with captions, as a group's titles will be. */
function CoverSkeletons() {
  return (
    <div aria-hidden className="grid grid-cols-2">
      {Array.from({ length: PER_GROUP }, (_, index) => (
        <div key={index} className="flex flex-col">
          <Skeleton className="h-[185px] rounded-none" />
          <span className="px-3 py-2.5">
            <Skeleton className="h-3 w-3/4" />
          </span>
        </div>
      ))}
    </div>
  )
}

/** The section's outline while the genres load. */
function FeaturedSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: GROUPS }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 overflow-hidden rounded-xl border border-muted bg-card pt-2"
          >
            <div className="flex flex-col gap-1.5 px-4 py-0.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <CoverSkeletons />
          </div>
        ))}
      </div>
    </div>
  )
}

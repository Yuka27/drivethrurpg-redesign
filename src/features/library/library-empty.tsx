import { Link } from '@tanstack/react-router'
import { BookOpenTextIcon, SearchXIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  EmptyActions,
  EmptyLink,
  EmptyState,
} from '@/components/site/empty-state'
import { Button } from '@/components/ui/button'
import { useComingSoon } from '@/lib/use-coming-soon'

const miniClass =
  'flex flex-col gap-0.5 rounded-[10px] border bg-card p-3 text-left hover:bg-secondary'

/**
 * An empty library: a beginning, not a failure. The store, and
 * the three real reasons a library is empty: new here, a gift to claim, or
 * purchases on another account.
 */
export function LibraryEmpty() {
  const { t } = useTranslation('library')
  const { t: tCommon } = useTranslation()
  const comingSoon = useComingSoon()
  return (
    <EmptyState
      icon={<BookOpenTextIcon />}
      title={t('emptyState.title')}
      text={t('emptyState.text')}
    >
      <EmptyActions>
        <Button asChild className="rounded-lg">
          <Link to="/titles">{tCommon('emptyStates.browseStore')}</Link>
        </Button>
      </EmptyActions>
      <ul className="mt-1.5 grid w-full gap-2.5 sm:grid-cols-3">
        <li>
          {/* the gift email carries the link; there is nothing to open here */}
          <div className={`${miniClass} hover:bg-card`}>
            <Mini
              title={t('emptyState.gift')}
              hint={t('emptyState.giftHint')}
            />
          </div>
        </li>
        <li>
          {/* TODO(account-merge): no flow yet to merge another account */}
          <button
            type="button"
            onClick={comingSoon}
            className={`${miniClass} w-full`}
          >
            <Mini
              title={t('emptyState.merge')}
              hint={t('emptyState.mergeHint')}
            />
          </button>
        </li>
        <li>
          <Link to="/titles" search={{ priceMax: 0 }} className={miniClass}>
            <Mini
              title={t('emptyState.free')}
              hint={t('emptyState.freeHint')}
            />
          </Link>
        </li>
      </ul>
    </EmptyState>
  )
}

function Mini({ title, hint }: { title: string; hint: ReactNode }) {
  return (
    <>
      <span className="text-[13px] font-bold">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
    </>
  )
}

/**
 * No match: what was searched, how much the library holds,
 * a way back, and where a missing purchase might be.
 */
export function LibraryNoMatch({
  query,
  owned,
  onClear,
}: {
  query: string
  owned: number
  onClear: () => void
}) {
  const { t } = useTranslation('library')
  const q = query.trim()
  return (
    <EmptyState
      icon={<SearchXIcon />}
      title={
        q
          ? t('emptyState.noMatchQuery', { query: q })
          : t('emptyState.noMatchFilters')
      }
      text={t('emptyState.owned', { count: owned })}
      className="rounded-md bg-card"
    >
      <EmptyActions>
        <Button onClick={onClear} className="rounded-lg">
          {t(q ? 'emptyState.clearSearch' : 'clearFilters')}
        </Button>
      </EmptyActions>
      <EmptyLink to="/orders">{t('emptyState.orders')}</EmptyLink>
    </EmptyState>
  )
}

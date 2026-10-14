import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FooterLink } from './footer-link'
import type { LinkGroup } from '@/config/footer'

type SystemGroupsProps = {
  groups: Array<LinkGroup>
}

export function SystemGroups({ groups }: SystemGroupsProps) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-3 lg:gap-0">
      {groups.map((group) => (
        <SystemGroup key={group.title} group={group} />
      ))}
    </div>
  )
}

function SystemGroup({ group }: { group: LinkGroup }) {
  const { t } = useTranslation()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const preview = group.previewCount ?? group.links.length
  const hidden = group.links.length - preview
  const visible = expanded ? group.links : group.links.slice(0, preview)

  return (
    <nav aria-label={group.title}>
      <h2 className="flex h-6 items-center px-2 font-sans text-xs font-bold tracking-normal">
        {group.titleHref ? (
          <a
            href={group.titleHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {group.title}
            <span className="sr-only"> {t('actions.opensInNewTab')}</span>
          </a>
        ) : (
          group.title
        )}
      </h2>
      <ul id={listId}>
        {visible.map((link) => (
          <li key={link.label ?? link.labelKey}>
            <FooterLink link={link} />
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="flex h-6 items-center rounded-full px-2 text-xs font-medium text-primary-text hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {expanded
            ? t('footer.showLess')
            : t(group.moreKey ?? 'footer.moreSystems', { count: hidden })}
        </button>
      )}
    </nav>
  )
}

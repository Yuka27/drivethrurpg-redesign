import { Skeleton } from '@/components/ui/skeleton'

/**
 * A filter panel while its facets load: `FilterGroup` sidebars, each a heading
 * over a few checkbox rows (the sheet shows closed headings only).
 */
export function FilterPanelSkeleton({
  variant,
  groups = 4,
}: {
  variant: 'sidebar' | 'sheet'
  groups?: number
}) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: groups }, (_, group) => (
        <div key={group} className="border-b border-muted py-2.5">
          <Skeleton className="h-5 w-28" />
          {variant === 'sidebar' && (
            <div className="flex flex-col gap-2.5 pt-3.5 pb-1">
              {Array.from({ length: 4 }, (_row, row) => (
                <div key={row} className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-[4px]" />
                  <Skeleton
                    className="h-4"
                    style={{ width: `${45 + ((group + row) % 3) * 15}%` }}
                  />
                  <Skeleton className="ml-auto h-4 w-6" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

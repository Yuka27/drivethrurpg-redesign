import { useId } from 'react'

import type { FacetOption } from './facet-option'
import { FacetRow } from './facet-row'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

/** A single-choice facet (Status). The picked radio is filled red with a light dot. */
export function RadioFacet({
  label,
  options,
  value,
  onChange,
}: {
  /** the group's accessible name (the section title) */
  label: string
  options: Array<FacetOption>
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()

  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={onChange}
      className="gap-1.5"
    >
      {options.map((option) => {
        const optionId = `${id}-${option.value}`
        return (
          <FacetRow
            key={option.value}
            id={optionId}
            label={option.label}
            count={option.count}
            control={
              <RadioGroupItem
                id={optionId}
                value={option.value}
                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary [&_svg]:fill-primary-foreground [&_svg]:text-primary-foreground"
              />
            }
          />
        )
      })}
    </RadioGroup>
  )
}

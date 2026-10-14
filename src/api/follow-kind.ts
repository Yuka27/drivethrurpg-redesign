import { z } from 'zod'

/** What can be followed for the weekly new-releases email. */
export const FOLLOW_KINDS = [
  'publisher',
  'product_line',
  'imprint',
  'rule_system',
  'genre',
] as const
export const FollowKindSchema = z.enum(FOLLOW_KINDS)
export type FollowKind = z.infer<typeof FollowKindSchema>

/** POST/DELETE `${FOLLOW_PATH[kind]}/{id}/follow` */
export const FOLLOW_PATH: Record<FollowKind, string> = {
  publisher: '/publishers',
  product_line: '/product-lines',
  imprint: '/imprints',
  rule_system: '/rule-systems',
  genre: '/genres',
}

/** The body key of POST /following for each kind (Undo after unfollowing). */
export const FOLLOW_BODY_KEY: Record<FollowKind, string> = {
  publisher: 'publisherId',
  product_line: 'productLineId',
  imprint: 'imprintId',
  rule_system: 'ruleSystemId',
  genre: 'genreId',
}

/** A genre, product line, … as a title refers to it: with the user's follow state. */
export const FollowRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  following: z.boolean().catch(false),
})
export type FollowRef = z.infer<typeof FollowRefSchema>

/** One row of a title's "Follow" card, in the API's order. */
export const FollowTargetSchema = FollowRefSchema.extend({
  type: FollowKindSchema,
})
export type FollowTarget = z.infer<typeof FollowTargetSchema>

/**
 * A list whose items are parsed one by one: an item of a kind this app does
 * not know (or a broken one) is left out instead of failing the whole list.
 */
export const lenientArray = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((value) => {
        const parsed = item.safeParse(value)
        return parsed.success ? [parsed.data] : []
      }),
    )

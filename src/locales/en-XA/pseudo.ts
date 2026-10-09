// Dev only: the pseudo-locale is built from the English files at runtime, so it never
// gets out of date. Anything on screen that is NOT accented and bracketed is a
// hard-coded string; text that breaks the layout will break with real translations too.
import { enResources } from '@/i18n/resources'

const PLAIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ACCENTED = 'áƀçðéƒĝĥíĵķļɱñóþǫŕšţúṽŵẋýžÁƁÇÐÉƑĜĤÍĴĶĻṀÑÓÞǪŔŠŢÚṼŴẊÝŽ'
const accentedLetters = [...ACCENTED]
const ACCENTS = new Map([...PLAIN].map((c, i) => [c, accentedLetters[i]]))

// keep {{interpolation}}, $t(nesting) and <tags> intact
const PROTECTED = /(\{\{[^}]+\}\}|\$t\([^)]*\)|<[^>]+>)/g

export function pseudoLocalize(text: string) {
  const accented = text
    .split(PROTECTED)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(/[a-z]/gi, (c) => ACCENTS.get(c) ?? c),
    )
    .join('')
  const padding = '·'.repeat(Math.ceil(text.length * 0.3))
  return `[${accented}${padding}]`
}

type Tree = { [key: string]: string | Tree }

const transform = (tree: Tree): Tree =>
  Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === 'string' ? pseudoLocalize(value) : transform(value),
    ]),
  )

export const pseudoResources = Object.fromEntries(
  Object.entries(enResources).map(([ns, tree]) => [
    ns,
    transform(tree as Tree),
  ]),
) as Record<keyof typeof enResources, Tree>

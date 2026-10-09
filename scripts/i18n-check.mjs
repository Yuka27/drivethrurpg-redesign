#!/usr/bin/env node
// npm run i18n:check
// Fails when a locale has different keys from English in any namespace.
// Warns about English keys that no source file appears to use.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const localesDir = path.join(root, 'src/locales')
const srcDir = path.join(root, 'src')
const BASE = 'en'
// en-XA is generated from en at runtime, not a file set
const locales = fs
  .readdirSync(localesDir)
  .filter(
    (dir) =>
      dir !== BASE &&
      fs.existsSync(path.join(localesDir, dir)) &&
      fs.statSync(path.join(localesDir, dir)).isDirectory(),
  )
  .filter((dir) =>
    fs.readdirSync(path.join(localesDir, dir)).some((f) => f.endsWith('.json')),
  )

// Plural forms differ by language (en: one/other, pl: one/few/many/other),
// so compare keys with the plural suffix removed.
const PLURAL = /_(zero|one|two|few|many|other)$/
const flatten = (tree, prefix = '') =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
const keysOf = (file) =>
  new Set(
    flatten(JSON.parse(fs.readFileSync(file, 'utf8'))).map((k) =>
      k.replace(PLURAL, ''),
    ),
  )

let errors = 0
const namespaces = fs
  .readdirSync(path.join(localesDir, BASE))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
const baseKeys = Object.fromEntries(
  namespaces.map((ns) => [
    ns,
    keysOf(path.join(localesDir, BASE, `${ns}.json`)),
  ]),
)

for (const locale of locales) {
  for (const ns of namespaces) {
    const file = path.join(localesDir, locale, `${ns}.json`)
    if (!fs.existsSync(file)) {
      console.error(`✖ ${locale}/${ns}.json is missing`)
      errors++
      continue
    }
    const keys = keysOf(file)
    const missing = [...baseKeys[ns]].filter((k) => !keys.has(k))
    const extra = [...keys].filter((k) => !baseKeys[ns].has(k))
    for (const k of missing) console.error(`✖ ${locale}/${ns}: missing "${k}"`)
    for (const k of extra)
      console.error(`✖ ${locale}/${ns}: not in ${BASE} "${k}"`)
    errors += missing.length + extra.length
  }
}

// ---- unused keys (warning only)
const sourceFiles = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full !== localesDir) walk(full)
    } else if (
      /\.(tsx?|mjs)$/.test(entry.name) &&
      !entry.name.endsWith('.gen.ts')
    )
      sourceFiles.push(full)
  }
}
walk(srcDir)
const source = sourceFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
// keys used through a computed prefix, e.g. t(`errors.${code}`)
const DYNAMIC_PREFIXES = ['errors.']

let unused = 0
for (const ns of namespaces) {
  for (const key of baseKeys[ns]) {
    if (DYNAMIC_PREFIXES.some((p) => ns === 'common' && key.startsWith(p)))
      continue
    if (
      !source.includes(`'${key}'`) &&
      !source.includes(`"${key}"`) &&
      !source.includes(`\`${key}\``)
    ) {
      console.warn(`⚠ ${ns}: "${key}" looks unused`)
      unused++
    }
  }
}

console.log(
  `\nChecked ${namespaces.length} namespaces × [${[BASE, ...locales].join(', ')}]: ${errors} error(s), ${unused} unused-key warning(s).`,
)
process.exit(errors > 0 ? 1 : 0)

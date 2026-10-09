import 'i18next'

import type { enResources } from './resources'

// t('header.cart.label') is type-checked against the English files;
// a misspelled key or namespace is a TypeScript error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof enResources
  }
}

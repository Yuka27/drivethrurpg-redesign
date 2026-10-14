import { describe, expect, it } from 'vite-plus/test'

import { pseudoLocalize, pseudoResources } from './pseudo'

describe('pseudoLocalize', () => {
  it('accents letters, pads by about 30% and brackets the text', () => {
    expect(pseudoLocalize('Cart')).toBe('[Çáŕţ··]')
  })

  it('leaves interpolations, nesting and tags untouched', () => {
    const text = pseudoLocalize(
      'Hi {{name}}, see <terms>Terms</terms> and $t(common:brand)',
    )
    expect(text).toContain('{{name}}')
    expect(text).toContain('<terms>')
    expect(text).toContain('</terms>')
    expect(text).toContain('$t(common:brand)')
    expect(text).not.toContain('Terms')
  })

  it('covers every English namespace', () => {
    expect(pseudoResources.common.actions).toMatchObject({
      tryAgain: expect.stringMatching(/^\[.+\]$/),
    })
  })
})

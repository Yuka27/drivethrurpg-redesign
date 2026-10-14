import { describe, expect, it } from 'vite-plus/test'

import { assetUrl, resolveAssetUrl } from './client'
import { env } from '@/lib/env'

const API = 'https://api.example.com'

describe('resolveAssetUrl', () => {
  it('puts a root-relative path on the API origin', () => {
    expect(resolveAssetUrl('/img/covers/x.jpg', API)).toBe(
      'https://api.example.com/img/covers/x.jpg',
    )
    expect(resolveAssetUrl('/files/sample.pdf', API)).toBe(
      'https://api.example.com/files/sample.pdf',
    )
  })

  it('also takes a path without its leading slash', () => {
    expect(resolveAssetUrl('img/logos/a.png', API)).toBe(
      'https://api.example.com/img/logos/a.png',
    )
  })

  it('copes with an origin that ends in a slash', () => {
    expect(resolveAssetUrl('/img/x.jpg', 'https://api.example.com/')).toBe(
      'https://api.example.com/img/x.jpg',
    )
    expect(resolveAssetUrl('/img/x.jpg', 'https://api.example.com//')).toBe(
      'https://api.example.com/img/x.jpg',
    )
  })

  it('leaves absolute URLs alone', () => {
    for (const url of [
      'https://cdn.example.com/x.jpg',
      'http://localhost:3000/img/x.jpg',
      '//cdn.example.com/x.jpg',
      'data:image/png;base64,AAAA',
      'blob:https://app.example.com/1234',
    ])
      expect(resolveAssetUrl(url, API)).toBe(url)
  })

  it('keeps nothing as nothing', () => {
    expect(resolveAssetUrl(undefined, API)).toBeUndefined()
    expect(resolveAssetUrl(null, API)).toBeUndefined()
    expect(resolveAssetUrl('', API)).toBeUndefined()
  })
})

describe('assetUrl', () => {
  it('resolves against the configured API origin', () => {
    expect(assetUrl('/img/covers/x.jpg')).toBe(
      `${env.VITE_API_URL}/img/covers/x.jpg`,
    )
    expect(assetUrl(null)).toBeUndefined()
  })
})

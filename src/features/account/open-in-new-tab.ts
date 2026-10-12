import { assetUrl } from '@/api/client'

/**
 * Open a file whose address the API returns only after a request (invoice PDF,
 * library download). The tab opens right away, inside the click, so pop-up
 * blockers allow it; it is pointed at the file once the request answers, and
 * closed again if it fails.
 */
export async function openInNewTab(getUrl: () => Promise<string>) {
  const tab = window.open('', '_blank')
  if (tab) tab.opener = null
  try {
    const url = assetUrl(await getUrl())
    if (tab) tab.location.href = url
    else window.location.assign(url)
  } catch (error) {
    tab?.close()
    throw error
  }
}

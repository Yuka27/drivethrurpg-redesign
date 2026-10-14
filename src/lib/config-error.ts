/**
 * The screen a build with missing or invalid variables shows instead of the
 * app. Plain DOM with its own inline styles: neither React, the stylesheet
 * nor the translations have loaded (they come with the app), so the words are
 * English. Built with textContent, never innerHTML: the details are not markup.
 */
export function showConfigError(problem: string) {
  console.error(`Invalid environment variables:\n${problem}`)
  const root = document.getElementById('app') ?? document.body
  root.replaceChildren()
  // no stylesheet yet: the browser's default margin and white page otherwise
  document.body.style.cssText = 'margin:0;background:#0a0a0a'

  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    style: string,
    text?: string,
  ) => {
    const node = document.createElement(tag)
    node.style.cssText = style
    if (text !== undefined) node.textContent = text
    return node
  }

  const main = element(
    'main',
    'min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#0a0a0a;color:#fafafa;font:16px/1.5 Inter,system-ui,sans-serif',
  )
  main.setAttribute('role', 'alert')
  const card = element(
    'div',
    'max-width:560px;width:100%;display:flex;flex-direction:column;gap:12px',
  )
  card.append(
    element(
      'h1',
      'margin:0;font-size:24px;line-height:32px;font-weight:700',
      'This build is not configured',
    ),
    element(
      'p',
      'margin:0;color:#c4c4c4',
      'The app cannot start: an environment variable is missing or invalid. Set it in the hosting settings, then deploy again. Variables are read when the site is built, so a change needs a new build.',
    ),
    element(
      'pre',
      'margin:0;padding:12px 16px;border:1px solid #404040;border-radius:10px;background:#171717;color:#fafafa;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere',
      problem,
    ),
  )
  main.append(card)
  root.append(main)
}

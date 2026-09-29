/*
 * The latest firmware anybody can install, as GitHub knows it.
 *
 * Every release is a GitHub release of `magearts/iot-firmware`, tagged
 * `vX.Y.Z` (PROTOCOL.md, "Where versions come from"). `/releases/latest`
 * leaves out drafts and pre-releases by itself, needs no token, and is open
 * to CORS.
 *
 * Asked only when somebody presses the button, never on a page load. Without
 * a token GitHub allows sixty requests an hour per address, and every phone in
 * a house shares one. The answer is kept for a few minutes so that an owner
 * going through their devices one after another costs one request, not one
 * each.
 */

export interface Release {
  // Without the `v`: what goes in `req.ver`.
  ver: string
  notes: string
  publishedAt: number
}

const LATEST = 'https://api.github.com/repos/magearts/iot-firmware/releases/latest'
const KEPT_MS = 5 * 60 * 1000

let kept: { at: number; release: Release } | null = null

export async function latestRelease(): Promise<Release> {
  if (kept && Date.now() - kept.at < KEPT_MS) return kept.release

  const response = await fetch(LATEST, { headers: { Accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`)

  const body = (await response.json()) as { tag_name?: unknown; body?: unknown; published_at?: unknown }
  const tag = typeof body.tag_name === 'string' ? body.tag_name : ''
  const ver = tag.replace(/^v/, '')

  // It goes into a URL on the board, which refuses anything but digits and
  // dots. Refused here too, rather than written and then refused there.
  if (!/^\d+\.\d+\.\d+$/.test(ver)) throw new Error(`not a release tag: ${tag}`)

  const release: Release = {
    ver,
    notes: typeof body.body === 'string' ? body.body.trim() : '',
    publishedAt: typeof body.published_at === 'string' ? Date.parse(body.published_at) : 0,
  }

  kept = { at: Date.now(), release }
  return release
}

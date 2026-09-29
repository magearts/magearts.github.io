import { ref } from 'vue'

/*
 * Whether this is running as an installed app, and what it would take to make
 * it one.
 *
 * Two different worlds. On Android the browser offers to do it: it fires an
 * event, we keep it, and a button can hand the whole thing back to the system
 * - one tap, no instructions. On iOS there is no such event and never has
 * been, so all that is left is telling somebody where the buttons are.
 *
 * Which means the instructions are the fallback, not the feature. Anywhere
 * the browser will do it for us, it should.
 */

type Platform = 'ios' | 'android' | 'other'
type Browser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'other'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent

/*
 * iPads have reported themselves as Macs since iPadOS 13, which is why the
 * second half of this exists: a Mac with a touch screen is not a thing, so
 * one that claims to have one is an iPad.
 */
const isIOS =
  /iphone|ipad|ipod/i.test(ua) ||
  (typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1)

const isAndroid = /android/i.test(ua)

export const platform: Platform = isIOS ? 'ios' : isAndroid ? 'android' : 'other'

/*
 * Every browser on iOS is Safari underneath, but they do not all put the
 * share button in the same place, so the name still matters for what we tell
 * somebody to look for.
 */
export const browser: Browser = /crios/i.test(ua)
  ? 'chrome'
  : /fxios|firefox/i.test(ua)
    ? 'firefox'
    : /samsungbrowser/i.test(ua)
      ? 'samsung'
      : isIOS
        ? 'safari'
        : /chrome|chromium/i.test(ua)
          ? 'chrome'
          : 'other'

export const onPhone = platform === 'ios' || platform === 'android'

export function isInstalled() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/*
 * The browser's own offer, kept for later.
 *
 * It arrives once, unannounced, and is gone if nothing calls preventDefault
 * on it - so this listener is registered at module load rather than when some
 * component happens to mount.
 */
const offer = ref<InstallPrompt | null>(null)

export const canInstallDirectly = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    offer.value = event as InstallPrompt
    canInstallDirectly.value = true
  })

  window.addEventListener('appinstalled', () => {
    offer.value = null
    canInstallDirectly.value = false
  })
}

export async function installNow(): Promise<boolean> {
  const waiting = offer.value
  if (!waiting) return false

  await waiting.prompt()
  const { outcome } = await waiting.userChoice

  // The offer is spent whichever way it went; the browser sends another one
  // later if it still thinks the app is worth installing.
  offer.value = null
  canInstallDirectly.value = false

  return outcome === 'accepted'
}

/*
 * An hour between asks, checked on every arrival and every refresh.
 *
 * Once ever loses everybody who was busy the first time they saw it. Every
 * refresh is how a thing gets dismissed without being read - and a page that
 * asks again the moment somebody pulls to refresh is a page arguing with
 * them. An hour is long enough that nobody meets it twice while doing one
 * thing, and short enough that somebody who meant to do it later is asked
 * again the same afternoon.
 *
 * There is no ceiling on top of that, so a phone left open all day could see
 * it several times. That is the trade for asking again at all, and the sheet
 * closes on one tap.
 */
const ASKED_KEY = 'magearts-install-asked'
const AN_HOUR = 60 * 60 * 1000

export function shouldOffer() {
  if (!onPhone || isInstalled()) return false

  try {
    const last = Number(localStorage.getItem(ASKED_KEY)) || 0
    return Date.now() - last > AN_HOUR
  } catch {
    // Private window, or storage turned off. Asking is the safe direction to
    // fail in: the alternative is somebody who can never be told.
    return true
  }
}

export function markOffered() {
  try {
    localStorage.setItem(ASKED_KEY, String(Date.now()))
  } catch {
    // Nothing to remember it with, so it will ask again next time.
  }
}

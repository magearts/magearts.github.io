import { ref } from 'vue'

/*
 * Pull down from the top of the page to refresh, the way phone apps do.
 *
 * Written by hand because the browser's own version is no use here. Chrome on
 * Android reloads the whole page, which throws away the signed-in state
 * while Firebase looks for it again; Safari has none at all once the portal
 * is on the home screen. `overscroll-behavior-y: contain` switches the
 * browser's one off while a page using this is open, so the two never fire
 * together.
 *
 * A drag is never the only way in: WCAG 2.5.7 wants a single tap to do the
 * same thing, so every page that uses this also puts `refresh` on a button.
 */

// How far the finger has to travel, after damping, before letting go refreshes.
const THRESHOLD = 64
const MAX = 96

// Long enough that the spinner is seen to have done something; a refresh
// that finishes in 40ms otherwise looks like a pull that did not register.
const MIN_SPIN_MS = 600

export function usePullToRefresh(action: () => Promise<unknown>) {
  const pull = ref(0)
  const dragging = ref(false)
  const refreshing = ref(false)

  let startY: number | null = null

  async function refresh() {
    if (refreshing.value) return
    refreshing.value = true
    pull.value = THRESHOLD

    const floor = new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS))
    try {
      await Promise.all([action().catch(() => {}), floor])
    } finally {
      refreshing.value = false
      pull.value = 0
    }
  }

  function onStart(event: TouchEvent) {
    if (refreshing.value || event.touches.length !== 1 || window.scrollY > 0) return
    // A pull that starts inside an open dialog belongs to the dialog.
    if ((event.target as Element | null)?.closest('dialog')) return
    startY = event.touches[0]!.clientY
  }

  function onMove(event: TouchEvent) {
    if (startY === null) return

    const distance = event.touches[0]!.clientY - startY
    if (distance <= 0 || window.scrollY > 0) {
      // Scrolling up the page, not pulling it down.
      startY = null
      dragging.value = false
      pull.value = 0
      return
    }

    dragging.value = true
    pull.value = Math.min(MAX, distance * 0.5)

    // Stops iOS rubber-banding the whole page underneath the indicator.
    if (event.cancelable) event.preventDefault()
  }

  function onEnd() {
    if (startY === null) return
    startY = null
    dragging.value = false

    if (pull.value >= THRESHOLD) refresh()
    else pull.value = 0
  }

  /*
   * Bound as soon as this is called, not on mount.
   *
   * It used to use onMounted, which was right while each page called it for
   * itself and wrong the moment it became one gesture for the whole app:
   * called from a module rather than from inside a component, those hooks
   * have no instance to attach to and quietly do nothing at all. The gesture
   * stopped working everywhere and nothing said so.
   *
   * Nothing is taken down again, and that is correct here: there is one of
   * these for the life of the page, and the listeners should outlive every
   * screen that draws its state.
   */
  if (typeof window !== 'undefined') {
    document.documentElement.style.overscrollBehaviorY = 'contain'
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
  }

  return { pull, dragging, refreshing, refresh, threshold: THRESHOLD }
}

import { usePullToRefresh } from './usePullToRefresh'
import { reconnect } from './useDevices'

/*
 * One pull gesture for the whole portal, not one per page.
 *
 * `usePullToRefresh` was always application-wide - it listens on the window
 * and watches the window's own scroll position - but it was being called from
 * inside two of the five screens, so the other three simply did not have it.
 * Calling it once here, from a module, gives every screen the same gesture
 * and the same state to draw it with.
 *
 * What it does is reconnect the database rather than reload anything, which
 * is why nothing here knows or cares which page is open.
 */
export const { pull, dragging, refreshing, refresh, threshold } = usePullToRefresh(reconnect)

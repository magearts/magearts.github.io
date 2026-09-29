import { computed, ref, watch } from 'vue'
import { onValue, orderByKey, query, ref as dbRef, startAt, type Unsubscribe } from 'firebase/database'
import { db } from '@/firebase'
import { devices } from './useDevices'
import { readAt } from './useSites'

/*
 * The schedules that ran, for the notifications page.
 *
 * Read from the same `/logs/{deviceId}` the history of one automation reads
 * (PROTOCOL.md, "What the switch did, and when"), keeping only the lines a
 * schedule wrote. Nothing new is stored: the device already says when it did
 * something on schedule, and a second record of it would be one more thing to
 * keep in step and trim.
 *
 * Unlike that history, this is listened to for as long as the portal is open,
 * because the badge on the tab has to know without the page being visited. So
 * it reads a day and not the week the logs keep - a listener per device,
 * running all the time, is exactly the cost useDeviceLog.ts is careful not to
 * pay, and a day is as far back as "did it run" is still news.
 */
export const RUNS_SHOWN_MS = 24 * 60 * 60 * 1000

// Two devices given the same slot do not share a clock to the second. Lines
// this close together under one slot are one run of it.
const SAME_RUN_MS = 2 * 60 * 1000

export interface ScheduleRun {
  slot: string
  at: number // the first device to report it
  on: boolean
  devices: string[]
}

interface Line {
  deviceId: string
  at: number
  on: boolean
  slot: string
}

const held = ref(new Map<string, Line[]>())
const stops = new Map<string, Unsubscribe>()

function listen(id: string) {
  const cutoff = Date.now() - RUNS_SHOWN_MS

  // `startAt` on the key is a range on the time itself, because the key is
  // the time - see useDeviceLog.ts.
  const stop = onValue(
    query(dbRef(db, `logs/${id}`), orderByKey(), startAt(String(cutoff))),
    (snapshot) => {
      const lines: Line[] = []

      snapshot.forEach((line) => {
        const at = Number(line.key)
        const value = line.val() as { on?: boolean; by?: string; slot?: string } | null
        if (!Number.isFinite(at) || !value || value.by !== 'sched' || !value.slot) return

        lines.push({ deviceId: id, at, on: value.on === true, slot: value.slot })
      })

      const next = new Map(held.value)
      next.set(id, lines)
      held.value = next
    },
    () => {
      // Refused, or the device has gone. Nothing to announce for it.
      const next = new Map(held.value)
      next.delete(id)
      held.value = next
    },
  )

  stops.set(id, stop)
}

/*
 * One listener per device in the site, and only those.
 *
 * Watched by the list of ids rather than the devices themselves, which change
 * every time a relay moves - re-opening every listener on each of those would
 * be a round trip per switch for nothing.
 */
watch(
  () =>
    devices.value
      .map((device) => device.id)
      .sort()
      .join(','),
  (joined) => {
    const wanted = new Set(joined ? joined.split(',') : [])

    let dropped = false
    stops.forEach((off, id) => {
      if (wanted.has(id)) return
      off()
      stops.delete(id)
      dropped = true
    })

    if (dropped) {
      const next = new Map(held.value)
      for (const id of next.keys()) if (!wanted.has(id)) next.delete(id)
      held.value = next
    }

    for (const id of wanted) if (!stops.has(id)) listen(id)
  },
  { immediate: true },
)

/*
 * Newest first, one entry per run however many devices it switched.
 *
 * The shared slot key is what a schedule set on several devices at once has
 * in common (PROTOCOL.md, "Schedules"), so it is also what ties their lines
 * back together here.
 */
export const scheduleRuns = computed<ScheduleRun[]>(() => {
  const lines: Line[] = []
  held.value.forEach((each) => lines.push(...each))
  lines.sort((a, b) => a.at - b.at)

  const runs: ScheduleRun[] = []
  const open = new Map<string, ScheduleRun>()

  for (const line of lines) {
    const run = open.get(line.slot)

    if (run && line.at - run.at < SAME_RUN_MS && !run.devices.includes(line.deviceId)) {
      run.devices.push(line.deviceId)
      continue
    }

    const fresh = { slot: line.slot, at: line.at, on: line.on, devices: [line.deviceId] }
    open.set(line.slot, fresh)
    runs.push(fresh)
  }

  return runs.reverse()
})

export const newRuns = computed(() => scheduleRuns.value.filter((run) => run.at > readAt.value).length)

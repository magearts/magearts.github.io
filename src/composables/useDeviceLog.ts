import { ref, type Ref } from 'vue'
import {
  endAt,
  get,
  onValue,
  orderByKey,
  query,
  ref as dbRef,
  startAt,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { db } from '@/firebase'

/*
 * What the switches actually did, read a few devices at a time.
 *
 * PROTOCOL.md, "What the switch did, and when", is the contract. The short
 * of it: every device appends a line to `/logs/{deviceId}` whenever the relay
 * moves on purpose, keyed by the time in milliseconds, and says whether it
 * was a schedule, the portal or the button on the wall.
 *
 * This is not listened to all the time. The devices list has a listener per
 * device running for as long as the portal is open, and adding a history to
 * each of them would be a second listener each, carrying data nothing on
 * screen is showing. So it opens when somebody asks a question - which today
 * means opening one automation - and closes when they stop asking.
 */

export interface LogLine {
  deviceId: string
  at: number
  on: boolean
  by: 'sched' | 'cmd' | 'tap'
  slot?: string
}

/*
 * A week, and the portal is the only thing that enforces it.
 *
 * The device appends and never deletes: it has no over-the-air update, so the
 * less of this that is cast into flash the better. Which puts the trimming
 * here, where it runs whenever somebody opens a history - one multi-path
 * delete of everything older than this.
 */
export const KEPT_DAYS = 7
const KEPT_MS = KEPT_DAYS * 24 * 60 * 60 * 1000

export const logLines: Ref<LogLine[]> = ref([])
export const logReady = ref(false)

const stops = new Map<string, Unsubscribe>()
const held = new Map<string, LogLine[]>()

// Ids whose first snapshot has arrived, so that a half-built list is never
// shown as an empty one - "it never ran" is exactly the wrong thing to say
// while the answer is still on its way.
let arrived = new Set<string>()

// What the current question is about. Readiness is measured against this
// rather than against the listeners, which are still being set up while the
// first answers are already coming back.
let target = new Set<string>()

function rebuild() {
  const all: LogLine[] = []
  held.forEach((lines) => all.push(...lines))

  all.sort((a, b) => b.at - a.at)
  logLines.value = all
}

/*
 * Everything older than a week, gone.
 *
 * One read of the keys below the cutoff and one write that nulls them. It is
 * done on the way in rather than on a timer, because there is no useful
 * moment to run a timer in a page that is usually closed, and because the
 * cost is a query that returns nothing on every visit after the first.
 *
 * A failure is ignored. Trimming is housekeeping - the history still reads
 * correctly with a few stale lines in it, and the next person to open it
 * tries again.
 */
async function trim(deviceId: string, before: number) {
  try {
    const old = await get(
      query(dbRef(db, `logs/${deviceId}`), orderByKey(), endAt(String(before))),
    )
    if (!old.exists()) return

    const patch: Record<string, null> = {}
    old.forEach((line) => {
      if (line.key) patch[line.key] = null
    })

    if (Object.keys(patch).length > 0) await update(dbRef(db, `logs/${deviceId}`), patch)
  } catch {
    // Housekeeping, and not worth a word to anybody.
  }
}

/*
 * Start reading the history of these devices, and stop reading anything else.
 *
 * Called again with a different set - a second automation opened without the
 * first being closed - it swaps cleanly, because every id not in the new set
 * is taken down by name.
 */
export function openLog(ids: string[]) {
  const wanted = new Set(ids)
  target = wanted

  stops.forEach((off, id) => {
    if (wanted.has(id)) return
    off()
    stops.delete(id)
    held.delete(id)
    arrived.delete(id)
  })

  const cutoff = Date.now() - KEPT_MS

  for (const id of wanted) {
    if (stops.has(id)) continue

    void trim(id, cutoff)

    /*
     * Only the week that is kept. `startAt` on the key is a range on the
     * time itself, because the key is the time - thirteen digits, so it
     * sorts as text exactly the way it sorts as a number until the year
     * 2286. Anything older is on its way out and is not worth drawing.
     */
    const stop = onValue(
      query(dbRef(db, `logs/${id}`), orderByKey(), startAt(String(cutoff))),
      (snapshot) => {
        const lines: LogLine[] = []

        snapshot.forEach((line) => {
          const at = Number(line.key)
          const value = line.val() as { on?: boolean; by?: string; slot?: string } | null
          if (!Number.isFinite(at) || !value) return
          if (value.by !== 'sched' && value.by !== 'cmd' && value.by !== 'tap') return

          lines.push({
            deviceId: id,
            at,
            on: value.on === true,
            by: value.by,
            slot: value.slot,
          })
        })

        held.set(id, lines)
        arrived.add(id)
        logReady.value = arrived.size >= target.size
        rebuild()
      },
      () => {
        // Refused, or the device has gone. An empty history is the honest
        // answer to give for it, and the rest of the list still stands.
        held.set(id, [])
        arrived.add(id)
        logReady.value = arrived.size >= target.size
        rebuild()
      },
    )

    stops.set(id, stop)
  }

  if (stops.size === 0) logReady.value = true
}

export function closeLog() {
  stops.forEach((off) => off())
  stops.clear()
  held.clear()
  arrived = new Set()
  target = new Set()
  logLines.value = []
  logReady.value = false
}

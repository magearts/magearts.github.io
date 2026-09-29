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
 * What the room was over the last day, for one sensor's graph.
 *
 * PROTOCOL.md, "What the room was, and when", is the contract. A sensor
 * appends `{ t, h }` to `/readings/{deviceId}` every five minutes, keyed by
 * the time in milliseconds, and never deletes any of it - which is `/logs`
 * with different contents, and read the same way as useDeviceLog reads it.
 *
 * One device at a time, and only while its page is open.
 */

export interface Reading {
  at: number
  t?: number
  h?: number
}

/*
 * A day, and the portal is the only thing that enforces it.
 *
 * The device only appends. Trimming is here, on the way into the page, so
 * that visiting the page is enough to keep the tree at a day whether or not
 * anybody looks at the graph.
 */
export const READINGS_KEPT_MS = 24 * 60 * 60 * 1000

export const readings: Ref<Reading[]> = ref([])
export const readingsReady = ref(false)

let stop: Unsubscribe | null = null
let current = ''

/*
 * Everything older than a day, gone - one read of the keys below the cutoff
 * and one write that nulls them.
 *
 * A failure is ignored. The graph still draws with a few stale lines left
 * behind it, and the next visit tries again.
 */
async function trim(deviceId: string, before: number) {
  try {
    const old = await get(
      query(dbRef(db, `readings/${deviceId}`), orderByKey(), endAt(String(before))),
    )
    if (!old.exists()) return

    const patch: Record<string, null> = {}
    old.forEach((line) => {
      if (line.key) patch[line.key] = null
    })

    if (Object.keys(patch).length > 0) await update(dbRef(db, `readings/${deviceId}`), patch)
  } catch {
    // Housekeeping, and not worth a word to anybody.
  }
}

export function openReadings(deviceId: string) {
  if (deviceId === current && stop) return
  closeReadings()
  current = deviceId

  const cutoff = Date.now() - READINGS_KEPT_MS
  void trim(deviceId, cutoff)

  /*
   * Only the day that is kept. The key is the time, thirteen digits, so a
   * range on the key is a range on the time - the same as `/logs`.
   */
  stop = onValue(
    query(dbRef(db, `readings/${deviceId}`), orderByKey(), startAt(String(cutoff))),
    (snapshot) => {
      const lines: Reading[] = []

      snapshot.forEach((line) => {
        const at = Number(line.key)
        const value = line.val() as { t?: unknown; h?: unknown } | null
        if (!Number.isFinite(at) || !value) return

        const t = typeof value.t === 'number' ? value.t : undefined
        const h = typeof value.h === 'number' ? value.h : undefined
        if (t === undefined && h === undefined) return

        lines.push({ at, t, h })
      })

      readings.value = lines
      readingsReady.value = true
    },
    () => {
      // Refused, or not there. An empty day is the honest thing to draw.
      readings.value = []
      readingsReady.value = true
    },
  )
}

export function closeReadings() {
  stop?.()
  stop = null
  current = ''
  readings.value = []
  readingsReady.value = false
}

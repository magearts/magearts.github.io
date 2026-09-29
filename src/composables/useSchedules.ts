import { computed } from 'vue'
import { push, ref as dbRef, update } from 'firebase/database'
import { db } from '@/firebase'
import { t } from '@/i18n'
import { deviceName, devices } from './useDevices'

/*
 * Times of day, each saying on or off, that the device carries out by itself.
 *
 * PROTOCOL.md, "Schedules", is the contract, and the firmware and the rules
 * read the same one. The short of it: every device holds its own complete
 * copy under `devices/{id}/sched`, and runs it on its own clock whether or not
 * it can reach the network. Nothing here runs anything - it only writes what
 * the devices will do.
 *
 * A schedule set for several devices at once is the same slot under the same
 * key on each of them. That shared key is the whole of the grouping, which is
 * why everything below is keyed by slot id and carries the list of devices
 * that have it.
 */

// Agreed with the firmware. The rules cannot count children, so this check
// and the firmware ignoring anything past eight are all that keep it.
export const SLOTS_MAX = 8

// POSIX, not IANA: the device has no timezone database. UTC+7, with the sign
// the way POSIX writes it. Every customer so far is in Thailand; the day one
// is not, this becomes a site setting.
export const TZ = 'ICT-7'

export const EVERY_DAY = 127
export const WEEKDAYS = 62 // Monday to Friday
export const WEEKENDS = 65 // Saturday and Sunday

export interface Slot {
  on: boolean
  at: number // minutes after local midnight
  days: number // bit 0 Sunday ... bit 6 Saturday
  en: boolean
}

export interface Schedule extends Slot {
  id: string
  devices: string[]
}

/*
 * Every schedule in the site, once each however many devices share it.
 *
 * Built from the device list the portal already listens to, so there is no
 * listener of its own. The copies are always written together, so whichever
 * device is read first speaks for the rest.
 */
export const schedules = computed<Schedule[]>(() => {
  const byId = new Map<string, Schedule>()

  for (const device of devices.value) {
    for (const [id, slot] of Object.entries(device.sched?.slots ?? {})) {
      const known = byId.get(id)
      if (known) {
        known.devices.push(device.id)
      } else {
        byId.set(id, { ...slot, id, devices: [device.id] })
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
})

function slotCount(deviceId: string) {
  const device = devices.value.find((each) => each.id === deviceId)
  return Object.keys(device?.sched?.slots ?? {}).length
}

// The devices that cannot take one more, by name, so the error can say which.
export class ScheduleFullError extends Error {
  constructor(public names: string[]) {
    super('schedule full')
  }
}

/*
 * Adding a schedule, or changing one, on however many devices.
 *
 * One write for all of it, so a schedule meant for the whole floor is either
 * on the whole floor or nowhere. A device taken out of the list in the editor
 * loses its copy in the same write.
 *
 * The key comes from push() without a value, which makes one locally and
 * writes nothing.
 */
export async function saveSchedule(slot: Slot, ids: string[], slotId?: string) {
  const id = slotId ?? push(dbRef(db, 'devices')).key
  if (!id) throw new Error('no key')

  const before = schedules.value.find((one) => one.id === id)?.devices ?? []

  const full = ids.filter((each) => !before.includes(each) && slotCount(each) >= SLOTS_MAX)
  if (full.length > 0) {
    throw new ScheduleFullError(
      full.map((each) => {
        const device = devices.value.find((d) => d.id === each)
        return device ? deviceName(device) : each
      }),
    )
  }

  const patch: Record<string, unknown> = {}

  for (const each of ids) {
    patch[`devices/${each}/sched/tz`] = TZ
    patch[`devices/${each}/sched/slots/${id}`] = {
      on: slot.on,
      at: slot.at,
      days: slot.days,
      en: slot.en,
    }
  }

  for (const each of before) {
    if (!ids.includes(each)) patch[`devices/${each}/sched/slots/${id}`] = null
  }

  await update(dbRef(db), patch)
}

/*
 * Several at once, and always in one write.
 *
 * A schedule is already spread across every device that has it, so five of
 * them over three devices is fifteen paths. Sent as five writes, a failure
 * halfway leaves half the selection paused and half of it running, with
 * nothing on screen to say which half - and no way to tell afterwards which
 * of them the person meant. One write is all of it or none of it.
 *
 * The singular forms below are this with one item, rather than a second
 * implementation that has to be kept in step with it.
 */
export async function setSchedulesEnabled(list: Schedule[], en: boolean) {
  const patch: Record<string, unknown> = {}

  for (const schedule of list) {
    for (const each of schedule.devices) {
      patch[`devices/${each}/sched/slots/${schedule.id}/en`] = en
    }
  }

  if (Object.keys(patch).length === 0) return
  await update(dbRef(db), patch)
}

export async function deleteSchedules(list: Schedule[]) {
  const patch: Record<string, unknown> = {}

  for (const schedule of list) {
    for (const each of schedule.devices) {
      patch[`devices/${each}/sched/slots/${schedule.id}`] = null
    }
  }

  if (Object.keys(patch).length === 0) return
  await update(dbRef(db), patch)
}

// Paused rather than deleted, on every device that has it.
export async function setScheduleEnabled(schedule: Schedule, en: boolean) {
  await setSchedulesEnabled([schedule], en)
}

export async function deleteSchedule(schedule: Schedule) {
  await deleteSchedules([schedule])
}

// ---------- words ----------

export function timeText(at: number) {
  const hours = Math.floor(at / 60)
  const minutes = at % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function timeValue(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(text)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return hours * 60 + minutes
}

/*
 * "Every day", "Weekdays", or the days themselves, Monday first - which is
 * how a week is read here, even though the bits start on Sunday because that
 * is how the device's C library counts them.
 */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function daysText(days: number) {
  const words = t.value.portal
  if (days === EVERY_DAY) return words.everyDay
  if (days === WEEKDAYS) return words.weekdays
  if (days === WEEKENDS) return words.weekends

  return DAY_ORDER.filter((day) => days & (1 << day))
    .map((day) => words.dayShort[day])
    .join(' ')
}

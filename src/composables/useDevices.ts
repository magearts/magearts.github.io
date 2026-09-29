import { ref, watch } from 'vue'
import {
  get,
  goOffline,
  goOnline,
  onValue,
  ref as dbRef,
  serverTimestamp,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { db } from '@/firebase'
import { t } from '@/i18n'
import { user } from './useAuth'
import { currentSite, isOwner, sitesReady } from './useSites'

export interface Device {
  id: string
  type?: string
  fw?: string
  ip?: string
  seen?: number
  owner?: string
  alive?: number
  rssi?: number
  cmd?: { on?: boolean; ts?: number }
  state?: { on?: boolean; ts?: number }
  sched?: {
    tz?: string
    slots?: Record<string, { on: boolean; at: number; days: number; en: boolean }>
  }
}

export const devices = ref<Device[]>([])
export const devicesReady = ref(false)

/*
 * One listener per device, and the site says which devices there are.
 *
 * The site is already being watched by useSites, so nothing is fetched here:
 * a device added or removed from the site changes the list of ids, and this
 * follows it. Each device then gets a listener of its own, because a member
 * is allowed to read the devices in their site and nothing else in the tree.
 *
 * They all have to be taken down again when the site or the user changes, or
 * the old listeners keep firing against a uid that is no longer allowed to
 * read, and fill the console with permission errors.
 */
const stopDevice = new Map<string, Unsubscribe>()

function stopEverything() {
  stopDevice.forEach((off) => off())
  stopDevice.clear()
  devices.value = []
}

// Ids whose first snapshot has arrived. Until every one of them has, the
// list is incomplete, and showing an incomplete list reads as "you own
// fewer devices than you do".
let arrived = new Set<string>()

function idsOf(): string[] {
  const site = currentSite.value
  if (!site) return []
  return Object.keys(site.devices ?? {}).sort()
}

watch(
  [user, () => currentSite.value?.id, () => idsOf().join(',')],
  ([signedIn, siteId]) => {
    if (!signedIn || !siteId) {
      stopEverything()
      arrived = new Set()
      devicesReady.value = sitesReady.value
      return
    }

    const ids = idsOf()

    // Anything no longer in the site loses its listener and its row.
    stopDevice.forEach((off, id) => {
      if (!ids.includes(id)) {
        off()
        stopDevice.delete(id)
        arrived.delete(id)
      }
    })
    devices.value = devices.value.filter((device) => ids.includes(device.id))

    if (ids.length === 0) {
      devicesReady.value = true
      return
    }

    devicesReady.value = ids.every((id) => arrived.has(id))

    ids.forEach((id) => {
      if (stopDevice.has(id)) return

      stopDevice.set(
        id,
        onValue(
          dbRef(db, `devices/${id}`),
          (deviceSnap) => {
            const value = (deviceSnap.val() ?? {}) as Partial<Device>
            const next: Device = { ...value, id }

            const at = devices.value.findIndex((device) => device.id === id)
            if (at === -1) {
              devices.value = [...devices.value, next].sort((a, b) =>
                a.id.localeCompare(b.id),
              )
            } else {
              devices.value[at] = next
            }

            arrived.add(id)
            if (idsOf().every((each) => arrived.has(each))) devicesReady.value = true
          },
          () => {
            // Refused, most likely because the site link has not caught up.
            // Counting it as arrived keeps the rest of the list from waiting
            // on it forever.
            arrived.add(id)
            if (idsOf().every((each) => arrived.has(each))) devicesReady.value = true
          },
        ),
      )
    })
  },
  { immediate: true },
)

/*
 * What the relay is doing, as far as anybody knows.
 *
 * Only `state` counts, never `cmd` (PROTOCOL.md, "Commands and state"). A
 * device that has never written `state` is unknown, not off: saying off
 * about a light nobody has heard from would be a guess.
 */
/*
 * Whether a device is answering, worked out from the timestamp it writes
 * every three minutes. PROTOCOL.md agrees both numbers; changing one here
 * without the other there either calls healthy devices offline or takes far
 * too long to notice a real one.
 */
const OFFLINE_AFTER_MS = 8 * 60 * 1000

/*
 * How long a command may go unanswered before the tile says so.
 *
 * Nothing to do with the number above, and it is here because that number
 * cannot do this job. A device unplugged thirty seconds ago still has an
 * `alive` a minute old, so it counts as online for another seven minutes -
 * and until then a command sent to it reads as "Turning on...", which is a
 * promise nobody is keeping. This is the shorter question: has this
 * particular command been answered?
 *
 * Thirty seconds rather than twenty, which was the first number. A device on
 * a weak signal can take a while - see the RSSI thresholds below, where past
 * -70dBm a command sometimes takes a minute - and calling that device
 * unresponsive because it was slow is crying wolf on something that works.
 *
 * It does not cancel anything and it is not final. The device may answer at
 * the thirty-first second, and the tile will say so.
 */
const NO_ANSWER_AFTER_MS = 30 * 1000

/*
 * The phone's clock is not the server's, and `alive` is the server's.
 *
 * A phone two minutes fast would report every healthy device as offline, and
 * nothing on screen would suggest why. Firebase publishes the difference at
 * `.info/serverTimeOffset`, which is what this is for; it costs one listener
 * and is the only honest way to compare the two.
 */
const offset = ref(0)

/*
 * Whether that number ever actually arrived.
 *
 * Falling back to zero means falling back to this phone's own clock, which
 * for the eight-minute question is harmless - a clock two minutes out does
 * not change the answer. For the thirty-second question below it changes the
 * answer every time: two minutes fast and every command reads as unanswered
 * the instant it is sent; two minutes slow and none ever does.
 *
 * So the short question is not asked at all until the offset is known. What
 * that costs is being slower to say a device is not answering, and the
 * eight-minute rule still says it in the end. What it avoids is saying it
 * when it is not true.
 */
const offsetReady = ref(false)

onValue(
  dbRef(db, '.info/serverTimeOffset'),
  (snap) => {
    offset.value = Number(snap.val()) || 0
    offsetReady.value = true
  },
  () => {
    offset.value = 0
    offsetReady.value = false
  },
)

/*
 * A clock of the portal's own, because nothing else moves.
 *
 * A device that was answering four minutes ago is offline now, and no data
 * changed to say so. Without something ticking, the screen would go on
 * claiming it is online for as long as the page stayed open.
 */
const now = ref(Date.now())

/*
 * Five seconds, which is about the command timeout above rather than about
 * the offline one.
 *
 * Thirty seconds was enough while the only question was whether a device had
 * been quiet for eight minutes - being a few seconds late to that answer
 * changes nothing anyone can see. A thirty-second question read by a
 * thirty-second clock is a different matter: the answer would land anywhere
 * between thirty and sixty seconds, and which one you got would depend on
 * when in the tick you happened to press the button.
 *
 * It costs one write to a ref. There is no request behind it.
 */
setInterval(() => (now.value = Date.now()), 5000)

export function isOnline(device: Device): boolean {
  if (!device.alive) return false
  return now.value + offset.value - device.alive < OFFLINE_AFTER_MS
}

/*
 * A command that has been sitting there long enough to be worth mentioning.
 *
 * Read off `cmd.ts` rather than timed from the press, because the press may
 * not have happened here - somebody else in the site may have sent it, or it
 * may have been sent before this page was loaded. A timer started by this tab
 * knows about neither.
 *
 * Server time on both sides, via the same offset `isOnline` uses: `cmd.ts` is
 * written by the database, and comparing it against a phone's own clock is
 * comparing two clocks that have never agreed.
 */
function unanswered(device: Device): boolean {
  if (!offsetReady.value) return false

  const asked = device.cmd?.ts
  if (!asked) return false
  return now.value + offset.value - asked >= NO_ANSWER_AFTER_MS
}

/*
 * Whether the tile should still look like something is happening.
 *
 * `pendingOf` alone was driving the pulse, and it does not know that the
 * label beside it has given up - so a switch that said "No response" went on
 * pulsing as though it were mid-move. A rhythm means work in progress; that
 * is the whole reason it is a rhythm.
 */
export function workingOn(device: Device): boolean {
  return pendingOf(device) && isOnline(device) && !unanswered(device)
}

/*
 * How good the signal is where the device is, in four steps.
 *
 * The thresholds are the ones every wifi tool uses, and they are about what a
 * connection can do rather than about the number: past -70 a device starts
 * dropping off and coming back, which for a switch means commands that
 * sometimes take a minute.
 */
export type Signal = 0 | 1 | 2 | 3 | 4

export function signalOf(device: Device): Signal {
  // Only while it is answering. The last reading from a device nobody has
  // heard from since yesterday describes yesterday.
  if (!isOnline(device) || typeof device.rssi !== 'number') return 0

  if (device.rssi >= -60) return 4
  if (device.rssi >= -70) return 3
  if (device.rssi >= -80) return 2
  return 1
}

export type Power = 'on' | 'off' | 'unknown'

export function powerOf(device: Device): Power {
  const on = device.state?.on
  if (on === true) return 'on'
  if (on === false) return 'off'
  return 'unknown'
}

/*
 * How the power button is drawn, on a card and on a device's own page alike.
 *
 * Filled in both states, and that is the point. A button is a thing that
 * stands up from what it sits on; an outline with a glyph in it is a badge.
 * Off used to be hollow and read as a label somebody had printed on the card
 * - which matters more here than anywhere, because the whole card is already
 * a link, so this has to look like something else you can press.
 *
 * Green when it is on, the card's own raised surface when it is off.
 *
 * Two things carry the state besides the colour, which colour is not allowed
 * to do on its own (WCAG 1.4.1). Off has a ring and on has none - a
 * difference that survives greyscale. And every place that draws this writes
 * the word underneath: "On", "Off", "Turning on..." on a tile, and in large
 * type under the button on the device's page.
 *
 * What it does not do is change the glyph. `PowerOff` with its broken stroke
 * would say it plainest of all, and that pair is already spoken for: the bar
 * that appears while several devices are chosen uses Power and PowerOff as
 * two buttons that *do* two things. One pair of glyphs cannot mean "this is
 * the state" in one place and "this is the action" in another.
 *
 * It was a track and a knob once, the switch every phone draws. The switch
 * came off because the schedule list draws the same one to mean something
 * else entirely - "this time of day is in use" - and one shape cannot mean
 * both "there is power at the socket" and "this setting is turned on" in the
 * same app.
 *
 * Only the colours live here. How big the button is, is each page's own
 * business.
 *
 * It follows `state`, never `cmd`, like everything else that shows power: it
 * turns green when the switch says it has, and pulses until then.
 */
export function powerTone(device: Device) {
  return powerOf(device) === 'on'
    ? 'border-transparent bg-[var(--ok)] text-[var(--background)]'
    : 'border-[var(--layer-line)] bg-[var(--layer-hover)] text-muted-foreground'
}

/*
 * Waiting to hear back.
 *
 * Both timestamps are the server's, so they are comparable even though one
 * was written by a phone and the other by a switch. A command is outstanding
 * while it is the later of the two; once the device writes `state` the
 * question is settled, whichever way it went.
 *
 * A device that has never written `state` counts as outstanding too, which is
 * right: nothing has answered.
 */
export function pendingOf(device: Device): boolean {
  const asked = device.cmd?.ts
  if (!asked) return false
  return asked > (device.state?.ts ?? 0)
}

/*
 * Ask for the switch to be on or off.
 *
 * `cmd` is a request, and the device replies by writing `state` - so nothing
 * here waits for the relay, and nothing here pretends to know what it did.
 * Both fields go in one write because the firmware needs the timestamp to
 * tell a new command from one it has already carried out (PROTOCOL.md).
 *
 * The timestamp is the server's, not this phone's. A phone whose clock is
 * wrong by a minute would otherwise send commands the device believes it has
 * already seen - and a switch that stops responding on one person's phone is
 * a fault nobody would find.
 *
 * Rejected unless `owner` is this account: everything that keeps somebody
 * else out of this switch is in the rules, not here.
 */
export async function setPower(id: string, on: boolean) {
  await setPowerMany([id], on)
}

/*
 * Several switches told the same thing, in one write.
 *
 * Sent one at a time, a failure halfway leaves half a room lit and the other
 * half dark, with nothing on screen to say which half was reached - and the
 * person who pressed it has already put the phone down. One write is all of
 * them or none of them.
 *
 * `ts` is the server's, once per device as always. Nothing here asks whether
 * a device is already in that state: a command is a request with a time on
 * it, and asking a switch that is already on to be on moves `cmd.ts` forward
 * and costs one reply. Filtering them out would make "turn everything off"
 * silently skip the one device whose `state` was stale, which is the one
 * device the person was worried about.
 *
 * **Each key is a whole `cmd`, never `cmd/on` and `cmd/ts` separately.** That
 * is not tidiness and it is not negotiable. A multi-path update arrives at a
 * device as one SSE patch whose own keys are the paths that were written -
 * so writing the two fields separately reaches the board as
 * `{"cmd/on": false, "cmd/ts": 1774...}`, and the board looks for a key
 * called `cmd`, does not find one, and never hears the command at all. It
 * stays online, answers nothing, and the portal sits on "Turning off..."
 * until it gives up. Written this way the key is `cmd` and the board reads it
 * the way it always has.
 *
 * The schedule side survives the other shape because it joins the path back
 * together itself (MageArtsCloud.cpp, schedEvent). `cmd` does not, and there
 * is no over-the-air update to teach it.
 */
export async function setPowerMany(ids: string[], on: boolean) {
  const patch: Record<string, unknown> = {}

  for (const id of ids) {
    patch[`devices/${id}/cmd`] = { on, ts: serverTimestamp() }
  }

  if (Object.keys(patch).length === 0) return
  await update(dbRef(db), patch)
}

/*
 * The word under the icon.
 *
 * While a command is outstanding it says which way the switch is heading -
 * "Turning on" - rather than either of the two things it is not yet. The
 * colour keeps following `state`, so nothing here claims the relay has moved;
 * this is the part that explains why it has not, to somebody who just pressed
 * a button and watched nothing happen.
 */
export function powerLabel(device: Device) {
  if (pendingOf(device)) {
    /*
     * Two ways of knowing the same thing, and both are needed.
     *
     * `!isOnline` catches a device that has been gone for a while - the
     * struck-through signal glyph on the same card knew it, while this line
     * went on promising the switch was turning on, three lines apart and not
     * speaking to each other.
     *
     * `unanswered` catches the case that one cannot: a device unplugged in
     * the last few minutes still looks online, because `alive` is only
     * checked against eight minutes. Without it, a switch pulled out of the
     * wall thirty seconds ago reads as busy for another seven minutes.
     *
     * Neither cancels the command. It sits in the database, and the device
     * declines it when it comes back, because it was sent to a board that
     * was not there (PROTOCOL.md, "A command is for a device that is there").
     */
    if (!isOnline(device) || unanswered(device)) return t.value.portal.noResponse

    return device.cmd?.on ? t.value.portal.turningOn : t.value.portal.turningOff
  }

  /*
   * Whether it is answering is not said here. It was, for a while - "Offline
   * · last off" - and on a phone that wrapped to three lines for one device.
   * A dot beside the name carries it now, and this line says the one thing
   * it was always for: what the switch last reported.
   */
  return t.value.portal[powerOf(device)]
}

/*
 * Whether it has an on and an off at all.
 *
 * Asked by `type`, which every device writes about itself on every boot, and
 * answered by a list rather than a guess: a temperature sensor has nothing to
 * switch, and a schedule set on one would be a promise nothing keeps. A type
 * this portal has never heard of is not switchable until somebody adds it
 * here.
 */
const SWITCHABLE = ['smart-switch']

export function canSwitch(device: Device) {
  return !!device.type && SWITCHABLE.includes(device.type)
}

/*
 * What to call it.
 *
 * The name lives under the site rather than under the device, so that
 * everybody in the house sees the same one - and so that a device given away
 * arrives at its new site without the last owner's name for it.
 *
 * Nobody is made to type one. A device with no name is called after what it
 * is, which is true of every device on the day it is unboxed.
 */
export function deviceName(device: Device) {
  const given = currentSite.value?.devices?.[device.id]?.name?.trim()
  if (given) return given

  return device.type === 'smart-switch' ? t.value.portal.smartSwitch : t.value.portal.unnamed
}

// Whether that name is one somebody chose, which the rename field needs to
// know: it should open empty rather than pre-filled with a fallback.
export function givenName(device: Device) {
  return currentSite.value?.devices?.[device.id]?.name?.trim() ?? ''
}

// The key of the picture this site has chosen for it, or nothing. Turning
// that into an actual icon is useIcons' business, which is where the fallback
// for an unknown key lives too.
export function iconKey(device: Device) {
  return currentSite.value?.devices?.[device.id]?.icon ?? ''
}

/*
 * The two things that happen once rather than continuously.
 *
 * Only the device's owner may write here, and the board deletes the request
 * before it acts on it - so a request that stays in the database is one no
 * board has heard, and a request that vanishes has been taken up.
 *
 * Nothing waits for a result. A restart takes the device off the network on
 * its way to coming back, and an erase takes it off for good until somebody
 * walks over to it; neither can report its own success.
 */
export async function askDevice(id: string, what: 'reboot' | 'factory-reset') {
  await update(dbRef(db, `devices/${id}/req`), { what, ts: serverTimestamp() })
}

/*
 * Giving devices up.
 *
 * `cmd` goes with the ownership, and that is not tidiness: a command left
 * behind is one the next owner's board finds on its first boot and carries
 * out, so their light comes on by itself because of something typed in
 * somebody else's house. `sched` goes for the same reason, a week at a time.
 *
 * One write for however many devices, so that a site being emptied either
 * empties or does not. Half a release would leave a device belonging to a
 * site that no longer exists, which nothing in the portal can show and
 * nobody can undo.
 *
 * The devices need not be online, or even plugged in. What they are is
 * decided here; they find out the next time they look.
 */
export async function releaseDevices(ids: string[], siteId: string) {
  if (ids.length === 0) return

  const patch: Record<string, unknown> = {}

  for (const id of ids) {
    patch[`devices/${id}/owner`] = null
    patch[`devices/${id}/site`] = null
    patch[`devices/${id}/cmd`] = null
    patch[`devices/${id}/sched`] = null
    patch[`sites/${siteId}/devices/${id}`] = null
  }

  await update(dbRef(db), patch)
}

/*
 * Not a refresh of anything in particular - the whole connection, dropped and
 * opened again.
 *
 * Every listener in the portal is live, so there is nothing to fetch. What
 * this fixes is a connection that has gone quiet without saying so: a phone
 * that slept, a network that changed under it. Reopening it makes every
 * listener resync, sites and devices and invitations alike, and the one read
 * afterwards is there to know when that has finished.
 *
 * It was called `refreshDevices` and that was a lie by omission - it never
 * had anything to do with devices, and the name kept it out of the three
 * screens that needed it just as much.
 */
export async function reconnect() {
  const signedIn = user.value
  if (!signedIn) return

  goOffline(db)
  goOnline(db)

  const timeout = new Promise((resolve) => setTimeout(resolve, 8000))
  await Promise.race([get(dbRef(db, `users/${signedIn.uid}/sites`)).catch(() => {}), timeout])
}

export class BadCodeError extends Error {}

/*
 * What somebody types is one string: A1B2C3-7K2M9Q. The first half is the
 * device id, printed on the device and visible in the setup network's name;
 * the second is the part that proves they have the device in front of them.
 *
 * Punctuation and case are thrown away before anything is checked, because
 * people copy these off a screen and add spaces, and the alphabet the code is
 * drawn from has no lowercase.
 */
export function splitCode(input: string): { id: string; code: string } {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, '')

  if (cleaned.length !== 12) throw new BadCodeError()

  const id = cleaned.slice(0, 6)
  const code = cleaned.slice(6)

  // The id is the tail of a MAC address, so hex. The code leaves out I, L, O
  // and U, which are the characters people get wrong reading them back.
  if (!/^[0-9A-F]{6}$/.test(id)) throw new BadCodeError()
  if (!/^[2-9A-HJKMNP-TV-Z]{6}$/.test(code)) throw new BadCodeError()

  return { id, code }
}

/*
 * One write, covering three paths, which the database takes or refuses whole.
 *
 * The code is not checked here and could not be: the portal is not allowed to
 * read the real one, which is the point of keeping it where it is. The rules
 * do the comparing, on Google's side, and a wrong code fails the whole write -
 * so there is never a half-claimed device to clean up.
 *
 * `claims/{id}` exists only to carry the attempt into a place the rule can
 * see it. Nothing reads it afterwards.
 *
 * Owners only, and the rules say so too - `sites/$siteId` is writable by the
 * uid in its `owner`, so a member's attempt fails on the fourth path and the
 * whole update goes with it. The check here is so that it fails before the
 * network rather than after, with a sentence instead of a permission error.
 */
export async function claimDevice(input: string, name = '') {
  const signedIn = user.value
  if (!signedIn) throw new Error('not signed in')

  const site = currentSite.value
  if (!site) throw new Error('no site')
  if (!isOwner.value) throw new Error('not the owner of this site')

  const { id, code } = splitCode(input)

  await update(dbRef(db), {
    [`claims/${id}`]: code,
    [`devices/${id}/owner`]: signedIn.uid,
    [`devices/${id}/site`]: site.id,
    [`sites/${site.id}/devices/${id}/name`]: name.trim().slice(0, 60),
  })

  // Tidying, not security - it was never readable. If it fails, it stays, and
  // nothing is worse for it.
  update(dbRef(db), { [`claims/${id}`]: null }).catch(() => {})

  return id
}

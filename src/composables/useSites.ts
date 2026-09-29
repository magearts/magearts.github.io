import { computed, ref, watch } from 'vue'
import {
  onValue,
  push,
  ref as dbRef,
  serverTimestamp,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { db } from '@/firebase'
import { t } from '@/i18n'
import { user } from './useAuth'

/*
 * Sites, which is where everything about who-may-do-what is decided.
 *
 * A device belongs to a site, and people belong to sites. Nothing here asks
 * whether somebody owns a switch; it asks which site the switch is in and who
 * is in that site. See PROTOCOL.md in the firmware repository - both sides
 * implement that document and neither can change it alone.
 *
 * Two roles and no more. The owner made the site and can do everything to it;
 * a member can see its devices and work them. There is deliberately no third
 * role: a permission nobody has asked for is a permission somebody has to
 * explain on every screen it appears.
 */
export type Role = 'owner' | 'member'

export interface Person {
  name?: string
  email?: string
}

export interface Site {
  id: string
  name: string
  owner: string
  members: Record<string, Role>
  people: Record<string, Person>
  devices: Record<string, { name?: string; icon?: string }>
}

export interface Invitation {
  site: string
  siteId: string
  byName: string
  at: number
}

export const sites = ref<Site[]>([])
export const sitesReady = ref(false)

/*
 * Which site the portal is showing, and which one it opens on.
 *
 * Two different things, kept apart deliberately. `picked` is where somebody
 * has navigated to and lasts as long as the page does; `defaultSite` is a
 * decision they made once, stored under their account so that it is the same
 * on every phone they sign in from.
 *
 * Glancing at a site a friend shared is not a statement about where you live,
 * so looking does not change anything. Nothing is kept in this browser
 * either - a reload returns to the default, which is the point of having one.
 */
const picked = ref('')
export const defaultSite = ref('')

export const currentSite = computed<Site | null>(() => {
  if (sites.value.length === 0) return null

  const wanted = picked.value || defaultSite.value

  // A default naming a site they have since left is worth nothing, and
  // showing an empty screen over it would be worse than ignoring it.
  return sites.value.find((site) => site.id === wanted) ?? sites.value[0] ?? null
})

export function pickSite(id: string) {
  picked.value = id
}

export async function setDefaultSite(id: string) {
  const signedIn = user.value
  if (!signedIn) throw new Error('not signed in')

  await update(dbRef(db, `users/${signedIn.uid}`), { defaultSite: id })
}

/*
 * What you are in one particular site, as a word.
 *
 * `isOwner` above answers the same question about the site being looked at
 * now, and is what the buttons hang off. This one takes the site, because the
 * lists that show several at once - the site picker in the top bar, the page
 * behind it - have to say it about each row.
 *
 * It lived in the sites page for a while and was about to be copied into the
 * picker. Two of these is two things to keep in step, and the day they
 * disagree is the day somebody is told they own a site they cannot add a
 * device to.
 *
 * The owner's name is not part of it. It belongs to the list of people inside
 * the site, where it sits beside everybody else's; on a row that is about
 * what *you* are, a second person's name is one more thing to read past.
 */
export function roleOf(site: Site) {
  return site.owner === user.value?.uid ? t.value.portal.roleOwner : t.value.portal.roleMember
}

// Everything a member cannot do hangs off this.
export const isOwner = computed(() => {
  const site = currentSite.value
  const uid = user.value?.uid
  return !!site && !!uid && site.owner === uid
})

/*
 * Two layers of listener, the same shape as the device list.
 *
 * `users/{uid}/sites` is an index holding nothing but `true`, so that the
 * portal can find what somebody belongs to without being allowed to read
 * every site in the database. Each id in it gets a listener of its own.
 */
let stopIndex: Unsubscribe | null = null
let stopDefault: Unsubscribe | null = null
const stopSite = new Map<string, Unsubscribe>()

/*
 * Declared up here because the watcher below runs immediately, at the moment
 * this module is evaluated, and a `let` further down the file would still be
 * in its temporal dead zone when it did.
 *
 * `listed` is how many sites the index says there are. The index arrives
 * before the sites themselves do, and without it an account that already has
 * a site would be found empty for a moment and given a second one.
 *
 * `refused` is the ids in that index this account was not allowed to read.
 * They are counted rather than removed, for reasons written out at the
 * handler that fills it.
 */
let settledFor = ''
const listed = ref(0)
const refused = ref(new Set<string>())

function stopEverything() {
  stopIndex?.()
  stopIndex = null
  stopSite.forEach((off) => off())
  stopSite.clear()
  sites.value = []
  refused.value = new Set()
}

function shape(id: string, value: Record<string, unknown> | null): Site {
  const raw = (value ?? {}) as Partial<Site>
  return {
    id,
    name: raw.name ?? '',
    owner: raw.owner ?? '',
    members: raw.members ?? {},
    people: raw.people ?? {},
    devices: raw.devices ?? {},
  }
}

watch(
  user,
  (signedIn) => {
    stopEverything()
    stopDefault?.()
    stopDefault = null
    sitesReady.value = false
    settledFor = ''
    listed.value = 0
    refused.value = new Set()
    picked.value = ''
    defaultSite.value = ''

    if (!signedIn) {
      sitesReady.value = true
      return
    }

    const uid = signedIn.uid

    stopDefault = onValue(
      dbRef(db, `users/${uid}/defaultSite`),
      (snap) => {
        defaultSite.value = String(snap.val() ?? '')
      },
      () => {
        defaultSite.value = ''
      },
    )

    stopIndex = onValue(
      dbRef(db, `users/${uid}/sites`),
      (snap) => {
        const ids: string[] = []
        snap.forEach((child) => {
          if (child.key) ids.push(child.key)
        })

        listed.value = ids.length

        stopSite.forEach((off, id) => {
          if (!ids.includes(id)) {
            off()
            stopSite.delete(id)
          }
        })
        sites.value = sites.value.filter((site) => ids.includes(site.id))

        ids.forEach((id) => {
          if (stopSite.has(id)) return

          stopSite.set(
            id,
            onValue(
              dbRef(db, `sites/${id}`),
              (siteSnap) => {
                const next = shape(id, siteSnap.val())
                const at = sites.value.findIndex((site) => site.id === id)

                if (at === -1) {
                  sites.value = [...sites.value, next].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  )
                } else {
                  sites.value[at] = next
                }
              },
              () => {
                /*
                 * Refused. The row disappears from the list, and that is all
                 * that happens.
                 *
                 * It used to delete the index entry as well, on the argument
                 * that this person had been removed from the site and only
                 * they may write their own index, so nobody else could tidy
                 * it. That argument is sound and the code built on it was
                 * not, because a refusal does not say why. Being removed from
                 * a site and a rule set that has not been published yet come
                 * back as the same `permission_denied`, and the second one
                 * had this deleting the index of a site the person still
                 * owned - after which the account looked empty, and the
                 * watcher further down helpfully made them a new one.
                 *
                 * So nothing is written. The entry stays, the site comes back
                 * by itself once the read works again, and an entry left
                 * pointing at a site somebody really has left is a row nobody
                 * sees and a listener that fails quietly once per session.
                 * That is the cheaper of the two mistakes by a long way.
                 */
                sites.value = sites.value.filter((site) => site.id !== id)
                refused.value = new Set(refused.value).add(id)
              },
            ),
          )
        })

        sitesReady.value = true
      },
      () => {
        // Denied or offline. An empty list is the honest answer either way.
        sitesReady.value = true
      },
    )
  },
  { immediate: true },
)

// The address, as a key. Realtime Database keys may not contain a dot, so
// dots become commas - reversibly, because the owner has to be able to read
// back who they invited. Lower-cased, because a key comparison is exact and
// people capitalise their own addresses inconsistently.
export function emailKey(email: string) {
  return email.trim().toLowerCase().split('.').join(',')
}

export class BadEmailError extends Error {}

// Deliberately not a full address grammar, which is famously not a regular
// language. What it does rule out is anything Realtime Database cannot hold
// as a key, and anything that is obviously not an address.
const ADDRESS = /^[^\s@,#$[\]/]+@[^\s@,#$[\]/]+\.[^\s@,#$[\]/]+$/

function whoAmI() {
  const signedIn = user.value
  return {
    uid: signedIn?.uid ?? '',
    name: signedIn?.displayName?.trim() || signedIn?.email || '',
    email: signedIn?.email ?? '',
  }
}

export async function createSite(name: string) {
  const signedIn = user.value
  if (!signedIn) throw new Error('not signed in')

  // push() is used for the key and nothing else - no value is written at the
  // path it invented. Its keys are unguessable and sort by the time they were
  // made, both of which a site wants.
  const id = push(dbRef(db, 'sites')).key
  if (!id) throw new Error('no key')

  const me = whoAmI()

  await update(dbRef(db), {
    [`sites/${id}/name`]: name,
    [`sites/${id}/owner`]: signedIn.uid,
    [`sites/${id}/members/${signedIn.uid}`]: 'owner',
    [`sites/${id}/people/${signedIn.uid}/name`]: me.name,
    [`sites/${id}/people/${signedIn.uid}/email`]: me.email,
    [`users/${signedIn.uid}/sites/${id}`]: true,
  })

  pickSite(id)
  return id
}

export async function renameSite(name: string) {
  const site = currentSite.value
  if (!site) throw new Error('no site')

  await update(dbRef(db, `sites/${site.id}`), { name: name.trim().slice(0, 60) })
}

/*
 * What this site calls a device, and which picture stands for it.
 *
 * Both in one write, because they are edited on one screen and a half-applied
 * rename is a worse outcome than a refused one. They live under the site
 * rather than under the device for the same reason: a device is a piece of
 * hardware, and these are what one group of people decided about it. Putting
 * a site's opinion inside the device's own record is how "a device belongs to
 * one site" stops being true by accident.
 */
export async function editDevice(deviceId: string, name: string, icon: string) {
  const site = currentSite.value
  if (!site) throw new Error('no site')

  await update(dbRef(db, `sites/${site.id}/devices/${deviceId}`), {
    name: name.trim().slice(0, 60),
    icon: icon.slice(0, 20),
  })
}

/*
 * The first site, made for somebody who has none.
 *
 * Nobody is asked to create one. A person who has just signed in wants to add
 * a switch, and a screen between them and that, asking them to name a place
 * before they have anything to put in it, is a screen they did not come for.
 * They can rename it afterwards, and most will never need to.
 *
 * It runs once per signed-in person per session. The write below changes the
 * data the listeners above are watching, so without the guard it would call
 * itself for as long as the page stayed open.
 */
watch([sitesReady, user, sites, listed, refused], async () => {
  const signedIn = user.value
  if (!signedIn || !sitesReady.value) return
  if (settledFor === signedIn.uid) return

  // Every site the index named has been heard about - loaded, or refused.
  if (sites.value.length + refused.value.size !== listed.value) return
  if (sites.value.length > 0) return

  /*
   * Refused something, so this account is not empty - it has sites that
   * could not be read this time. Making another one here is how the
   * duplicate "My site" appeared: the reads were failing because the rules
   * were wrong, and this took that for an account with nothing in it.
   *
   * Nothing is made, and `settledFor` is left alone so that a later pass -
   * after the rules are fixed, or after the site loads on the next try -
   * gets its chance.
   */
  if (refused.value.size > 0) return

  settledFor = signedIn.uid

  try {
    await createSite(t.value.portal.firstSite)
  } catch (error) {
    /*
     * Marked as done even though it failed, and that is deliberate.
     *
     * This used to clear the flag so it could try again, which is right when
     * the reason is a network that came back and catastrophic when it is a
     * rule that says no: the watcher is woken by the very writes it makes, so
     * a refusal it retries is a refusal it retries forever - a request every
     * few milliseconds for as long as the page is open.
     *
     * One attempt per sign-in. Signing out and in again tries once more,
     * which is the right amount of persistence for something nobody asked
     * for.
     */
    console.error('createSite', error)
  }
})

// ---------- invitations ----------

/*
 * Invitations addressed to the person signed in.
 *
 * Read by their own key, which the rules compare against the verified email
 * in their token. There is no link and nothing to forward: what proves an
 * invitation is something only this person's browser can produce.
 */
export const myInvites = ref<Invitation[]>([])

let stopMine: Unsubscribe | null = null

watch(
  user,
  (signedIn) => {
    stopMine?.()
    stopMine = null
    myInvites.value = []

    // An unverified address is a claim, not a fact, and the rules will refuse
    // it anyway. Not asking is quieter than being refused.
    if (!signedIn?.email || !signedIn.emailVerified) return

    stopMine = onValue(
      dbRef(db, `invites/${emailKey(signedIn.email)}`),
      (snap) => {
        const found: Invitation[] = []

        snap.forEach((child) => {
          const value = (child.val() ?? {}) as Partial<Invitation>
          if (!child.key) return

          found.push({
            siteId: child.key,
            site: value.site ?? '',
            byName: value.byName ?? '',
            at: value.at ?? 0,
          })
        })

        myInvites.value = found.sort((a, b) => a.at - b.at)
      },
      () => {
        myInvites.value = []
      },
    )
  },
  { immediate: true },
)

/*
 * When the notifications were last looked at, and saying that they have been.
 *
 * Everything offered since that moment is new. It is one number rather than a
 * flag per invitation because an invitation is not a message: it lives only
 * until it is answered, and a per-item read flag would outlive the thing it
 * was about and have to be swept up afterwards.
 *
 * `serverTimestamp()` rather than `Date.now()`, and the rules insist on it.
 * A clock that is running fast would otherwise mark everything that arrives
 * for the rest of the afternoon as already seen, and nothing in the portal
 * could put it back.
 */
export const readAt = ref(0)

let stopReadAt: Unsubscribe | null = null

watch(
  user,
  (signedIn) => {
    stopReadAt?.()
    stopReadAt = null
    readAt.value = 0

    if (!signedIn) return

    stopReadAt = onValue(
      dbRef(db, `users/${signedIn.uid}/readAt`),
      (snap) => {
        readAt.value = Number(snap.val() ?? 0)
      },
      () => {
        // Nothing read means everything looks new, which is the direction to
        // fail in: a notification shown twice is a nuisance, one never shown
        // is an invitation nobody answers.
        readAt.value = 0
      },
    )
  },
  { immediate: true },
)

export async function markNotificationsRead() {
  const signedIn = user.value
  if (!signedIn) return

  await update(dbRef(db, `users/${signedIn.uid}`), { readAt: serverTimestamp() })
}

/*
 * The other side: who this site has asked and not heard back from.
 *
 * Only the owner may read it, so nothing is attempted for anybody else -
 * a listener that is going to be refused is a console full of errors and no
 * information.
 */
export const invitesSent = ref<{ key: string; email: string; at: number }[]>([])

let stopSent: Unsubscribe | null = null

watch(
  [() => currentSite.value?.id, isOwner],
  ([siteId, owner]) => {
    stopSent?.()
    stopSent = null
    invitesSent.value = []

    if (!siteId || !owner) return

    stopSent = onValue(
      dbRef(db, `pending/${siteId}`),
      (snap) => {
        const found: { key: string; email: string; at: number }[] = []

        snap.forEach((child) => {
          if (!child.key) return
          found.push({
            key: child.key,
            email: child.key.split(',').join('.'),
            at: Number(child.val()) || 0,
          })
        })

        invitesSent.value = found.sort((a, b) => a.at - b.at)
      },
      () => {
        invitesSent.value = []
      },
    )
  },
  { immediate: true },
)

export async function invite(email: string) {
  const site = currentSite.value
  const me = whoAmI()
  if (!site || !me.uid) throw new Error('no site')

  const address = email.trim().toLowerCase()
  if (!ADDRESS.test(address)) throw new BadEmailError()

  const key = emailKey(address)

  await update(dbRef(db), {
    [`invites/${key}/${site.id}/by`]: me.uid,
    [`invites/${key}/${site.id}/byName`]: me.name,
    [`invites/${key}/${site.id}/site`]: site.name,
    [`invites/${key}/${site.id}/at`]: serverTimestamp(),
    [`pending/${site.id}/${key}`]: serverTimestamp(),
  })
}

export async function revokeInvite(key: string) {
  const site = currentSite.value
  if (!site) throw new Error('no site')

  await update(dbRef(db), {
    [`invites/${key}/${site.id}`]: null,
    [`pending/${site.id}/${key}`]: null,
  })
}

/*
 * Accepting, which is one write over four paths.
 *
 * The rule under `members/{uid}` looks for the invitation, and this write
 * deletes it - which is allowed, because a rule reads the database as it was
 * before the write it is judging.
 */
export async function acceptInvite(siteId: string) {
  const me = whoAmI()
  if (!me.uid || !me.email) throw new Error('not signed in')

  const key = emailKey(me.email)

  await update(dbRef(db), {
    [`sites/${siteId}/members/${me.uid}`]: 'member',
    [`sites/${siteId}/people/${me.uid}/name`]: me.name,
    [`sites/${siteId}/people/${me.uid}/email`]: me.email,
    [`users/${me.uid}/sites/${siteId}`]: true,
    [`invites/${key}/${siteId}`]: null,
    [`pending/${siteId}/${key}`]: null,
  })

  pickSite(siteId)
}

export async function declineInvite(siteId: string) {
  const me = whoAmI()
  if (!me.email) throw new Error('not signed in')

  const key = emailKey(me.email)

  await update(dbRef(db), {
    [`invites/${key}/${siteId}`]: null,
    [`pending/${siteId}/${key}`]: null,
  })
}

/*
 * Deleting a site, and everything that has to go with it.
 *
 * The devices in it are released rather than deleted - they keep their
 * identity and the code printed on them, and can be added again by whoever
 * has one in their hands. See releaseDevices() and PROTOCOL.md.
 *
 * The other members' entries in their own `users/{uid}/sites` cannot be
 * removed from here, because only a person may write their own. They are
 * left pointing at a site that no longer exists, and each of their portals
 * clears its own the next time the read is refused.
 *
 * One write for all of it. A site half deleted is devices belonging to
 * nothing, which no screen in the portal can show and nobody can undo.
 */
export async function deleteSite(siteId: string) {
  const signedIn = user.value
  if (!signedIn) throw new Error('not signed in')

  const site = sites.value.find((each) => each.id === siteId)
  if (!site) throw new Error('not a member')
  if (site.owner !== signedIn.uid) throw new Error('only the owner may delete a site')

  const patch: Record<string, unknown> = {
    [`sites/${siteId}`]: null,
    [`users/${signedIn.uid}/sites/${siteId}`]: null,
  }

  for (const id of Object.keys(site.devices ?? {})) {
    patch[`devices/${id}/owner`] = null
    patch[`devices/${id}/site`] = null
    patch[`devices/${id}/cmd`] = null
    patch[`devices/${id}/sched`] = null
  }

  if (defaultSite.value === siteId) patch[`users/${signedIn.uid}/defaultSite`] = null

  await update(dbRef(db), patch)

  picked.value = ''

  // Somebody who has just deleted their only site has none, and the watcher
  // that would make them one has already run for this session.
  settledFor = ''
}

/*
 * Leaving a site of somebody else's.
 *
 * The same three paths as being removed, written by the person themselves -
 * which is why it can be one write: each of them is a path the rules let
 * anybody write about themselves and nobody write about anybody else.
 *
 * The devices stay where they are. Leaving is about the person, not about
 * the switches, and an invitation can always be sent again.
 *
 * The owner is refused here as well as being offered no button. A site with
 * nobody able to invite, rename or remove is one only the console can
 * repair, and the rules cannot prevent it: an owner may write everything
 * beneath their own site.
 */
export async function leaveSite(siteId: string) {
  const signedIn = user.value
  if (!signedIn) throw new Error('not signed in')

  const site = sites.value.find((each) => each.id === siteId)
  if (!site) throw new Error('not a member')
  if (site.owner === signedIn.uid) throw new Error('the owner cannot leave')

  await update(dbRef(db), {
    [`sites/${siteId}/members/${signedIn.uid}`]: null,
    [`sites/${siteId}/people/${signedIn.uid}`]: null,
    [`users/${signedIn.uid}/sites/${siteId}`]: null,
  })

  // Somebody who has just left their only site has none, and the watcher
  // that would make them one has already run for this session. Letting it
  // run again is the difference between a fresh empty site and a portal
  // with nothing in it and no way to begin.
  settledFor = ''
}

/*
 * Removing somebody.
 *
 * Their entry in `/users/{uid}/sites` stays, because only they may write it,
 * and nothing clears it for them. It points at a site they can no longer
 * read, so their portal simply stops showing it - see the site listener
 * above, which used to delete the entry and no longer does.
 */
export async function removeMember(uid: string) {
  const site = currentSite.value
  if (!site) throw new Error('no site')
  if (uid === site.owner) throw new Error('the owner cannot be removed')

  await update(dbRef(db), {
    [`sites/${site.id}/members/${uid}`]: null,
    [`sites/${site.id}/people/${uid}`]: null,
  })
}

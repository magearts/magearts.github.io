<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Check,
  ChevronDown,
  CopyCheck,
  Download,
  EllipsisVertical,
  Settings,
  LoaderCircle,
  MapPin,
  Plus,
  House,
  Power,
  PowerOff,
  Trash2,
  X,
} from 'lucide-vue-next'
import { devicePath, LOCALES, locale, localeNames, pathFor, sitePath, t } from '@/i18n'
import { authReady, signIn, user } from '@/composables/useAuth'
import {
  BadCodeError,
  claimDevice,
  deviceName,
  devices,
  devicesReady,
  agoText,
  canSense,
  canSwitch,
  isOnline,
  readingText,
  powerLabel,
  powerOf,
  iconKey,
  releaseDevices,
  setPower,
  setPowerMany,
  workingOn,
  powerTone,
  type Device,
} from '@/composables/useDevices'
import {
  currentSite,
  defaultSite,
  createSite,
  isOwner,
  pickSite,
  roleOf,
  setDefaultSite,
  sites,
} from '@/composables/useSites'
import { iconByKey } from '@/composables/useIcons'
import PortalBar from '@/components/portal/PortalBar.vue'
import GoogleMark from '@/components/portal/GoogleMark.vue'
import { canInstallDirectly, isInstalled, onPhone, shouldOffer } from '@/composables/useInstall'
import ConfirmDialog from '@/components/portal/ConfirmDialog.vue'
import InstallSheet from '@/components/portal/InstallSheet.vue'
import PopMenu from '@/components/portal/PopMenu.vue'
import SignalIcon from '@/components/portal/SignalIcon.vue'
import Spinner from '@/components/portal/Spinner.vue'

const signedIn = computed(() => !!user.value)

// ---------- signing in ----------

const signInProblem = ref('')

async function startSignIn() {
  signInProblem.value = ''

  try {
    await signIn()
  } catch {
    // Without this the button does nothing at all when it fails, and the only
    // trace is a console message nobody outside this room will ever open.
    signInProblem.value = t.value.portal.signInFailed
  }
}

// ---------- making a site ----------

/*
 * Moved here from the page that used to list every site, which no longer
 * exists. Everything that page did is on this bar now - switching in the
 * menu under the title, the role beside each name, the default and the
 * settings behind the dots - except this, and this was the one thing it did
 * that nothing else could. A menu that lists your sites and cannot make one
 * is a menu with a hole in it.
 */
const siteDialog = ref<HTMLDialogElement | null>(null)
const siteName = ref('')
const makingSite = ref(false)
const siteProblem = ref('')

function openNewSite() {
  siteName.value = ''
  siteProblem.value = ''
  siteDialog.value?.showModal()
}

async function makeSite() {
  if (makingSite.value || siteName.value.trim().length === 0) return

  makingSite.value = true
  siteProblem.value = ''

  try {
    // createSite switches to it, which is what somebody who has just made one
    // wants - they are on their way to putting something in it.
    await createSite(siteName.value.trim().slice(0, 60))
    siteDialog.value?.close()
  } catch (error) {
    siteProblem.value = t.value.portal.saveFailed
    console.error('createSite', error)
  } finally {
    makingSite.value = false
  }
}

// ---------- adding a device ----------

/*
 * A real <dialog>, not a div pretending to be one. The element brings the
 * focus trap, Escape to close, inertness for everything behind it and the
 * backdrop, all of which have to be written by hand otherwise, and all of
 * which are usually written slightly wrong.
 */
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref('')
const wanted = ref('')
const busy = ref(false)
const problem = ref('')

function openAdd() {
  input.value = ''
  wanted.value = ''
  problem.value = ''
  dialog.value?.showModal()
}

function closeAdd() {
  dialog.value?.close()
}

async function add() {
  problem.value = ''
  busy.value = true

  try {
    await claimDevice(input.value, wanted.value)
    closeAdd()
  } catch (error) {
    // A mistyped code, a code belonging to somebody else, and a device that
    // was never registered all come back from the database as one refusal.
    // Guessing between them in the message would be guessing.
    problem.value =
      error instanceof BadCodeError ? t.value.portal.badFormat : t.value.portal.refused
  } finally {
    busy.value = false
  }
}

// ---------- devices ----------


/*
 * A tile is the switch, the way the tiles in Apple's Home app are - for
 * whatever canSwitch() in useDevices says has an on and an off.
 *
 * One tap turns the thing on. Nobody opening an app to turn a light on wants
 * to open a page about the light first, and the tile already shows everything
 * a page would: what it is, whether it is on, and whether it is answering.
 *
 * Site reaches the detail view by pressing and holding, and this does not.
 * A long press has no keyboard equivalent and is hard work for anybody whose
 * hands are unsteady, so the detail page keeps a corner of its own - one tap,
 * same as everything else.
 *
 * Only a switch behaves this way. Another kind of device that turns up later
 * has a tile that opens its page, because there is nothing to toggle.
 */

// Ids with a write still in flight. A set rather than one flag, because two
// tiles pressed in quick succession are two separate waits.
const sendingTo = ref(new Set<string>())
const commandProblem = ref('')

async function togglePower(device: Device) {
  if (sendingTo.value.has(device.id)) return

  commandProblem.value = ''
  sendingTo.value = new Set(sendingTo.value).add(device.id)

  try {
    await setPower(device.id, powerOf(device) !== 'on')
  } catch {
    commandProblem.value = t.value.portal.commandFailed
  } finally {
    const next = new Set(sendingTo.value)
    next.delete(device.id)
    sendingTo.value = next
  }
}

/*
 * Choosing several, to take several out at once.
 *
 * A mode, which is the kind of interface people find hardest: the same tap on
 * the same card does two different things depending on something invisible.
 * It earns its place by making the top bar say so - the bar becomes a count
 * and a way out for as long as it lasts, so the state is never invisible, and
 * the power buttons come off the cards so there is nothing else to hit.
 *
 * Owner only. Releasing a device is the owner's to do; a member removing
 * somebody else's switches from their account is not a thing that should be
 * one tap away, or any taps away.
 */
const selecting = ref(false)
const chosen = ref(new Set<string>())
const releaseAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const busyWithChosen = ref(false)

function startSelecting() {
  chosen.value = new Set()
  selecting.value = true
}

function stopSelecting() {
  selecting.value = false
  chosen.value = new Set()
}

function toggle(id: string) {
  const next = new Set(chosen.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  chosen.value = next
}

/*
 * Switching everything that is chosen, on or off at once.
 *
 * Offered only when every chosen device can be switched. The test is
 * `canSwitch` rather than "are these all the same type": today those answer
 * the same, and the day there is a second kind of switch they stop - one
 * would refuse to send a command both of them understand. What the test is
 * really for is the sensor that has no on and no off, and `canSwitch` is
 * where that is already written down.
 *
 * Disabled rather than hidden. Buttons that come and go as a selection grows
 * move the ones beside them under a thumb that is already moving.
 */
const canPowerChosen = computed(
  () =>
    chosen.value.size > 0 &&
    devices.value.filter((one) => chosen.value.has(one.id)).every(canSwitch),
)

async function powerChosen(on: boolean) {
  if (busyWithChosen.value || !canPowerChosen.value) return

  busyWithChosen.value = true
  commandProblem.value = ''

  const ids = [...chosen.value]

  try {
    await setPowerMany(ids, on)
    stopSelecting()
  } catch {
    commandProblem.value = t.value.portal.commandFailed
  } finally {
    busyWithChosen.value = false
  }
}

async function releaseChosen() {
  const site = currentSite.value
  if (!site || chosen.value.size === 0) return

  const ids = [...chosen.value]
  stopSelecting()

  try {
    await releaseDevices(ids, site.id)
  } catch (error) {
    commandProblem.value = t.value.portal.removeFailed
    console.error('releaseDevices', error)
  }
}

/*
 * The card never changes colour; the switch on it does.
 *
 * It used to flood with the brand colour while the device was on, and that one
 * decision cost more than anything else in this file. Every icon on the card
 * then had to be legible on two very different backgrounds, so nothing could
 * carry a meaningful colour of its own - a green that reads on a white card
 * measures about 1.3:1 on the lit one. Signal, presence and state all ended up
 * drawn in the colour of the surrounding text, saying less than they could.
 *
 * With one background, colour means something again. It also stops a room with
 * six switches on from being a wall of one colour with nothing to pick out.
 *
 * Two to a row on a phone, which is half a phone each, so the end padding
 * holds the space the power button sits in. A long name truncates.
 */
/*
 * A column, and no longer a row with a hole cut in the right of it.
 *
 * The switch used to sit against the middle of the right-hand edge, which
 * meant every card carried four rems of padding it could not use and the name
 * was truncated to pay for it. Moving the switch to the top corner gives the
 * name the full width of the card, which is the whole point: a name somebody
 * chose themselves, cut off at "Exhaust f...", is a name that failed at its
 * one job.
 *
 * The cost is height - three rows where there were two - and on a phone that
 * is one fewer device on screen. Worth it for the row people actually read.
 */
const tileClass =
  'flex h-full w-full flex-col gap-y-2 rounded-2xl border border-[var(--layer-line)] ' +
  'bg-[var(--card)] p-3 text-start hover:bg-[var(--layer-hover)] sm:p-4'

// The switch's colours are shared with the device page (useDevices); where
// the knob sits is this size's own. 4px from either end of the track.

/*
 * The offer to keep this on a home screen.
 *
 * It waits for the devices to be there. Somebody who has just arrived has no
 * idea yet whether this is worth a slot on their home screen, and asking
 * before they have seen anything is asking them to decide about nothing.
 *
 * Checked on every arrival and refresh, shown at most three times in a day -
 * see useInstall for why that is the number.
 */
const installSheet = ref<InstanceType<typeof InstallSheet> | null>(null)

/*
 * A way to ask for it, rather than only being offered it, shown wherever
 * installing is actually possible - which is not only phones.
 *
 * Chrome and Edge on a desktop install these too, and say so by firing the
 * event this reads - so the icon appears there as well. It stays hidden on a
 * desktop browser that has made no such offer, because the only thing left to
 * show that person would be instructions for a phone they are not holding.
 *
 * A computed rather than a value read once: the browser's offer arrives some
 * time after the page does, and a constant would have been decided before it
 * got here.
 */
const canInstall = computed(() => canInstallDirectly.value || (onPhone && !isInstalled()))

/*
 * A plain flag rather than stopping the watcher from inside itself.
 *
 * That is what this did, and it threw: `immediate: true` runs the callback
 * while `watch()` is still evaluating, so the const holding its stop function
 * does not exist yet. It only showed up on the second visit, because the
 * first time round the devices were not ready and the early return happened
 * before the line that touched it.
 */
let offeredAlready = false

watch(
  [devicesReady, signedIn],
  ([ready, inside]: [boolean, boolean]) => {
    if (offeredAlready || !ready || !inside || !shouldOffer()) return

    offeredAlready = true
    setTimeout(() => installSheet.value?.open(), 1200)
  },
  { immediate: true },
)

const buttonClass =
  'inline-flex h-11 items-center justify-center gap-x-2 rounded-lg bg-[var(--primary)] px-5 ' +
  'text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] ' +
  'disabled:opacity-60'

const menuRow =
  'flex min-h-11 w-full items-center gap-x-3 px-3 text-start text-sm ' +
  'hover:bg-[var(--layer-hover)] focus-visible:bg-[var(--layer-hover)]'

const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--primary)] ' +
  'hover:bg-[var(--layer-hover)] disabled:opacity-60'

/*
 * Everything on the bar that is not adding a device, written once.
 *
 * It is drawn twice - folded into the three dots on a phone, laid out along
 * the bar on a desktop - and the two are the same list because they stopped
 * being the same list the moment they were two blocks of markup. Each of
 * these has its own condition, and a condition that has to be repeated is one
 * that will be repeated wrong: `select` only means anything to an owner with
 * something to select, and `install` only when the browser will actually do
 * it.
 *
 * `to` or `act`, never both: one is a link and renders as one, the other is
 * a button. Which it is decides the element, because a router link that is
 * really a button is a thing no keyboard user can guess at.
 */
interface BarAction {
  key: string
  label: string
  icon: Component
  to?: string
  act?: () => void
}

/*
 * Only offered where it would change something. A site that is already the
 * one the portal opens on has nothing to set, and a row that does nothing
 * when pressed is worse than no row.
 */
async function makeDefault() {
  const site = currentSite.value
  if (!site) return

  try {
    await setDefaultSite(site.id)
  } catch (error) {
    console.error('setDefaultSite', error)
  }
}

const barActions = computed<BarAction[]>(() => {
  const all: (BarAction & { show: boolean })[] = [
    {
      key: 'select',
      label: t.value.portal.select,
      // Two sheets with a tick, not a bare tick: a tick on its own reads as
      // "done" or "confirm", and this opens a way of choosing several things.
      icon: CopyCheck,
      act: startSelecting,
      show: isOwner.value && devices.value.length > 0,
    },
    {
      key: 'settings',
      label: t.value.portal.siteSettings,
      icon: Settings,
      to: sitePath(locale.value),
      show: true,
    },
    {
      key: 'default',
      label: t.value.portal.setDefault,
      // The filled house the site list and the title both use, so that
      // setting it here and recognising it there are the same picture.
      icon: House,
      act: makeDefault,
      show: !!currentSite.value && currentSite.value.id !== defaultSite.value,
    },
    {
      key: 'install',
      label: t.value.portal.installHeading,
      icon: Download,
      act: () => installSheet.value?.open(),
      show: canInstall.value,
    },
  ]

  return all.filter((one) => one.show)
})
</script>

<template>
  <!-- The way in, and the wait before it.

       Firebase reports "nobody" first while it looks for a stored session,
       so these two are one screen rather than two: the mark is drawn
       immediately and what sits under it changes when the answer arrives.
       Rendering the sign-in on that first "nobody" would flash it at
       somebody already signed in, every time they opened the app; showing a
       lone spinner instead would open the app on a blank page with a
       turning circle, which is what a page that has not loaded looks like.

       Not a card sitting on a page, either. A person who put this on their
       home screen opened an app, and an app's first screen fills what it is
       given: the mark near the top, the one thing to do near the bottom
       where a thumb already is, and the way out to the website and the
       other language at the foot.

       `flex-1` rather than another `100dvh`: App.vue already makes the page
       exactly one screen tall and lays its main out as a column, so growing
       into it is all this has to do. A second full screen inside the first
       is a page that scrolls by the height of its own padding. -->
  <section
    v-if="!authReady || !signedIn"
    class="flex flex-1 flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
  >
    <!-- Centred in the space left after a tenth of the screen is taken off
         the bottom, which sits the mark above the middle without pinning it
         to the top - a fixed offset that looks right on a tall phone crowds
         the notch on a short one. -->
    <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[12vh]">
      <img src="/logo.svg" alt="" width="336" height="362" class="mx-auto h-24 w-auto" />
      <p class="mt-4 text-center text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">
        MageArts
      </p>

      <!-- Large and in the brand colour, which it is only allowed to be
           because it is large: #0082a5 measures 4.04:1 on this background,
           which passes WCAG 1.4.3 for text this size and would fail at body
           size. See the contrast table at the top of style.css. -->
      <!-- While Firebase is still looking, the mark above is the whole
           screen and this is the only thing that moves. -->
      <Spinner v-if="!authReady" class="mt-10" />

      <template v-else>
        <h1 class="mt-7 text-center text-3xl font-bold text-brand">{{ t.portal.heading }}</h1>
        <p class="mt-2 text-center text-muted-foreground">{{ t.portal.signedOut }}</p>

      <!-- One provider, so one button and no "or" beneath it. The shape is
           the one the others would take if there were ever a second: the
           mark boxed at the start, an empty box of the same width closing
           the other end, and the words centred between them whichever
           language they are in. -->
        <button
          type="button"
          class="mt-9 inline-flex h-14 w-full items-center rounded-xl border border-[var(--layer-line)] bg-[var(--card)] px-4 text-sm font-semibold hover:bg-[var(--layer-hover)]"
          @click="startSignIn"
        >
          <GoogleMark class="size-5 shrink-0" />
          <span class="min-w-0 flex-1 truncate px-3">{{ t.portal.signIn }}</span>
          <span class="size-5 shrink-0" aria-hidden="true"></span>
        </button>

        <p
          v-if="signInProblem"
          role="status"
          class="mt-3 text-center text-sm text-[var(--destructive)]"
        >
          {{ signInProblem }}
        </p>

        <p class="mt-5 text-center text-sm text-muted-foreground">{{ t.portal.signInWhy }}</p>
      </template>
    </div>

    <!-- The site header is not here to switch language or leave by, so the
         sign-in screen carries both itself. Nothing to navigate to while the
         answer is still coming. -->
    <nav
      v-if="authReady"
      class="mx-auto mt-6 flex w-full max-w-sm flex-wrap items-center justify-center gap-x-1 border-t border-[var(--border)] pt-2 text-sm"
    >
      <RouterLink
        :to="pathFor(locale, 'home')"
        class="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-[var(--primary)] hover:bg-[var(--layer-hover)]"
      >
        {{ t.portal.website }}
      </RouterLink>
      <RouterLink
        v-for="code in LOCALES.filter((c) => c !== locale)"
        :key="code"
        :to="pathFor(code, 'portal')"
        :lang="code"
        :hreflang="code"
        class="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-[var(--primary)] hover:bg-[var(--layer-hover)]"
      >
        {{ localeNames[code] }}
      </RouterLink>
    </nav>
  </section>

  <!-- signed in -->
  <template v-else>
    <!-- While choosing, the bar is the mode: it counts what is chosen, and
         both ways out of it are the only things on it. `plain` drops the
         pull-to-refresh indicator - reloading the list out from under a
         half-made selection would be answering a question nobody asked. -->
    <PortalBar v-if="selecting" plain :title="`${chosen.size} ${t.portal.selected}`">
      <template #start>
        <button
          type="button"
          :class="iconButton"
          :aria-label="t.portal.done"
          @click="stopSelecting"
        >
          <X class="size-6" aria-hidden="true" />
        </button>
      </template>

      <template #end>
        <button
          type="button"
          :disabled="!canPowerChosen || busyWithChosen"
          :class="iconButton"
          :aria-label="t.portal.turnOn"
          @click="powerChosen(true)"
        >
          <Power class="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          :disabled="!canPowerChosen || busyWithChosen"
          :class="iconButton"
          :aria-label="t.portal.turnOff"
          @click="powerChosen(false)"
        >
          <PowerOff class="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          :disabled="chosen.size === 0 || busyWithChosen"
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--destructive)] hover:bg-[var(--layer-hover)] disabled:opacity-60"
          :aria-label="t.portal.removeDevice"
          @click="releaseAsk?.open()"
        >
          <Trash2 class="size-5" aria-hidden="true" />
        </button>
      </template>
    </PortalBar>

    <PortalBar v-else :title="t.portal.heading">
      <!-- The site's name opens a list of the others, and nothing else.
           Switching is a quick thing somebody does on the way to something
           else, not a place to go: it used to open a page they then had to
           come back from. Making a new one or deleting one is rarer and
           heavier and keeps its page, reached through Site settings rather
           than from here - a menu for switching that also has a way out of
           itself is a menu with two jobs. -->
      <template #title>
        <PopMenu :label="t.portal.switchSite" class="max-w-full">
          <template #trigger>
            <span class="flex max-w-full items-center gap-x-2 px-2 py-1">
              <MapPin class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="truncate">{{ currentSite?.name || t.portal.heading }}</span>

              <!-- The same filled house the site list uses, so that somebody
                   who has just set one recognises what they are looking at.
                   The word it stands for is here too. -->
              <template v-if="currentSite && currentSite.id === defaultSite">
                <House
                  class="size-3.5 shrink-0 text-[var(--primary)]"
                  fill="currentColor"
                  aria-hidden="true"
                />
                <span class="sr-only">({{ t.portal.defaultLabel }})</span>
              </template>

              <ChevronDown class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </span>
          </template>

          <button
            v-for="one in sites"
            :key="one.id"
            type="button"
            role="menuitem"
            :class="[menuRow, one.id === currentSite?.id ? 'font-semibold' : '']"
            @click="pickSite(one.id)"
          >
            <!-- Two lines, not a name with the role tacked on after it. The
                 name truncates, and anything sharing that line takes width
                 from it - so a long name would be cut shorter in order to
                 show the word "Member", which is backwards.

                 Worth saying at all because it is what the bar will do next:
                 a site somebody is only a member of has no add button and no
                 way to select devices, and switching to one without being
                 told why two controls vanished is a thing to wonder about
                 rather than a thing to understand. -->
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ one.name }}</span>
              <span class="block truncate text-xs text-muted-foreground">
                {{ roleOf(one) }}
              </span>
            </span>

            <!-- Two different things, and they are allowed to both be true.
                 The house is the one the portal opens on; the tick is the one
                 being looked at now. The tick was here on its own for a
                 while, which left the only place the default is named as the
                 title bar - so the list that switches between them could not
                 say which was which. -->
            <template v-if="one.id === defaultSite">
              <House
                class="size-3.5 shrink-0 text-[var(--primary)]"
                fill="currentColor"
                aria-hidden="true"
              />
              <span class="sr-only">({{ t.portal.defaultLabel }})</span>
            </template>

            <Check
              v-if="one.id === currentSite?.id"
              class="size-4 shrink-0 text-[var(--primary)]"
              aria-hidden="true"
            />
          </button>

          <!-- Below the line, because it is not one of them. The menu is a
               list of places with one way to add to the list at the bottom
               of it, which is the shape every list of places has. -->
          <button
            type="button"
            role="menuitem"
            :class="[menuRow, 'border-t border-border']"
            @click="openNewSite"
          >
            <Plus class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {{ t.portal.newSiteHeading }}
          </button>
        </PopMenu>
      </template>

      <!-- Refresh comes from the bar itself, then these two. One filled
           button, because there is one thing somebody comes here to do that
           is not switching a light. Where the rest of it goes depends on how
           much bar there is: folded behind the dots on a phone, where a
           fourth icon is a fourth thing to miss, and spelled out along the
           bar on a desktop, where the space is already there and hiding
           two words behind a glyph is asking somebody to go looking. -->
      <template #end>
        <!-- The wrapper is what flips on a wide screen, and all it is doing
             is putting the plus at the right edge where the pointer already
             is. The row inside it does not flip: `barActions` is written in
             the order it should be read, and it is read in that order in
             both places - top to bottom behind the dots, left to right along
             the bar. Reversing it here as well made the desktop bar
             disagree with its own menu. -->
        <div class="flex items-center gap-x-1 lg:flex-row-reverse">
          <!-- Owners only. A member cannot claim a device into somebody
               else's site - the rules refuse the write, because `sites/$siteId`
               is writable by its owner and nobody else - so showing the button
               only buys them a form to fill in and a permission_denied at the
               end of it. Their own devices go in their own site, which they
               own, and which the picker in the title switches to.

               The disc is drawn the height of the dots beside it, not a pixel
               more: being the only filled thing on the bar is what marks it as
               the action, and size was saying so a second time. The button
               around it stays 44px, so the target is the same as every other
               one up here whatever the disc is doing. -->
          <button
            v-if="isOwner"
            type="button"
            class="inline-flex size-11 shrink-0 items-center justify-center"
            :aria-label="t.portal.addButton"
            @click="openAdd"
          >
            <span
              class="inline-flex size-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
            >
              <Plus class="size-4" aria-hidden="true" />
            </span>
          </button>

          <!-- Narrow: behind the dots. -->
          <PopMenu v-if="barActions.length > 0" class="lg:hidden" align="end" :label="t.portal.moreMenu">
            <template #trigger>
              <span :class="iconButton">
                <EllipsisVertical class="size-6" aria-hidden="true" />
              </span>
            </template>

            <component
              :is="one.to ? RouterLink : 'button'"
              v-for="one in barActions"
              :key="one.key"
              v-bind="one.to ? { to: one.to } : { type: 'button' }"
              role="menuitem"
              :class="menuRow"
              @click="one.act?.()"
            >
              <component
                :is="one.icon"
                class="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {{ one.label }}
            </component>
          </PopMenu>

          <!-- Wide: along the bar, with the words. Same list, so nothing can
               appear in one place and not the other. -->
          <div class="hidden lg:flex lg:items-center lg:gap-x-1">
            <component
              :is="one.to ? RouterLink : 'button'"
              v-for="one in barActions"
              :key="one.key"
              v-bind="one.to ? { to: one.to } : { type: 'button' }"
              class="inline-flex h-11 items-center gap-x-2 rounded-lg px-3 text-sm font-medium hover:bg-[var(--layer-hover)]"
              @click="one.act?.()"
            >
              <component
                :is="one.icon"
                class="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {{ one.label }}
            </component>
          </div>
        </div>
      </template>
    </PortalBar>

    <section
      class="w-full px-4 pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
    >
      <Spinner v-if="!devicesReady" class="mt-6" />

      <!-- Nothing yet: for the owner, the one thing to do here is the only
           thing on screen. For a member there is nothing to do at all, so the
           line says whose job it is rather than leaving them looking for a
           button that is not there. -->
      <div v-else-if="devices.length === 0" class="mt-16 text-center">
        <p class="text-muted-foreground">
          <!-- `!currentSite` is the third case and it is neither of the
               other two: somebody removed from the only site they were in
               has no site at all, and telling them its owner will add the
               devices names an owner who does not exist. The plain line is
               the true one, and the menu under the title is where they make
               a site of their own. -->
          {{ isOwner || !currentSite ? t.portal.empty : t.portal.emptyForMember }}
        </p>

        <button v-if="isOwner" type="button" :class="[buttonClass, 'mt-5']" @click="openAdd">
          <Plus class="size-4 shrink-0" aria-hidden="true" />
          {{ t.portal.addButton }}
        </button>
      </div>

      <!-- Tiles, the way phone apps for connected devices lay them out. A
           switched-on device is filled, so the room can be read at a glance;
           the words underneath say the same thing for anyone who cannot tell
           the fill apart (WCAG 1.4.1).

           The fill follows `state` and never `cmd` (PROTOCOL.md): a tile that
           lit up the moment it was pressed would be reporting a wish. What
           the press changes immediately is the pulse, and nothing else.

           Two controls to a tile. The card opens the device; the icon works
           it. The icon is a sibling of the card rather than a child of it -
           a button inside a link is markup no two browsers agree about, and
           both controls stop being reachable by keyboard - so it is lifted
           out and laid over the space the card's padding leaves for it. -->
      <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <li v-for="device in devices" :key="device.id" class="relative">
          <!-- A link normally, a button while choosing. Swapping the element
               rather than blocking the link's own click keeps the two
               behaviours from depending on which listener a browser runs
               first. -->
          <component
            :is="selecting ? 'button' : RouterLink"
            v-bind="selecting ? { type: 'button' } : { to: devicePath(locale, device.id) }"
            :aria-pressed="selecting ? chosen.has(device.id) : undefined"
            :class="[
              tileClass,
              selecting && chosen.has(device.id) ? 'ring-2 ring-[var(--primary)]' : '',
              isOnline(device) ? '' : 'opacity-60',
            ]"
            @click="selecting ? toggle(device.id) : undefined"
          >
            <!-- The top row is the two things that are not words: what the
                 device is, and what it is doing. The switch itself is drawn
                 outside this card - see below - and only room for it is kept
                 here. -->
            <span class="flex items-start justify-between gap-x-2">
              <span class="flex min-w-0 items-center gap-x-2">
                <!-- A tick in a ring, not a colour: the chosen card has to be
                     tellable apart without seeing the highlight (WCAG 1.4.1).

                     At the front, before the icon rather than in place of it.
                     It stood in the switch's corner once and was invisible
                     there - the switch is still drawn in that corner while
                     choosing, laid over the card, and it is twice the width of
                     this. Taking the icon's place instead would cost the one
                     thing that tells eight cards apart before a name is read,
                     at the moment somebody is picking between them. -->
                <span
                  v-if="selecting"
                  class="flex size-5 shrink-0 items-center justify-center rounded-full border"
                  :class="
                    chosen.has(device.id)
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'border-[var(--layer-line)]'
                  "
                  aria-hidden="true"
                >
                  <Check v-if="chosen.has(device.id)" class="size-3.5" />
                </span>

                <!-- What is on the other end of the switch, as a picture.
                     Chosen by whoever owns the site; a plug until they do.
                     Eight cards are told apart by these before a single name
                     is read, which is the whole reason it is worth a field in
                     the database - see useIcons.

                     Decorative here and nowhere else: the name is directly
                     underneath, and a screen reader announcing "light bulb"
                     and then "Kitchen light" is reading one thing twice. The
                     picker is where an icon has a name. -->
                <component
                  :is="iconByKey(iconKey(device)).icon"
                  class="size-7 shrink-0 text-muted-foreground sm:size-8"
                  aria-hidden="true"
                />
              </span>

              <!-- Room kept for the switch laid over this corner, in both
                   modes: something is drawn there whether it can be pressed
                   or not, and a card that reflows on the way into choosing
                   is a list that jumps under a thumb. It is a sibling of the
                   card rather than a child - a button inside a link is markup
                   no two browsers agree about, and both controls stop being
                   reachable by keyboard. -->
              <span v-if="canSwitch(device)" class="size-10 shrink-0" aria-hidden="true" />
            </span>

            <!-- The name, on a line of its own with the whole card to itself.
                 No device id: it is on the device's own page, in the table
                 that is there to be read, and on half a phone it was a line
                 nobody needed pushing out the one that matters. -->
            <span class="min-w-0 truncate font-semibold">{{ deviceName(device) }}</span>

            <!-- What it is doing, and how well it is being heard. The glyph
                 moved here from beside the name: it answers the same question
                 this line answers, and nothing about what the thing is called.

                 A wifi glyph with as many arcs as the signal deserves, and
                 struck through when there is none - see SignalIcon, which
                 explains why it carries no colour of its own. Both states are
                 drawn rather than only the bad one, because marking only the
                 exception leaves nothing to tell "this is answering" apart
                 from "this has not been built yet".

                 The words are there for anybody who sees neither glyph.

                 A sensor has its numbers on a line above, and the time they
                 were taken here - marked as the last reading once the device
                 has stopped answering, so yesterday's room is not read as
                 today's. A device that is neither says whether it is there
                 and nothing more. -->
            <span
              v-if="canSense(device)"
              class="mt-auto min-w-0 truncate font-semibold tabular-nums"
            >
              {{ readingText(device) || t.portal.noReading }}
            </span>
            <span
              class="flex min-w-0 items-center gap-x-1.5 text-sm text-muted-foreground"
              :class="canSense(device) ? '' : 'mt-auto'"
            >
              <SignalIcon
                :device="device"
                class="size-4 shrink-0"
                :class="isOnline(device) ? '' : 'opacity-70'"
              />
              <span v-if="canSwitch(device)" class="min-w-0 truncate">{{ powerLabel(device) }}</span>
              <span v-else-if="canSense(device) && device.state?.ts" class="min-w-0 truncate">
                <template v-if="!isOnline(device)">{{ t.portal.readingOld }} · </template>{{ agoText(device.state.ts) }}
              </span>
              <span :class="canSwitch(device) || (canSense(device) && device.state?.ts) ? 'sr-only' : 'min-w-0 truncate'">
                {{ isOnline(device) ? t.portal.deviceOnline : t.portal.deviceOffline }}
              </span>
            </span>
          </component>

          <!-- The power button itself, at the end of the card rather than
               the start: it is the thing being operated, and the name is the
               thing being read.

               The 48px target is wider than the 40px disc inside it, so it
               is inset by the card's own padding less the difference - which
               puts the disc exactly on the space kept for it in the row
               above, rather than near it.

               Icon only, so its name comes from
               aria-label - there is no visible text on it for that name to
               have to match (WCAG 2.5.3).

               Off the card while choosing, so there is nothing on it but the
               choosing. -->
          <button
            v-if="canSwitch(device) && !selecting"
            type="button"
            role="switch"
            :aria-checked="powerOf(device) === 'on'"
            :disabled="sendingTo.has(device.id)"
            :aria-label="`${t.portal.power}: ${deviceName(device)}`"
            class="group absolute end-2 top-2 flex size-12 items-center justify-center rounded-full disabled:opacity-60 sm:end-3 sm:top-3"
            :class="workingOn(device) ? 'motion-safe:animate-pulse' : ''"
            @click="togglePower(device)"
          >
            <span
              class="inline-flex size-10 items-center justify-center rounded-full border transition-[colors,transform] group-hover:brightness-95 group-active:scale-95"
              :class="powerTone(device)"
            >
              <Power class="size-5" aria-hidden="true" />
            </span>
          </button>

          <!-- While choosing, the same switch is only a picture, and clicks
               fall through to the card. A device that is not a switch shows
               nothing here at all: a switch drawn on something that has no
               on and off would be a control that does not exist. -->
          <span
            v-else-if="canSwitch(device) && selecting"
            aria-hidden="true"
            class="pointer-events-none absolute end-2 top-2 flex size-12 items-center justify-center sm:end-3 sm:top-3"
          >
            <span
              class="inline-flex size-10 items-center justify-center rounded-full border"
              :class="powerTone(device)"
            >
              <Power class="size-5" aria-hidden="true" />
            </span>
          </span>
        </li>
      </ul>

      <!-- In the page whether or not it has anything to say, so that when it
           does a screen reader is already watching it (WCAG 4.1.3). -->
      <p role="status" class="mt-4 min-h-6 text-center text-sm text-[var(--destructive)]">
        {{ commandProblem }}
      </p>

    </section>

  </template>

  <InstallSheet ref="installSheet" />

  <ConfirmDialog
    ref="releaseAsk"
    danger
    :heading="t.portal.removeDeviceHeading"
    :body="t.portal.removeDeviceBody"
    :confirm-label="t.portal.remove"
    @confirm="releaseChosen"
  />

  <!-- ---------- add a device ---------- -->
  <dialog
    ref="dialog"
    aria-labelledby="add-heading"
    class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
  >
    <!-- No backdrop close. A stray tap beside a half-typed device code
         throws the typing away, and there is no undo for something that was
         never committed anywhere. The way out is Cancel or Escape - Escape
         stays, because a dialog with no keyboard way out fails WCAG 2.1.2,
         and pressing it is a decision rather than an accident. -->
    <form @submit.prevent="add">
      <h2 id="add-heading" class="text-lg font-semibold">{{ t.portal.addHeading }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t.portal.addHint }}</p>

      <label for="device-code" class="mt-4 block text-sm font-medium">
        {{ t.portal.codeLabel }}
      </label>
      <!-- X is not a hex digit, so this cannot be mistaken for a real
           code, and it still shows the shape of the placeholder. -->
      <input
        id="device-code"
        v-model="input"
        type="text"
        autocapitalize="characters"
        autocorrect="off"
        spellcheck="false"
        placeholder="XXXXXX-XXXXXX"
        :disabled="busy"
        class="mt-2 h-11 w-full rounded-lg border border-[var(--layer-line)] bg-[var(--background)] px-3 font-mono tracking-wider disabled:opacity-60"
      />

      <!-- Asked for here rather than on a second screen after the device
           arrives. It is one field, it is optional, and a flow that stops to
           ask a second question is a flow people abandon. -->
      <label for="device-name" class="mt-4 block text-sm font-medium">
        {{ t.portal.nameLabel }}
      </label>
      <input
        id="device-name"
        v-model="wanted"
        type="text"
        maxlength="60"
        aria-describedby="device-name-hint"
        :disabled="busy"
        class="mt-2 h-11 w-full rounded-lg border border-[var(--layer-line)] bg-[var(--background)] px-3 disabled:opacity-60"
      />
      <p id="device-name-hint" class="mt-1.5 text-sm text-muted-foreground">
        {{ t.portal.nameHint }}
      </p>

      <!-- WCAG 4.1.3: the outcome has to reach a screen reader without focus
           moving, which a paragraph that merely appears would not. -->
      <p v-if="problem" role="status" class="mt-3 text-sm text-[var(--destructive)]">
        {{ problem }}
      </p>

      <div class="mt-5 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="closeAdd"
        >
          {{ t.portal.cancel }}
        </button>

        <button
          type="submit"
          :disabled="busy || input.trim().length === 0"
          :class="[buttonClass, 'flex-1']"
        >
          <LoaderCircle
            v-if="busy"
            class="size-4 shrink-0 motion-safe:animate-spin"
            aria-hidden="true"
          />
          {{ busy ? t.portal.adding : t.portal.add }}
        </button>
      </div>
    </form>
  </dialog>

  <!-- No backdrop close: there is a name being typed in here. -->
  <dialog
    ref="siteDialog"
    aria-labelledby="new-site-heading"
    class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
  >
    <form @submit.prevent="makeSite">
      <h2 id="new-site-heading" class="text-lg font-semibold">{{ t.portal.newSiteHeading }}</h2>

      <label for="new-site-name" class="mt-4 block text-sm font-medium">
        {{ t.portal.siteNameLabel }}
      </label>
      <input
        id="new-site-name"
        v-model="siteName"
        type="text"
        maxlength="60"
        :disabled="makingSite"
        class="mt-2 h-11 w-full rounded-lg border border-[var(--layer-line)] bg-[var(--background)] px-3 disabled:opacity-60"
      />

      <p role="status" class="mt-2 min-h-6 text-sm text-[var(--destructive)]">
        {{ siteProblem }}
      </p>

      <div class="mt-3 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="siteDialog?.close()"
        >
          {{ t.portal.cancel }}
        </button>
        <button
          type="submit"
          :disabled="makingSite || siteName.trim().length === 0"
          :class="[buttonClass, 'flex-1']"
        >
          {{ t.portal.create }}
        </button>
      </div>
    </form>
  </dialog>
</template>

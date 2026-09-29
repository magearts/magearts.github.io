<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  History,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
} from 'lucide-vue-next'
import { locale, pathFor, t } from '@/i18n'
import { authReady, user } from '@/composables/useAuth'
import {
  agoText,
  askDevice,
  canSense,
  canSwitch,
  caps,
  deviceName,
  hearsAtOnce,
  devices,
  devicesReady,
  givenName,
  iconKey,
  isOnline,
  pendingOf,
  workingOn,
  signalOf,
  powerLabel,
  readingText,
  powerOf,
  releaseDevices,
  setPower,
  powerTone,
} from '@/composables/useDevices'
import { currentSite, isOwner, editDevice } from '@/composables/useSites'
import { DEFAULT_ICON, ICON_GROUPS, iconByKey } from '@/composables/useIcons'
import { closeLog, logLines, logReady, openLog, type LogLine } from '@/composables/useDeviceLog'
import { schedules, timeText } from '@/composables/useSchedules'
import { closeReadings, openReadings, readings } from '@/composables/useReadings'
import ConfirmDialog from '@/components/portal/ConfirmDialog.vue'
import PortalBar from '@/components/portal/PortalBar.vue'
import SignalIcon from '@/components/portal/SignalIcon.vue'
import HintLabel from '@/components/portal/HintLabel.vue'
import ReadingsChart from '@/components/portal/ReadingsChart.vue'
import Spinner from '@/components/portal/Spinner.vue'

/*
 * One device, full screen: the page a tile opens.
 *
 * The device comes out of the same live list the portal holds, so there is
 * no second listener and nothing here to go stale. Anybody who lands on this
 * URL without owning the device - or without being signed in - simply finds
 * it missing from their list, which is also all the database would tell them.
 */
const route = useRoute()
const router = useRouter()

const device = computed(() => devices.value.find((d) => d.id === route.params.id))
const power = computed(() => (device.value ? powerOf(device.value) : 'unknown'))

const loading = computed(() => !authReady.value || (!!user.value && !devicesReady.value))

/*
 * Everything this switch has done in the past week, and what caused it.
 *
 * Read only while this page is open - one listener for one device, taken
 * down on the way out. That is also what keeps the tree from growing: the
 * device appends and never deletes, and opening a history is what trims it
 * (PROTOCOL.md, "What the switch did, and when"). This page is the one people
 * open, so this is where the week is actually enforced.
 *
 * Every cause is shown, unlike the list behind an automation, which shows
 * only its own runs. This one belongs to the device, and "the light came on
 * at seven" is not answered by a list that has left out the schedule, or the
 * button on the wall, or the phone.
 */
/*
 * Only for a switch: `/logs` is what the relay did, and a device without one
 * writes none (PROTOCOL.md, "What a device can do"). Watched on what the
 * device can do as well as on the id, because the record may arrive after the
 * page does.
 */
const switches = computed(() => (device.value ? canSwitch(device.value) : false))
const senses = computed(() => (device.value ? canSense(device.value) : false))

watch(
  [() => route.params.id, switches],
  ([id, yes]) => {
    if (typeof id === 'string' && id && yes) openLog([id])
    else closeLog()
  },
  { immediate: true },
)

/*
 * A sensor's last day, read on arrival whether or not anybody scrolls to the
 * graph - for the same reason as the history above: reading it is what trims
 * it (PROTOCOL.md, "What the room was, and when").
 */
watch(
  [() => route.params.id, senses],
  ([id, yes]) => {
    if (typeof id === 'string' && id && yes) openReadings(id)
    else closeReadings()
  },
  { immediate: true },
)

onUnmounted(() => {
  closeLog()
  closeReadings()
})

const historyDialog = ref<HTMLDialogElement | null>(null)

/*
 * Focus the dialog itself, not what is inside it.
 *
 * showModal() focuses the first thing that can take focus, and in here that
 * is the Close button at the foot of the list - which scrolls a week of
 * history out of sight before it has been seen once. The dialog carries
 * `aria-labelledby`, so focusing it announces the heading instead.
 */
function openHistory() {
  historyDialog.value?.showModal()
  historyDialog.value?.focus()
}

function logWhen(at: number) {
  return new Intl.DateTimeFormat(locale.value === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at)
}

/*
 * A schedule is named by its time, which is the only name it has. If it has
 * been deleted since - and a week of history outlives plenty of schedules -
 * the line still says a schedule did it, and stops there rather than showing
 * a key nobody has ever seen.
 */
function sourceText(line: LogLine) {
  if (line.by === 'cmd') return t.value.portal.byCmd
  if (line.by === 'tap') return t.value.portal.byTap

  const slot = schedules.value.find((one) => one.id === line.slot)
  return slot ? `${t.value.portal.bySchedule} ${timeText(slot.at)}` : t.value.portal.bySchedule
}


/*
 * What the button does, and what it says while it is doing it.
 *
 * The button shows `state` and never `cmd` (PROTOCOL.md): a request that has
 * not arrived must not look like a light that came on. So pressing it changes
 * nothing on screen except the line underneath, and the circle changes when
 * the switch says it has.
 *
 * Three ways it can go, and they are not the same thing. The write can be
 * refused, which is this phone's problem. The write can succeed and the
 * device stay silent, which is the device's. Or it can answer, which is the
 * only one that needs no words.
 */
const NO_ANSWER_MS = 8000

const sending = ref(false)
const failed = ref(false)
const silent = ref(false)

const pending = computed(() => (device.value ? pendingOf(device.value) : false))

// Pending says a command is outstanding; this says it is still plausibly on
// its way. They part company the moment the label gives up - a control that
// keeps pulsing under the words "No response" is telling two stories.
const working = computed(() => (device.value ? workingOn(device.value) : false))

let timer: ReturnType<typeof setTimeout> | null = null

watch(
  pending,
  (waiting) => {
    if (timer) clearTimeout(timer)
    timer = null
    silent.value = false

    // Started from another phone or another tab as readily as from this one,
    // which is why it is the waiting that starts the clock and not the press.
    if (waiting) timer = setTimeout(() => (silent.value = true), NO_ANSWER_MS)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

async function toggle() {
  const current = device.value
  if (!current || sending.value) return

  sending.value = true
  failed.value = false

  try {
    // Unknown counts as off: the useful thing to do with a switch nobody has
    // heard from is to try turning it on.
    await setPower(current.id, power.value !== 'on')
  } catch {
    failed.value = true
  } finally {
    sending.value = false
  }
}

/*
 * Renaming, which only the owner of the site may do.
 *
 * The field opens with whatever name was actually chosen, not with the
 * fallback: somebody renaming "Wi-Fi switch" should not have to clear the
 * words the portal put there on their behalf.
 */
/*
 * One dialog for both, because they are one decision.
 *
 * They were two, behind two pencils in two rows, and two pencils one above
 * the other is a question about which one does what. Smart Life puts the
 * icon, the name and the room behind a single edit screen reached from a
 * single pencil, and that is the right shape: what a device is called and
 * what it looks like are the same act of naming it.
 *
 * Nothing is written until Save, so the grid selects rather than commits.
 * Both fields go in one write - a rename that landed while the icon did not
 * is a worse outcome than one that was refused.
 */
const editDialog = ref<HTMLDialogElement | null>(null)
const wanted = ref('')
const wantedIcon = ref(DEFAULT_ICON)
const saving = ref(false)

function openEdit() {
  const current = device.value
  if (!current) return

  // The field opens with the name somebody actually chose, not the fallback:
  // renaming "Wi-Fi switch" should not start by clearing words the portal put
  // there on their behalf. The icon has no such distinction - an unset one is
  // the default, and the default is a real choice.
  wanted.value = givenName(current)
  wantedIcon.value = iconByKey(iconKey(current)).key
  editDialog.value?.showModal()
}

function closeEdit() {
  editDialog.value?.close()
}

async function saveEdit() {
  const current = device.value
  if (!current || saving.value) return

  saving.value = true

  try {
    await editDevice(current.id, wanted.value, wantedIcon.value)
    closeEdit()
  } catch {
    failed.value = true
    closeEdit()
  } finally {
    saving.value = false
  }
}

/*
 * Restarting and erasing, which only the owner may ask for.
 *
 * Neither reports back. The board deletes the request before it acts, so the
 * request disappearing is the only acknowledgement there is, and by the time
 * it does the board is already on its way down.
 */
const asking = ref(false)
const said = ref('')

const rebootAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const resetAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)

async function ask(what: 'reboot' | 'factory-reset') {
  const current = device.value
  if (!current || asking.value) return

  asking.value = true
  said.value = ''

  try {
    await askDevice(current.id, what)
    // A device without a stream reads `req` every five minutes, and saying
    // "the moment it hears" about that one would be a promise with no date.
    said.value = hearsAtOnce(current) ? t.value.portal.asked : t.value.portal.askedSlow
  } catch {
    said.value = t.value.portal.askFailed
  } finally {
    asking.value = false
  }
}

// The visible note is for the two things the button cannot say itself: a
// command that was refused, and one that was accepted by the database and
// then ignored by the device.
/*
 * Giving the device up.
 *
 * Not "deactivate": nothing is switched off, and whatever is wired to it goes
 * on doing whatever it was doing. What ends is the claim on it - it leaves
 * the account, and the code printed on its case will add it to another one.
 *
 * It sits apart from restart and erase, because those two ask the board to do
 * something and this one does not involve the board at all. It works while
 * the device is unplugged.
 */
const removeAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)

async function release() {
  const current = device.value
  const site = currentSite.value
  if (!current || !site) return

  said.value = ''

  try {
    await releaseDevices([current.id], site.id)
    router.replace(pathFor(locale.value, 'portal'))
  } catch (error) {
    said.value = t.value.portal.removeFailed
    console.error('releaseDevices', error)
  }
}

const note = computed(() => {
  if (failed.value) return t.value.portal.commandFailed
  if (silent.value) return t.value.portal.noAnswer

  // Not an error, so it is not red: the device has simply not been heard
  // from. What it last said is still on the button above.
  if (device.value && !isOnline(device.value)) return t.value.portal.noAnswer

  return ''
})

// The button's own words change while a command is outstanding, and a
// changed label is not announced. WCAG 4.1.3: this is.
const spoken = computed(() =>
  pending.value && device.value ? powerLabel(device.value) : '',
)

// Both timestamps in the table below. They are the server's, and the phone
// is asked only to format them.
function when(at?: number) {
  if (!at) return '-'
  return new Date(at).toLocaleString(locale.value === 'th' ? 'th-TH' : 'en-GB')
}

const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--primary)] ' +
  'hover:bg-[var(--layer-hover)] disabled:opacity-60'
</script>

<template>
  <PortalBar :title="device ? deviceName(device) : t.portal.heading">
    <!-- The same pair as on the tile it was opened from, in front of the
         name, so that the first thing read on this page is whether anything
         else on it can be believed. -->
    <template v-if="device" #title>
      <span class="flex items-center gap-x-2">
        <SignalIcon
          :device="device"
          class="size-5 shrink-0"
          :class="isOnline(device) ? '' : 'opacity-70'"
        />
        <span class="min-w-0 truncate">{{ deviceName(device) }}</span>
        <span class="sr-only">
          ({{ isOnline(device) ? t.portal.deviceOnline : t.portal.deviceOffline }})
        </span>
      </span>
    </template>

    <template #start>
      <RouterLink :to="pathFor(locale, 'portal')" :class="iconButton" :aria-label="t.portal.back">
        <ChevronLeft class="size-6" aria-hidden="true" />
      </RouterLink>
    </template>

  </PortalBar>

    <!-- Two containers, one purpose: the outer one is the width the top bar
         and the tab bar use, and the inner one is the width a list or a form
         should actually be. Left-aligned rather than centred inside it, so
         the column starts under the page's own title instead of floating in
         the middle of a wide screen with the chrome around it somewhere
         else.

         The outer one is no longer capped. It was, at 1152px, and on a wide
         desktop that left the whole page floating in the middle with the
         chrome hemmed in with it. What the cap was protecting against -
         a line of text three thousand pixels long, which WCAG 1.4.8 puts at
         eighty characters - is the inner one's job, and the inner one is
         still doing it. -->
  <section
    class="w-full px-4 pt-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
  >
    <div class="max-w-md">
    <Spinner v-if="loading" />

    <p v-else-if="!device" class="text-center text-muted-foreground">{{ t.portal.notFound }}</p>

    <template v-else>
      <!-- The power button, drawn the way it is on the device's card so the
           two read as the same control.

           Its accessible name is the word above it, "Power", and it does not
           change with the state: a switch says which way it is set through
           aria-checked, and a name that flipped between "On" and "Off" would
           be read out as a different control each time. The state word and
           the note below describe it instead. Both are visible, and the name
           is the visible label, so voice control finds it by what it says on
           screen (WCAG 2.5.3). -->
      <div v-if="canSwitch(device)" class="flex flex-col items-center text-center">
        <p id="power-label" class="text-sm font-semibold">{{ t.portal.power }}</p>

        <button
          type="button"
          role="switch"
          :aria-checked="power === 'on'"
          :disabled="sending"
          aria-labelledby="power-label"
          aria-describedby="power-state power-note"
          class="group mt-3 flex size-32 items-center justify-center rounded-full disabled:opacity-60"
          :class="working ? 'motion-safe:animate-pulse' : ''"
          @click="toggle"
        >
          <span
            class="inline-flex size-28 items-center justify-center rounded-full border-2 transition-[colors,transform] group-hover:brightness-95 group-active:scale-95"
            :class="powerTone(device)"
          >
            <Power class="size-12" aria-hidden="true" />
          </span>
        </button>

        <p id="power-state" class="mt-3 text-base font-semibold">{{ powerLabel(device) }}</p>

        <p class="sr-only" role="status">{{ spoken }}</p>

        <!-- Always in the page, empty most of the time: a live region that is
             added to the page when it has something to say is a live region
             screen readers miss (WCAG 4.1.3). The height is held so the page
             does not jump when it fills. -->
        <p
          id="power-note"
          role="status"
          class="mt-3 min-h-10 max-w-xs text-sm"
          :class="failed ? 'text-[var(--destructive)]' : 'text-muted-foreground'"
        >
          {{ note }}
        </p>
      </div>

      <!-- The room, in large type where a switch has its button. Nothing to
           press: a sensor has nothing to command.

           A reading from a device that has stopped answering is still shown,
           and said to be the last one rather than the current one - a
           temperature from yesterday afternoon looks exactly like one from
           now unless something says otherwise. -->
      <div
        v-if="canSense(device)"
        class="flex flex-col items-center text-center"
        :class="canSwitch(device) ? 'mt-8' : ''"
      >
        <p v-if="readingText(device)" class="text-4xl font-semibold tabular-nums">
          {{ readingText(device) }}
        </p>
        <p v-else class="text-base text-muted-foreground">{{ t.portal.noReading }}</p>

        <p v-if="device.state?.ts && readingText(device)" class="mt-2 text-sm text-muted-foreground">
          <template v-if="!isOnline(device)">{{ t.portal.readingOld }} · </template>{{ agoText(device.state.ts) }}
        </p>
      </div>

      <!-- What somebody chose, above what the hardware reports.
           Smart Life opens its settings screen with exactly this: the icon,
           the name, and one way in to change them. Everything below is
           something nobody typed.

           One pencil, not two. It was two, one per row, which is a question
           about which of them does what - and what a device is called and
           what it looks like are the same act of naming it. -->
      <div
        class="mt-10 flex items-center gap-x-3 rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] p-4"
      >
        <component
          :is="iconByKey(iconKey(device)).icon"
          class="size-8 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate font-semibold">{{ deviceName(device) }}</span>
        <button
          v-if="isOwner"
          type="button"
          class="-me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--layer-hover)]"
          :aria-label="t.portal.editHeading"
          @click="openEdit"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </button>
      </div>

      <!-- Two cards rather than one table of eight rows, and the gap between
           them is doing the work a dividing line cannot. These are two
           different kinds of fact: the first changes every few minutes and is
           what somebody opens this page to check, the second changes once a
           year. Somebody asking "is it all right?" reads the first card and
           closes the page. -->
      <h2 class="mt-8 text-sm font-semibold">{{ t.portal.statusSection }}</h2>
      <dl
        class="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] px-4 text-sm"
      >
        <!-- The same glyph as the card and the title, not a second way of
             drawing the same measurement. The number goes beside it for
             somebody standing on a chair moving the thing about, who needs
             to know whether what they just did made it better - four arcs
             cannot answer that, and -71 becoming -63 can. The word is there
             because no glyph says anything to a screen reader. -->
        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">
            <HintLabel :hint="t.portal.signalHint">{{ t.portal.signalLabel }}</HintLabel>
          </dt>
          <dd v-if="signalOf(device) === 0" class="text-end">-</dd>
          <dd v-else class="flex items-center gap-x-2 text-end">
            <SignalIcon :device="device" class="size-4 shrink-0" />
            <span class="sr-only">{{ t.portal.signalWords[signalOf(device) - 1] }},</span>
            <span class="font-mono">{{ device.rssi }} dBm</span>
          </dd>
        </div>

        <!-- Both, and next to each other, because either one alone is
             misread as the other. "Last seen" is when it last said anything;
             "last started" is when it last booted, and a device whose
             starting time keeps moving is one that is restarting itself. -->
        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">{{ t.portal.lastSeenLabel }}</dt>
          <dd class="text-end">{{ when(device.alive) }}</dd>
        </div>

        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">
            <HintLabel :hint="t.portal.startedHint">{{ t.portal.startedLabel }}</HintLabel>
          </dt>
          <dd class="text-end">{{ when(device.seen) }}</dd>
        </div>
      </dl>

      <h2 class="mt-8 text-sm font-semibold">{{ t.portal.details }}</h2>
      <dl
        class="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] px-4 text-sm"
      >
        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">{{ t.portal.idLabel }}</dt>
          <dd class="font-mono tracking-wider">{{ device.id }}</dd>
        </div>

        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">{{ t.portal.fwLabel }}</dt>
          <dd>{{ device.fw || '-' }}</dd>
        </div>

        <div class="flex items-center justify-between gap-x-4 py-3">
          <dt class="text-muted-foreground">{{ t.portal.ipLabel }}</dt>
          <dd class="font-mono">{{ device.ip || '-' }}</dd>
        </div>
      </dl>

      <!-- A button, not the list itself.

           The list was here and it was the wrong shape for the page: a week
           of a switch somebody uses is a hundred lines, and everything below
           this - restart, factory reset, removing the device - was pushed a
           hundred lines down where nobody would find it. A history is
           something you go and look at; those are things you need to reach.

           A dialog rather than a page of its own, because it is a thing to
           glance at and close, and a page would put a back button in the way
           of getting on with whatever brought somebody here. -->
      <template v-if="senses">
        <h2 class="mt-8 text-sm font-semibold">{{ t.portal.readingsHeading }}</h2>
        <p class="mt-1 text-xs text-muted-foreground">{{ t.portal.readingsHint }}</p>
        <div class="mt-2 grid gap-3">
          <ReadingsChart
            v-if="caps(device).temp"
            :readings="readings"
            field="t"
            unit="°C"
            :label="t.portal.temperature"
            tone="var(--warn)"
          />
          <ReadingsChart
            v-if="caps(device).humid"
            :readings="readings"
            field="h"
            unit="%"
            :label="t.portal.humidity"
            tone="var(--primary)"
          />
        </div>
      </template>

      <button
        v-if="switches"
        type="button"
        class="mt-8 inline-flex h-12 w-full items-center gap-x-3 rounded-lg border border-[var(--layer-line)] bg-[var(--card)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
        @click="openHistory"
      >
        <History class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="min-w-0 flex-1 text-start">{{ t.portal.historyHeading }}</span>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
      </button>

      <!-- Owner only, and grouped by what happens if it was a mistake -
           not by what each one acts on.

           Restarting is a command to the board and removing is about who
           owns it, which is the tidy way to sort them and the wrong one.
           Nobody standing over a switch is thinking "is this a board
           command"; they are thinking "can I undo this from here". Those
           two can be. The third cannot, and it is on its own below a line
           with the reason written above it.

           One red button on the page, for the same reason. A colour that
           means "be careful" on three buttons at once means nothing on any
           of them.

           Every one of them says what it costs before it is pressed. The
           confirmation says it too, and by then the person has already
           decided. -->
      <template v-if="isOwner">
        <h2 class="mt-10 text-sm font-semibold">{{ t.portal.maintenance }}</h2>

        <div class="mt-2 grid gap-4">
          <div>
            <button
              type="button"
              :disabled="asking"
              class="inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)] disabled:opacity-60"
              @click="rebootAsk?.open()"
            >
              <RotateCcw class="size-4 shrink-0" aria-hidden="true" />
              {{ t.portal.reboot }}
            </button>
            <p class="mt-1.5 text-xs text-muted-foreground">{{ t.portal.rebootWhat }}</p>
          </div>

          <div>
            <button
              type="button"
              class="inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
              @click="removeAsk?.open()"
            >
              <Trash2 class="size-4 shrink-0" aria-hidden="true" />
              {{ t.portal.removeDevice }}
            </button>
            <p class="mt-1.5 text-xs text-muted-foreground">{{ t.portal.removeWhat }}</p>
          </div>
        </div>

        <h2 class="mt-8 border-t border-border pt-6 text-sm font-semibold">
          {{ t.portal.cannotUndoHere }}
        </h2>

        <div class="mt-2">
          <button
            type="button"
            :disabled="asking"
            class="inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-[var(--destructive)] bg-[var(--destructive)] px-4 text-sm font-medium text-[var(--destructive-foreground)] hover:bg-[var(--destructive-hover)] disabled:opacity-60"
            @click="resetAsk?.open()"
          >
            <Eraser class="size-4 shrink-0" aria-hidden="true" />
            {{ t.portal.eraseLabel }}
          </button>
          <p class="mt-1.5 text-xs text-muted-foreground">{{ t.portal.eraseWhat }}</p>
        </div>

        <p role="status" class="mt-3 min-h-6 text-sm text-muted-foreground">{{ said }}</p>
      </template>

    </template>
    </div>
  </section>

  <!-- ---------- what happened ---------- -->
  <dialog
    ref="historyDialog"
    autofocus
    tabindex="-1"
    aria-labelledby="history-heading"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-0 text-foreground backdrop:bg-black/50"
  >
    <!-- Three bands, and only the middle one moves.

         The heading says what is being read and the way out sits under a
         thumb; a week of history scrolling either of them off the screen
         means finding the top again to learn what you are looking at, and
         finding the bottom to leave.

         The column is this <div> rather than the <dialog>. A `display` set by
         our own stylesheet beats the browser's, whatever the selector looks
         like - so `display: flex` on the dialog would defeat
         `dialog:not([open]) { display: none }` and leave the thing on screen
         with nothing open. -->
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div class="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="history-heading" class="text-lg font-semibold">{{ t.portal.historyHeading }}</h2>
        <p class="mt-2 text-xs text-muted-foreground">{{ t.portal.historyHint }}</p>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
        <Spinner v-if="!logReady" class="mt-6" />

        <p v-else-if="logLines.length === 0" class="mt-8 text-center text-sm text-muted-foreground">
          {{ t.portal.noHistory }}
        </p>

        <ul v-else class="mt-4 divide-y divide-[var(--border)] text-sm">
          <li
            v-for="line in logLines"
            :key="line.at"
            class="flex items-start justify-between gap-x-4 py-2.5"
          >
            <span class="min-w-0">
              <span class="block font-medium">
                {{ line.on ? t.portal.ranOn : t.portal.ranOff }}
              </span>
              <span class="block text-xs text-muted-foreground">{{ sourceText(line) }}</span>
            </span>
            <span class="shrink-0 text-end text-xs text-muted-foreground">
              {{ logWhen(line.at) }}
            </span>
          </li>
        </ul>
      </div>

      <div class="shrink-0 px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="historyDialog?.close()"
        >
          {{ t.portal.close }}
        </button>
      </div>
    </div>
  </dialog>

  <ConfirmDialog
    ref="removeAsk"
    danger
    :heading="t.portal.removeDeviceHeading"
    :body="t.portal.removeDeviceBody"
    :confirm-label="t.portal.remove"
    @confirm="release"
  />

  <ConfirmDialog
    ref="rebootAsk"
    :heading="t.portal.rebootHeading"
    :body="t.portal.rebootBody"
    :confirm-label="t.portal.reboot"
    @confirm="ask('reboot')"
  />

  <ConfirmDialog
    ref="resetAsk"
    danger
    :heading="t.portal.eraseHeading"
    :body="t.portal.eraseWarning"
    :confirm-label="t.portal.eraseConfirm"
    @confirm="ask('factory-reset')"
  />

  <!-- ---------- name and icon ----------
       No backdrop close: there is a name being typed in here. Cancel and
       Escape, as with the other forms - Escape stays because a dialog with no
       keyboard way out fails WCAG 2.1.2. -->
  <dialog
    ref="editDialog"
    aria-labelledby="edit-heading"
    class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
  >
    <form @submit.prevent="saveEdit">
      <h2 id="edit-heading" class="text-lg font-semibold">{{ t.portal.editHeading }}</h2>

      <!-- The picture first, because it is the coarser choice: what kind of
           thing this is, then what this one is called. -->
      <p class="mt-4 text-sm font-medium">{{ t.portal.iconHeading }}</p>

      <div class="mt-2 max-h-56 overflow-y-auto">
        <div v-for="group in ICON_GROUPS" :key="group.label" class="mt-3 first:mt-0">
          <h3 class="text-xs font-semibold text-muted-foreground">
            {{ t.portal.iconGroups[group.label] }}
          </h3>

          <!-- Named here, and only here. Every button is a picture with no
               words on it, so the only name it has is this one (WCAG 4.1.2),
               and the chosen one carries a tick as well as a tint - a tint on
               its own is colour doing the work alone (WCAG 1.4.1).

               It selects; it does not save. Save is at the bottom with the
               name, because they go into the database together. -->
          <ul class="mt-1.5 grid grid-cols-6 gap-1 sm:grid-cols-8">
            <li v-for="one in group.icons" :key="one.key">
              <button
                type="button"
                class="relative flex h-11 w-full items-center justify-center rounded-lg hover:bg-[var(--layer-hover)]"
                :class="
                  one.key === wantedIcon
                    ? 'bg-[var(--layer-hover)] text-[var(--primary)]'
                    : 'text-muted-foreground'
                "
                :aria-label="t.portal.iconNames[one.label]"
                :aria-pressed="one.key === wantedIcon"
                @click="wantedIcon = one.key"
              >
                <component :is="one.icon" class="size-5" aria-hidden="true" />
                <Check
                  v-if="one.key === wantedIcon"
                  class="absolute end-0.5 top-0.5 size-3"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <label for="new-name" class="mt-5 block text-sm font-medium">
        {{ t.portal.nameLabel }}
      </label>
      <input
        id="new-name"
        v-model="wanted"
        type="text"
        maxlength="60"
        aria-describedby="new-name-hint"
        :disabled="saving"
        class="mt-2 h-11 w-full rounded-lg border border-[var(--layer-line)] bg-[var(--background)] px-3 disabled:opacity-60"
      />
      <p id="new-name-hint" class="mt-1.5 text-sm text-muted-foreground">
        {{ t.portal.nameHint }}
      </p>

      <div class="mt-5 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="closeEdit"
        >
          {{ t.portal.cancel }}
        </button>

        <button
          type="submit"
          :disabled="saving"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {{ t.portal.save }}
        </button>
      </div>
    </form>
  </dialog>
</template>

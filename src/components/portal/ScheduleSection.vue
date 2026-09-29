<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { HSSelect } from 'preline'
import { Check, Clock, Pencil } from 'lucide-vue-next'
import { locale, t } from '@/i18n'
import { canSwitch, deviceName, devices } from '@/composables/useDevices'
import { closeLog, logLines, logReady, openLog } from '@/composables/useDeviceLog'
import { checkSvg, chevronSvg } from '@/composables/svgIcons'
import {
  DAY_ORDER,
  EVERY_DAY,
  ScheduleFullError,
  daysText,
  deleteSchedule,
  saveSchedule,
  schedules,
  setScheduleEnabled,
  timeText,
  timeValue,
  type Schedule,
} from '@/composables/useSchedules'
import ConfirmDialog from './ConfirmDialog.vue'
import Spinner from './Spinner.vue'

/*
 * Every schedule in the site, and the form that sets them.
 *
 * It lives on the Automations tab and nowhere else. It was on each device's
 * page as well for a while, and two places to change the same schedule - one
 * of which showed only part of it - was one too many.
 *
 * Anybody in the site may do all of it. A schedule is a command written in
 * advance, and the rules open it to the same people `cmd` is open to.
 */
/*
 * Choosing several is the page's business, not this list's.
 *
 * The bar above counts what is chosen and carries the buttons that act on
 * it, and the bar belongs to the view. So this takes the mode as a prop and
 * says which row was touched - it draws the ticks and knows nothing about
 * what happens to them.
 */
const props = defineProps<{ selecting?: boolean; chosen?: Set<string> }>()
const emit = defineEmits<{ toggle: [id: string] }>()

function isChosen(id: string) {
  return props.chosen?.has(id) === true
}

const list = schedules

// Only what can be switched. A sensor has no on and no off to schedule.
const switchable = computed(() => devices.value.filter(canSwitch))

function devicesText(schedule: Schedule) {
  return schedule.devices
    .map((id) => devices.value.find((d) => d.id === id))
    .filter((d) => d !== undefined)
    .map((d) => deviceName(d))
    .join(', ')
}

// ---------- the switch on each row ----------

const busy = ref('')
const said = ref('')

async function toggle(schedule: Schedule) {
  if (busy.value) return
  busy.value = schedule.id
  said.value = ''

  try {
    await setScheduleEnabled(schedule, !schedule.en)
  } catch {
    said.value = t.value.portal.saveFailed
  } finally {
    busy.value = ''
  }
}

// ---------- what actually happened ----------

/*
 * One automation's history, which is the question a schedule always provokes:
 * did it run last night?
 *
 * The list is everything those devices did in the week, not only what this
 * schedule did, because "it did not run" and "it ran and somebody turned it
 * off again" look identical from a list that shows one of them. This
 * schedule's own lines are the ones picked out in colour.
 *
 * Read only while the dialog is open. PROTOCOL.md, "What the switch did, and
 * when" - and opening it is also what trims the week, so a history nobody
 * ever looks at is the one that grows.
 */
const historyDialog = ref<HTMLDialogElement | null>(null)
const showing = ref<Schedule | null>(null)

function openHistory(schedule: Schedule) {
  showing.value = schedule
  openLog(schedule.devices)
  historyDialog.value?.showModal()
  historyDialog.value?.focus()
}

function whenText(at: number) {
  return new Intl.DateTimeFormat(locale.value === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at)
}

function lineDevice(id: string) {
  const device = devices.value.find((one) => one.id === id)
  return device ? deviceName(device) : id
}

/*
 * This automation's own runs, and nothing else.
 *
 * The devices it switches do other things - somebody presses the button,
 * somebody opens the app, another schedule shares the same device - and none
 * of that belongs here. This list exists to answer one question, "did it run
 * the way I set it", and anything else in it is something to read past.
 *
 * The whole of a device's history, cause by cause, is on the device's own
 * page.
 */
const runs = computed(() =>
  logLines.value.filter((line) => line.by === 'sched' && line.slot === showing.value?.id),
)

// ---------- the form ----------

const dialog = ref<HTMLDialogElement | null>(null)
const deleteAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)

const editing = ref<Schedule | null>(null)
const time = ref('07:00')
const turnOn = ref(true)
const days = ref(EVERY_DAY)
const picked = ref<string[]>([])
const saving = ref(false)
const problem = ref('')

function open(schedule?: Schedule) {
  editing.value = schedule ?? null
  problem.value = ''

  if (schedule) {
    time.value = timeText(schedule.at)
    turnOn.value = schedule.on
    days.value = schedule.days
    picked.value = [...schedule.devices]
  } else {
    time.value = '07:00'
    turnOn.value = true
    days.value = EVERY_DAY
    // Shown ticked rather than hidden when it is the only one, so that the
    // form always says which device the time is for.
    picked.value = switchable.value.length === 1 ? [switchable.value[0]!.id] : []
  }

  dialog.value?.showModal()

  /*
   * Onto the dialog itself, not into the form.
   *
   * showModal() focuses the first thing in the dialog that can take focus,
   * and here that is the time field - which on iOS opens the wheel picker as
   * a full-screen sheet over a form nobody has read yet. The `autofocus` on
   * the dialog element is meant to prevent that, and does on Safari 16.4 and
   * later; this is for everything older, where it would otherwise fall back
   * to the old behaviour.
   *
   * It also reads better: the dialog carries `aria-labelledby`, so focusing
   * it announces "New schedule" rather than "time field".
   */
  dialog.value?.focus()

  nextTick(buildPicker)
}

function close() {
  dialog.value?.close()
}

// ---------- which devices: Preline's multi select ----------

/*
 * Preline's select, with three things it does not do and this form needs.
 *
 * It is built by hand each time the form opens and taken down when it
 * closes, in a box Vue renders empty and never looks inside. Preline moves
 * the <select> it is given into markup of its own and back again, and
 * doing that to an element Vue is keeping track of is how a list ends up
 * patched into the wrong place.
 *
 * What is added once it is built, and again after every change:
 *
 * - Roles and states. Preline marks the dropdown as a listbox and stops
 *   there, so a screen reader hears a list of unnamed things with no way to
 *   tell which are chosen. Each option gets role="option" and aria-selected,
 *   the list says it takes more than one, and the button is named by the
 *   label above it and what it currently shows (WCAG 4.1.2).
 *
 * - Text, not HTML. Preline writes titles into the page as innerHTML, and a
 *   title here is a device name somebody typed. So the names it is given are
 *   escaped, which keeps whatever it does with them inert, and the words on
 *   screen are then put back in with textContent.
 *
 * - Escape closing the list, and only the list. Inside a modal <dialog> the
 *   same key would close the form as well, and take the time and days that
 *   had been picked with it.
 *
 * All of it leans on how Preline 4.2 builds its markup. A Preline upgrade
 * means opening this form with a screen reader running before shipping it.
 */
const pickerHost = ref<HTMLDivElement | null>(null)
let picker: HSSelect | null = null

const LABEL_ID = 'schedule-devices-label'
const TEXT_ID = 'schedule-devices-text'
const LIST_ID = 'schedule-devices-list'

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Devices already on a schedule that this portal no longer counts as
// switchable. They are not offered, and they are not dropped either.
function unlisted() {
  return picked.value.filter((id) => !switchable.value.some((d) => d.id === id))
}

function patchPicker() {
  const host = pickerHost.value
  if (!host) return

  const toggle = host.querySelector<HTMLElement>('[data-picker-toggle]')
  const list = host.querySelector<HTMLElement>('[data-hs-select-dropdown]')

  if (list) {
    list.id = LIST_ID
    list.setAttribute('aria-multiselectable', 'true')
    list.setAttribute('aria-labelledby', LABEL_ID)

    list.querySelectorAll<HTMLElement>('[data-value]').forEach((option) => {
      const id = option.getAttribute('data-value') ?? ''
      const device = switchable.value.find((d) => d.id === id)

      option.id = `schedule-device-${id}`
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(picked.value.includes(id)))

      const title = option.querySelector('[data-title]')
      if (title && device) title.textContent = deviceName(device)
    })
  }

  if (toggle) {
    toggle.setAttribute('aria-controls', LIST_ID)

    const text = toggle.querySelector<HTMLElement>('[data-title]')
    if (text) {
      const names = switchable.value
        .filter((d) => picked.value.includes(d.id))
        .map((d) => deviceName(d))

      text.textContent = names.length > 0 ? names.join(', ') : t.value.portal.pickDevices
      text.classList.toggle('text-muted-foreground', names.length === 0)
    }
  }
}

function buildPicker() {
  destroyPicker()

  const host = pickerHost.value
  if (!host) return

  const select = document.createElement('select')
  select.multiple = true

  for (const one of switchable.value) {
    const option = document.createElement('option')
    option.value = one.id
    option.textContent = escapeHtml(deviceName(one))
    option.selected = picked.value.includes(one.id)
    select.append(option)
  }

  host.append(select)

  picker = new HSSelect(select, {
    placeholder: escapeHtml(t.value.portal.pickDevices),
    dropdownScope: 'parent',
    dropdownSpace: 8,
    dropdownPlacement: null,
    dropdownVerticalFixedPlacement: null,
    wrapperClasses: 'relative mt-2',
    toggleTag:
      `<button type="button" data-picker-toggle aria-haspopup="listbox" aria-expanded="false" ` +
      `aria-labelledby="${LABEL_ID} ${TEXT_ID}">` +
      `<span id="${TEXT_ID}" data-title class="min-w-0 flex-1 truncate"></span>` +
      `<span class="shrink-0 text-muted-foreground">${chevronSvg()}</span>` +
      `</button>`,
    toggleClasses:
      'flex h-11 w-full items-center gap-x-2 rounded-lg border border-[var(--layer-line)] ' +
      'bg-[var(--background)] px-3 text-start text-sm',
    dropdownClasses:
      'z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--layer-line)] ' +
      'bg-[var(--card)] p-1 shadow-lg',
    optionClasses:
      'flex min-h-11 w-full items-center rounded-md px-3 text-sm hover:bg-[var(--layer-hover)] ' +
      '[&.hs-select-option-highlighted]:bg-[var(--layer-hover)]',
    optionTemplate:
      '<div class="flex w-full items-center gap-x-3">' +
      '<span data-title class="min-w-0 flex-1 truncate"></span>' +
      `<span class="hidden shrink-0 text-[var(--primary)] hs-selected:block" aria-hidden="true">${checkSvg()}</span>` +
      '</div>',
  })

  picker.on('change', (value: unknown) => {
    const chosen = Array.isArray(value) ? (value as string[]) : []
    picked.value = [...chosen, ...unlisted()]
    patchPicker()
  })

  patchPicker()
}

function destroyPicker() {
  try {
    picker?.destroy()
  } catch {
    // Already half gone with the dialog. Clearing the box below is enough.
  }
  picker = null
  pickerHost.value?.replaceChildren()
}

onBeforeUnmount(destroyPicker)

// Escape with the list open is for the list. Noted on the way down, before
// Preline's own handler has closed it, and used to refuse the dialog's cancel.
let listHadEscape = false

function onDialogKeydown(event: KeyboardEvent) {
  // Set on every Escape, not only the ones that matter: Preline sometimes
  // swallows the key before the dialog hears it, and a flag left standing
  // would then refuse the next Escape that was meant for the form.
  if (event.key === 'Escape') listHadEscape = !!picker?.isOpened()
}

function onDialogCancel(event: Event) {
  if (listHadEscape) event.preventDefault()
  listHadEscape = false
}

function toggleDay(day: number) {
  days.value ^= 1 << day
}

async function save() {
  if (saving.value) return

  const at = timeValue(time.value)
  if (at === null) {
    problem.value = t.value.portal.pickTime
    return
  }
  if (days.value === 0) {
    problem.value = t.value.portal.pickDay
    return
  }
  if (picked.value.length === 0) {
    problem.value = t.value.portal.pickDevice
    return
  }

  saving.value = true
  problem.value = ''

  try {
    await saveSchedule(
      { on: turnOn.value, at, days: days.value, en: editing.value?.en ?? true },
      picked.value,
      editing.value?.id,
    )
    close()
  } catch (error) {
    problem.value =
      error instanceof ScheduleFullError
        ? `${t.value.portal.scheduleFull} ${error.names.join(', ')}`
        : t.value.portal.saveFailed
  } finally {
    saving.value = false
  }
}

async function remove() {
  const schedule = editing.value
  if (!schedule) return

  try {
    await deleteSchedule(schedule)
    close()
  } catch {
    problem.value = t.value.portal.saveFailed
  }
}

// The top bar opens the form, so the button that used to do it from here is
// gone and this is what is left in its place.
defineExpose({ open })

const chip =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium ' +
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--primary)]'
const chipOn = 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]'
const chipOff = 'border-[var(--layer-line)] hover:bg-[var(--layer-hover)]'
</script>

<template>
  <!-- Only the heading. Adding one is a button on the top bar, beside the
       one that starts choosing, because that is where the devices list keeps
       the same pair and two pages that put the same two actions in different
       places are two pages somebody has to learn separately. -->
  <h2 class="text-sm font-semibold">{{ t.portal.schedules }}</h2>

  <!-- What the device can and cannot do without a network, said once where
       somebody sets a time rather than discovered the evening the router
       dies. -->
  <p class="mt-1 text-xs text-muted-foreground">{{ t.portal.scheduleHint }}</p>

  <p
    v-if="list.length === 0"
    class="mt-2 rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] px-4 py-3 text-sm text-muted-foreground"
  >
    {{ t.portal.noSchedules }}
  </p>

  <ul
    v-else
    class="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] px-4 text-sm"
  >
    <li v-for="schedule in list" :key="schedule.id" class="flex items-center gap-x-3 py-3">
      <!-- A tick in a ring while choosing, the clock the rest of the time,
           in the same place either way. It is drawn here rather than by the
           row's own button so that the row keeps one accessible name: the
           button says what it is chosen or not through aria-pressed. -->
      <span
        v-if="selecting"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2"
        :class="
          isChosen(schedule.id)
            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'border-[var(--layer-line)]'
        "
        aria-hidden="true"
      >
        <Check v-if="isChosen(schedule.id)" class="size-3.5" />
      </span>

      <Clock v-else class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

      <!-- The row itself opens the history. Its accessible name is its own
           text plus the word for what it does, rather than an aria-label
           that would replace what is on screen with something else (WCAG
           2.5.3). -->
      <button
        type="button"
        class="-mx-2 min-w-0 flex-1 rounded-lg px-2 py-1 text-start hover:bg-[var(--layer-hover)]"
        :class="schedule.en ? '' : 'text-muted-foreground'"
        :aria-pressed="selecting ? isChosen(schedule.id) : undefined"
        @click="selecting ? emit('toggle', schedule.id) : openHistory(schedule)"
      >
        <span class="block font-medium">
          <span class="font-mono">{{ timeText(schedule.at) }}</span>
          · {{ schedule.on ? t.portal.turnOn : t.portal.turnOff }}
        </span>
        <span class="block truncate text-xs text-muted-foreground">
          {{ daysText(schedule.days) }}
          · {{ devicesText(schedule) }}
        </span>
        <span class="sr-only">{{ selecting ? '' : t.portal.scheduleHistory }}</span>
      </button>

      <!-- A switch, not a checkbox dressed as one: role="switch" says it acts
           at once, with no save to press afterwards. Its name carries the
           time so that a screen reader moving down the list hears which one
           it is about to pause. -->
      <button
        v-if="!selecting"
        type="button"
        role="switch"
        :aria-checked="schedule.en"
        :aria-label="`${t.portal.scheduleActive}, ${timeText(schedule.at)}`"
        :disabled="busy === schedule.id"
        class="inline-flex h-11 shrink-0 items-center disabled:opacity-60"
        @click="toggle(schedule)"
      >
        <span
          class="relative inline-block h-6 w-11 rounded-full border-2 transition-colors"
          :class="
            schedule.en
              ? 'border-[var(--primary)] bg-[var(--primary)]'
              : 'border-[var(--layer-line)] bg-[var(--card)]'
          "
        >
          <span
            class="absolute top-0.5 size-4 rounded-full transition-[inset-inline-start]"
            :class="
              schedule.en
                ? 'start-[calc(100%-1.125rem)] bg-[var(--primary-foreground)]'
                : 'start-0.5 bg-[var(--layer-line)]'
            "
          />
        </span>
      </button>

      <button
        v-if="!selecting"
        type="button"
        class="-me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--layer-hover)]"
        :aria-label="`${t.portal.editSchedule}, ${timeText(schedule.at)}`"
        @click="open(schedule)"
      >
        <Pencil class="size-4" aria-hidden="true" />
      </button>
    </li>
  </ul>

  <p role="status" class="mt-1.5 min-h-6 text-sm text-[var(--destructive)]">{{ said }}</p>

  <!-- ---------- the form ---------- -->
  <dialog
    ref="dialog"
    autofocus
    tabindex="-1"
    aria-labelledby="schedule-heading"
    @keydown.capture="onDialogKeydown"
    @cancel="onDialogCancel"
    @close="destroyPicker"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
  >
    <!-- No backdrop close, as with the other forms: a tap outside would
         throw away the days somebody has just picked. -->
    <form @submit.prevent="save">
      <h2 id="schedule-heading" class="text-lg font-semibold">
        {{ editing ? t.portal.editScheduleHeading : t.portal.newScheduleHeading }}
      </h2>

      <label for="schedule-time" class="mt-4 block text-sm font-medium">
        {{ t.portal.timeLabel }}
      </label>
      <!-- The box is the <div>, and the input is only what is inside it.
           That is not a preference; it is the only arrangement that works.

           Safari on iOS sizes `input[type="time"]` from its own idea of the
           content and will not be told otherwise. `w-full`, `max-w-full`,
           `min-w-0`, `box-border` and `appearance-none` were each tried and
           each changed nothing - the field came out exactly one of the
           dialog's paddings too wide and ran off the right edge every time.

           So nothing here asks it to be narrower. The border, the rounding
           and the background belong to the wrapper, which is an ordinary
           block and does as it is told; `overflow-hidden` cuts off however
           much the input decides to be. Nothing is lost by the cut because
           the value sits at the left of the field and the overspill is empty
           space.

           The focus ring moves to the wrapper with it (`focus-within`), so
           the field still shows where the keyboard is - WCAG 2.4.7. -->
      <div
        class="mt-2 flex h-11 w-full overflow-hidden rounded-lg border border-[var(--layer-line)] bg-[var(--background)] focus-within:ring-2 focus-within:ring-[var(--primary)]"
      >
        <input
          id="schedule-time"
          v-model="time"
          type="time"
          required
          :disabled="saving"
          class="h-full w-full min-w-0 appearance-none border-0 bg-transparent px-3 outline-none disabled:opacity-60"
        />
      </div>

      <fieldset class="mt-4">
        <legend class="text-sm font-medium">{{ t.portal.actionLabel }}</legend>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label :class="[chip, turnOn ? chipOn : chipOff]">
            <input v-model="turnOn" type="radio" name="schedule-action" :value="true" class="sr-only" />
            {{ t.portal.turnOn }}
          </label>
          <label :class="[chip, !turnOn ? chipOn : chipOff]">
            <input v-model="turnOn" type="radio" name="schedule-action" :value="false" class="sr-only" />
            {{ t.portal.turnOff }}
          </label>
        </div>
      </fieldset>

      <!-- Checkboxes under the chips, so that each day is a real form
           control with a real name - "Monday", not "M" - and the chip is
           only how it looks. -->
      <fieldset class="mt-4">
        <legend class="text-sm font-medium">{{ t.portal.daysLabel }}</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          <label
            v-for="day in DAY_ORDER"
            :key="day"
            :class="[chip, days & (1 << day) ? chipOn : chipOff]"
          >
            <input
              type="checkbox"
              class="sr-only"
              :checked="(days & (1 << day)) !== 0"
              @change="toggleDay(day)"
            />
            <span aria-hidden="true">{{ t.portal.dayShort[day] }}</span>
            <span class="sr-only">{{ t.portal.dayLong[day] }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Not a <label>: what it names is the button Preline builds, which
           has no id until then, and aria-labelledby reaches it from there. -->
      <div class="mt-4">
        <p :id="LABEL_ID" class="text-sm font-medium">{{ t.portal.scheduleDevices }}</p>
        <div ref="pickerHost" />
      </div>

      <p role="status" class="mt-3 min-h-6 text-sm text-[var(--destructive)]">{{ problem }}</p>

      <div class="mt-2 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="close"
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

      <button
        v-if="editing"
        type="button"
        class="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--layer-hover)]"
        @click="deleteAsk?.open()"
      >
        {{ t.portal.deleteSchedule }}
      </button>
    </form>
  </dialog>

  <!-- ---------- what happened ---------- -->
  <dialog
    ref="historyDialog"
    autofocus
    tabindex="-1"
    aria-labelledby="history-heading"
    @close="closeLog()"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-0 text-foreground backdrop:bg-black/50"
  >
    <!-- Three bands, and only the middle one moves - the same shape as the
         history on a device's page, and for the same reason: the heading says
         which schedule this is about and the way out has to stay under a
         thumb. The column is this <div> and not the <dialog>, because a
         `display` set here beats the browser's own, and `display: flex` on
         the dialog would defeat `dialog:not([open]) { display: none }` and
         leave it on screen with nothing open. -->
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div class="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="history-heading" class="text-lg font-semibold">{{ t.portal.historyHeading }}</h2>

        <p v-if="showing" class="mt-1 text-sm">
          <span class="font-mono">{{ timeText(showing.at) }}</span>
          · {{ showing.on ? t.portal.turnOn : t.portal.turnOff }}
          · {{ daysText(showing.days) }}
        </p>

        <p class="mt-2 text-xs text-muted-foreground">{{ t.portal.historyHint }}</p>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
        <Spinner v-if="!logReady" class="mt-6" />

        <p v-else-if="runs.length === 0" class="mt-8 text-center text-sm text-muted-foreground">
          {{ t.portal.noHistory }}
        </p>

        <ul v-else class="mt-4 divide-y divide-[var(--border)] text-sm">
          <li
            v-for="line in runs"
            :key="`${line.deviceId}-${line.at}`"
            class="flex items-start gap-x-3 py-2.5"
          >
            <Clock class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block font-medium">
                {{ line.on ? t.portal.ranOn : t.portal.ranOff }} · {{ lineDevice(line.deviceId) }}
              </span>
              <span class="block text-xs text-muted-foreground">{{ whenText(line.at) }}</span>
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
    ref="deleteAsk"
    danger
    :heading="t.portal.deleteScheduleHeading"
    :body="t.portal.deleteScheduleBody"
    :confirm-label="t.portal.deleteSchedule"
    @confirm="remove"
  />
</template>

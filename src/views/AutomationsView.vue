<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CopyCheck, Pause, Play, Plus, Trash2, X } from 'lucide-vue-next'
import { locale, pathFor, t } from '@/i18n'
import { authReady, user } from '@/composables/useAuth'
import { canSwitch, devices, devicesReady } from '@/composables/useDevices'
import { deleteSchedules, schedules, setSchedulesEnabled } from '@/composables/useSchedules'
import ConfirmDialog from '@/components/portal/ConfirmDialog.vue'
import PortalBar from '@/components/portal/PortalBar.vue'
import ScheduleSection from '@/components/portal/ScheduleSection.vue'
import Spinner from '@/components/portal/Spinner.vue'

/*
 * What the devices in this site do without being asked.
 *
 * Today that is schedules and nothing else: every one in the site, and the
 * place to set one time on several devices at once. It is a tab of its own
 * rather than a section of the site's settings because it is going to grow -
 * scenes are the next thing that belongs here - and because it is something
 * a member uses as much as the owner does, which the settings page is not.
 *
 * Each kind gets a section of its own, one after another. A section is not
 * added before there is something in it: an empty "Scenes" heading is a
 * promise the page cannot keep yet.
 */
const router = useRouter()

const anySwitchable = computed(() => devices.value.some(canSwitch))

watch(
  [authReady, user],
  ([ready, signedIn]) => {
    if (ready && !signedIn) router.replace(pathFor(locale.value, 'portal'))
  },
  { immediate: true },
)

/*
 * Choosing several, to do one thing to all of them.
 *
 * Built the same way the devices list builds it, and deliberately: the bar
 * becomes the mode, counts what is chosen, and carries the only ways out of
 * it. A mode that leaves the page looking as it did is a mode somebody is
 * in without knowing, and the rows below it stop doing what they did a
 * moment ago.
 *
 * It lives here rather than inside the section because the bar is here. When
 * scenes arrive they will want the same thing, and the count will have to say
 * which of the two it is about - that is a problem for the day there are two
 * lists, not a reason to build a second kind of selection now.
 */
const section = ref<InstanceType<typeof ScheduleSection> | null>(null)

const selecting = ref(false)
const chosen = ref(new Set<string>())
const deleteAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const busy = ref(false)
const problem = ref('')

// What is chosen, as schedules - and only the ones that still exist. A
// schedule deleted from another phone while this one was choosing simply
// falls out of the list, which is the same thing the rest of the portal does.
const picked = computed(() => schedules.value.filter((one) => chosen.value.has(one.id)))

function startSelecting() {
  chosen.value = new Set()
  problem.value = ''
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
 * The mode ends when the work is done, not when it is asked for.
 *
 * Leaving it open would put the person back in front of the same selection
 * with no sign of whether anything happened; closing it first would take the
 * count away while the write was still in flight. So: hold the buttons, write,
 * then leave.
 */
async function setChosen(en: boolean) {
  if (busy.value || picked.value.length === 0) return

  busy.value = true
  problem.value = ''

  try {
    await setSchedulesEnabled(picked.value, en)
    stopSelecting()
  } catch {
    problem.value = t.value.portal.saveFailed
  } finally {
    busy.value = false
  }
}

async function removeChosen() {
  if (busy.value || picked.value.length === 0) return

  busy.value = true
  problem.value = ''

  try {
    await deleteSchedules(picked.value)
    stopSelecting()
  } catch {
    problem.value = t.value.portal.saveFailed
  } finally {
    busy.value = false
  }
}

const barButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--layer-hover)] disabled:opacity-60'
</script>

<template>
  <!-- While choosing, the bar is the mode. `plain` drops the pull-to-refresh
       indicator, as it does on the devices list: reloading the list out from
       under a half-made selection would be answering a question nobody
       asked. -->
  <PortalBar v-if="selecting" plain :title="`${chosen.size} ${t.portal.selected}`">
    <template #start>
      <button type="button" :class="barButton" :aria-label="t.portal.done" @click="stopSelecting">
        <X class="size-6" aria-hidden="true" />
      </button>
    </template>

    <template #end>
      <button
        type="button"
        :class="barButton"
        :disabled="chosen.size === 0 || busy"
        :aria-label="t.portal.enableSelected"
        @click="setChosen(true)"
      >
        <Play class="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        :class="barButton"
        :disabled="chosen.size === 0 || busy"
        :aria-label="t.portal.disableSelected"
        @click="setChosen(false)"
      >
        <Pause class="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--destructive)] hover:bg-[var(--layer-hover)] disabled:opacity-60"
        :disabled="chosen.size === 0 || busy"
        :aria-label="t.portal.deleteSchedule"
        @click="deleteAsk?.open()"
      >
        <Trash2 class="size-5" aria-hidden="true" />
      </button>
    </template>
  </PortalBar>

  <PortalBar v-else :title="t.portal.automations">
    <template #end>
      <!-- Nothing to select until there is something in the list, and the
           button that says otherwise is a button that does nothing. -->
      <button
        v-if="schedules.length > 0"
        type="button"
        :class="barButton"
        :aria-label="t.portal.select"
        @click="startSelecting"
      >
        <!-- The same glyph the devices list uses to start choosing, and for
             the reason written there: two sheets with a tick, because a bare
             tick reads as "done" rather than "pick several". -->
        <CopyCheck class="size-5" aria-hidden="true" />
      </button>

      <!-- Adding, at the end of the bar: it is the one thing on this page
           somebody came here to do, and the far corner is where a thumb
           reaches without the hand moving. Choosing sits inboard of it.

           The filled disc is the action; it is drawn the height of the glyph
           beside it rather than the height of its own button, which is what
           keeps one filled thing on the bar from also being the biggest.

           No owner check, unlike the devices list: the rules let anybody in
           the site write `sched`, and a button this portal hides from a
           member is a button the database would have let them press.

           The day scenes arrive there will be two things to add behind this
           one disc, and it becomes a small menu. -->
      <button
        v-if="anySwitchable"
        type="button"
        class="inline-flex size-11 shrink-0 items-center justify-center"
        :aria-label="t.portal.addSchedule"
        @click="section?.open()"
      >
        <span
          class="inline-flex size-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        >
          <Plus class="size-4" aria-hidden="true" />
        </span>
      </button>
    </template>
  </PortalBar>

  <!-- The same two containers as the other tabs: the outer one as wide as
       the bars, the inner one as wide as a list should be. -->
  <section class="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-10">
    <div class="max-w-md">
      <Spinner v-if="!authReady || (!!user && !devicesReady)" class="mt-6" />

      <!-- A schedule has to be for something that switches. With nothing to
           pick, the form would open on an empty list and refuse to save. -->
      <p v-else-if="!anySwitchable" class="mt-16 text-center text-muted-foreground">
        {{ t.portal.noDevicesForAutomations }}
      </p>

      <template v-else>
        <ScheduleSection
          ref="section"
          :selecting="selecting"
          :chosen="chosen"
          @toggle="toggle"
        />

        <p role="status" class="mt-1.5 min-h-6 text-sm text-[var(--destructive)]">{{ problem }}</p>
      </template>
    </div>
  </section>

  <ConfirmDialog
    ref="deleteAsk"
    danger
    :heading="t.portal.deleteSchedulesHeading"
    :body="t.portal.deleteSchedulesBody"
    :confirm-label="t.portal.deleteSchedule"
    @confirm="removeChosen"
  />
</template>

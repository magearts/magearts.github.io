<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, LoaderCircle, LogOut, Mail, Trash2, UserMinus } from 'lucide-vue-next'
import { locale, pathFor, t } from '@/i18n'
import { authReady, user } from '@/composables/useAuth'
import {
  BadEmailError,
  currentSite,
  deleteSite,
  invite,
  invitesSent,
  isOwner,
  leaveSite,
  removeMember,
  renameSite,
  revokeInvite,
  sitesReady,
} from '@/composables/useSites'
import PortalBar from '@/components/portal/PortalBar.vue'
import ConfirmDialog from '@/components/portal/ConfirmDialog.vue'
import Spinner from '@/components/portal/Spinner.vue'

/*
 * One site: what it is called, who is in it, and who has been asked.
 *
 * A page rather than the sheet this used to share with the site list. Those
 * were two different jobs in one panel - choosing which site to look at, and
 * changing the one already open - and the list sat above settings that were
 * about exactly one of its rows, with nothing saying which.
 *
 * It is a page rather than a second sheet because the two lists in it grow:
 * a sheet that scrolls inside a page held still is awkward to build and worse
 * to use, and a back button that has to guess which of two stacked sheets it
 * closes is a back button nobody trusts.
 *
 * Almost everything here is the owner's. A member comes to see who else has
 * a key and to leave, which is the least somebody sharing another person's
 * switches is owed.
 */
const router = useRouter()

watch(
  [authReady, user],
  ([ready, signedIn]) => {
    if (ready && !signedIn) router.replace(pathFor(locale.value, 'portal'))
  },
  { immediate: true },
)

// ---------- the name ----------

const name = ref('')
const savingName = ref(false)
const nameProblem = ref('')

// The field follows the site until somebody types in it, so arriving here -
// or switching site in another tab - does not leave a stale name on screen.
watch(
  () => currentSite.value?.name,
  (current) => {
    name.value = current ?? ''
  },
  { immediate: true },
)

const nameChanged = computed(
  () => name.value.trim().length > 0 && name.value.trim() !== currentSite.value?.name,
)

async function saveName() {
  if (savingName.value || !nameChanged.value) return

  savingName.value = true
  nameProblem.value = ''

  try {
    await renameSite(name.value)
  } catch {
    nameProblem.value = t.value.portal.saveFailed
  } finally {
    savingName.value = false
  }
}

// ---------- who is in it ----------

/*
 * The owner first, then everybody else by name. `members` is what decides
 * anything; `people` only says what to call them, and somebody with a role
 * and no entry there still belongs in the list.
 */
const people = computed(() => {
  const site = currentSite.value
  if (!site) return []

  return Object.entries(site.members ?? {})
    .map(([uid, role]) => ({
      uid,
      role,
      name: site.people?.[uid]?.name ?? '',
      email: site.people?.[uid]?.email ?? '',
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1
      return (a.name || a.email).localeCompare(b.name || b.email)
    })
})

const removeAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const marked = ref<{ uid: string; label: string } | null>(null)

function askRemove(uid: string, label: string) {
  marked.value = { uid, label }
  removeAsk.value?.open()
}

async function remove() {
  const person = marked.value
  if (!person) return

  marked.value = null
  try {
    await removeMember(person.uid)
  } catch (error) {
    console.error('removeMember', error)
  }
}

// ---------- inviting ----------

const address = ref('')
const sending = ref(false)
const problem = ref('')
const sent = ref(false)

async function send() {
  problem.value = ''
  sent.value = false
  sending.value = true

  try {
    await invite(address.value)
    address.value = ''
    sent.value = true
  } catch (error) {
    problem.value =
      error instanceof BadEmailError ? t.value.portal.badEmail : t.value.portal.inviteFailed
  } finally {
    sending.value = false
  }
}

async function revoke(key: string) {
  try {
    await revokeInvite(key)
  } catch (error) {
    console.error('revokeInvite', error)
  }
}

// ---------- leaving ----------

const leaveAsk = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const leaveProblem = ref('')

async function leave() {
  const site = currentSite.value
  if (!site) return

  leaveProblem.value = ''

  try {
    await leaveSite(site.id)
    router.replace(pathFor(locale.value, 'portal'))
  } catch (error) {
    leaveProblem.value = t.value.portal.leaveFailed
    console.error('leaveSite', error)
  }
}

/*
 * Deleting the site, which is the only thing in this portal that takes
 * several other things with it.
 *
 * Its own dialog rather than the shared confirm, because it asks for the name
 * to be typed. Three taps of "yes" teach people to tap yes; copying a name
 * out cannot be done by accident, and it makes them look at which site they
 * are about to delete.
 */
const deleteDialog = ref<HTMLDialogElement | null>(null)
const typed = ref('')
const deleting = ref(false)
const deleteProblem = ref('')

const deviceCount = computed(() => Object.keys(currentSite.value?.devices ?? {}).length)
const peopleCount = computed(() => people.value.length)

const typedMatches = computed(
  () => typed.value.trim() === (currentSite.value?.name ?? '').trim() && typed.value.length > 0,
)

function openDelete() {
  typed.value = ''
  deleteProblem.value = ''
  deleteDialog.value?.showModal()
}

async function reallyDelete() {
  const site = currentSite.value
  if (!site || deleting.value || !typedMatches.value) return

  deleting.value = true
  deleteProblem.value = ''

  try {
    await deleteSite(site.id)
    deleteDialog.value?.close()
    router.replace(pathFor(locale.value, 'portal'))
  } catch (error) {
    deleteProblem.value = t.value.portal.deleteFailed
    console.error('deleteSite', error)
  } finally {
    deleting.value = false
  }
}

const row = 'flex min-h-11 w-full items-center gap-x-3 rounded-lg px-3 text-start text-sm'
const field =
  'h-11 w-full rounded-lg border border-[var(--layer-line)] bg-[var(--background)] px-3 ' +
  'disabled:opacity-60'
</script>

<template>
  <PortalBar :title="currentSite?.name || t.portal.siteSettings">
    <template #start>
      <!-- Back to the devices. There was a list of sites in between for a
           while and this pointed at it; the list is gone, its job done by
           the menu under the title on that page, so this arrow and the
           browser's own back button agree again - which is the only thing
           that matters about an arrow like this. -->
      <RouterLink
        :to="pathFor(locale, 'portal')"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--layer-hover)]"
        :aria-label="t.portal.back"
      >
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
  <section class="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-10">
    <div class="max-w-md">
    <Spinner v-if="!authReady || !sitesReady" class="mt-6" />

    <template v-else-if="currentSite">
      <!-- The name. The owner edits it in place; everybody else reads it. -->
      <template v-if="isOwner">
        <label for="site-name" class="block text-sm font-medium">
          {{ t.portal.siteNameLabel }}
        </label>
        <form class="mt-2" @submit.prevent="saveName">
          <div class="flex gap-2">
            <input
              id="site-name"
              v-model="name"
              type="text"
              maxlength="60"
              :disabled="savingName"
              :class="field"
            />
            <button
              type="submit"
              :disabled="!nameChanged || savingName"
              class="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              <LoaderCircle
                v-if="savingName"
                class="size-4 shrink-0 motion-safe:animate-spin"
                aria-hidden="true"
              />
              <span v-else>{{ t.portal.save }}</span>
            </button>
          </div>

          <p role="status" class="mt-1.5 min-h-6 text-sm text-[var(--destructive)]">
            {{ nameProblem }}
          </p>
        </form>
      </template>

      <!-- Who is in it. Everybody sees this, which is the point: a site where
           you cannot find out who else has a key is not one anybody should
           agree to share. -->
      <h2 class="mt-6 text-sm font-semibold">{{ t.portal.people }}</h2>
      <ul class="mt-2">
        <li v-for="person in people" :key="person.uid" :class="row">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ person.name || person.email }}</span>
            <span class="block truncate text-xs text-muted-foreground">
              {{ person.role === 'owner' ? t.portal.roleOwner : t.portal.roleMember }}
              <template v-if="person.name && person.email"> · {{ person.email }}</template>
            </span>
          </span>

          <button
            v-if="isOwner && person.uid !== currentSite.owner"
            type="button"
            class="inline-flex h-11 shrink-0 items-center gap-x-1.5 rounded-lg px-3 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--layer-hover)]"
            @click="askRemove(person.uid, person.name || person.email)"
          >
            <UserMinus class="size-4 shrink-0" aria-hidden="true" />
            {{ t.portal.remove }}
          </button>
        </li>
      </ul>

      <!-- Asked and not yet answered. Owner only: these are the addresses of
           people who have agreed to nothing. -->
      <template v-if="isOwner && invitesSent.length > 0">
        <h2 class="mt-6 text-sm font-semibold">{{ t.portal.invitedLabel }}</h2>
        <ul class="mt-2">
          <li v-for="one in invitesSent" :key="one.key" :class="row">
            <Mail class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ one.email }}</span>
            <button
              type="button"
              class="inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium hover:bg-[var(--layer-hover)]"
              @click="revoke(one.key)"
            >
              {{ t.portal.revoke }}
            </button>
          </li>
        </ul>
      </template>

      <template v-if="isOwner">
        <h2 class="mt-6 text-sm font-semibold">{{ t.portal.inviteHeading }}</h2>
        <form class="mt-2" @submit.prevent="send">
          <label for="invite-email" class="sr-only">{{ t.portal.emailLabel }}</label>
          <div class="flex gap-2">
            <input
              id="invite-email"
              v-model="address"
              type="email"
              autocomplete="email"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="t.portal.emailLabel"
              aria-describedby="invite-hint"
              :disabled="sending"
              :class="field"
            />
            <button
              type="submit"
              :disabled="sending || address.trim().length === 0"
              class="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              <LoaderCircle
                v-if="sending"
                class="size-4 shrink-0 motion-safe:animate-spin"
                aria-hidden="true"
              />
              <span v-else>{{ t.portal.sendInvite }}</span>
              <span v-if="sending" class="sr-only">{{ t.portal.sendingInvite }}</span>
            </button>
          </div>
          <p id="invite-hint" class="mt-1.5 text-sm text-muted-foreground">
            {{ t.portal.emailHint }}
          </p>

          <!-- One live region for both answers, in the page from the start so
               that a screen reader is already watching it (WCAG 4.1.3). -->
          <p
            role="status"
            class="mt-2 min-h-6 text-sm"
            :class="problem ? 'text-[var(--destructive)]' : 'text-[var(--ok)]'"
          >
            {{ problem || (sent ? t.portal.inviteSent : '') }}
          </p>
        </form>
      </template>

      <!-- The owner's way out is deleting the site; a member's is leaving
           it. Neither can do the other: a site with nobody able to invite,
           rename or remove is one only the console can repair. -->
      <button
        v-if="isOwner"
        type="button"
        class="mt-8 inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-[var(--destructive)] px-4 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--layer-hover)]"
        @click="openDelete"
      >
        <Trash2 class="size-4 shrink-0" aria-hidden="true" />
        {{ t.portal.deleteSite }}
      </button>

      <template v-if="!isOwner">
        <button
          type="button"
          class="mt-8 inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-[var(--destructive)] px-4 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--layer-hover)]"
          @click="leaveAsk?.open()"
        >
          <LogOut class="size-4 shrink-0" aria-hidden="true" />
          {{ t.portal.leave }}
        </button>

        <p role="status" class="mt-2 min-h-6 text-sm text-[var(--destructive)]">
          {{ leaveProblem }}
        </p>
      </template>
    </template>
    </div>
  </section>

  <!-- No backdrop close: there is a name being typed in here, and this is
       the one action in the portal that cannot be undone from the portal. -->
  <dialog
    ref="deleteDialog"
    aria-labelledby="delete-site-heading"
    aria-describedby="delete-site-warn"
    class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
  >
    <form @submit.prevent="reallyDelete">
      <h2 id="delete-site-heading" class="text-lg font-semibold">
        {{ t.portal.deleteSiteHeading }}
      </h2>
      <p class="mt-1 font-semibold">{{ currentSite?.name }}</p>

      <!-- Real numbers, not a general warning. "3 devices" is a thing
           somebody can picture; "devices will be removed" is not. -->
      <p class="mt-3 text-sm text-muted-foreground">
        {{ deviceCount }} {{ t.portal.devicesTab }} · {{ peopleCount }} {{ t.portal.people }}
      </p>
      <p id="delete-site-warn" class="mt-2 text-sm text-muted-foreground">
        {{ t.portal.deleteSiteWarn }}
      </p>

      <!-- The name to type is inside the label, not only up beside the
           heading. Up there it reads as "this is what is being deleted",
           which is a different sentence from "this is what to type" - and
           somebody who has to scroll back to check the spelling of their own
           site name, emoji and all, is being asked to do the work twice.

           Inside the label rather than beside the field, so a screen reader
           reads it out as part of what the field is for. A separate line of
           text next to an input is a line that gets skipped (WCAG 3.3.2). -->
      <label for="confirm-name" class="mt-4 block text-sm font-medium">
        {{ t.portal.typeToConfirm }}
        <span class="mt-1 block font-semibold break-words">{{ currentSite?.name }}</span>
      </label>
      <input
        id="confirm-name"
        v-model="typed"
        type="text"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :disabled="deleting"
        :class="[field, 'mt-2']"
      />

      <p role="status" class="mt-2 min-h-6 text-sm text-[var(--destructive)]">
        {{ deleteProblem }}
      </p>

      <div class="mt-3 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
          @click="deleteDialog?.close()"
        >
          {{ t.portal.cancel }}
        </button>
        <button
          type="submit"
          :disabled="!typedMatches || deleting"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[var(--destructive)] px-4 text-sm font-medium text-[var(--destructive-foreground)] hover:bg-[var(--destructive-hover)] disabled:opacity-60"
        >
          {{ t.portal.deleteLabel }}
        </button>
      </div>
    </form>
  </dialog>

  <ConfirmDialog
    ref="leaveAsk"
    danger
    :heading="t.portal.leaveHeading"
    :body="t.portal.leaveBody"
    :confirm-label="t.portal.leave"
    @confirm="leave"
  />

  <ConfirmDialog
    ref="removeAsk"
    danger
    :heading="t.portal.removeHeading"
    :body="marked ? `${marked.label} — ${t.portal.removeBody}` : t.portal.removeBody"
    :confirm-label="t.portal.remove"
    @confirm="remove"
  />
</template>

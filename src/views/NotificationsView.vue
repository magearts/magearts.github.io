<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { locale, pathFor, t } from '@/i18n'
import { authReady, user } from '@/composables/useAuth'
import {
  acceptInvite,
  declineInvite,
  markNotificationsRead,
  myInvites,
  readAt,
} from '@/composables/useSites'
import PortalBar from '@/components/portal/PortalBar.vue'
import Spinner from '@/components/portal/Spinner.vue'

/*
 * Whatever is waiting for an answer.
 *
 * Today that is invitations and nothing else. It is still not a mailbox -
 * an invitation is a row in the database until it is answered, and answering
 * it is what makes the row go away, so there is nothing to dismiss and no
 * history to keep.
 *
 * What it does have is one number: when this person last looked. Anything
 * offered since is marked new. That is one write per visit rather than a
 * flag per invitation, and it survives the invitation going away, which a
 * per-item flag would not - it would outlive the thing it was about and have
 * to be swept up afterwards.
 */
const router = useRouter()

watch(
  [authReady, user],
  ([ready, signedIn]) => {
    if (ready && !signedIn) router.replace(pathFor(locale.value, 'portal'))
  },
  { immediate: true },
)

// The id being answered, so the two buttons on that row can be held while
// the write is in flight. A refusal - the site deleted, the invitation
// withdrawn between the page loading and the tap - leaves it where it was.
const answering = ref('')

/*
 * Marked on the way out, not on the way in.
 *
 * Marking on arrival is the obvious thing and it defeats the point: the dot
 * that says which of these is new would vanish in the same frame it was
 * drawn, and somebody arriving from the badge would never see what the badge
 * was about.
 *
 * A failure is ignored. The worst of it is being shown the same "new" twice,
 * and there is nothing useful to say to somebody who has already left the
 * page.
 */
onBeforeUnmount(() => {
  if (user.value) markNotificationsRead().catch(() => {})
})

async function say(siteId: string, yes: boolean) {
  if (answering.value) return

  answering.value = siteId
  try {
    await (yes ? acceptInvite(siteId) : declineInvite(siteId))
    if (yes) router.push(pathFor(locale.value, 'portal'))
  } catch {
    // The list is live. Nothing to undo, and nothing to say that the list
    // will not say by itself.
  } finally {
    answering.value = ''
  }
}
</script>

<template>
  <PortalBar :title="t.portal.notifications" />

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
    <Spinner v-if="!authReady" class="mt-6" />

    <p v-else-if="myInvites.length === 0" class="mt-16 text-center text-muted-foreground">
      {{ t.portal.noNotifications }}
    </p>

    <ul v-else class="grid gap-3">
      <li
        v-for="one in myInvites"
        :key="one.siteId"
        class="rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] p-4"
      >
        <!-- A filled dot and the word, not the dot alone. Colour is not
             allowed to be the only thing carrying it (WCAG 1.4.1), and the
             word is what a screen reader has - a dot is decoration to one,
             however bright it is. -->
        <p class="flex items-center gap-x-2 text-sm text-muted-foreground">
          <template v-if="one.at > readAt">
            <span
              class="inline-block size-2 shrink-0 rounded-full bg-[var(--primary)]"
              aria-hidden="true"
            ></span>
            <span class="font-semibold text-[var(--primary)]">{{ t.portal.newLabel }}</span>
            <span aria-hidden="true">·</span>
          </template>
          {{ t.portal.invitationsHeading }}
        </p>
        <p class="mt-1 font-semibold">{{ one.site || t.portal.siteHeading }}</p>
        <p v-if="one.byName" class="mt-0.5 text-sm text-muted-foreground">
          {{ t.portal.invitedBy }} {{ one.byName }}
        </p>

        <div class="mt-4 flex gap-3">
          <button
            type="button"
            :disabled="answering === one.siteId"
            class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)] disabled:opacity-60"
            @click="say(one.siteId, false)"
          >
            {{ t.portal.decline }}
          </button>
          <button
            type="button"
            :disabled="answering === one.siteId"
            class="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            @click="say(one.siteId, true)"
          >
            {{ t.portal.accept }}
          </button>
        </div>
      </li>
    </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, Clock, LayoutGrid, User } from 'lucide-vue-next'
import { locale, pathFor, t, type Page } from '@/i18n'
import { user } from '@/composables/useAuth'
import { myInvites } from '@/composables/useSites'
import { newRuns } from '@/composables/useScheduleRuns'
import UserAvatar from './UserAvatar.vue'

/*
 * The portal's own navigation, at the bottom where a thumb already is.
 *
 * Four places, not four buttons that open things. Each one is a URL: the
 * back button closes it, the bar can show which is open, and a link to any of
 * them can be sent. A row of buttons that opened sheets would look like this
 * and behave like none of it.
 *
 * A device's own page is not a fourth tab. It belongs to the devices list and
 * the bar stays as it is while it is open, with Devices still marked - which
 * is what every app with a bar like this does, and what the back arrow at the
 * top of that page is for.
 *
 * At the foot of every screen, whatever its size. There was a rail down the
 * side of wider ones for a while, on the argument that the bottom edge is the
 * furthest a mouse can be asked to travel - which is true and was not worth
 * a second layout to maintain. The apps this is measured against keep the bar
 * at the foot on tablets too, and one bar that is right everywhere beats two
 * that each have to be kept right.
 */
const route = useRoute()

// Invitations count until they are answered; a schedule's run only until it
// has been seen, because there is nothing to answer.
const waiting = computed(() => myInvites.value.length + newRuns.value)

const tabs = computed<{ page: Page; label: string; icon: unknown; badge: number }[]>(() => [
  { page: 'portal', label: t.value.portal.devicesTab, icon: LayoutGrid, badge: 0 },
  { page: 'automations', label: t.value.portal.automations, icon: Clock, badge: 0 },
  {
    page: 'notifications',
    label: t.value.portal.notifications,
    icon: Bell,
    badge: waiting.value,
  },
  { page: 'account', label: t.value.portal.account, icon: User, badge: 0 },
])

/*
 * Devices stays lit while a device's own page is open, because that page came
 * from the list. `meta.page` is 'portal' for both, which is the whole reason
 * it is asked rather than the path.
 */
function isHere(page: Page) {
  return route.meta.page === page
}
</script>

<template>
  <nav
    :aria-label="t.portal.heading"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
  >
    <!-- The same width as the content it navigates, which is now the whole
         screen. Anything narrower clusters the three destinations somewhere
         in the middle with the bar stretching empty on both sides, which
         reads as three buttons somebody forgot to lay out. -->
    <ul class="flex w-full px-2 sm:px-4 lg:px-6">
      <li v-for="tab in tabs" :key="tab.page" class="flex-1">
        <RouterLink
          :to="pathFor(locale, tab.page)"
          :aria-current="isHere(tab.page) ? 'page' : undefined"
          class="m-1 flex min-h-12 flex-col items-center justify-center gap-y-0.5 rounded-xl px-2 py-1.5 text-xs font-medium hover:bg-[var(--layer-hover)]"
          :class="
            isHere(tab.page)
              ? 'bg-[var(--layer-hover)] text-[var(--primary)]'
              : 'text-muted-foreground'
          "
        >
          <span class="relative">
            <!-- The account tab wears the person's own face.
                 `photoURL` arrives with the sign-in token, so this costs no
                 request of its own, and UserAvatar falls back to a letter
                 when Google has no picture or refuses to serve it.

                 A photograph cannot be tinted the way the other two icons
                 are, so the current tab is marked with a ring around it
                 instead - the same signal in a form a picture can carry. -->
            <UserAvatar
              v-if="tab.page === 'account' && user"
              :user="user"
              class="size-6 text-[10px]"
              :class="isHere('account') ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--background)]' : ''"
            />
            <component v-else :is="tab.icon" class="size-6" aria-hidden="true" />

            <!-- The count is decoration here; the number a screen reader
                 needs is in the link's own text below, where it is part of
                 the name rather than a shape floating beside it. -->
            <span
              v-if="tab.badge > 0"
              aria-hidden="true"
              class="absolute -end-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] leading-4 font-bold text-[var(--destructive-foreground)]"
            >
              {{ tab.badge }}
            </span>
          </span>

          {{ tab.label }}
          <span v-if="tab.badge > 0" class="sr-only">({{ tab.badge }})</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

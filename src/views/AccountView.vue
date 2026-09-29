<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Download, Globe, LogOut, Monitor, Moon, Sun } from 'lucide-vue-next'
import { LOCALES, locale, localeNames, pathFor, t } from '@/i18n'
import { setTheme, theme, THEME_CHOICES, type ThemeChoice } from '@/theme'
import { authReady, signOutOfPortal, user } from '@/composables/useAuth'
import PortalBar from '@/components/portal/PortalBar.vue'
import UserAvatar from '@/components/portal/UserAvatar.vue'
import Spinner from '@/components/portal/Spinner.vue'
import InstallSheet from '@/components/portal/InstallSheet.vue'
import { canInstallDirectly, isInstalled, onPhone } from '@/composables/useInstall'

/*
 * Everything about the person rather than their devices: who is signed in,
 * language, theme, and the way out.
 *
 * A page rather than the sheet it used to be, because it is one of the three
 * places the bar at the bottom goes. That makes the back button work, gives
 * it a URL, and lets the bar show it as the one that is open - none of which
 * a sheet can do however it is drawn.
 */
const router = useRouter()

// Nobody signed in has no account to look at. Waiting for authReady first
// matters: Firebase reports "nobody" while it is still looking, and
// redirecting on that would throw somebody out of their own account every
// time they opened the app here.
watch(
  [authReady, user],
  ([ready, signedIn]) => {
    if (ready && !signedIn) router.replace(pathFor(locale.value, 'portal'))
  },
  { immediate: true },
)

async function signOut() {
  await signOutOfPortal()
  router.replace(pathFor(locale.value, 'portal'))
}

/*
 * A way back to the install instructions, for somebody who dismissed them
 * and changed their mind. A sheet that appears three times and then never
 * again is a feature nobody can find on the day they want it.
 */
const installSheet = ref<InstanceType<typeof InstallSheet> | null>(null)
/*
 * Shown wherever installing is actually possible, which is not only phones.
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

const themeIcons: Record<ThemeChoice, Component> = { light: Sun, dark: Moon, auto: Monitor }

/*
 * One way of saying "this is the one", used by both groups below.
 *
 * They used to disagree - language marked its choice with a tick, theme with
 * a thicker border - and each was defensible on its own. Together on one
 * screen they read as two systems, and somebody who has learnt what the tick
 * means has to learn the border as well.
 *
 * Three signals at once, on purpose: colour, border weight, and a tick. Any
 * one of them alone would fail somebody - colour on its own fails WCAG 1.4.1,
 * and a 1px difference in border fails anybody looking at a phone in
 * sunlight.
 */
const choice =
  'relative flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm ' +
  'font-medium hover:bg-[var(--layer-hover)]'

function chosen(is: boolean) {
  return is ? 'border-2 border-[var(--primary)]' : 'border-[var(--layer-line)]'
}

const row =
  'flex min-h-11 w-full items-center gap-x-3 rounded-lg px-3 text-start text-sm font-medium ' +
  'hover:bg-[var(--layer-hover)]'
</script>

<template>
  <PortalBar :title="t.portal.account" />

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

    <template v-else-if="user">
      <div class="flex min-w-0 items-center gap-x-3">
        <UserAvatar :user="user" class="size-12 text-lg" />
        <div class="min-w-0">
          <p v-if="user.displayName" class="truncate font-semibold">{{ user.displayName }}</p>
          <p class="truncate text-sm text-muted-foreground">{{ user.email }}</p>
        </div>
      </div>

      <!-- Language. Real links, as in the site header, so the same page in
           the other language has its own URL. -->
      <h2 class="mt-8 flex items-center gap-x-2 text-sm font-semibold">
        <Globe class="size-4 shrink-0" aria-hidden="true" />
        {{ t.language.label }}
      </h2>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <RouterLink
          v-for="code in LOCALES"
          :key="code"
          :to="pathFor(code, 'account')"
          :lang="code"
          :hreflang="code"
          :aria-current="code === locale ? 'true' : undefined"
          :class="[choice, chosen(code === locale)]"
        >
          {{ localeNames[code] }}
          <Check
            v-if="code === locale"
            class="absolute end-1.5 top-1.5 size-3.5 text-[var(--primary)]"
            aria-hidden="true"
          />
        </RouterLink>
      </div>

      <h2 class="mt-6 text-sm font-semibold">{{ t.theme.label }}</h2>
      <div class="mt-2 grid grid-cols-3 gap-2">
        <button
          v-for="option in THEME_CHOICES"
          :key="option"
          type="button"
          :aria-pressed="theme === option"
          :class="[choice, chosen(theme === option), 'flex-col gap-1 px-2 py-2']"
          @click="setTheme(option)"
        >
          <component :is="themeIcons[option]" class="size-4 shrink-0" aria-hidden="true" />
          {{ t.theme[option] }}
          <Check
            v-if="theme === option"
            class="absolute end-1.5 top-1.5 size-3.5 text-[var(--primary)]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="mt-8 border-t border-border pt-3">
        <!-- The same glyph as the one in the devices bar, so that somebody
             who dismissed it there recognises it here. -->
        <button v-if="canInstall" type="button" :class="row" @click="installSheet?.open()">
          <Download class="size-5 shrink-0" aria-hidden="true" />
          {{ t.portal.installHeading }}
        </button>
        <RouterLink :to="pathFor(locale, 'home')" :class="row">
          <img src="/logo.svg" alt="" width="336" height="362" class="h-5 w-auto shrink-0" />
          {{ t.portal.website }}
        </RouterLink>
        <button type="button" :class="[row, 'text-[var(--destructive)]']" @click="signOut">
          <LogOut class="size-5 shrink-0" aria-hidden="true" />
          {{ t.portal.signOut }}
        </button>
      </div>
    </template>
    </div>
  </section>

  <InstallSheet ref="installSheet" />
</template>

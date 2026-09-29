<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import PortalTabs from '@/components/portal/PortalTabs.vue'
import { authReady, user } from '@/composables/useAuth'
import { t } from '@/i18n'

const route = useRoute()

// The portal is an app, not a page of the site: it brings its own top bar,
// and the site's header and footer would be a second one on top of it.
// Nothing is matched until the router has resolved the first URL, and
// showing the site header in that moment would flash it on the portal.
const siteChrome = computed(() => route.matched.length > 0 && !route.meta.app)

/*
 * The bottom bar, on the portal and only once there is somebody to show it
 * to. The sign-in screen has nowhere to navigate to, and a row of tabs
 * underneath it would be three places nobody is allowed to go.
 */
const tabs = computed(() => route.meta.app === true && authReady.value && !!user.value)
</script>

<template>
  <!-- WCAG 2.4.1: a way past the header for anyone who tabs through the page.
       Hidden until it takes focus, then it has to be visible and on top. -->
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:font-semibold focus:text-[var(--primary-foreground)]"
  >
    {{ t.skipToContent }}
  </a>

  <div class="flex min-h-dvh flex-col">
    <SiteHeader v-if="siteChrome" />

    <!-- A column, so that a view wanting the whole screen can ask for it with
         `flex-1` and get it. Nothing is stretched from here: the portal puts
         several elements straight into this main - a top bar, a pull
         indicator, the content - and a rule that grew every child would share
         the screen out between them. -->
    <!-- Room for the bar at the foot: its height plus whatever the phone
         keeps for its own home indicator. Without it the last card in a list
         sits underneath, reachable only by somebody who guesses it is
         there. -->
    <main
      id="main"
      class="flex flex-1 flex-col"
      :class="tabs ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''"
    >
      <RouterView />
    </main>

    <PortalTabs v-if="tabs" />

    <SiteFooter v-if="siteChrome" />
  </div>
</template>

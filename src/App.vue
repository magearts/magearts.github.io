<script setup lang="ts">
import { RouterView } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { t } from '@/i18n'
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
    <SiteHeader />

    <main id="main" class="flex-1">
      <RouterView />
    </main>

    <SiteFooter />
  </div>
</template>

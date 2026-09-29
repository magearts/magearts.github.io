<script setup lang="ts">
import { locale, pathFor, t } from '@/i18n'
</script>

<template>
  <section
    class="mx-auto w-full max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20 lg:max-w-6xl lg:px-8 lg:pt-28 lg:pb-16"
  >
    <!-- Decorative: the heading below carries the meaning, and the header
         already names the brand. -->
    <img
      src="/logo.svg"
      alt=""
      width="336"
      height="362"
      class="mx-auto h-16 w-auto sm:h-24 lg:h-28"
    />

    <h1 class="mt-6 text-2xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
      {{ t.hero.heading }}
    </h1>

    <!-- Line length in `ch`, not pixels: it is tied to the text size, so it
         holds when someone zooms or enlarges their system font. WCAG 1.4.8
         caps a line at 80 characters; a centred paragraph wants less. -->
    <p class="mx-auto mt-4 max-w-[55ch] text-base text-pretty text-muted-foreground sm:text-lg lg:mt-6">
      {{ t.hero.body }}
    </p>

    <RouterLink
      :to="{ path: pathFor(locale, 'home'), hash: '#work' }"
      class="mt-7 inline-flex h-11 max-w-full items-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] sm:h-12 sm:text-base"
    >
      {{ t.hero.cta }}
    </RouterLink>
  </section>
</template>

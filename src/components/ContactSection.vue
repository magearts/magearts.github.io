<script setup lang="ts">
import { Mail } from 'lucide-vue-next'
import { t } from '@/i18n'

// Written out rather than obfuscated. Address-harvesting bots will find it,
// but Gmail filters well, and anything that hides it from a bot also hides
// it from someone using a screen reader.
const email = 'magearts.th@gmail.com'
</script>

<template>
  <section
    class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:max-w-6xl lg:px-8 lg:py-14"
  >
    <h2 class="text-xl font-semibold lg:text-2xl">{{ t.contact.heading }}</h2>
    <p class="mt-2 max-w-[70ch] text-muted-foreground">{{ t.contact.body }}</p>

    <!-- min-h rather than a fixed height, and the address is free to break:
         at 320px it does not fit on one line, and a fixed height would put it
         through the border instead of growing. -->
    <a
      :href="`mailto:${email}`"
      class="mt-4 inline-flex min-h-11 max-w-full items-center gap-x-2 rounded-lg border border-[var(--layer-line)] px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--layer-hover)] sm:text-base lg:mt-6"
    >
      <Mail class="size-4 shrink-0" aria-hidden="true" />
      <span class="break-all">{{ email }}</span>
    </a>
  </section>
</template>

<script setup lang="ts">
import { t } from '@/i18n'
</script>

<template>
  <!-- No container of its own: HomeView places this and SkillsList side by
       side on large screens, so the two share one grid.
       scroll-mt clears the sticky header when the hero button jumps here. -->
  <section id="work" class="scroll-mt-20">
    <h2 class="text-xl font-semibold lg:text-2xl">{{ t.work.heading }}</h2>

    <!-- --layer-line, not --border: this edge has to be seen, so it is the
         3:1 token rather than the decorative divider. -->
    <article
      class="mt-4 rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 sm:p-6 lg:mt-6 lg:p-8"
    >
      <p
        class="inline-flex items-center rounded-full bg-[var(--warn-fill)] px-2.5 py-1 text-xs font-semibold text-[var(--warn-fill-foreground)]"
      >
        {{ t.work.status }}
      </p>

      <h3 class="mt-3 text-lg font-semibold lg:text-xl">{{ t.work.name }}</h3>
      <p class="mt-2 max-w-[70ch] text-pretty text-muted-foreground">{{ t.work.body }}</p>

      <!-- Said plainly rather than left for someone to find out later. -->
      <p class="mt-3 max-w-[70ch] text-sm text-muted-foreground">{{ t.work.caveat }}</p>
    </article>
  </section>
</template>

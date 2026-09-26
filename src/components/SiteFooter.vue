<script setup lang="ts">
import { t } from '@/i18n'
</script>

<template>
  <footer class="mt-6 border-t border-border">
    <div
      class="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-y-3 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 sm:text-start lg:max-w-6xl lg:px-8"
    >
      <!-- The copyright is in the owner's own name: MageArts is a name he
           works under, not a registered company, so it cannot hold it. -->
      <p class="max-w-full text-balance">{{ t.footer.copyright }}</p>

      <a
        href="https://github.com/magearts"
        rel="me noopener"
        class="rounded-md text-[var(--primary)] hover:underline"
      >
        {{ t.footer.github }}
      </a>
    </div>
  </footer>
</template>

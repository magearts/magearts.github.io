<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { t } from '@/i18n'

/*
 * Waiting, said in a way that reaches everybody.
 *
 * The turning circle is for the eyes. The word beside it is for a screen
 * reader, which is told nothing at all by an animation, and `role="status"`
 * is what makes it arrive without stealing the focus (WCAG 4.1.3).
 *
 * `motion-safe:` stops the spin for anybody who has asked their system for
 * less movement. They see a still circle, which on its own means nothing -
 * which is the other reason the word is not optional.
 *
 * `label` is for the places where the wait is a particular one; left out, it
 * says the general thing.
 */
defineProps<{ label?: string }>()
</script>

<template>
  <p role="status" class="flex items-center justify-center gap-x-2 text-muted-foreground">
    <LoaderCircle class="size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
    <span class="sr-only">{{ label || t.portal.loading }}</span>
  </p>
</template>

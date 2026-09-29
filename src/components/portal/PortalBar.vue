<script setup lang="ts">
import { dragging, pull, refreshing, threshold } from '@/composables/usePull'
import PullIndicator from './PullIndicator.vue'

/*
 * The portal's own top bar.
 *
 * There is no refresh button on it, and there was one until the owner of the
 * project decided against it. Pulling down is the only way now.
 *
 * That is a deliberate exception to WCAG 2.5.7, which asks that anything done
 * by dragging can also be done without dragging, and it costs more than the
 * standard: the gesture reads touch events, so on a desktop there is no way
 * to refresh at all short of reloading the page. Everything on screen is live
 * anyway - a refresh only matters when the connection has gone quiet without
 * saying so.
 *
 * `plain` is for the one bar that is not a page's own: while devices are
 * being selected, the bar becomes a count and a way out.
 *
 * The pull indicator is here too, and has to be: it grows downward from
 * wherever it sits, so above the bar it drags the bar itself down the screen
 * and below the bar it moves only the page. Putting it in the shell, above
 * the view, was the second of those - which is what the bar visibly doing a
 * pull-to-refresh looked like.
 */
withDefaults(defineProps<{ title: string; plain?: boolean }>(), { plain: false })
</script>

<template>
  <!-- The portal's own top bar, in place of the site header. The top inset
       keeps it clear of the notch when it is opened from the home screen. -->
  <header
    class="sticky top-0 z-40 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-sm"
  >
    <div
      class="flex h-14 w-full items-center gap-x-1 px-2 sm:px-4 lg:px-6"
    >
      <slot name="start" />

      <!-- The heading stays a heading. What fills it may be a button - the
           portal's own title opens the site - and a button inside an h1 is
           both valid and still announced as the page's heading. -->
      <!-- No `truncate` on the heading itself. It sets `overflow: hidden`,
           and a page that puts a menu in this slot then has its menu clipped
           to the height of one line - which looks like a menu that half
           opened. The cutting off belongs to whatever fills the slot, and
           the default below does it for itself. -->
      <h1 class="min-w-0 flex-1 px-2 text-lg font-semibold">
        <slot name="title"><span class="block truncate">{{ title }}</span></slot>
      </h1>

      <slot name="end" />
    </div>
  </header>

  <PullIndicator
    v-if="!plain"
    :pull="pull"
    :dragging="dragging"
    :refreshing="refreshing"
    :threshold="threshold"
  />
</template>

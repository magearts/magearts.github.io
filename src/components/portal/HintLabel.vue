<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/*
 * A label that can explain itself, in a bubble above it.
 *
 * Opened by a click, not by hovering. The portal's first screen is a phone,
 * where there is no hover at all and the browser's own `title` never appears
 * - a hover tooltip there is an explanation written for nobody.
 *
 * It floats rather than pushing the page around. An explanation that appears
 * in the flow moves everything under it down, so the row somebody was reading
 * jumps out from under their thumb at the moment they ask what it means.
 *
 * WCAG 1.4.13 asks that content which appears like this can be dismissed
 * without moving the pointer and that reaching for it does not dismiss it.
 * Escape closes it, a press anywhere outside closes it, and a press on the
 * bubble itself does not.
 *
 * The dotted underline belongs to the component rather than to whoever uses
 * it. A label that can be opened always looks like one, and a label that
 * looks like one can always be opened; keeping the two together by hand is
 * how they drift apart.
 */
defineProps<{ hint: string }>()

let counter = 0
const id = `hint-${(counter += 1)}-${Math.random().toString(36).slice(2, 7)}`

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function awayClick(event: Event) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

// Listening only while it is open, and taken down again on the way out:
// a handler left on the document by a component that has gone is a leak
// with a long tail.
watch(open, (showing) => {
  if (showing) document.addEventListener('pointerdown', awayClick)
  else document.removeEventListener('pointerdown', awayClick)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', awayClick))
</script>

<template>
  <span ref="root" class="relative inline-block" @keydown.esc="open = false">
    <button
      type="button"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-describedby="open ? id : undefined"
      class="border-b border-dotted border-current text-start"
      @click="open = !open"
    >
      <slot />
    </button>

    <span
      v-if="open"
      :id="id"
      role="tooltip"
      class="absolute bottom-full left-0 z-20 mb-2 block w-max max-w-[14rem] rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-lg"
    >
      {{ hint }}
      <!-- The tail, pinned under the start of the bubble rather than its
           middle, so it still points at the label when the bubble is wider
           than the words it came from. -->
      <span
        class="absolute top-full left-4 size-2 -translate-y-1/2 rotate-45 bg-foreground"
        aria-hidden="true"
      ></span>
    </span>
  </span>
</template>

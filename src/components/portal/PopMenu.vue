<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/*
 * A menu that drops from the control that opened it.
 *
 * One component for both menus in the top bar - the site picker under the
 * title and the overflow under the three dots - because two menus written
 * separately end up behaving differently, and the difference is always in the
 * parts nobody tests: what Escape does, what a click outside does, whether
 * the arrow keys work.
 *
 * It is a real menu rather than a div that drops down. The trigger says it
 * has one and whether it is open; the panel says it is a menu and its rows
 * say they are items; Escape closes it and returns the focus to the trigger,
 * which is the one thing a keyboard user cannot do for themselves.
 *
 * Rows are supplied by whoever uses it and only have to carry
 * `role="menuitem"`. Arrow keys find them by that.
 */
withDefaults(defineProps<{ align?: 'start' | 'end'; label: string }>(), { align: 'start' })

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)

function items() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function close(focusTrigger = false) {
  open.value = false
  if (focusTrigger) trigger.value?.focus()
}

function toggle() {
  open.value = !open.value
}

// Closing when the pointer lands anywhere else, and only listening while
// there is something to close: a document handler left behind by a component
// that has gone is a leak with a long tail.
function awayClick(event: Event) {
  if (!root.value?.contains(event.target as Node)) close()
}

watch(open, async (showing) => {
  if (showing) {
    document.addEventListener('pointerdown', awayClick)
    await nextTick()
    items()[0]?.focus()
  } else {
    document.removeEventListener('pointerdown', awayClick)
  }
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', awayClick))

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close(true)
    return
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  const all = items()
  if (all.length === 0) return

  event.preventDefault()

  const at = all.indexOf(document.activeElement as HTMLElement)
  const next = event.key === 'ArrowDown' ? at + 1 : at - 1

  all[(next + all.length) % all.length]?.focus()
}

// Whoever fills the menu closes it from their own row handlers.
defineExpose({ close })
</script>

<template>
  <div ref="root" class="relative" @keydown="onKey">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="label"
      class="inline-flex max-w-full items-center rounded-lg hover:bg-[var(--layer-hover)]"
      @click="toggle"
    >
      <slot name="trigger" />
    </button>

    <div
      v-if="open"
      ref="panel"
      role="menu"
      class="absolute top-full z-50 mt-1 min-w-52 overflow-hidden rounded-xl border border-[var(--layer-line)] bg-[var(--card)] py-1 shadow-lg"
      :class="align === 'end' ? 'end-0' : 'start-0'"
      @click="close()"
    >
      <slot />
    </div>
  </div>
</template>

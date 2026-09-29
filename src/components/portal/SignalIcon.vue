<script setup lang="ts">
import { computed } from 'vue'
import { Wifi, WifiHigh, WifiLow, WifiOff, WifiZero } from 'lucide-vue-next'
import { signalOf, type Device } from '@/composables/useDevices'

/*
 * One glyph for both questions a device raises at a glance: is it answering,
 * and how well.
 *
 * `signalOf` is already zero for anything that is not answering, so the
 * struck-through wifi covers both "offline" and "online and reporting
 * nothing" - which, to somebody looking at a switch, are the same problem.
 *
 * **The whole shape is always drawn, faintly, behind the part that is real.**
 * On its own, the two-arc glyph is just a smaller picture: there is nothing
 * to tell you it is two arcs out of four rather than all there is. A meter
 * has to show what is missing as well as what is there, which is why a
 * battery has an outline and why this has a ghost.
 *
 * It is given no colour of its own and inherits the text around it. A red or
 * amber warning would be the obvious thing and cannot be done: half the
 * device cards are filled with the brand colour while the switch is on, and
 * nothing readable on white is readable on that - a warning colour measured
 * there comes out around 1.3:1. The number of arcs carries the strength, and
 * arcs are shape rather than colour, which is what WCAG 1.4.1 asks for.
 *
 * It says nothing to a screen reader, deliberately: whoever places one puts
 * the word beside it, because only they know which of the two questions the
 * surrounding text has already answered.
 */
const props = defineProps<{ device: Device }>()

const ICONS = [WifiOff, WifiZero, WifiLow, WifiHigh, Wifi]

const level = computed(() => signalOf(props.device))
const icon = computed(() => ICONS[level.value])

// Nothing to ghost behind a struck-through glyph, which is already a whole
// shape, or behind a full one, which is already the ghost.
const ghosted = computed(() => level.value > 0 && level.value < 4)
</script>

<template>
  <span class="relative inline-flex">
    <Wifi v-if="ghosted" class="absolute inset-0 size-full opacity-25" aria-hidden="true" />
    <component :is="icon" class="relative size-full" aria-hidden="true" />
  </span>
</template>

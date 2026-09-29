<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@/i18n'
import { READINGS_KEPT_MS, type Reading } from '@/composables/useReadings'

/*
 * One measurement over the last day, as a line.
 *
 * One chart per measurement rather than two lines on one: °C and % share no
 * scale, and two lines told apart by colour alone fail WCAG 1.4.1. Each has
 * its own heading instead, and its lowest and highest written out underneath,
 * which is also what a screen reader is given - the drawing itself is
 * decorative.
 *
 * Drawn by hand in SVG. A charting library for two lines is a bundle that is
 * already large enough to have been flagged, made larger.
 */
const props = defineProps<{
  readings: Reading[]
  field: 't' | 'h'
  label: string
  unit: string
  // The line's colour, a token from style.css that is at least 3:1 on the
  // card in both themes (WCAG 1.4.11).
  tone: string
}>()

const WIDTH = 300
const HEIGHT = 100

/*
 * The longest step that is still one line. The device writes every five
 * minutes, so anything past two missed lines is a gap - no power, or no
 * clock yet - and is drawn as one rather than bridged by a straight line
 * that claims to know what happened in between.
 */
const GAP_MS = 12 * 60 * 1000

const points = computed(() =>
  props.readings
    .map((one) => ({ at: one.at, value: one[props.field] }))
    .filter((one): one is { at: number; value: number } => typeof one.value === 'number'),
)

const end = computed(() => Math.max(Date.now(), points.value.at(-1)?.at ?? 0))
const start = computed(() => end.value - READINGS_KEPT_MS)

const low = computed(() => Math.min(...points.value.map((one) => one.value)))
const high = computed(() => Math.max(...points.value.map((one) => one.value)))

// Some room above and below, and at least a couple of units of it, so that a
// room holding still reads as flat rather than as a tenth of a degree
// stretched across the whole height.
const range = computed(() => {
  const middle = (low.value + high.value) / 2
  const half = Math.max((high.value - low.value) / 2 + 0.5, 1)
  return { bottom: middle - half, top: middle + half }
})

function x(at: number) {
  return ((at - start.value) / READINGS_KEPT_MS) * WIDTH
}

function y(value: number) {
  const { bottom, top } = range.value
  return HEIGHT - ((value - bottom) / (top - bottom)) * HEIGHT
}

// Runs of points close enough together to be joined.
const runs = computed(() => {
  const all: { at: number; value: number }[][] = []

  for (const one of points.value) {
    const last = all.at(-1)
    const before = last?.at(-1)
    if (last && before && one.at - before.at <= GAP_MS) last.push(one)
    else all.push([one])
  }

  return all
})

const lines = computed(() =>
  runs.value
    .filter((run) => run.length > 1)
    .map((run) => run.map((one, i) => `${i ? 'L' : 'M'}${x(one.at).toFixed(1)},${y(one.value).toFixed(1)}`).join('')),
)

// A reading with nothing either side of it is still a reading, and a line of
// one point is invisible.
const dots = computed(() =>
  runs.value.filter((run) => run.length === 1).map((run) => ({ cx: x(run[0]!.at), cy: y(run[0]!.value) })),
)

function shown(value: number) {
  return props.field === 't' ? value.toFixed(1) : String(Math.round(value))
}

function clock(at: number) {
  return new Intl.DateTimeFormat(locale.value === 'th' ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(at)
}
</script>

<template>
  <figure class="rounded-2xl border border-[var(--layer-line)] bg-[var(--card)] p-4">
    <figcaption class="text-sm font-semibold">{{ label }}</figcaption>

    <p v-if="points.length === 0" class="mt-4 text-sm text-muted-foreground">
      {{ t.portal.noReadings }}
    </p>

    <template v-else>
      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        preserveAspectRatio="none"
        class="mt-3 h-28 w-full overflow-visible"
        aria-hidden="true"
      >
        <line x1="0" :y1="HEIGHT" :x2="WIDTH" :y2="HEIGHT" stroke="var(--border)" vector-effect="non-scaling-stroke" />
        <path
          v-for="(d, i) in lines"
          :key="i"
          :d="d"
          fill="none"
          :stroke="tone"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <!-- A circle drawn in a stretched viewBox is an ellipse, so the dot
             is a zero-length line with a round cap instead, which is round
             whatever the aspect. -->
        <line
          v-for="(dot, i) in dots"
          :key="`dot-${i}`"
          :x1="dot.cx"
          :y1="dot.cy"
          :x2="dot.cx"
          :y2="dot.cy"
          :stroke="tone"
          stroke-width="4"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <div class="mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>{{ clock(start) }}</span>
        <span>{{ clock(end) }}</span>
      </div>

      <dl class="mt-3 flex gap-x-6 text-sm">
        <div class="flex gap-x-1.5">
          <dt class="text-muted-foreground">{{ t.portal.lowest }}</dt>
          <dd class="font-semibold">{{ shown(low) }} {{ unit }}</dd>
        </div>
        <div class="flex gap-x-1.5">
          <dt class="text-muted-foreground">{{ t.portal.highest }}</dt>
          <dd class="font-semibold">{{ shown(high) }} {{ unit }}</dd>
        </div>
      </dl>
    </template>
  </figure>
</template>

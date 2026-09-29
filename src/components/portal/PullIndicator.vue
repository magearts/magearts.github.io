<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { t } from '@/i18n'

const props = defineProps<{
  pull: number
  dragging: boolean
  refreshing: boolean
  threshold: number
}>()

const label = computed(() => {
  if (props.refreshing) return t.value.portal.refreshing
  return props.pull >= props.threshold ? t.value.portal.releaseToRefresh : t.value.portal.pullToRefresh
})
</script>

<template>
  <!-- Grows with the finger, so the content underneath moves down with it.
       It only animates once let go: animating while dragging makes it lag
       behind the finger. -->
  <div
    aria-hidden="true"
    class="flex items-end justify-center overflow-hidden text-sm text-muted-foreground"
    :class="dragging ? '' : 'motion-safe:transition-[height] motion-safe:duration-200'"
    :style="{ height: `${pull}px` }"
  >
    <span class="flex items-center gap-x-2 pb-3">
      <RefreshCw
        class="size-4 shrink-0"
        :class="refreshing ? 'motion-safe:animate-spin' : ''"
        :style="refreshing ? undefined : { transform: `rotate(${(pull / threshold) * 270}deg)` }"
      />
      {{ label }}
    </span>
  </div>

  <!-- WCAG 4.1.3: the indicator above is visual only; this is what a screen
       reader hears, whether the refresh came from a pull or the button. -->
  <p class="sr-only" role="status">{{ refreshing ? t.portal.refreshing : '' }}</p>
</template>

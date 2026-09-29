<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { User } from 'firebase/auth'

const props = defineProps<{ user: User }>()

/*
 * Google's photo host sometimes refuses a request that carries a referrer,
 * and an account can have no photo at all. Either way the circle falls back
 * to a letter rather than showing a broken image.
 */
const photoFailed = ref(false)
watch(
  () => props.user.photoURL,
  () => (photoFailed.value = false),
)

const initial = computed(() =>
  (props.user.displayName || props.user.email || '?').charAt(0).toUpperCase(),
)
</script>

<template>
  <!-- alt is empty and the letter hidden: wherever this is used, the name is
       written beside it or given to the button around it, and a screen
       reader would otherwise read it twice. -->
  <img
    v-if="user.photoURL && !photoFailed"
    :src="user.photoURL"
    alt=""
    referrerpolicy="no-referrer"
    class="shrink-0 rounded-full object-cover"
    @error="photoFailed = true"
  />
  <span
    v-else
    aria-hidden="true"
    class="flex shrink-0 items-center justify-center rounded-full border border-[var(--layer-line)] bg-[var(--card)] font-semibold"
  >
    {{ initial }}
  </span>
</template>

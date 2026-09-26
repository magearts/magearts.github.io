<script setup lang="ts">
import { computed } from 'vue'
import { Code, Cpu, Printer } from 'lucide-vue-next'
import { t } from '@/i18n'

const skills = computed(() => [
  { label: t.value.skills.web, icon: Code },
  { label: t.value.skills.hardware, icon: Cpu },
  { label: t.value.skills.printing, icon: Printer },
])
</script>

<template>
  <!-- Container comes from the grid in HomeView. -->
  <section>
    <h2 class="text-xl font-semibold lg:text-2xl">{{ t.skills.heading }}</h2>

    <ul class="mt-4 flex flex-wrap gap-2 lg:mt-6">
      <li
        v-for="skill in skills"
        :key="skill.label"
        class="inline-flex max-w-full items-center gap-x-2 rounded-full border border-[var(--layer-line)] px-3.5 py-1.5 text-sm"
      >
        <component :is="skill.icon" class="size-4 shrink-0" aria-hidden="true" />
        {{ skill.label }}
      </li>
    </ul>
  </section>
</template>

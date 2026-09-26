<script setup lang="ts">
import HeroSection from '@/components/HeroSection.vue'
import CurrentWork from '@/components/CurrentWork.vue'
import SkillsList from '@/components/SkillsList.vue'
import ContactSection from '@/components/ContactSection.vue'
</script>

<template>
  <HeroSection />

  <!-- The two short sections sit side by side from lg up. Widening the text
       instead would have meant longer lines, which is the thing the width is
       supposed to avoid - so the space is filled with layout, not with
       stretched paragraphs. Below lg they stack, in this order. -->
  <div
    class="mx-auto grid w-full max-w-3xl gap-y-10 px-4 py-10 sm:px-6 lg:max-w-6xl lg:grid-cols-3 lg:gap-x-10 lg:gap-y-0 lg:px-8 lg:py-14"
  >
    <CurrentWork class="lg:col-span-2" />
    <SkillsList />
  </div>

  <ContactSection />
</template>

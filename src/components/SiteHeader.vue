<script setup lang="ts">
import { computed, onMounted, type Component } from 'vue'
import { HSStaticMethods } from 'preline'
import { Check, ChevronDown, Globe, Monitor, Moon, Sun } from 'lucide-vue-next'
import { LOCALES, locale, localeNames, localePath, t } from '@/i18n'
import { setTheme, theme, THEME_CHOICES, type ThemeChoice } from '@/theme'

const themeIcons: Record<ThemeChoice, Component> = { light: Sun, dark: Moon, auto: Monitor }

const currentThemeIcon = computed(() => themeIcons[theme.value])

// This header sits outside RouterView, so it mounts once and the autoInit in
// router.afterEach can run before it exists. Without this the two dropdowns
// would never be wired up.
onMounted(() => {
  HSStaticMethods.autoInit()
})

const menu =
  'hs-dropdown-menu hs-dropdown-open:opacity-100 z-50 mt-2 hidden min-w-44 rounded-lg border ' +
  'border-[var(--layer-line)] bg-[var(--layer)] p-1 opacity-0 shadow-lg transition-[opacity,margin] duration-150'

const item =
  'flex min-h-10 w-full items-center gap-x-2.5 rounded-md px-3 text-start text-sm ' +
  'text-[var(--layer-foreground)] hover:bg-[var(--layer-hover)]'

const trigger =
  'hs-dropdown-toggle inline-flex h-10 items-center gap-x-1.5 rounded-md px-2 text-sm font-medium ' +
  'hover:bg-[var(--layer-hover)] sm:px-3'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
    <div
      class="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-x-3 px-4 sm:px-6 lg:max-w-6xl lg:px-8"
    >
      <!-- alt is empty because the wordmark beside it already says MageArts;
           a screen reader would otherwise announce the name twice. -->
      <RouterLink
        :to="localePath[locale]"
        class="inline-flex min-w-0 items-center gap-x-2 rounded-md font-semibold"
      >
        <img src="/logo.svg" alt="" width="336" height="362" class="h-7 w-auto shrink-0" />
        <span class="truncate">MageArts</span>
      </RouterLink>

      <div class="flex shrink-0 items-center gap-x-0.5 sm:gap-x-1">
        <!-- Language. Every option is a real link to that language's URL, so
             the hreflang pair keeps working and a Thai search result can point
             straight at /th. -->
        <div class="hs-dropdown relative inline-flex [--placement:bottom-right]">
          <button
            id="language-menu"
            type="button"
            :class="trigger"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <Globe class="size-4 shrink-0" aria-hidden="true" />

            <!-- WCAG 2.5.3: the accessible name has to contain the visible
                 text. The name is read as "Language English" in both layouts;
                 only the second half is on screen, and only from sm up. -->
            <span class="sr-only">{{ t.language.label }}</span>
            <span class="hidden sm:inline">{{ localeNames[locale] }}</span>
            <span class="sr-only sm:hidden">{{ localeNames[locale] }}</span>

            <ChevronDown class="hidden size-4 shrink-0 sm:inline" aria-hidden="true" />
          </button>

          <div :class="menu" role="menu" aria-orientation="vertical" aria-labelledby="language-menu">
            <RouterLink
              v-for="code in LOCALES"
              :key="code"
              :to="localePath[code]"
              :lang="code"
              :hreflang="code"
              :class="item"
              role="menuitem"
            >
              {{ localeNames[code] }}
              <!-- Kept in the layout when hidden so the labels stay in line.
                   A tick, not a colour, so it survives WCAG 1.4.1. -->
              <Check
                class="ms-auto size-4 shrink-0"
                :class="code === locale ? '' : 'invisible'"
                aria-hidden="true"
              />
            </RouterLink>
          </div>
        </div>

        <!-- Theme. System is a stored choice of its own, not the absence of
             one, so it can be chosen again after picking light or dark. -->
        <div class="hs-dropdown relative inline-flex [--placement:bottom-right]">
          <button
            id="theme-menu"
            type="button"
            :class="trigger"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <component :is="currentThemeIcon" class="size-4 shrink-0" aria-hidden="true" />

            <span class="sr-only">{{ t.theme.label }}</span>
            <span class="hidden sm:inline">{{ t.theme[theme] }}</span>
            <span class="sr-only sm:hidden">{{ t.theme[theme] }}</span>

            <ChevronDown class="hidden size-4 shrink-0 sm:inline" aria-hidden="true" />
          </button>

          <div :class="menu" role="menu" aria-orientation="vertical" aria-labelledby="theme-menu">
            <button
              v-for="choice in THEME_CHOICES"
              :key="choice"
              type="button"
              :class="item"
              role="menuitemradio"
              :aria-checked="theme === choice"
              @click="setTheme(choice)"
            >
              <component :is="themeIcons[choice]" class="size-4 shrink-0" aria-hidden="true" />
              {{ t.theme[choice] }}
              <Check
                class="ms-auto size-4 shrink-0"
                :class="theme === choice ? '' : 'invisible'"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

import { computed, ref, watchEffect } from 'vue'

/**
 * Light, dark, or whatever the operating system is doing.
 *
 * `auto` is the default and is a real stored choice, not the absence of one:
 * someone who picks dark, then changes their mind, can get back to following
 * the OS. Preline reads the `.dark` class on <html>, so that is all this
 * writes.
 *
 * The first paint is done by the inline script in index.html, before Vue
 * loads, so the page never flashes the wrong theme. The two have to agree -
 * if you change the rule here, change it there.
 */

const STORAGE_KEY = 'magearts-theme'

export type ThemeChoice = 'light' | 'dark' | 'auto'

export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark', 'auto']

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'auto') return value
  } catch {
    // Private mode, or storage blocked. Falls through to the default.
  }
  return 'auto'
}

const query = matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(query.matches)

// Kept live, so a visitor on `auto` sees the page change when their phone
// crosses into night mode - without reloading.
query.addEventListener('change', (event) => {
  systemDark.value = event.matches
})

export const theme = ref<ThemeChoice>(read())

export const resolvedTheme = computed<'light' | 'dark'>(() =>
  theme.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : theme.value,
)

watchEffect(() => {
  document.documentElement.classList.toggle('dark', resolvedTheme.value === 'dark')
})

export function setTheme(next: ThemeChoice) {
  theme.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // The theme still changes for this visit; it just will not be remembered.
  }
}

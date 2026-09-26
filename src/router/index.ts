import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { HSStaticMethods } from 'preline'
import HomeView from '@/views/HomeView.vue'
import { setLocale, t, type Locale } from '@/i18n'

const SITE = 'https://magearts.github.io'

declare module 'vue-router' {
  interface RouteMeta {
    locale?: Locale
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // English is the default, so it keeps the bare root.
    { path: '/', name: 'home', component: HomeView, meta: { locale: 'en' } },
    { path: '/th', name: 'home-th', component: HomeView, meta: { locale: 'th' } },

    // A deep link that no longer exists lands on the English page rather than
    // a blank screen - GitHub Pages serves 404.html, which is a copy of
    // index.html, so every unknown path reaches the router.
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

function setMeta(selector: string, attribute: string, value: string) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attribute, value)
}

// The language is decided by the route, so everything that depends on it is
// set here in one place rather than from inside a component.
router.beforeEach((to) => {
  setLocale(to.meta.locale ?? 'en')
})

router.afterEach(async (to) => {
  const copy = t.value

  document.documentElement.lang = copy.lang
  document.title = copy.title
  setMeta('meta[name="description"]', 'content', copy.description)
  setMeta('meta[name="title"]', 'content', copy.title)

  // Tells a search engine which URL is the real one for this language.
  // Note that Facebook and LINE do not run JavaScript, so the og: tags they
  // read are the static English ones in index.html, for both languages.
  setMeta('link[rel="canonical"]', 'href', SITE + (to.meta.locale === 'th' ? '/th' : '/'))

  await nextTick()
  HSStaticMethods.autoInit()
})

export default router

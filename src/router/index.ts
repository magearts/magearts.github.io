import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { HSStaticMethods } from 'preline'
import HomeView from '@/views/HomeView.vue'
import { pathFor, setLocale, t, type Locale, type Page } from '@/i18n'

const SITE = 'https://magearts.github.io'

declare module 'vue-router' {
  interface RouteMeta {
    locale?: Locale
    page?: Page
    /*
     * True for every page that belongs to the portal rather than to the site:
     * the devices list, its other tabs, and a device's own page.
     *
     * `page` cannot answer this on its own any more - there are three portal
     * pages now, and a device page has no page of its own at all. Asking
     * "which of these three or four values is it" in each of the places that
     * needs to know is how one of them gets forgotten.
     */
    app?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // English is the default, so it keeps the bare root.
    { path: '/', name: 'home', component: HomeView, meta: { locale: 'en', page: 'home' } },
    { path: '/th', name: 'home-th', component: HomeView, meta: { locale: 'th', page: 'home' } },

    /*
     * Loaded only when somebody goes there. The portal pulls in Firebase auth
     * and the database client, which together are larger than everything else
     * on the site - and most people who arrive are here to read about a
     * product, not to sign in.
     */
    {
      path: '/portal',
      name: 'portal',
      component: () => import('@/views/PortalView.vue'),
      meta: { locale: 'en', page: 'portal', app: true },
    },
    {
      path: '/th/portal',
      name: 'portal-th',
      component: () => import('@/views/PortalView.vue'),
      meta: { locale: 'th', page: 'portal', app: true },
    },

    {
      path: '/portal/automations',
      name: 'automations',
      component: () => import('@/views/AutomationsView.vue'),
      meta: { locale: 'en', page: 'automations', app: true },
    },
    {
      path: '/th/portal/automations',
      name: 'automations-th',
      component: () => import('@/views/AutomationsView.vue'),
      meta: { locale: 'th', page: 'automations', app: true },
    },

    {
      path: '/portal/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { locale: 'en', page: 'notifications', app: true },
    },
    {
      path: '/th/portal/notifications',
      name: 'notifications-th',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { locale: 'th', page: 'notifications', app: true },
    },
    /*
     * One site's own settings. Not a tab and with no `Page` of its own: like
     * a device's page it belongs to the devices tab, which is what
     * `page: 'portal'` keeps lit at the bottom of the screen.
     *
     * A page rather than a sheet so that the back button works the whole way
     * down. A sheet is not in the browser's history, so coming back from it
     * skipped straight past whatever opened it.
     *
     * There was a list of every site at /portal/sites too. It is gone: the
     * menu under the title on the devices page switches between them, says
     * which you own, and is where a new one is made, so the page was a
     * second way to do things that were already one tap away.
     */
    {
      path: '/portal/site',
      name: 'site',
      component: () => import('@/views/SiteView.vue'),
      meta: { locale: 'en', page: 'portal', app: true },
    },
    {
      path: '/th/portal/site',
      name: 'site-th',
      component: () => import('@/views/SiteView.vue'),
      meta: { locale: 'th', page: 'portal', app: true },
    },

    {
      path: '/portal/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
      meta: { locale: 'en', page: 'account', app: true },
    },
    {
      path: '/th/portal/account',
      name: 'account-th',
      component: () => import('@/views/AccountView.vue'),
      meta: { locale: 'th', page: 'account', app: true },
    },
    {
      path: '/portal/device/:id',
      name: 'device',
      component: () => import('@/views/DeviceView.vue'),
      meta: { locale: 'en', page: 'portal', app: true },
    },
    {
      path: '/th/portal/device/:id',
      name: 'device-th',
      component: () => import('@/views/DeviceView.vue'),
      meta: { locale: 'th', page: 'portal', app: true },
    },

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
  setMeta('link[rel="canonical"]', 'href', SITE + pathFor(to.meta.locale ?? 'en', to.meta.page ?? 'home'))

  const isApp = to.meta.app === true

  // The portal is somebody's account, not a page to be found in a search.
  setMeta('meta[name="robots"]', 'content', isApp ? 'noindex, nofollow' : 'index, follow')

  // Nothing here touches the viewport. It is the same on every page now -
  // zoom pinned, a recorded WCAG exception - so it is written once in
  // index.html, where it holds from the first paint instead of from whenever
  // this hook happens to run.

  await nextTick()
  HSStaticMethods.autoInit()
})

export default router

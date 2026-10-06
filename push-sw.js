/*
 * Notifications, inside the service worker that vite-plugin-pwa writes.
 *
 * Pulled in by `workbox.importScripts` in vite.config.ts, so it runs with the
 * portal closed - which is the whole point, and also why nothing in here can
 * reach the app, the database or the signed-in account. Everything it shows
 * has to arrive in the message.
 *
 * The board sends (PROTOCOL.md, "Notifications", in the iot repository)
 * either what its relay did and why:
 *
 *   { "id": "821938", "on": true, "by": "tap", "n": "Hall light", "l": "th" }
 *
 * `by` being "tap", "sched" or "timer" - or an invitation it was asked to
 * pass on:
 *
 *   { "k": "invite", "site": "Workshop", "by": "Kritsana", "l": "th" }
 *
 * `n` is what the site calls the device, read by the board as it sends. `l`
 * is the language the portal was in when this browser was last opened.
 */

const WORDS = {
  en: {
    app: 'MageArts',
    tap: ['Turned off with the button on the device', 'Turned on with the button on the device'],
    sched: ['Turned off by a schedule', 'Turned on by a schedule'],
    timer: ['Turned off when the timer ran out', 'Turned on by the timer'],
    other: ['Turned off', 'Turned on'],
    invite: (by, site) => `${by || 'Somebody'} invited you to ${site || 'a site'}`,
  },
  th: {
    app: 'MageArts',
    tap: ['ปิดด้วยปุ่มที่ตัวเครื่อง', 'เปิดด้วยปุ่มที่ตัวเครื่อง'],
    sched: ['ปิดตามเวลาที่ตั้งไว้', 'เปิดตามเวลาที่ตั้งไว้'],
    timer: ['ปิดเมื่อหมดเวลาที่ตั้งไว้', 'เปิดตามตัวตั้งเวลา'],
    other: ['ปิดแล้ว', 'เปิดแล้ว'],
    invite: (by, site) => `${by || 'มีคน'} เชิญคุณเข้า ${site || 'สถานที่'}`,
  },
}

function prefix(lang) {
  return lang === 'th' ? '/th' : ''
}


self.addEventListener('push', (event) => {
  let msg = {}
  try {
    msg = event.data ? event.data.json() : {}
  } catch {
    // Something that is not ours, or not JSON. Shown anyway, below: a push
    // that shows nothing is one Safari counts against the site.
  }

  const lang = msg.l === 'th' ? 'th' : 'en'
  const w = WORDS[lang]

  // An invitation opens the notifications page, where it can be answered.
  if (msg.k === 'invite') {
    event.waitUntil(
      self.registration.showNotification(w.app, {
        body: w.invite(msg.by, msg.site),
        lang,
        icon: '/icon-192.png',
        tag: 'invite-' + (msg.site || ''),
        data: { url: prefix(lang) + '/portal/notifications' },
      }),
    )
    return
  }

  const title = typeof msg.n === 'string' && msg.n ? msg.n : w.app
  const body = (w[msg.by] || w.other)[msg.on ? 1 : 0]

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      lang,
      icon: '/icon-192.png',
      // One per device: a second press replaces the first rather than
      // stacking under it, and still makes a sound.
      tag: 'device-' + (msg.id || ''),
      renotify: true,
      // The notifications page, where this is listed too, like every app's
      // notification opens its list rather than somewhere else.
      data: { url: prefix(lang) + '/portal/notifications' },
    }),
  )
})

// Opens the device's page - in a window that is already open if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/portal', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if ('focus' in win) {
          return win.navigate(url).then((w) => (w || win).focus())
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

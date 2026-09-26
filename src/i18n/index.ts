import { ref } from 'vue'

/**
 * Two languages, hand-rolled.
 *
 * vue-i18n would be the obvious choice, but this site has one page and
 * around twenty strings. A dictionary and a ref cover it without adding a
 * dependency to a bundle that is already large enough to have been flagged.
 *
 * English is the default: `/` is English and `/th` is Thai, two real URLs
 * rather than a toggle, so that a Thai search result can point at the Thai
 * page. A visitor is never redirected by browser language - the switch in
 * the header is the only thing that changes language, and it is a link, so
 * it can be shared, bookmarked and crawled.
 */

export type Locale = 'en' | 'th'

export interface Copy {
  /** Goes on <html lang>. WCAG 3.1.1 is Level A, so this has to be right. */
  lang: string
  title: string
  description: string
  skipToContent: string
  hero: {
    heading: string
    body: string
    cta: string
  }
  work: {
    heading: string
    status: string
    name: string
    body: string
    caveat: string
  }
  skills: {
    heading: string
    web: string
    hardware: string
    printing: string
  }
  contact: {
    heading: string
    body: string
  }
  footer: {
    copyright: string
    github: string
  }
  /** Accessible name for the language menu; the options themselves are never translated. */
  language: {
    label: string
  }
  theme: {
    label: string
    light: string
    dark: string
    auto: string
  }
}

const en: Copy = {
  lang: 'en',
  title: 'MageArts — Kritsana Wattanapiphatsakul',
  description:
    'MageArts is the name Kritsana Wattanapiphatsakul builds under — a developer and maker in Thailand, currently building a Wi-Fi light switch you set up from your phone.',
  skipToContent: 'Skip to content',
  hero: {
    heading: 'I build connected hardware',
    body: "MageArts is the name I build under. I'm Kritsana Wattanapiphatsakul — a developer and maker in Thailand. Right now I'm building a Wi-Fi light switch you set up from your phone.",
    cta: "See what I'm working on",
  },
  work: {
    heading: "What I'm working on",
    status: 'In development',
    name: 'Wi-Fi light switch',
    body: 'A switch that replaces the one already on your wall and joins your home network from your phone. No hub, and no app to install.',
    caveat: "It isn't finished and isn't for sale yet.",
  },
  skills: {
    heading: 'What I work with',
    web: 'Web development',
    hardware: 'IoT and embedded hardware',
    printing: '3D printing',
  },
  contact: {
    heading: 'Get in touch',
    body: 'Questions, ideas, or work — email is the best way to reach me.',
  },
  footer: {
    copyright: '© 2026 Kritsana Wattanapiphatsakul',
    github: 'GitHub',
  },
  language: { label: 'Language' },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark', auto: 'System' },
}

const th: Copy = {
  lang: 'th',
  title: 'MageArts — กฤษณะ วัฒนพิพัฒน์สกุล',
  description:
    'MageArts คือชื่อที่ กฤษณะ วัฒนพิพัฒน์สกุล ใช้ทำงาน เป็นนักพัฒนาและเมกเกอร์ ตอนนี้กำลังทำสวิตช์ไฟ Wi-Fi ที่ตั้งค่าได้จากมือถือ',
  skipToContent: 'ข้ามไปยังเนื้อหา',
  hero: {
    heading: 'ผมสร้างอุปกรณ์เชื่อมต่อ',
    body: 'MageArts คือชื่อที่ผมใช้ทำงาน ผมชื่อ กฤษณะ วัฒนพิพัฒน์สกุล เป็นนักพัฒนาและเมกเกอร์ ตอนนี้กำลังทำสวิตช์ไฟ Wi-Fi ที่ตั้งค่าได้จากมือถือ',
    cta: 'ดูสิ่งที่กำลังทำ',
  },
  work: {
    heading: 'สิ่งที่กำลังทำ',
    status: 'อยู่ระหว่างพัฒนา',
    name: 'สวิตช์ไฟ Wi-Fi',
    body: 'สวิตช์ที่ใช้แทนตัวเดิมบนผนังได้เลย และเชื่อมต่อเข้า Wi-Fi ที่บ้านจากมือถือ ไม่ต้องมี hub และไม่ต้องติดตั้งแอป',
    caveat: 'ยังพัฒนาไม่เสร็จ และยังไม่ได้วางขาย',
  },
  skills: {
    heading: 'สิ่งที่ผมทำ',
    web: 'พัฒนาเว็บ',
    hardware: 'IoT และฮาร์ดแวร์ฝังตัว',
    printing: 'งานพิมพ์ 3 มิติ',
  },
  contact: {
    heading: 'ติดต่อ',
    body: 'มีคำถาม มีไอเดีย หรืออยากร่วมงาน ส่งอีเมลมาได้เลย',
  },
  footer: {
    copyright: '© 2026 กฤษณะ วัฒนพิพัฒน์สกุล',
    github: 'GitHub',
  },
  language: { label: 'ภาษา' },
  theme: { label: 'ธีม', light: 'สว่าง', dark: 'มืด', auto: 'ตามระบบ' },
}

const messages: Record<Locale, Copy> = { en, th }

/** The path each locale lives at. Every entry in the language menu is a link to one. */
export const localePath: Record<Locale, string> = { en: '/', th: '/th' }

/**
 * Each language named in itself, the same in both dictionaries. Someone who
 * lands on the English page and cannot read it needs to find their own
 * language by sight - "Thai" would be no help to them, ไทย is.
 */
export const localeNames: Record<Locale, string> = { en: 'English', th: 'ไทย' }

export const LOCALES: Locale[] = ['en', 'th']

export const locale = ref<Locale>('en')

/** Unwrapped in templates, so components read `t.hero.heading`. */
export const t = ref<Copy>(en)

export function setLocale(next: Locale) {
  locale.value = next
  t.value = messages[next]
}

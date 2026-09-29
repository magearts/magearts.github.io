import { createApp, h, type Component } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

/*
 * Lucide icons as strings of SVG, for the places that want markup rather than
 * a component - Preline's select builds its dropdown from HTML.
 *
 * Drawn once per icon by mounting the component somewhere nobody can see and
 * reading back what it drew, so an icon in a Preline dropdown is the same icon
 * from the same package as everywhere else. Nothing in the markup comes from
 * the database: it is ours, and it is safe to hand over as HTML.
 */
const drawn = new Map<Component, string>()

export function svgOf(icon: Component): string {
  const known = drawn.get(icon)
  if (known !== undefined) return known

  const host = document.createElement('div')
  const app = createApp({
    render: () => h(icon, { class: 'size-4', 'aria-hidden': 'true' }),
  })
  app.mount(host)
  const svg = host.innerHTML
  app.unmount()

  drawn.set(icon, svg)
  return svg
}

export const checkSvg = () => svgOf(Check)
export const chevronSvg = () => svgOf(ChevronDown)

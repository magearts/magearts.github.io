import {
  AirVent,
  Bath,
  Coffee,
  CookingPot,
  Droplets,
  Fan,
  Heater,
  Lamp,
  LampCeiling,
  LampDesk,
  Lightbulb,
  Plug,
  Power,
  Refrigerator,
  Router,
  ShowerHead,
  Siren,
  Snowflake,
  Speaker,
  SprayCan,
  Sprout,
  Trees,
  Tv,
  Warehouse,
  WashingMachine,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-vue-next'
import { t, type Copy } from '@/i18n'

/*
 * What a device looks like on its card, chosen by whoever owns the site.
 *
 * A switch is a switch, and the thing on the other end of it is not. A list of
 * eight identical power symbols is a list somebody has to read every word of;
 * a fan, a lamp and a pump are told apart before the names are read at all.
 * That is the whole of what this buys, and it is worth a field.
 *
 * A curated set, not the whole of Lucide. Five thousand icons is not a choice,
 * it is a search box and a decision nobody wanted to make - and most of them
 * are for things a mains relay will never be wired to. These are the things
 * people actually put on a switch.
 *
 * The key is what goes in the database. It is deliberately not the component
 * name: the components are a library's business and can be renamed by an
 * upgrade, while these keys are stored data and cannot.
 */
export interface DeviceIcon {
  key: string
  icon: LucideIcon
  label: keyof Copy['portal']['iconNames']
}

export interface IconGroup {
  label: keyof Copy['portal']['iconGroups']
  icons: DeviceIcon[]
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'light',
    icons: [
      { key: 'bulb', icon: Lightbulb, label: 'bulb' },
      { key: 'ceiling', icon: LampCeiling, label: 'ceiling' },
      { key: 'desk', icon: LampDesk, label: 'desk' },
      { key: 'floor', icon: Lamp, label: 'floor' },
    ],
  },
  {
    label: 'air',
    icons: [
      { key: 'fan', icon: Fan, label: 'fan' },
      { key: 'vent', icon: AirVent, label: 'vent' },
      { key: 'ac', icon: Snowflake, label: 'ac' },
      { key: 'heater', icon: Heater, label: 'heater' },
    ],
  },
  {
    label: 'water',
    icons: [
      { key: 'pump', icon: Droplets, label: 'pump' },
      { key: 'shower', icon: ShowerHead, label: 'shower' },
      { key: 'bath', icon: Bath, label: 'bath' },
      { key: 'pond', icon: Waves, label: 'pond' },
    ],
  },
  {
    label: 'outside',
    icons: [
      { key: 'plant', icon: Sprout, label: 'plant' },
      { key: 'garden', icon: Trees, label: 'garden' },
      { key: 'sprinkler', icon: SprayCan, label: 'sprinkler' },
      { key: 'garage', icon: Warehouse, label: 'garage' },
    ],
  },
  {
    label: 'appliance',
    icons: [
      { key: 'washer', icon: WashingMachine, label: 'washer' },
      { key: 'fridge', icon: Refrigerator, label: 'fridge' },
      { key: 'pot', icon: CookingPot, label: 'pot' },
      { key: 'coffee', icon: Coffee, label: 'coffee' },
      { key: 'tv', icon: Tv, label: 'tv' },
      { key: 'speaker', icon: Speaker, label: 'speaker' },
      { key: 'router', icon: Router, label: 'router' },
    ],
  },
  {
    label: 'general',
    icons: [
      { key: 'plug', icon: Plug, label: 'plug' },
      { key: 'power', icon: Power, label: 'power' },
      { key: 'zap', icon: Zap, label: 'zap' },
      { key: 'siren', icon: Siren, label: 'siren' },
    ],
  },
]

/*
 * Flattened once, because every lookup wants it that way and the groups only
 * matter to the picker.
 */
const BY_KEY = new Map<string, DeviceIcon>(
  ICON_GROUPS.flatMap((group) => group.icons).map((one) => [one.key, one]),
)

// Where an unchosen device lands, and what a key nobody recognises falls back
// to. A stored key can outlive this list - somebody choosing an icon that a
// later version drops should get the plain one, not an empty square.
export const DEFAULT_ICON = 'plug'

export function iconByKey(key?: string): DeviceIcon {
  return BY_KEY.get(key ?? '') ?? BY_KEY.get(DEFAULT_ICON)!
}

export function iconLabel(key?: string): string {
  return t.value.portal.iconNames[iconByKey(key).label]
}

// The longest a key may be, enforced by the rules as well. Nothing here is
// near it; it is there so that the field cannot become a place to put things.
export const ICON_KEY_MAX = 20

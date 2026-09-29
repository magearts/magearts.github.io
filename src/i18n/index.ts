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
  portal: {
    link: string
    heading: string
    signedOut: string
    signIn: string
    signInWhy: string
    signOut: string
    empty: string
    emptyForMember: string
    addButton: string
    addHeading: string
    addHint: string
    cancel: string
    signInFailed: string
    codeLabel: string
    add: string
    adding: string
    loading: string
    badFormat: string
    refused: string
    offline: string
    installHeading: string
    installWhy: string
    installNow: string
    installLater: string
    installWording: string
    stepShare: string
    stepAddHome: string
    stepConfirmAdd: string
    stepMenu: string
    stepInstallApp: string
    unnamed: string
    smartSwitch: string
    roomSensor: string
    account: string
    close: string
    website: string
    refreshing: string
    pullToRefresh: string
    releaseToRefresh: string
    on: string
    off: string
    unknown: string
    deviceOnline: string
    deviceOffline: string
    back: string
    firstSite: string
    siteHeading: string
    siteNameLabel: string
    people: string
    newLabel: string
    startedHint: string
    roleOwner: string
    roleMember: string
    remove: string
    leave: string
    leaveHeading: string
    leaveBody: string
    leaveFailed: string
    switchSite: string
    moreMenu: string
    defaultLabel: string
    setDefault: string
    siteSettings: string
    newSite: string
    newSiteHeading: string
    create: string
    deleteSite: string
    deleteSiteHeading: string
    deleteSiteWarn: string
    typeToConfirm: string
    deleteLabel: string
    deleteFailed: string
    removeDevice: string
    removeDeviceHeading: string
    removeDeviceBody: string
    removeFailed: string
    select: string
    done: string
    selected: string
    removeHeading: string
    removeBody: string
    invitedLabel: string
    revoke: string
    inviteHeading: string
    emailLabel: string
    emailHint: string
    sendInvite: string
    sendingInvite: string
    badEmail: string
    inviteFailed: string
    inviteSent: string
    invitationsHeading: string
    notifications: string
    automations: string
    noDevicesForAutomations: string
    noNotifications: string
    scheduleRan: string
    turnedOn: string
    turnedOff: string
    devicesTab: string
    invitedBy: string
    accept: string
    decline: string
    nameLabel: string
    nameHint: string
    rename: string
    maintenance: string
    cannotUndoHere: string
    rebootWhat: string
    removeWhat: string
    eraseWhat: string
    reboot: string
    rebootHeading: string
    rebootBody: string
    eraseLabel: string
    eraseHeading: string
    eraseWarning: string
    eraseConfirm: string
    asked: string
    askedSlow: string
    askFailed: string
    save: string
    saveFailed: string
    power: string
    noResponse: string
    iconGroups: {
      light: string
      air: string
      water: string
      outside: string
      appliance: string
      general: string
    }
    iconNames: {
      bulb: string
      ceiling: string
      desk: string
      floor: string
      fan: string
      vent: string
      ac: string
      heater: string
      pump: string
      shower: string
      bath: string
      pond: string
      plant: string
      garden: string
      sprinkler: string
      garage: string
      washer: string
      fridge: string
      pot: string
      coffee: string
      tv: string
      speaker: string
      router: string
      plug: string
      power: string
      zap: string
      siren: string
    }
    iconHeading: string
    editHeading: string
    statusSection: string
    turningOn: string
    turningOff: string
    noAnswer: string
    commandFailed: string
    details: string
    idLabel: string
    fwLabel: string
    ipLabel: string
    signalLabel: string
    signalHint: string
    lastSeenLabel: string
    signalWords: [string, string, string, string]
    startedLabel: string
    notFound: string
    schedules: string
    scheduleHint: string
    addSchedule: string
    noSchedules: string
    newScheduleHeading: string
    editScheduleHeading: string
    timeLabel: string
    actionLabel: string
    turnOn: string
    turnOff: string
    daysLabel: string
    /** Sunday first, the way the device counts - not the way the form shows them. */
    dayShort: [string, string, string, string, string, string, string]
    dayLong: [string, string, string, string, string, string, string]
    everyDay: string
    weekdays: string
    weekends: string
    scheduleDevices: string
    pickDevices: string
    pickTime: string
    pickDay: string
    pickDevice: string
    scheduleFull: string
    scheduleActive: string
    editSchedule: string
    scheduleHistory: string
    enableSelected: string
    disableSelected: string
    deleteSchedulesHeading: string
    deleteSchedulesBody: string
    historyHeading: string
    historyHint: string
    noHistory: string
    ranOn: string
    ranOff: string
    bySchedule: string
    byCmd: string
    byTap: string
    deleteSchedule: string
    deleteScheduleHeading: string
    deleteScheduleBody: string
    agoNow: string
    agoMinutes: string
    agoHours: string
    agoDays: string
    readingOld: string
    noReading: string
    readingsHeading: string
    readingsHint: string
    noReadings: string
    temperature: string
    humidity: string
    lowest: string
    highest: string
  }
}

const en: Copy = {
  lang: 'en',
  title: 'MageArts — Kritsana Wattanapiphatsakul',
  description:
    'MageArts is the name Kritsana Wattanapiphatsakul builds under — a developer and maker in Thailand, currently building a Wi-Fi switch module you set up from your phone.',
  skipToContent: 'Skip to content',
  hero: {
    heading: 'I build connected hardware',
    body: "MageArts is the name I build under. I'm Kritsana Wattanapiphatsakul — a developer and maker in Thailand. Right now I'm building a Wi-Fi switch module you set up from your phone.",
    cta: "See what I'm working on",
  },
  work: {
    heading: "What I'm working on",
    status: 'In development',
    name: 'Wi-Fi switch module',
    body: 'A module that goes inline on a circuit\'s live wire and switches it from your phone — a light, a fan, an outlet, whatever runs through it. No hub to buy, and it runs in the browser on any phone: the switch shows you its own setup page, and the portal sits on your home screen like an app.',
    caveat: "It is not a wall plate: it goes into the wiring, not over it. And it isn't finished or for sale.",
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
  portal: {
    link: 'Portal',
    heading: 'Your devices',
    signedOut: 'Sign in to see the devices you have added.',
    signIn: 'Continue with Google',
    // Said before the Google button rather than after it. Somebody meeting
    // that button for the first time is wondering what is about to be taken
    // from their account, and the answer is short enough to give them.
    signInWhy: 'Your Google account is only used to know which devices are yours.',
    signOut: 'Sign out',
    empty: 'Nothing here yet.',
    emptyForMember: 'No devices in this site yet. Only its owner can add one.',
    addButton: 'Add device',
    addHeading: 'Add a device',
    addHint:
      'The code is shown when you set the device up, and printed on the device itself.',
    codeLabel: 'Setup code',
    cancel: 'Cancel',
    signInFailed: 'Could not sign in. Check your connection and try again.',
    add: 'Add',
    adding: 'Adding',
    loading: 'Loading',
    // Said without blaming them: a mistyped code and a device somebody else
    // owns look identical from here, and the database will not say which.
    badFormat: 'A device code is six characters, a dash, and six more.',
    refused: 'That code was not accepted. Check it, or the device may already belong to somebody.',
    offline: 'No connection.',
    // A verb, not a description. "Keep this on your home screen" is true and
    // reads as a sentence somebody wrote rather than a thing they can do; the
    // line underneath is where the explaining belongs.
    installHeading: 'Install app',
    installWhy:
      'It opens like an app - full screen, its own icon, and straight back to where you were.',
    installNow: 'Install',
    installLater: 'Not now',
    // Said once, under the steps. The labels move between browser versions
    // and change with the phone's language; the icons do not.
    installWording: 'The words may differ on your phone. Look for the icon.',
    stepShare: 'Tap the share button in the bar at the bottom',
    stepAddHome: 'Choose Add to Home Screen',
    stepConfirmAdd: 'Tap Add',
    stepMenu: 'Tap the three dots at the top right',
    stepInstallApp: 'Choose Install app, or Add to Home screen',
    unnamed: 'Device',
    smartSwitch: 'Wi-Fi switch',
    roomSensor: 'Room sensor',
    account: 'Account',
    close: 'Close',
    website: 'MageArts website',
    refreshing: 'Refreshing...',
    pullToRefresh: 'Pull to refresh',
    releaseToRefresh: 'Release to refresh',
    on: 'On',
    off: 'Off',
    unknown: 'Status unknown',
    // Never seen on screen: a dot says this, and a dot says nothing at all
    // to a screen reader.
    deviceOnline: 'Online',
    deviceOffline: 'Offline',
    back: 'Back to devices',
    // What the first site is called until somebody renames it. A site is
    // wherever the devices are - a house, an office, a workshop, a factory
    // floor - so the default has to be a word that fits all of them and
    // says nothing.
    firstSite: 'My site',
    siteHeading: 'Site',
    siteNameLabel: 'Site name',
    people: 'People',
    newLabel: 'New',
    startedHint:
      'When the device last booted. A time that keeps moving means it is restarting itself.',
    roleOwner: 'Owner',
    roleMember: 'Member',
    remove: 'Remove',
    leave: 'Leave this site',
    leaveHeading: 'Leave this site?',
    leaveBody:
      'You lose the site and its devices straight away. Everything stays where it is for everybody else, and the owner can invite you back.',
    leaveFailed: 'Could not leave. Check your connection and try again.',
    switchSite: 'Your sites',
    moreMenu: 'More',
    defaultLabel: 'Default',
    setDefault: 'Open on this site',
    siteSettings: 'Site settings',
    newSite: 'New site',
    newSiteHeading: 'New site',
    create: 'Create',
    deleteSite: 'Delete this site',
    deleteSiteHeading: 'Delete this site?',
    // Every consequence, before the field that asks them to mean it.
    deleteSiteWarn:
      'The devices in it are removed from your account. Each can be added again with the code printed on it, and whatever it is wired to goes on doing whatever it is doing. Anybody else in this site loses it straight away.',
    typeToConfirm: 'Type the site name to confirm',
    deleteLabel: 'Delete',
    deleteFailed: 'Could not delete. Check your connection and try again.',
    removeDevice: 'Remove from this site',
    removeDeviceHeading: 'Remove this device?',
    removeDeviceBody:
      'It leaves your account and stops appearing here. Whatever it is wired to goes on doing whatever it is doing, and it can be added again with the code printed on it.',
    removeFailed: 'Could not remove that. Check your connection and try again.',
    select: 'Select',
    done: 'Done',
    selected: 'selected',
    removeHeading: 'Remove this person?',
    removeBody:
      'They lose the site and everything in it straight away. You can invite them back at any time.',
    invitedLabel: 'Invited, not yet answered',
    revoke: 'Cancel',
    inviteHeading: 'Invite somebody',
    emailLabel: 'Email address',
    // Said here because it costs nothing and the alternative is an invitation
    // that silently never arrives.
    emailHint: 'The address they sign in to Google with, typed the way they use it.',
    sendInvite: 'Invite',
    sendingInvite: 'Sending the invitation',
    badEmail: 'That does not look like an email address.',
    inviteFailed: 'Could not send that invitation.',
    inviteSent: 'Invitation sent.',
    invitationsHeading: 'Invitations',
    notifications: 'Notifications',
    automations: 'Automations',
    noDevicesForAutomations: 'None of your devices can be switched on and off on a schedule yet.',
    noNotifications: 'Nothing to tell you.',
    scheduleRan: 'Schedule ran',
    turnedOn: 'Turned on',
    turnedOff: 'Turned off',
    devicesTab: 'Devices',
    invitedBy: 'Invited by',
    accept: 'Accept',
    decline: 'Decline',
    nameLabel: 'Name',
    nameHint: 'Optional. Left empty, it is called after what it is.',
    rename: 'Rename',
    maintenance: 'Maintenance',
    // The heading of the second group. Not "Danger": what makes this one
    // different is not how bad it is, it is who has to be standing where.
    cannotUndoHere: 'Cannot be undone from here',
    rebootWhat: 'Off the network for about half a minute, then back exactly as it was.',
    removeWhat: 'It leaves your account. Add it again with the code printed on it.',
    eraseWhat:
      'It leaves the network at once. Somebody has to go to the device, join the network it starts broadcasting, and set it up again.',
    reboot: 'Restart',
    rebootHeading: 'Restart this device?',
    rebootBody:
      'It goes off the network for a few seconds and comes back with everything as it was. Whatever is plugged into it keeps whatever it was doing.',
    eraseLabel: 'Factory reset',
    eraseHeading: 'Factory reset this device?',
    // Blunt on purpose. This is the only action in the portal that cannot be
    // undone from the portal.
    eraseWarning:
      'It will forget the Wi-Fi network and leave it straight away. Nobody can bring it back from here — somebody has to go to the device, join the network it starts broadcasting, and set it up again. It stays yours, and it keeps its setup code.',
    eraseConfirm: 'Reset',
    asked: 'Asked. The device will do it the moment it hears.',
    askedSlow: 'Asked. This device checks every 5 minutes, so it will happen within 5 minutes.',
    askFailed: 'Could not ask. Check your connection and try again.',
    save: 'Save',
    saveFailed: 'Could not save that. Check your connection and try again.',
    power: 'Power',
    // "Turning on", not "On": it says which way the switch is heading
    // without claiming it has arrived. The colour still follows what the
    // relay says it is doing, and that is the part that must not lie.
    noResponse: 'No response',
    iconGroups: {
      light: 'Lighting',
      air: 'Air',
      water: 'Water',
      outside: 'Outside',
      appliance: 'Appliances',
      general: 'General',
    },
    iconNames: {
      bulb: 'Light bulb',
      ceiling: 'Ceiling light',
      desk: 'Desk lamp',
      floor: 'Floor lamp',
      fan: 'Fan',
      vent: 'Extractor',
      ac: 'Air conditioner',
      heater: 'Heater',
      pump: 'Water pump',
      shower: 'Shower',
      bath: 'Bath',
      pond: 'Pond',
      plant: 'Plants',
      garden: 'Garden',
      sprinkler: 'Sprinkler',
      garage: 'Garage',
      washer: 'Washing machine',
      fridge: 'Fridge',
      pot: 'Cooker',
      coffee: 'Coffee machine',
      tv: 'Television',
      speaker: 'Speaker',
      router: 'Router',
      plug: 'Socket',
      power: 'Power',
      zap: 'Mains',
      siren: 'Alarm',
    },
    iconHeading: 'Choose an icon',
    editHeading: 'Edit device',
    statusSection: 'Status',
    turningOn: 'Turning on…',
    turningOff: 'Turning off…',
    // The command was accepted by the database; what has not happened is the
    // device answering. Saying so beats showing a light that is not on.
    noAnswer: 'The device has not answered. It may be offline.',
    commandFailed: 'Could not send that. Check your connection and try again.',
    details: 'Details',
    idLabel: 'Device ID',
    fwLabel: 'Firmware',
    ipLabel: 'Local address',
    signalLabel: 'Wi-Fi signal',
    // The interval is the firmware's, agreed in PROTOCOL.md. If it moves
    // there, it moves here.
    signalHint: 'Reported every 3 minutes while the device is online.',
    lastSeenLabel: 'Last seen',
    // Ordered weakest first. Bars are for glancing; these are what a screen
    // reader gets, and what somebody moving the device around compares.
    signalWords: ['Very weak', 'Weak', 'Good', 'Excellent'],
    // `seen` is written once per boot (PROTOCOL.md), so this is when it last
    // started, not when it was last heard from.
    startedLabel: 'Last started',
    notFound: 'This device is not in your list.',
    schedules: 'Schedules',
    // The limit is the board's, not the portal's: it has no clock that runs
    // without power. PROTOCOL.md, "Schedules".
    scheduleHint:
      'Kept on the device, so it runs even when the internet is down. After a power cut, it waits until the device is back online to know the time.',
    addSchedule: 'Add',
    noSchedules: 'No schedules yet.',
    newScheduleHeading: 'New schedule',
    editScheduleHeading: 'Edit schedule',
    timeLabel: 'Time',
    actionLabel: 'Action',
    turnOn: 'Turn on',
    turnOff: 'Turn off',
    daysLabel: 'Repeat on',
    dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    dayLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    everyDay: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    scheduleDevices: 'Devices',
    pickDevices: 'Choose devices',
    pickTime: 'Enter a time.',
    pickDay: 'Pick at least one day.',
    pickDevice: 'Pick at least one device.',
    scheduleFull: 'Each device can hold 8 schedules. Already full:',
    scheduleActive: 'Active',
    editSchedule: 'Edit',
    scheduleHistory: 'History',
    enableSelected: 'Activate',
    disableSelected: 'Pause',
    deleteSchedulesHeading: 'Delete these schedules?',
    deleteSchedulesBody:
      'They are removed from every device that has them. The devices keep whatever they are doing now.',
    historyHeading: 'What happened',
    historyHint: 'The last 7 days. A switch with no network keeps its times and reports them when it is back.',
    noHistory: 'Nothing in the last 7 days.',
    ranOn: 'Switched on',
    ranOff: 'Switched off',
    bySchedule: 'on schedule',
    byCmd: 'from the app',
    byTap: 'by the button',
    deleteSchedule: 'Delete schedule',
    deleteScheduleHeading: 'Delete this schedule?',
    deleteScheduleBody: 'It is removed from every device it is set on.',
    agoNow: 'just now',
    agoMinutes: '{n} min ago',
    agoHours: '{n} h ago',
    agoDays: '{n} d ago',
    readingOld: 'last reading',
    noReading: 'No reading yet',
    readingsHeading: 'Last 24 hours',
    readingsHint: 'One reading every 5 minutes. Gaps are times the device had no power or no clock.',
    noReadings: 'Nothing in the last 24 hours.',
    temperature: 'Temperature',
    humidity: 'Humidity',
    lowest: 'Low',
    highest: 'High',
  },
}

const th: Copy = {
  lang: 'th',
  title: 'MageArts — กฤษณะ วัฒนพิพัฒน์สกุล',
  description:
    'MageArts คือชื่อที่ กฤษณะ วัฒนพิพัฒน์สกุล ใช้ทำงาน เป็นนักพัฒนาและเมกเกอร์ ตอนนี้กำลังทำโมดูลสวิตช์ Wi-Fi ที่ตั้งค่าได้จากมือถือ',
  skipToContent: 'ข้ามไปยังเนื้อหา',
  hero: {
    heading: 'ผมสร้างอุปกรณ์เชื่อมต่อ',
    body: 'MageArts คือชื่อที่ผมใช้ทำงาน ผมชื่อ กฤษณะ วัฒนพิพัฒน์สกุล เป็นนักพัฒนาและเมกเกอร์ ตอนนี้กำลังทำโมดูลสวิตช์ Wi-Fi ที่ตั้งค่าได้จากมือถือ',
    cta: 'ดูสิ่งที่กำลังทำ',
  },
  work: {
    heading: 'สิ่งที่กำลังทำ',
    status: 'อยู่ระหว่างพัฒนา',
    name: 'โมดูลสวิตช์ Wi-Fi',
    body: 'โมดูลที่ต่อคั่นบนสาย L ของวงจร แล้วสั่งเปิดปิดจากมือถือ — ดวงไฟ พัดลม ปลั๊ก หรืออะไรก็ตามที่ต่อผ่านมัน ไม่ต้องซื้อ hub เพิ่ม และใช้ผ่านเบราว์เซอร์ได้ทุกเครื่อง ตัวโมดูลเปิดหน้าตั้งค่าให้เอง ส่วนหน้าควบคุมเพิ่มลงหน้าจอโฮมได้เหมือนแอป',
    caveat: 'ยังไม่ใช่ตัวที่ติดแทนสวิตช์บนผนัง — มันไปอยู่ในสายไฟ ไม่ได้อยู่หน้าผนัง และยังพัฒนาไม่เสร็จ ยังไม่ได้วางขาย',
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
  portal: {
    link: 'พอร์ทัล',
    heading: 'อุปกรณ์ของคุณ',
    signedOut: 'เข้าสู่ระบบเพื่อดูอุปกรณ์ที่คุณเพิ่มไว้',
    signIn: 'ดำเนินการต่อด้วย Google',
    signInWhy: 'เราใช้บัญชี Google เพื่อรู้ว่าอุปกรณ์ไหนเป็นของคุณเท่านั้น',
    signOut: 'ออกจากระบบ',
    empty: 'ยังไม่มีอุปกรณ์',
    emptyForMember: 'สถานที่นี้ยังไม่มีอุปกรณ์ เจ้าของสถานที่เท่านั้นที่เพิ่มได้',
    addButton: 'เพิ่มอุปกรณ์',
    addHeading: 'เพิ่มอุปกรณ์',
    addHint: 'รหัสจะแสดงตอนตั้งค่าอุปกรณ์ และพิมพ์อยู่บนตัวเครื่องด้วย',
    codeLabel: 'รหัสตั้งค่า',
    cancel: 'ยกเลิก',
    signInFailed: 'เข้าสู่ระบบไม่สำเร็จ ลองตรวจการเชื่อมต่อแล้วลองใหม่',
    add: 'เพิ่ม',
    adding: 'กำลังเพิ่ม',
    loading: 'กำลังโหลด',
    badFormat: 'รหัสอุปกรณ์คือตัวอักษร 6 ตัว ขีดกลาง แล้วอีก 6 ตัว',
    refused: 'รหัสนี้ใช้ไม่ได้ ลองตรวจดูอีกครั้ง หรืออุปกรณ์อาจมีเจ้าของแล้ว',
    offline: 'ไม่มีการเชื่อมต่อ',
    installHeading: 'ติดตั้งแอป',
    installWhy: 'เปิดแล้วเหมือนแอป เต็มจอ มีไอคอนของตัวเอง และกลับมาที่เดิมที่ค้างไว้',
    installNow: 'ติดตั้ง',
    installLater: 'ไว้ก่อน',
    installWording: 'คำที่ขึ้นบนเครื่องคุณอาจต่างออกไปตามเวอร์ชัน ให้ดูที่ไอคอนเป็นหลัก',
    stepShare: 'แตะปุ่มแชร์ที่แถบล่างของจอ',
    stepAddHome: 'เลือก เพิ่มไปยังหน้าจอโฮม',
    stepConfirmAdd: 'แตะ เพิ่ม',
    stepMenu: 'แตะจุดสามจุดมุมขวาบน',
    stepInstallApp: 'เลือก ติดตั้งแอป หรือ เพิ่มลงในหน้าจอหลัก',
    unnamed: 'อุปกรณ์',
    smartSwitch: 'สวิตช์ Wi-Fi',
    roomSensor: 'เซนเซอร์ในห้อง',
    account: 'บัญชี',
    close: 'ปิด',
    website: 'เว็บไซต์ MageArts',
    refreshing: 'กำลังรีเฟรช...',
    pullToRefresh: 'ดึงลงเพื่อรีเฟรช',
    releaseToRefresh: 'ปล่อยเพื่อรีเฟรช',
    on: 'เปิดอยู่',
    off: 'ปิดอยู่',
    unknown: 'ยังไม่ทราบสถานะ',
    deviceOnline: 'ออนไลน์',
    deviceOffline: 'ออฟไลน์',
    back: 'กลับไปหน้าอุปกรณ์',
    firstSite: 'สถานที่ของฉัน',
    siteHeading: 'สถานที่',
    siteNameLabel: 'ชื่อสถานที่',
    people: 'สมาชิก',
    newLabel: 'ใหม่',
    startedHint: 'เวลาที่อุปกรณ์บูตครั้งล่าสุด ถ้าเวลานี้ขยับเรื่อยๆ แปลว่าเครื่องกำลังรีสตาร์ทตัวเอง',
    roleOwner: 'เจ้าของ',
    roleMember: 'สมาชิก',
    remove: 'นำออก',
    leave: 'ออกจากสถานที่นี้',
    leaveHeading: 'ออกจากสถานที่นี้ใช่ไหม',
    leaveBody:
      'คุณจะเข้าถึงสถานที่นี้และอุปกรณ์ในนั้นไม่ได้ทันที ทุกอย่างยังอยู่เหมือนเดิมสำหรับคนอื่น และเจ้าของเชิญคุณกลับมาได้',
    leaveFailed: 'ออกไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    switchSite: 'สถานที่ของคุณ',
    moreMenu: 'เมนู',
    defaultLabel: 'ค่าเริ่มต้น',
    setDefault: 'เปิดมาที่นี่เป็นค่าเริ่มต้น',
    siteSettings: 'ตั้งค่าสถานที่นี้',
    newSite: 'เพิ่มสถานที่',
    newSiteHeading: 'สถานที่ใหม่',
    create: 'สร้าง',
    deleteSite: 'ลบสถานที่นี้',
    deleteSiteHeading: 'ลบสถานที่นี้ใช่ไหม',
    deleteSiteWarn:
      'อุปกรณ์ที่อยู่ในนั้นจะถูกนำออกจากบัญชีของคุณ แต่ละตัวเพิ่มกลับได้ด้วยรหัสที่พิมพ์อยู่บนตัวเครื่อง และสิ่งที่ต่ออยู่กับมันจะยังทำงานค้างไว้อย่างเดิม ส่วนคนอื่นในสถานที่นี้จะเข้าถึงไม่ได้ทันที',
    typeToConfirm: 'พิมพ์ชื่อสถานที่เพื่อยืนยัน',
    deleteLabel: 'ลบ',
    deleteFailed: 'ลบไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    removeDevice: 'นำออกจากสถานที่นี้',
    removeDeviceHeading: 'นำอุปกรณ์นี้ออกใช่ไหม',
    removeDeviceBody:
      'อุปกรณ์จะออกจากบัญชีของคุณและหายไปจากรายการ สิ่งที่ต่ออยู่กับมันจะยังทำงานค้างไว้อย่างเดิม และเพิ่มกลับได้ด้วยรหัสที่พิมพ์อยู่บนตัวเครื่อง',
    removeFailed: 'นำออกไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    select: 'เลือก',
    done: 'เสร็จ',
    selected: 'ที่เลือก',
    removeHeading: 'นำคนนี้ออกใช่ไหม',
    removeBody: 'เขาจะเข้าถึงสถานที่นี้และทุกอย่างในนั้นไม่ได้ทันที เชิญกลับมาใหม่เมื่อไหร่ก็ได้',
    invitedLabel: 'เชิญแล้ว ยังไม่ตอบรับ',
    revoke: 'ยกเลิก',
    inviteHeading: 'เชิญคนเข้าบ้าน',
    emailLabel: 'อีเมล',
    emailHint: 'อีเมลที่เขาใช้ล็อกอิน Google พิมพ์ให้ตรงกับที่เขาใช้จริง',
    sendInvite: 'เชิญ',
    sendingInvite: 'กำลังส่งคำเชิญ',
    badEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
    inviteFailed: 'ส่งคำเชิญไม่สำเร็จ',
    inviteSent: 'ส่งคำเชิญแล้ว',
    invitationsHeading: 'คำเชิญ',
    notifications: 'การแจ้งเตือน',
    automations: 'อัตโนมัติ',
    noDevicesForAutomations: 'ยังไม่มีอุปกรณ์ที่ตั้งเวลาเปิดปิดได้',
    noNotifications: 'ยังไม่มีอะไรต้องแจ้ง',
    scheduleRan: 'ตั้งเวลาทำงาน',
    turnedOn: 'เปิดแล้ว',
    turnedOff: 'ปิดแล้ว',
    devicesTab: 'อุปกรณ์',
    invitedBy: 'เชิญโดย',
    accept: 'เข้าร่วม',
    decline: 'ปฏิเสธ',
    nameLabel: 'ชื่อ',
    nameHint: 'ไม่ใส่ก็ได้ ถ้าเว้นไว้จะเรียกตามชนิดของอุปกรณ์',
    rename: 'เปลี่ยนชื่อ',
    maintenance: 'การบำรุงรักษา',
    cannotUndoHere: 'ย้อนกลับจากที่นี่ไม่ได้',
    rebootWhat: 'หลุดจากเครือข่ายราวครึ่งนาที แล้วกลับมาเหมือนเดิมทุกอย่าง',
    removeWhat: 'อุปกรณ์จะออกจากบัญชีของคุณ เพิ่มกลับได้ด้วยรหัสที่พิมพ์อยู่บนตัวเครื่อง',
    eraseWhat:
      'อุปกรณ์จะหลุดจากเครือข่ายทันที ต้องมีคนไปที่ตัวเครื่อง ต่อเข้าเครือข่ายที่มันเปิดขึ้นมา แล้วตั้งค่าใหม่',
    reboot: 'รีสตาร์ท',
    rebootHeading: 'รีสตาร์ทอุปกรณ์นี้ใช่ไหม',
    rebootBody:
      'อุปกรณ์จะหลุดจากเครือข่ายไม่กี่วินาทีแล้วกลับมาเหมือนเดิมทุกอย่าง สิ่งที่ต่ออยู่กับมันจะยังทำงานค้างไว้อย่างเดิม',
    eraseLabel: 'รีเซ็ตเป็นค่าโรงงาน',
    eraseHeading: 'รีเซ็ตอุปกรณ์นี้เป็นค่าโรงงานใช่ไหม',
    eraseWarning:
      'อุปกรณ์จะลืมเครือข่าย Wi-Fi แล้วหลุดออกทันที เรียกกลับจากหน้านี้ไม่ได้ ต้องมีคนเดินไปที่ตัวเครื่อง ต่อเข้าเครือข่ายที่มันเปิดขึ้นมา แล้วตั้งค่าใหม่ ตัวเครื่องยังเป็นของคุณ และรหัสติดตั้งยังเหมือนเดิม',
    eraseConfirm: 'รีเซ็ต',
    asked: 'ส่งคำสั่งแล้ว อุปกรณ์จะทำทันทีที่ได้ยิน',
    askedSlow: 'ส่งคำสั่งแล้ว อุปกรณ์นี้ตรวจคำสั่งทุก 5 นาที จึงจะทำภายใน 5 นาที',
    askFailed: 'ส่งคำสั่งไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    save: 'บันทึก',
    saveFailed: 'บันทึกไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    power: 'เปิด/ปิด',
    noResponse: 'ไม่ตอบสนอง',
    iconGroups: {
      light: 'แสงสว่าง',
      air: 'อากาศ',
      water: 'น้ำ',
      outside: 'นอกบ้าน',
      appliance: 'เครื่องใช้ไฟฟ้า',
      general: 'ทั่วไป',
    },
    iconNames: {
      bulb: 'หลอดไฟ',
      ceiling: 'ไฟเพดาน',
      desk: 'โคมไฟตั้งโต๊ะ',
      floor: 'โคมไฟตั้งพื้น',
      fan: 'พัดลม',
      vent: 'พัดลมดูดอากาศ',
      ac: 'เครื่องปรับอากาศ',
      heater: 'เครื่องทำความร้อน',
      pump: 'ปั๊มน้ำ',
      shower: 'ฝักบัว',
      bath: 'อ่างอาบน้ำ',
      pond: 'บ่อน้ำ',
      plant: 'ต้นไม้',
      garden: 'สวน',
      sprinkler: 'สปริงเกอร์',
      garage: 'โรงรถ',
      washer: 'เครื่องซักผ้า',
      fridge: 'ตู้เย็น',
      pot: 'เตา',
      coffee: 'เครื่องชงกาแฟ',
      tv: 'โทรทัศน์',
      speaker: 'ลำโพง',
      router: 'เราเตอร์',
      plug: 'ปลั๊กไฟ',
      power: 'เปิดปิด',
      zap: 'ไฟฟ้า',
      siren: 'สัญญาณเตือน',
    },
    iconHeading: 'เลือกไอคอน',
    editHeading: 'แก้ไขอุปกรณ์',
    statusSection: 'สถานะ',
    turningOn: 'กำลังเปิด…',
    turningOff: 'กำลังปิด…',
    noAnswer: 'อุปกรณ์ยังไม่ตอบ อาจไม่ได้เชื่อมต่ออยู่',
    commandFailed: 'ส่งคำสั่งไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่',
    details: 'ข้อมูลอุปกรณ์',
    idLabel: 'รหัสอุปกรณ์',
    fwLabel: 'เฟิร์มแวร์',
    ipLabel: 'IP ในบ้าน',
    signalLabel: 'สัญญาณ Wi-Fi',
    signalHint: 'อุปกรณ์รายงานทุก 3 นาที ขณะที่ออนไลน์',
    lastSeenLabel: 'ออนไลน์ล่าสุด',
    signalWords: ['อ่อนมาก', 'อ่อน', 'ดี', 'ดีมาก'],
    startedLabel: 'เริ่มทำงานล่าสุด',
    notFound: 'ไม่พบอุปกรณ์นี้ในรายการของคุณ',
    schedules: 'ตั้งเวลา',
    scheduleHint:
      'ตารางเวลาเก็บอยู่ในตัวเครื่อง จึงทำงานได้แม้เน็ตหลุด แต่ถ้าไฟดับ เครื่องต้องรอเน็ตกลับมาก่อนจึงจะรู้เวลา',
    addSchedule: 'เพิ่ม',
    noSchedules: 'ยังไม่ได้ตั้งเวลา',
    newScheduleHeading: 'ตั้งเวลาใหม่',
    editScheduleHeading: 'แก้ไขเวลา',
    timeLabel: 'เวลา',
    actionLabel: 'สั่งให้',
    turnOn: 'เปิด',
    turnOff: 'ปิด',
    daysLabel: 'ทำซ้ำทุกวัน',
    dayShort: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    dayLong: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
    everyDay: 'ทุกวัน',
    weekdays: 'จันทร์–ศุกร์',
    weekends: 'เสาร์–อาทิตย์',
    scheduleDevices: 'อุปกรณ์',
    pickDevices: 'เลือกอุปกรณ์',
    pickTime: 'กรอกเวลา',
    pickDay: 'เลือกอย่างน้อยหนึ่งวัน',
    pickDevice: 'เลือกอุปกรณ์อย่างน้อยหนึ่งเครื่อง',
    scheduleFull: 'ตั้งเวลาได้เครื่องละ 8 รายการ เครื่องที่เต็มแล้ว:',
    scheduleActive: 'ใช้งาน',
    editSchedule: 'แก้ไข',
    scheduleHistory: 'ประวัติ',
    enableSelected: 'เปิดใช้งาน',
    disableSelected: 'หยุดไว้',
    deleteSchedulesHeading: 'ลบเวลาที่เลือกใช่ไหม',
    deleteSchedulesBody: 'จะถูกลบออกจากทุกเครื่องที่ตั้งไว้ สถานะของเครื่องตอนนี้ไม่เปลี่ยน',
    historyHeading: 'ที่ผ่านมา',
    historyHint: 'ย้อนหลัง 7 วัน ถ้าเน็ตหลุด อุปกรณ์ยังทำตามเวลาเดิมและจะส่งประวัติมาเมื่อกลับมาออนไลน์',
    noHistory: 'ไม่มีรายการใน 7 วันที่ผ่านมา',
    ranOn: 'เปิด',
    ranOff: 'ปิด',
    bySchedule: 'ตามเวลาที่ตั้ง',
    byCmd: 'จากแอป',
    byTap: 'จากปุ่มที่เครื่อง',
    deleteSchedule: 'ลบเวลานี้',
    deleteScheduleHeading: 'ลบเวลานี้ใช่ไหม',
    deleteScheduleBody: 'จะถูกลบออกจากทุกอุปกรณ์ที่ตั้งไว้',
    agoNow: 'เมื่อสักครู่',
    agoMinutes: '{n} นาทีที่แล้ว',
    agoHours: '{n} ชม. ที่แล้ว',
    agoDays: '{n} วันที่แล้ว',
    readingOld: 'ค่าล่าสุด',
    noReading: 'ยังไม่มีค่าที่วัดได้',
    readingsHeading: '24 ชั่วโมงที่ผ่านมา',
    readingsHint: 'วัดทุก 5 นาที ช่วงที่ขาดหายคือช่วงที่อุปกรณ์ไม่มีไฟหรือยังไม่รู้เวลา',
    noReadings: 'ไม่มีข้อมูลใน 24 ชั่วโมงที่ผ่านมา',
    temperature: 'อุณหภูมิ',
    humidity: 'ความชื้น',
    lowest: 'ต่ำสุด',
    highest: 'สูงสุด',
  },
}

const messages: Record<Locale, Copy> = { en, th }

/*
 * The pages that have a URL in both languages. `portal` is the devices list,
 * and the three beside it are its other tabs - real pages rather than sheets,
 * so that the back button closes them, the bottom bar can show which one is
 * open, and a link to either can be sent.
 */
export type Page = 'home' | 'portal' | 'automations' | 'notifications' | 'account'

/**
 * The URL of a page in a language. Built in one place because the language
 * menu has to link to the *same* page in the other language - switching to
 * Thai from the portal should not land somebody back on the sales page.
 */
export function pathFor(loc: Locale, page: Page): string {
  const base = loc === 'th' ? '/th' : ''

  if (page === 'home') return base || '/'
  if (page === 'portal') return `${base}/portal`

  return `${base}/portal/${page}`
}

// The current site's own page. It has no `Page` of its own because it is not
// a tab - it belongs to the devices tab, the way a device's page does.
export function sitePath(loc: Locale): string {
  return `${pathFor(loc, 'portal')}/site`
}

export function devicePath(loc: Locale, id: string): string {
  return `${pathFor(loc, 'portal')}/device/${id}`
}

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

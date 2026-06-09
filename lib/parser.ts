import {
  format,
  addDays,
  addWeeks,
  addMonths,
  nextDay,
  startOfWeek,
  startOfDay,
  getDay,
  isAfter,
} from 'date-fns'
import type { Day } from 'date-fns'
import type { ParsedInput } from './types'

// ── Config ─────────────────────────────────────────────────────────────────────

/**
 * When the spoken weekday matches today ("friday" said on a Friday):
 *   true  → return NEXT week's Friday (skip to 7 days out)
 *   false → return today
 */
const SAME_DAY_MEANS_NEXT_WEEK = true

/** Words that trigger type="task" when found anywhere in the input */
export const ACTION_VERBS = [
  'call', 'email', 'text', 'message', 'send', 'finish', 'complete', 'build',
  'fix', 'pay', 'schedule', 'meet', 'meeting', 'meets', 'met',
  'follow up', 'follow-up', 'followup', 'follow through',
  'submit', 'review', 'ship', 'prep', 'prepare', 'write', 'create', 'update',
  'check', 'buy', 'order', 'pick up', 'pickup',
  'contact', 'reach out', 'reach', 'push', 'deploy', 'release', 'tag', 'merge',
  'test', 'run', 'get', 'make', 'handle', 'set up', 'setup',
  'book', 'confirm', 'cancel', 'reschedule',
  'research', 'draft', 'edit', 'post', 'upload', 'download',
  'attend', 'join', 'ask', 'tell', 'show', 'present', 'demo',
  'pitch', 'close', 'sign', 'file', 'register', 'apply',
  'deliver', 'share', 'notify', 'invoice', 'collect', 'approve', 'reject',
  'commit', 'return', 'exchange', 'drop', 'look into', 'send out',
]

const WEEKDAY_MAP: Record<string, Day> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

/** Filler phrases stripped from the start of the input before producing the title */
const FILLER_PREFIXES = [
  "don't forget to", "dont forget to",
  "remember to", "remember that",
  "i need to", "i have to", "i've got to",
  "need to", "have to", "got to", "gotta",
  "please", "make sure to",
  "don't forget", "dont forget",
  "make sure",
  "remember",
  "must",
  "should",
]

/** Capitalized words that look like names but are not client names */
const EXCLUDED_CAPS = new Set([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Mon', 'Tue', 'Tues', 'Wed', 'Thu', 'Thur', 'Thurs', 'Fri', 'Sat', 'Sun',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
  'Today', 'Tomorrow', 'Yesterday', 'Tonight', 'Morning', 'Afternoon', 'Evening',
  'Next', 'This', 'Last', 'In', 'On', 'At', 'By', 'For', 'With', 'To', 'Of', 'From',
  'The', 'A', 'An', 'And', 'Or', 'But', 'So', 'Yet', 'About', 'Before', 'After',
  'I', 'Me', 'My', 'We', 'Our', 'You', 'Your', 'He', 'She', 'It', 'They', 'Their',
])

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Next occurrence of `day` from `from`. Honors SAME_DAY_MEANS_NEXT_WEEK. */
function nextWeekdayFrom(from: Date, day: Day): Date {
  if (!SAME_DAY_MEANS_NEXT_WEEK && (getDay(from) as Day) === day) return from
  return nextDay(from, day)
}

/** The occurrence of `day` in the following calendar week (Mon–Sun). */
function weekdayInNextWeek(from: Date, day: Day): Date {
  const nextMon = startOfWeek(addWeeks(from, 1), { weekStartsOn: 1 })
  const offset = (day - getDay(nextMon) + 7) % 7
  return addDays(nextMon, offset)
}

/** The occurrence of `day` in the current calendar week (Mon–Sun). */
function weekdayInThisWeek(from: Date, day: Day): Date {
  const thisMon = startOfWeek(from, { weekStartsOn: 1 })
  const offset = (day - getDay(thisMon) + 7) % 7
  return addDays(thisMon, offset)
}

// ── Date Extraction ────────────────────────────────────────────────────────────

interface DateResult {
  due_date: string | null
  removedPhrase: string | null
}

function extractDate(lower: string, now: Date): DateResult {
  const t = startOfDay(now)
  type Hit = { date: Date; phrase: string }

  const DAYS_PATTERN = Object.keys(WEEKDAY_MAP).join('|')
  const MONTHS_PATTERN = Object.keys(MONTH_MAP).join('|')

  const patterns: Array<() => Hit | null> = [
    // "in N days / weeks / months"
    () => {
      const m = lower.match(/\bin\s+(\d+)\s+(days?|weeks?|months?)\b/)
      if (!m) return null
      const n = parseInt(m[1])
      const u = m[2][0]
      const date = u === 'd' ? addDays(t, n) : u === 'w' ? addWeeks(t, n) : addMonths(t, n)
      return { date, phrase: m[0] }
    },

    // "next week" / "next month" — must come before "next [weekday]"
    () => {
      const m = lower.match(/\bnext\s+(week|month)\b/)
      if (!m) return null
      return { date: m[1] === 'week' ? addDays(t, 7) : addMonths(t, 1), phrase: m[0] }
    },

    // "next [weekday]" → the occurrence in the following calendar week
    () => {
      const m = lower.match(new RegExp(`\\bnext\\s+(${DAYS_PATTERN})\\b`))
      if (!m) return null
      const day = WEEKDAY_MAP[m[1]]
      return day !== undefined ? { date: weekdayInNextWeek(t, day), phrase: m[0] } : null
    },

    // "this [weekday]" → the occurrence in the current calendar week
    () => {
      const m = lower.match(new RegExp(`\\bthis\\s+(${DAYS_PATTERN})\\b`))
      if (!m) return null
      const day = WEEKDAY_MAP[m[1]]
      return day !== undefined ? { date: weekdayInThisWeek(t, day), phrase: m[0] } : null
    },

    // "tomorrow" / "tmrw" / "tmr"
    () => {
      const m = lower.match(/\b(tomorrow|tmrw|tmr)\b/)
      return m ? { date: addDays(t, 1), phrase: m[0] } : null
    },

    // "today"
    () => {
      const m = lower.match(/\btoday\b/)
      return m ? { date: t, phrase: m[0] } : null
    },

    // "yesterday"
    () => {
      const m = lower.match(/\byesterday\b/)
      return m ? { date: addDays(t, -1), phrase: m[0] } : null
    },

    // bare weekday — next occurrence (no "next"/"this" prefix)
    () => {
      const m = lower.match(new RegExp(`\\b(${DAYS_PATTERN})\\b`))
      if (!m) return null
      const day = WEEKDAY_MAP[m[1]]
      return day !== undefined ? { date: nextWeekdayFrom(t, day), phrase: m[0] } : null
    },

    // "Month DD[th/st/nd/rd]" — e.g. "June 12", "dec 3rd"
    () => {
      const m = lower.match(new RegExp(`\\b(${MONTHS_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`))
      if (!m) return null
      const month = MONTH_MAP[m[1]]
      const dayNum = parseInt(m[2])
      if (month === undefined || dayNum < 1 || dayNum > 31) return null
      let d = new Date(t.getFullYear(), month, dayNum)
      if (!isAfter(d, addDays(t, -1))) d = new Date(t.getFullYear() + 1, month, dayNum)
      return { date: d, phrase: m[0] }
    },

    // "M/D" or "MM/DD" — e.g. "6/12"
    () => {
      const m = lower.match(/\b(\d{1,2})\/(\d{1,2})\b/)
      if (!m) return null
      const month = parseInt(m[1]) - 1
      const dayNum = parseInt(m[2])
      if (month < 0 || month > 11 || dayNum < 1 || dayNum > 31) return null
      let d = new Date(t.getFullYear(), month, dayNum)
      if (!isAfter(d, addDays(t, -1))) d = new Date(t.getFullYear() + 1, month, dayNum)
      return { date: d, phrase: m[0] }
    },

    // "the Nth" / "on the Nth" / bare "12th" → next occurrence of that day-of-month
    () => {
      const m = lower.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(st|nd|rd|th)\b/)
      if (!m) return null
      const dayNum = parseInt(m[1])
      if (dayNum < 1 || dayNum > 31) return null
      let d = new Date(t.getFullYear(), t.getMonth(), dayNum)
      if (!isAfter(d, addDays(t, -1))) d = new Date(t.getFullYear(), t.getMonth() + 1, dayNum)
      return { date: d, phrase: m[0] }
    },
  ]

  for (const tryPattern of patterns) {
    const hit = tryPattern()
    if (hit) return { due_date: fmtDate(hit.date), removedPhrase: hit.phrase }
  }

  return { due_date: null, removedPhrase: null }
}

// ── Client Extraction ──────────────────────────────────────────────────────────

interface ClientResult {
  client_tag: string | null
  removedPhrase: string | null
}

function extractClient(input: string): ClientResult {
  // Priority 1: explicit @Name — most reliable, encourage this syntax
  const atM = input.match(/@([A-Za-z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/)
  if (atM) return { client_tag: atM[1].trim(), removedPhrase: atM[0] }

  // Priority 2: "for [CapName]" or "with [CapName]"
  const prepM = input.match(/\b(?:for|with)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]*)*)/)
  if (prepM) return { client_tag: prepM[1].trim(), removedPhrase: prepM[0] }

  // Priority 3: First capitalized word (or pair) after position 0 that's not a known non-name
  const words = input.trim().split(/\s+/)
  for (let i = 1; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-Z]/g, '')
    if (clean.length < 2 || !/^[A-Z]/.test(clean) || EXCLUDED_CAPS.has(clean)) continue

    // Grab adjacent capitalized word for multi-word names (e.g. "Acme Corp")
    const next = i + 1 < words.length ? words[i + 1].replace(/[^a-zA-Z]/g, '') : ''
    if (next && /^[A-Z]/.test(next) && !EXCLUDED_CAPS.has(next)) {
      return { client_tag: `${clean} ${next}`, removedPhrase: `${words[i]} ${words[i + 1]}` }
    }
    return { client_tag: clean, removedPhrase: words[i] }
  }

  return { client_tag: null, removedPhrase: null }
}

// ── Title Cleanup ──────────────────────────────────────────────────────────────

function cleanTitle(raw: string, removedDate: string | null, removedClient: string | null): string {
  let t = raw

  if (removedDate) t = t.replace(new RegExp(escRe(removedDate), 'gi'), ' ')
  if (removedClient) t = t.replace(new RegExp(escRe(removedClient), 'gi'), ' ')

  t = t.replace(/\s+/g, ' ').trim()

  // Strip filler prefixes — sorted longest-first so "don't forget to" beats "don't forget"
  const sorted = [...FILLER_PREFIXES].sort((a, b) => b.length - a.length)
  for (const filler of sorted) {
    if (t.toLowerCase().startsWith(filler)) {
      t = t.slice(filler.length).trimStart()
      break
    }
  }

  // Strip residual leading "to "
  t = t.replace(/^to\s+/i, '')

  // Strip leading/trailing connector noise
  t = t.replace(/^(for|on|at|by|in|about|with|before|after|the)\s+/i, '')
  t = t.replace(/\s+(for|on|at|by|in|about|with|before|after)\s*$/i, '')

  t = t.replace(/\s+/g, ' ').trim()

  // Capitalize first letter
  return t.length > 0 ? t[0].toUpperCase() + t.slice(1) : raw.trim()
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function parseInput(raw: string): ParsedInput {
  try {
    const trimmed = raw.trim()
    if (!trimmed) return { type: 'memory', title: raw, due_date: null, client_tag: null }

    const now = new Date()
    const lower = trimmed.toLowerCase()

    const { due_date, removedPhrase: removedDate } = extractDate(lower, now)
    const { client_tag, removedPhrase: removedClient } = extractClient(trimmed)

    const title = cleanTitle(trimmed, removedDate, removedClient)

    const hasVerb = ACTION_VERBS.some(verb =>
      new RegExp(`\\b${escRe(verb)}\\b`, 'i').test(lower)
    )
    const type = hasVerb || due_date !== null ? 'task' : 'memory'

    return { type, title, due_date, client_tag }
  } catch {
    return { type: 'memory', title: raw.trim() || raw, due_date: null, client_tag: null }
  }
}

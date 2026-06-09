/**
 * localStorage persistence layer — zero external dependencies.
 * Each collection is stored as a JSON array under its own key.
 * All reads are wrapped in try/catch so a missing or corrupt key
 * always returns [] instead of throwing.
 */

import type { Task, IncomeEntry, Client } from './types'

const KEYS = {
  tasks: 'cc_tasks',
  income: 'cc_income',
  clients: 'cc_clients',
} as const

// ── Core helpers ───────────────────────────────────────────────────────────────

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

const uid = (): string => crypto.randomUUID()
const now = (): string => new Date().toISOString()

// ── Tasks ──────────────────────────────────────────────────────────────────────

export const getTasks = (): Task[] =>
  read<Task>(KEYS.tasks).sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

export function addTask(data: Omit<Task, 'id' | 'created_at'>): Task {
  const all = read<Task>(KEYS.tasks)
  const task: Task = { ...data, id: uid(), created_at: now() }
  write(KEYS.tasks, [...all, task])
  return task
}

export function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Task | null {
  const all = read<Task>(KEYS.tasks)
  const i = all.findIndex(t => t.id === id)
  if (i === -1) return null
  all[i] = { ...all[i], ...updates }
  write(KEYS.tasks, all)
  return all[i]
}

export function removeTask(id: string): void {
  write(KEYS.tasks, read<Task>(KEYS.tasks).filter(t => t.id !== id))
}

// ── Income entries ─────────────────────────────────────────────────────────────

export const getIncomeEntries = (): IncomeEntry[] =>
  read<IncomeEntry>(KEYS.income).sort((a, b) => b.date.localeCompare(a.date))

export function addIncomeEntry(data: Omit<IncomeEntry, 'id' | 'created_at'>): IncomeEntry {
  const all = read<IncomeEntry>(KEYS.income)
  const entry: IncomeEntry = { ...data, id: uid(), created_at: now() }
  write(KEYS.income, [...all, entry])
  return entry
}

export function updateIncomeEntry(
  id: string,
  updates: Partial<Omit<IncomeEntry, 'id' | 'created_at'>>
): IncomeEntry | null {
  const all = read<IncomeEntry>(KEYS.income)
  const i = all.findIndex(e => e.id === id)
  if (i === -1) return null
  all[i] = { ...all[i], ...updates }
  write(KEYS.income, all)
  return all[i]
}

export function removeIncomeEntry(id: string): void {
  write(KEYS.income, read<IncomeEntry>(KEYS.income).filter(e => e.id !== id))
}

// ── Clients ────────────────────────────────────────────────────────────────────

export const getClients = (): Client[] =>
  read<Client>(KEYS.clients).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

export function addClient(data: Omit<Client, 'id' | 'created_at' | 'total_revenue'>): Client {
  const all = read<Client>(KEYS.clients)
  const client: Client = { ...data, id: uid(), created_at: now() }
  write(KEYS.clients, [...all, client])
  return client
}

export function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'created_at' | 'total_revenue'>>
): Client | null {
  const all = read<Client>(KEYS.clients)
  const i = all.findIndex(c => c.id === id)
  if (i === -1) return null
  all[i] = { ...all[i], ...updates }
  write(KEYS.clients, all)
  return all[i]
}

export function removeClient(id: string): void {
  write(KEYS.clients, read<Client>(KEYS.clients).filter(c => c.id !== id))
}

// ── Export / Import ────────────────────────────────────────────────────────────

export function exportAllData(): void {
  const payload = {
    tasks: read<Task>(KEYS.tasks),
    income: read<IncomeEntry>(KEYS.income),
    clients: read<Client>(KEYS.clients),
    exportedAt: new Date().toISOString(),
    version: 1,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `command-center-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  tasks: number
  income: number
  clients: number
}

export function importAllData(jsonString: string): ImportResult {
  const data = JSON.parse(jsonString) as {
    tasks?: Task[]
    income?: IncomeEntry[]
    clients?: Client[]
  }
  if (data.tasks) write(KEYS.tasks, data.tasks)
  if (data.income) write(KEYS.income, data.income)
  if (data.clients) write(KEYS.clients, data.clients)
  return {
    tasks: data.tasks?.length ?? 0,
    income: data.income?.length ?? 0,
    clients: data.clients?.length ?? 0,
  }
}

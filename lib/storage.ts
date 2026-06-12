/**
 * localStorage persistence layer — zero external dependencies.
 * Tasks (and memories, which are just tasks with type='memory') are stored as a
 * JSON array under a single key. All reads are wrapped in try/catch so a missing
 * or corrupt key always returns [] instead of throwing.
 */

import type { Task } from './types'

const KEYS = {
  tasks: 'cc_tasks',
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

// ── Export / Import ────────────────────────────────────────────────────────────

export function exportAllData(): void {
  const payload = {
    tasks: read<Task>(KEYS.tasks),
    exportedAt: new Date().toISOString(),
    version: 2,
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
}

export function importAllData(jsonString: string): ImportResult {
  const data = JSON.parse(jsonString) as { tasks?: Task[] }
  if (data.tasks) write(KEYS.tasks, data.tasks)
  return { tasks: data.tasks?.length ?? 0 }
}

export type TaskType = 'task' | 'memory'
export type ClientStatus = 'Active' | 'Paused' | 'Done'

export interface Task {
  id: string
  type: TaskType
  title: string
  due_date: string | null
  client_tag: string | null
  completed: boolean
  created_at: string
}

export interface IncomeEntry {
  id: string
  amount: number
  client: string | null
  date: string
  note: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  status: ClientStatus
  rate: string | null
  notes: string | null
  created_at: string
  total_revenue?: number
}

export interface ParsedInput {
  type: TaskType
  title: string
  due_date: string | null
  client_tag: string | null
}

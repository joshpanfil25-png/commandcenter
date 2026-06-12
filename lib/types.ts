export type TaskType = 'task' | 'memory'

export interface Task {
  id: string
  type: TaskType
  title: string
  due_date: string | null
  client_tag: string | null
  completed: boolean
  created_at: string
}

export interface ParsedInput {
  type: TaskType
  title: string
  due_date: string | null
  client_tag: string | null
}

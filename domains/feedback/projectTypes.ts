
// Project status - these are the kanban columns
export type ProjectStatus = 'backlog' | 'on_deck' | 'in_progress' | 'review' | 'completed' | 'archived'

// Application-level types (camelCase)
export interface Project {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  sortOrder: number
  githubRepo: string | null
  githubUrl: string | null
  createdAt: string
  updatedAt: string
  // Aggregated data
  feedbackCount?: number
  feedbackItems?: ProjectFeedbackItem[]
}

export interface ProjectFeedbackItem {
  id: string
  projectId: string
  feedbackId: string
  createdAt: string
  // Joined feedback data
  feedback?: {
    id: string
    title: string
    type: string
    importance: string
    status: string
  }
}

// Form data types
export interface ProjectFormData {
  title: string
  description?: string
  githubRepo?: string
  githubUrl?: string
}

// Kanban column definition (derived from status)
export interface KanbanColumn {
  id: ProjectStatus
  title: string
  color: string
}

// UI Constants - these define the kanban columns
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: '#64748b' },
  { id: 'on_deck', title: 'On Deck', color: '#f59e0b' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { id: 'review', title: 'Review', color: '#8b5cf6' },
  { id: 'completed', title: 'Completed', color: '#22c55e' },
]

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'on_deck', label: 'On Deck' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  backlog: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  on_deck: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  review: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  completed: 'bg-green-500/20 text-green-300 border-green-500/40',
  archived: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
}

// Simplified project for pickers and lists
export interface SimpleProject {
  id: string
  title: string
  status: ProjectStatus
}

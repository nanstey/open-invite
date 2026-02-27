// Project status - these are the kanban columns
export type ProjectStatus =
  | 'backlog'
  | 'on_deck'
  | 'research'
  | 'proposal'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'completed'

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
  archivedAt?: string | null
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
  { id: 'research', title: 'Research', color: '#06b6d4' },
  { id: 'proposal', title: 'Proposal', color: '#a855f7' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { id: 'review', title: 'Review', color: '#8b5cf6' },
  { id: 'blocked', title: 'Blocked', color: '#ef4444' },
  { id: 'completed', title: 'Completed', color: '#22c55e' },
]

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'on_deck', label: 'On Deck' },
  { value: 'research', label: 'Research' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
]

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  backlog: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  on_deck: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  research: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  proposal: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  review: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/40',
  completed: 'bg-green-500/20 text-green-300 border-green-500/40',
}

// Card styling by status - used for immediate visual consistency after moves
export const CARD_STATUS_STYLES: Record<ProjectStatus, string> = {
  backlog: 'bg-slate-800 border border-slate-700',
  on_deck: 'bg-amber-900/40 border border-amber-700/60',
  research: 'bg-cyan-900/40 border border-cyan-700/60',
  proposal: 'bg-fuchsia-900/40 border border-fuchsia-700/60',
  in_progress: 'bg-blue-900/40 border border-blue-700/60',
  review: 'bg-violet-900/40 border border-violet-700/60',
  blocked: 'bg-red-900/40 border border-red-700/60',
  completed: 'bg-green-900/40 border border-green-700/60',
}

// Simplified project for pickers and lists
export interface SimpleProject {
  id: string
  title: string
  status: ProjectStatus
}

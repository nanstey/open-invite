import type { Database } from '../../lib/database.types'

// Database row types
export type FeedbackRow = Database['public']['Tables']['user_feedback']['Row']
export type FeedbackInsert = Database['public']['Tables']['user_feedback']['Insert']
export type FeedbackUpdate = Database['public']['Tables']['user_feedback']['Update']

// Enum types
export type FeedbackType = Database['public']['Enums']['feedback_type']
export type FeedbackImportance = Database['public']['Enums']['feedback_importance']
export type FeedbackStatus = Database['public']['Enums']['feedback_status']

// Application-level type (camelCase)
export interface Feedback {
  id: string
  userId: string
  title: string
  type: FeedbackType
  importance: FeedbackImportance
  description: string
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
  // Joined data (optional)
  userName?: string
  userAvatar?: string
}

// Form data for submitting feedback
export interface FeedbackFormData {
  title: string
  type: FeedbackType
  importance: FeedbackImportance
  description: string
}

// UI constants
export const FEEDBACK_TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'ux', label: 'UX Issue' },
  { value: 'other', label: 'Other' },
]

export const FEEDBACK_IMPORTANCE_OPTIONS: { value: FeedbackImportance; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const FEEDBACK_STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' },
]

// Badge colors for status
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  reviewed: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  planned: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  done: 'bg-green-500/20 text-green-300 border-green-500/40',
  declined: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
}

// Badge colors for importance
export const FEEDBACK_IMPORTANCE_COLORS: Record<FeedbackImportance, string> = {
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
}

// Badge colors for type
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  bug: 'bg-red-500/20 text-red-300 border-red-500/40',
  feature: 'bg-green-500/20 text-green-300 border-green-500/40',
  ux: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
}


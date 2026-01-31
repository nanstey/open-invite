// Main components
export { FeedbackModal } from './components/feedback/FeedbackModal'
export { FeedbackAdminPage } from './components/FeedbackAdminPage'
export { FeedbackAdminTabs } from './FeedbackAdminTabs'
export { FeedbackDetailPanel } from './components/feedback/FeedbackDetailPanel'
export { ProjectDetailPanel } from './components/projects/ProjectDetailPanel'
export { ProjectsKanbanBoard } from './components/ProjectsKanbanBoard'
export { ProjectLinkCard } from './components/projects/ProjectLinkCard'

// Sub-components
export { ProjectCard } from './components/projects/ProjectCard'
export { KanbanColumnComponent, type KanbanColumnProps } from './components/projects/KanbanColumn'
export { FeedbackPicker, type FeedbackPickerProps } from './components/feedback/FeedbackPicker'
export { CreateProjectModal, type CreateProjectModalProps } from './components/projects/CreateProjectModal'
export { FeedbackRow, type FeedbackRowProps } from './components/feedback/FeedbackRow'
export { 
  FeedbackFilterBar, 
  hasActiveFilters, 
  DEFAULT_FILTERS,
  type FeedbackFilters,
  type FeedbackFilterBarProps,
} from './components/feedback/FeedbackFilterBar'

// Types - Feedback
export type {
  Feedback,
  FeedbackFormData,
  FeedbackRow as FeedbackRowType,
  FeedbackInsert,
  FeedbackUpdate,
  FeedbackType,
  FeedbackImportance,
  FeedbackStatus,
  SimpleFeedbackItem,
} from './types'

export {
  FEEDBACK_TYPE_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  FEEDBACK_STATUS_OPTIONS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_TYPE_COLORS,
} from './types'

// Types - Projects
export type {
  Project,
  ProjectFormData,
  ProjectFeedbackItem,
  ProjectStatus,
  KanbanColumn,
  SimpleProject,
} from './projectTypes'

export {
  KANBAN_COLUMNS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_STATUS_COLORS,
} from './projectTypes'

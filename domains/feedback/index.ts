// Main components

export { FeedbackAdminPage } from './components/FeedbackAdminPage'
export { FeedbackDetailPanel } from './components/feedback/FeedbackDetailPanel'
export {
  DEFAULT_FILTERS,
  FeedbackFilterBar,
  type FeedbackFilterBarProps,
  type FeedbackFilters,
  hasActiveFilters,
} from './components/feedback/FeedbackFilterBar'
export { FeedbackModal } from './components/feedback/FeedbackModal'
export { FeedbackPicker, type FeedbackPickerProps } from './components/feedback/FeedbackPicker'
export { FeedbackRow, type FeedbackRowProps } from './components/feedback/FeedbackRow'
export { ProjectsKanbanBoard } from './components/ProjectsKanbanBoard'
export {
  CreateProjectModal,
  type CreateProjectModalProps,
} from './components/projects/CreateProjectModal'
export { KanbanColumnComponent, type KanbanColumnProps } from './components/projects/KanbanColumn'
// Sub-components
export { ProjectCard } from './components/projects/ProjectCard'
export { ProjectDetailPanel } from './components/projects/ProjectDetailPanel'
export { ProjectLinkCard } from './components/projects/ProjectLinkCard'
export { FeedbackAdminTabs } from './FeedbackAdminTabs'
// Types - Projects
export type {
  KanbanColumn,
  Project,
  ProjectFeedbackItem,
  ProjectFormData,
  ProjectStatus,
  SimpleProject,
} from './projectTypes'
export {
  KANBAN_COLUMNS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_OPTIONS,
} from './projectTypes'
// Types - Feedback
export type {
  Feedback,
  FeedbackFormData,
  FeedbackImportance,
  FeedbackInsert,
  FeedbackRow as FeedbackRowType,
  FeedbackStatus,
  FeedbackType,
  FeedbackUpdate,
  SimpleFeedbackItem,
} from './types'
export {
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_STATUS_OPTIONS,
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_TYPE_OPTIONS,
} from './types'

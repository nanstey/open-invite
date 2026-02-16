import React from 'react'
import { Badge } from '../../../../lib/ui/components/Badge'
import { ProjectLinkCard } from '../projects/ProjectLinkCard'
import { formatDateShort } from '../../../../lib/ui/utils/datetime'
import {
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_STATUS_COLORS,
  type Feedback,
} from '../../types'
import type { FeedbackProjectMapping } from '../../../../services/feedbackProjectService'

export interface FeedbackRowProps {
  feedback: Feedback
  /** Project mappings for this feedback item */
  projectMappings: FeedbackProjectMapping[]
  /** Click handler for the row */
  onClick: () => void
  /** Click handler for project link */
  onProjectClick: (projectId: string) => void
}

export const FeedbackRow: React.FC<FeedbackRowProps> = ({ 
  feedback, 
  projectMappings, 
  onClick, 
  onProjectClick 
}) => {
  const firstProject = projectMappings[0]
  const additionalCount = projectMappings.length > 1 ? projectMappings.length - 1 : undefined

  const handleProjectClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (firstProject) {
      onProjectClick(firstProject.projectId)
    }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors"
    >
      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-[1fr_180px_100px_100px_100px_100px] gap-4 items-center">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{feedback.title}</div>
          <div className="text-xs text-slate-500 truncate">
            {feedback.userName || 'Unknown User'}
          </div>
        </div>
        <div className="min-w-0">
          {firstProject ? (
            <ProjectLinkCard
              projectId={firstProject.projectId}
              title={firstProject.projectTitle}
              status={firstProject.projectStatus}
              additionalCount={additionalCount}
              onClick={handleProjectClick}
            />
          ) : (
            <span className="text-xs text-slate-600">—</span>
          )}
        </div>
        <Badge colorClass={FEEDBACK_TYPE_COLORS[feedback.type]}>{feedback.type}</Badge>
        <Badge colorClass={FEEDBACK_IMPORTANCE_COLORS[feedback.importance]}>{feedback.importance}</Badge>
        <Badge colorClass={FEEDBACK_STATUS_COLORS[feedback.status]}>{feedback.status}</Badge>
        <div className="text-xs text-slate-400">{formatDateShort(feedback.createdAt)}</div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-bold text-white">{feedback.title}</div>
          <Badge colorClass={FEEDBACK_STATUS_COLORS[feedback.status]}>{feedback.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge colorClass={FEEDBACK_TYPE_COLORS[feedback.type]}>{feedback.type}</Badge>
          <Badge colorClass={FEEDBACK_IMPORTANCE_COLORS[feedback.importance]}>{feedback.importance}</Badge>
        </div>
        {firstProject && (
          <ProjectLinkCard
            projectId={firstProject.projectId}
            title={firstProject.projectTitle}
            status={firstProject.projectStatus}
            additionalCount={additionalCount}
            onClick={handleProjectClick}
          />
        )}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{feedback.userName || 'Unknown User'}</span>
          <span>{formatDateShort(feedback.createdAt)}</span>
        </div>
      </div>
    </button>
  )
}


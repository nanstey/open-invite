import React from 'react'
import { ExternalLink, X } from 'lucide-react'
import { PROJECT_STATUS_COLORS, type ProjectStatus } from './projectTypes'

export interface ProjectLinkCardProps {
  projectId: string
  title: string
  status: ProjectStatus | string
  /** Additional count to show (e.g., "+2" for more projects) */
  additionalCount?: number
  /** Called when the card is clicked */
  onClick: () => void
  /** Called when remove button is clicked. If not provided, remove button is hidden */
  onRemove?: () => void
}

export const ProjectLinkCard: React.FC<ProjectLinkCardProps> = ({
  title,
  status,
  additionalCount,
  onClick,
  onRemove,
}) => {
  return (
    <div
      className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-transparent hover:border-slate-600 transition-colors group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white truncate" title={title}>
            {title}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-xs px-1.5 py-0.5 rounded border ${
              PROJECT_STATUS_COLORS[status as keyof typeof PROJECT_STATUS_COLORS] || 'bg-slate-500/20 text-slate-300 border-slate-500/40'
            }`}
          >
            {status.replace('_', ' ')}
          </span>
          {additionalCount && additionalCount > 0 && (
            <span className="text-xs text-slate-500">+{additionalCount}</span>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Remove from project"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}


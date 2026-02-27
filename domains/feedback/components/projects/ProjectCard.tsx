import {
  ExternalLink,
  Github,
  GripVertical,
  MessageSquare,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Card } from '../../../../lib/ui/9ui/card'
import type { Project } from '../../projectTypes'
import { CARD_STATUS_STYLES } from '../../projectTypes'

export interface ProjectCardProps {
  project: Project
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onTouchDragStart: () => void
  onTouchDragEnd: () => void
  onClick: () => void
  onDelete: () => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isDragging,
  onDragStart,
  onDragEnd,
  onTouchDragStart,
  onTouchDragEnd,
  onClick,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('projectId', project.id)
    e.dataTransfer.setData('sourceStatus', project.status)
    onDragStart()
  }

  // Touch handlers for mobile long-press drag
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      onTouchDragStart()
    }, 300) // 300ms long press to start drag
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    if (isDragging) {
      onTouchDragEnd()
    }
  }

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Derive card styling from canonical project status (not local state)
  const cardStatusStyle = CARD_STATUS_STYLES[project.status] || CARD_STATUS_STYLES.backlog

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`${cardStatusStyle} rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all touch-none ${
        isDragging ? 'opacity-50 scale-95 ring-2 ring-primary' : 'hover:border-slate-600'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className={`w-4 h-4 mt-0.5 shrink-0 ${isDragging ? 'text-primary' : 'text-slate-600'}`}
        />
        <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="text-sm font-bold text-white mb-1">{project.title}</div>
          {project.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{project.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {project.feedbackCount !== undefined && project.feedbackCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {project.feedbackCount}
              </span>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Github className="w-3 h-3" />
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 text-slate-500 hover:text-white rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 bg-transparent"
                onClick={() => setShowMenu(false)}
                onKeyDown={e => {
                  if (e.key === 'Escape' || e.key === 'Enter') {
                    setShowMenu(false)
                  }
                }}
              />
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    if (confirm('Delete this project?')) {
                      onDelete()
                    }
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

import { Plus } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { KanbanColumn, Project, ProjectStatus } from '../../projectTypes'
import type { TouchDragProject } from '../ProjectsKanbanBoard'
import { ProjectCard } from './ProjectCard'

export interface KanbanColumnProps {
  column: KanbanColumn
  projects: Project[]
  draggingProjectId: string | null
  touchDragProject: TouchDragProject | null
  onDragStart: (projectId: string) => void
  onDragEnd: () => void
  onDrop: (projectId: string, sourceStatus: ProjectStatus) => void
  onTouchDragStart: (projectId: string, sourceStatus: ProjectStatus) => void
  onTouchDragEnd: () => void
  onTouchDrop: (targetStatus: ProjectStatus) => void
  onProjectClick: (project: Project) => void
  onProjectDelete: (projectId: string) => void
  onAddProject: () => void
}

export const KanbanColumnComponent: React.FC<KanbanColumnProps> = ({
  column,
  projects,
  draggingProjectId,
  touchDragProject,
  onDragStart,
  onDragEnd,
  onDrop,
  onTouchDragStart,
  onTouchDragEnd,
  onTouchDrop,
  onProjectClick,
  onProjectDelete,
  onAddProject,
}) => {
  const [isOver, setIsOver] = useState(false)
  const [isTouchTarget, setIsTouchTarget] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const projectId = e.dataTransfer.getData('projectId')
    const sourceStatus = e.dataTransfer.getData('sourceStatus') as ProjectStatus
    if (projectId) {
      onDrop(projectId, sourceStatus)
    }
  }

  // Touch-based drop for mobile
  const handleTouchTap = () => {
    if (touchDragProject) {
      onTouchDrop(column.id)
      setIsTouchTarget(false)
    }
  }

  const handleTouchEnter = () => {
    if (touchDragProject) {
      setIsTouchTarget(true)
    }
  }

  const handleTouchLeave = () => {
    setIsTouchTarget(false)
  }

  return (
    <section
      aria-label={`${column.title} column`}
      className={`flex flex-col bg-slate-900/50 rounded-xl border min-w-[280px] max-w-[300px] shrink-0 transition-colors ${
        isOver || isTouchTarget ? 'border-primary bg-primary/5' : 'border-slate-800'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={touchDragProject ? handleTouchTap : undefined}
      onMouseEnter={touchDragProject ? handleTouchEnter : undefined}
      onMouseLeave={touchDragProject ? handleTouchLeave : undefined}
      tabIndex={touchDragProject ? 0 : -1}
      onKeyDown={e => {
        if (touchDragProject && e.key === 'Enter') {
          handleTouchTap()
        }
      }}
    >
      {/* Column Header */}
      <header className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-bold text-white text-sm">{column.title}</h3>
          <span className="text-xs text-slate-500 ml-auto">{projects.length}</span>
        </div>
      </header>

      {/* Projects */}
      <ul className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {projects.map(project => (
          <li key={project.id}>
            <ProjectCard
              project={project}
              isDragging={draggingProjectId === project.id}
              onDragStart={() => onDragStart(project.id)}
              onDragEnd={onDragEnd}
              onTouchDragStart={() => onTouchDragStart(project.id, project.status)}
              onTouchDragEnd={onTouchDragEnd}
              onClick={() => onProjectClick(project)}
              onDelete={() => onProjectDelete(project.id)}
            />
          </li>
        ))}

        {projects.length === 0 && (
          <li className="text-center py-8 text-slate-600 text-sm">Drop projects here</li>
        )}
      </ul>

      {/* Add button - only show in Backlog column */}
      {column.id === 'backlog' && (
        <div className="p-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onAddProject}
            className="w-full flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      )}
    </section>
  )
}

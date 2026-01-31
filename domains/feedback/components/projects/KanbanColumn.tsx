import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Project, ProjectStatus, KanbanColumn } from '../../projectTypes'
import { ProjectCard } from './ProjectCard'

export interface KanbanColumnProps {
  column: KanbanColumn
  projects: Project[]
  draggingProjectId: string | null
  onDragStart: (projectId: string) => void
  onDragEnd: () => void
  onDrop: (projectId: string, sourceStatus: ProjectStatus) => void
  onProjectClick: (project: Project) => void
  onProjectDelete: (projectId: string) => void
  onAddProject: () => void
}

export const KanbanColumnComponent: React.FC<KanbanColumnProps> = ({
  column,
  projects,
  draggingProjectId,
  onDragStart,
  onDragEnd,
  onDrop,
  onProjectClick,
  onProjectDelete,
  onAddProject,
}) => {
  const [isOver, setIsOver] = useState(false)

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

  return (
    <div
      className={`flex flex-col bg-slate-900/50 rounded-xl border min-w-[280px] max-w-[300px] shrink-0 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-slate-800'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-bold text-white text-sm">{column.title}</h3>
          <span className="text-xs text-slate-500 ml-auto">{projects.length}</span>
        </div>
      </div>

      {/* Projects */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isDragging={draggingProjectId === project.id}
            onDragStart={() => onDragStart(project.id)}
            onDragEnd={onDragEnd}
            onClick={() => onProjectClick(project)}
            onDelete={() => onProjectDelete(project.id)}
          />
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            Drop projects here
          </div>
        )}
      </div>

      {/* Add button - only show in Backlog column */}
      {column.id === 'backlog' && (
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={onAddProject}
            className="w-full flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      )}
    </div>
  )
}


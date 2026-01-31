import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  fetchProjects,
  createProject,
  deleteProject,
  moveProjectToStatus,
  addFeedbackToProject,
} from '../../../services/feedbackProjectService'
import { KanbanColumnComponent } from './projects/KanbanColumn'
import { CreateProjectModal } from './projects/CreateProjectModal'
import { ProjectDetailPanel } from './projects/ProjectDetailPanel'
import {
  KANBAN_COLUMNS,
  type Project,
  type ProjectFormData,
  type ProjectStatus,
} from '../projectTypes'

export interface ProjectsKanbanBoardProps {
  initialProjectId?: string
}

export function ProjectsKanbanBoard({ initialProjectId }: ProjectsKanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null)
  const [initialProjectHandled, setInitialProjectHandled] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  // Auto-open project if initialProjectId is provided
  useEffect(() => {
    if (initialProjectId && projects.length > 0 && !initialProjectHandled) {
      const project = projects.find(p => p.id === initialProjectId)
      if (project) {
        setSelectedProject(project)
      }
      setInitialProjectHandled(true)
    }
  }, [initialProjectId, projects, initialProjectHandled])

  const loadProjects = async () => {
    setLoading(true)
    const data = await fetchProjects()
    setProjects(data)
    setLoading(false)
  }

  const handleCreateProject = async (data: ProjectFormData, feedbackIds: string[]) => {
    const project = await createProject(data)
    if (project) {
      // Link feedback items if any were selected
      if (feedbackIds.length > 0) {
        for (const feedbackId of feedbackIds) {
          await addFeedbackToProject(project.id, feedbackId)
        }
        project.feedbackCount = feedbackIds.length
      }
      setProjects(prev => [...prev, project])
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId)
    if (success) {
      setProjects(prev => prev.filter(p => p.id !== projectId))
    }
  }

  const handleMoveProject = async (
    projectId: string,
    sourceStatus: ProjectStatus,
    targetStatus: ProjectStatus
  ) => {
    if (sourceStatus === targetStatus) return

    // Calculate new sort order (add to end of target column)
    const targetProjects = projects.filter(p => p.status === targetStatus)
    const newSortOrder = targetProjects.length

    // Optimistic update
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, status: targetStatus, sortOrder: newSortOrder }
          : p
      )
    )

    // Persist
    await moveProjectToStatus(projectId, targetStatus, newSortOrder)
  }

  const handleUpdateProject = (updates: Partial<Project>) => {
    if (!selectedProject) return
    setProjects(prev =>
      prev.map(p => (p.id === selectedProject.id ? { ...p, ...updates } : p))
    )
    setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
  }

  // Group projects by status
  const projectsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = projects
      .filter(p => p.status === col.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    return acc
  }, {} as Record<ProjectStatus, Project[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              projects={projectsByStatus[column.id] || []}
              draggingProjectId={draggingProjectId}
              onDragStart={setDraggingProjectId}
              onDragEnd={() => setDraggingProjectId(null)}
              onDrop={(projectId, sourceStatus) =>
                handleMoveProject(projectId, sourceStatus, column.id)
              }
              onProjectClick={setSelectedProject}
              onProjectDelete={handleDeleteProject}
              onAddProject={() => setShowCreateModal(true)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleUpdateProject}
        />
      )}
    </div>
  )
}

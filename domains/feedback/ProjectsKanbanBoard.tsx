import React, { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Loader2, GripVertical, MoreVertical, Trash2, Github, ExternalLink, MessageSquare, X, Check, Search, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  moveProjectToStatus,
  addFeedbackToProject,
  removeFeedbackFromProject,
  fetchProjectFeedback,
  fetchFeedbackNotInProject,
} from '../../services/feedbackProjectService'
import { supabase } from '../../lib/supabase'
import { FEEDBACK_TYPE_COLORS, FEEDBACK_IMPORTANCE_COLORS } from './types'
import {
  KANBAN_COLUMNS,
  PROJECT_STATUS_COLORS,
  type Project,
  type ProjectFormData,
  type ProjectStatus,
  type KanbanColumn,
} from './projectTypes'

// ============================================================================
// Project Card
// ============================================================================

interface ProjectCardProps {
  project: Project
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
  onDelete: () => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('projectId', project.id)
        e.dataTransfer.setData('sourceStatus', project.status)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:border-slate-600'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
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
                onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 text-slate-500 hover:text-white rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                <button
                  onClick={(e) => {
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
    </div>
  )
}

// ============================================================================
// Kanban Column
// ============================================================================

interface KanbanColumnComponentProps {
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

const KanbanColumnComponent: React.FC<KanbanColumnComponentProps> = ({
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

// ============================================================================
// Simple Feedback Item for display
// ============================================================================

interface SimpleFeedbackItem {
  id: string
  title: string
  description?: string
  type: string
  importance: string
  status: string
}

// ============================================================================
// Feedback Picker Component
// ============================================================================

interface FeedbackPickerProps {
  selectedIds: string[]
  onToggle: (feedbackId: string) => void
  excludeIds?: string[]
}

function FeedbackPicker({ selectedIds, onToggle, excludeIds = [] }: FeedbackPickerProps) {
  const [feedbackItems, setFeedbackItems] = useState<SimpleFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadFeedback()
  }, [])

  const loadFeedback = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_feedback')
      .select('id, title, type, importance, status')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFeedbackItems(data as SimpleFeedbackItem[])
    }
    setLoading(false)
  }

  const filteredItems = feedbackItems
    .filter(item => !excludeIds.includes(item.id))
    .filter(item =>
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary"
        />
      </div>

      {/* Feedback list */}
      <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-sm">
            {searchQuery ? 'No matching feedback' : 'No feedback available'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/20 border border-primary/50'
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${
                        FEEDBACK_TYPE_COLORS[item.type as keyof typeof FEEDBACK_TYPE_COLORS] || 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${
                        FEEDBACK_IMPORTANCE_COLORS[item.importance as keyof typeof FEEDBACK_IMPORTANCE_COLORS] || 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {item.importance}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="text-xs text-slate-400">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Create Project Modal
// ============================================================================

interface CreateProjectModalProps {
  onClose: () => void
  onCreate: (data: ProjectFormData, feedbackIds: string[]) => Promise<void>
}

function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleFeedback = (feedbackId: string) => {
    setSelectedFeedbackIds((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onCreate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          githubUrl: githubUrl.trim() || undefined,
        },
        selectedFeedbackIds
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        <div className="p-6 pb-0">
          <h2 className="text-xl font-bold text-white mb-4">New Project</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project name"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              GitHub Link
            </label>
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Link Feedback Items
            </label>
            <FeedbackPicker
              selectedIds={selectedFeedbackIds}
              onToggle={handleToggleFeedback}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Project Detail Panel
// ============================================================================

interface ProjectDetailPanelProps {
  project: Project
  onClose: () => void
  onUpdate: (updates: Partial<Project>) => void
}

function ProjectDetailPanel({ project, onClose, onUpdate }: ProjectDetailPanelProps) {
  const navigate = useNavigate()
  
  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editTitle, setEditTitle] = useState(project.title)
  const [editDescription, setEditDescription] = useState(project.description || '')
  const [savingTitle, setSavingTitle] = useState(false)
  const [savingDescription, setSavingDescription] = useState(false)
  
  // GitHub URL
  const [isEditingGithub, setIsEditingGithub] = useState(false)
  const [githubUrl, setGithubUrl] = useState(project.githubUrl || '')
  const [savingGithub, setSavingGithub] = useState(false)

  // Feedback management
  const [linkedFeedback, setLinkedFeedback] = useState<SimpleFeedbackItem[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [showAddFeedback, setShowAddFeedback] = useState(false)
  const [selectedNewFeedbackIds, setSelectedNewFeedbackIds] = useState<string[]>([])
  const [addingFeedback, setAddingFeedback] = useState(false)
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(new Set())

  const toggleFeedbackExpanded = (feedbackId: string) => {
    setExpandedFeedbackIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId)
      } else {
        newSet.add(feedbackId)
      }
      return newSet
    })
  }

  const handleNavigateToFeedback = (feedbackId: string) => {
    onClose()
    navigate({ to: '/admin/feedback', search: { feedbackId } })
  }

  // Title editing handlers
  const handleStartEditTitle = () => {
    setEditTitle(project.title)
    setIsEditingTitle(true)
  }

  const handleCancelEditTitle = () => {
    setEditTitle(project.title)
    setIsEditingTitle(false)
  }

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return
    setSavingTitle(true)
    const success = await updateProject(project.id, { title: editTitle.trim() })
    if (success) {
      onUpdate({ title: editTitle.trim() })
      setIsEditingTitle(false)
    }
    setSavingTitle(false)
  }

  // Description editing handlers
  const handleStartEditDescription = () => {
    setEditDescription(project.description || '')
    setIsEditingDescription(true)
  }

  const handleCancelEditDescription = () => {
    setEditDescription(project.description || '')
    setIsEditingDescription(false)
  }

  const handleSaveDescription = async () => {
    setSavingDescription(true)
    const success = await updateProject(project.id, { description: editDescription.trim() || undefined })
    if (success) {
      onUpdate({ description: editDescription.trim() || null })
      setIsEditingDescription(false)
    }
    setSavingDescription(false)
  }

  // GitHub URL handler
  const handleSaveGithubUrl = async () => {
    setSavingGithub(true)
    const success = await updateProject(project.id, { githubUrl: githubUrl.trim() || undefined })
    if (success) {
      onUpdate({ githubUrl: githubUrl.trim() || null })
    }
    setSavingGithub(false)
  }

  const githubUrlChanged = githubUrl !== (project.githubUrl || '')

  useEffect(() => {
    loadLinkedFeedback()
  }, [project.id])

  const loadLinkedFeedback = async () => {
    setLoadingFeedback(true)
    const items = await fetchProjectFeedback(project.id)
    setLinkedFeedback(
      items
        .filter((item) => item.feedback)
        .map((item) => ({
          id: item.feedback!.id,
          title: item.feedback!.title,
          description: (item.feedback as any)?.description,
          type: item.feedback!.type,
          importance: item.feedback!.importance,
          status: item.feedback!.status,
        }))
    )
    setLoadingFeedback(false)
  }

  const handleRemoveFeedback = async (feedbackId: string) => {
    const success = await removeFeedbackFromProject(project.id, feedbackId)
    if (success) {
      setLinkedFeedback((prev) => prev.filter((f) => f.id !== feedbackId))
      onUpdate({ feedbackCount: (project.feedbackCount || 1) - 1 })
    }
  }

  const handleToggleNewFeedback = (feedbackId: string) => {
    setSelectedNewFeedbackIds((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    )
  }

  const handleAddSelectedFeedback = async () => {
    if (selectedNewFeedbackIds.length === 0) return
    setAddingFeedback(true)

    for (const feedbackId of selectedNewFeedbackIds) {
      await addFeedbackToProject(project.id, feedbackId)
    }

    setSelectedNewFeedbackIds([])
    setShowAddFeedback(false)
    await loadLinkedFeedback()
    onUpdate({ feedbackCount: (project.feedbackCount || 0) + selectedNewFeedbackIds.length })
    setAddingFeedback(false)
  }

  const linkedFeedbackIds = linkedFeedback.map((f) => f.id)

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[480px] bg-slate-900 z-[70] flex flex-col border-l border-slate-700 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">Project Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Title</label>
              {!isEditingTitle && (
                <button
                  onClick={handleStartEditTitle}
                  className="p-1 text-slate-500 hover:text-white transition-colors rounded"
                  title="Edit title"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingTitle ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEditTitle}
                    disabled={savingTitle}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTitle}
                    disabled={savingTitle || !editTitle.trim()}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white text-xl font-bold">{project.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Description</label>
              {!isEditingDescription && (
                <button
                  onClick={handleStartEditDescription}
                  className="p-1 text-slate-500 hover:text-white transition-colors rounded"
                  title="Edit description"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  placeholder="Add a description..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEditDescription}
                    disabled={savingDescription}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {savingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-h-[24px]">
                {project.description ? (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
                ) : (
                  <p className="text-slate-500 text-sm italic">No description</p>
                )}
              </div>
            )}
          </div>

          {/* GitHub Link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">GitHub Link</label>
              {!isEditingGithub && (
                <button
                  onClick={() => setIsEditingGithub(true)}
                  className="p-1 text-slate-500 hover:text-white transition-colors rounded"
                  title="Edit GitHub link"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingGithub ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setGithubUrl(project.githubUrl || '')
                      setIsEditingGithub(false)
                    }}
                    disabled={savingGithub}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleSaveGithubUrl()
                      setIsEditingGithub(false)
                    }}
                    disabled={savingGithub}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {savingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-h-[24px]">
                {project.githubUrl ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Github className="w-5 h-5" />
                    <span className="text-sm underline">{project.githubUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm italic">No GitHub link</p>
                )}
              </div>
            )}
          </div>

          {/* Linked Feedback */}
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Linked Feedback ({linkedFeedback.length})
            </label>

            {loadingFeedback ? (
              <div className="flex items-center justify-center py-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
                {/* Linked feedback list */}
                {linkedFeedback.length > 0 && (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto mb-2">
                    {linkedFeedback.map((item) => {
                      const isExpanded = expandedFeedbackIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className="bg-slate-900 rounded-lg overflow-hidden"
                        >
                          {/* Header row */}
                          <div className="flex items-start gap-2 p-2 group">
                            <button
                              type="button"
                              onClick={() => toggleFeedbackExpanded(item.id)}
                              className="p-1 text-slate-500 hover:text-white transition-colors shrink-0"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-white font-medium">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded border ${
                                    FEEDBACK_TYPE_COLORS[item.type as keyof typeof FEEDBACK_TYPE_COLORS] || 'bg-slate-500/20 text-slate-300'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded border ${
                                    FEEDBACK_IMPORTANCE_COLORS[item.importance as keyof typeof FEEDBACK_IMPORTANCE_COLORS] || 'bg-slate-500/20 text-slate-300'
                                  }`}
                                >
                                  {item.importance}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNavigateToFeedback(item.id)}
                              className="p-1 text-slate-500 hover:text-primary transition-colors shrink-0"
                              title="View feedback details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveFeedback(item.id)
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="Remove from project"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Expanded description */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-slate-800">
                              {item.description ? (
                                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                                  {item.description}
                                </p>
                              ) : (
                                <p className="text-slate-600 text-sm italic">No description</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add feedback section */}
                {showAddFeedback ? (
                  <div className="p-2 border-t border-slate-800">
                    <FeedbackPicker
                      selectedIds={selectedNewFeedbackIds}
                      onToggle={handleToggleNewFeedback}
                      excludeIds={linkedFeedbackIds}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddFeedback(false)
                          setSelectedNewFeedbackIds([])
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSelectedFeedback}
                        disabled={selectedNewFeedbackIds.length === 0 || addingFeedback}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {addingFeedback ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Add ({selectedNewFeedbackIds.length})</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddFeedback(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Feedback
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Main Kanban Board
// ============================================================================

interface ProjectsKanbanBoardProps {
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


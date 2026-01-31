import React, { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X, User as UserIcon, Calendar, AlertCircle, FolderKanban, Plus, Loader2, Check, Search, ExternalLink } from 'lucide-react'
import { FormSelect } from '../../lib/ui/components/FormControls'
import { updateFeedbackStatus } from '../../services/feedbackService'
import {
  fetchProjectsForFeedback,
  fetchAllProjects,
  addFeedbackToProject,
  removeFeedbackFromProject,
} from '../../services/feedbackProjectService'
import {
  FEEDBACK_STATUS_OPTIONS,
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_STATUS_COLORS,
  type Feedback,
  type FeedbackStatus,
} from './types'
import { PROJECT_STATUS_COLORS } from './projectTypes'

interface FeedbackDetailPanelProps {
  feedback: Feedback
  onClose: () => void
  onStatusChange: (id: string, status: FeedbackStatus) => void
  onProjectsChange?: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${className}`}>
      {children}
    </span>
  )
}

interface SimpleProject {
  id: string
  title: string
  status: string
}

export function FeedbackDetailPanel({ feedback, onClose, onStatusChange, onProjectsChange }: FeedbackDetailPanelProps) {
  const navigate = useNavigate()
  const [updating, setUpdating] = useState(false)

  // Projects state
  const [linkedProjects, setLinkedProjects] = useState<SimpleProject[]>([])
  const [allProjects, setAllProjects] = useState<SimpleProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingProjectId, setAddingProjectId] = useState<string | null>(null)

  const handleNavigateToProject = (projectId: string) => {
    onClose()
    navigate({ to: '/admin/projects', search: { projectId } })
  }

  useEffect(() => {
    loadProjects()
  }, [feedback.id])

  const loadProjects = async () => {
    setLoadingProjects(true)
    const [linked, all] = await Promise.all([
      fetchProjectsForFeedback(feedback.id),
      fetchAllProjects(),
    ])
    setLinkedProjects(linked)
    setAllProjects(all)
    setLoadingProjects(false)
  }

  const handleAddToProject = async (projectId: string) => {
    setAddingProjectId(projectId)
    const success = await addFeedbackToProject(projectId, feedback.id)
    if (success) {
      const project = allProjects.find(p => p.id === projectId)
      if (project) {
        setLinkedProjects(prev => [...prev, project])
      }
      onProjectsChange?.()
    }
    setAddingProjectId(null)
    setShowAddProject(false)
    setSearchQuery('')
  }

  const handleRemoveFromProject = async (projectId: string) => {
    const success = await removeFeedbackFromProject(projectId, feedback.id)
    if (success) {
      setLinkedProjects(prev => prev.filter(p => p.id !== projectId))
      onProjectsChange?.()
    }
  }

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    setUpdating(true)
    const success = await updateFeedbackStatus(feedback.id, newStatus)
    if (success) {
      onStatusChange(feedback.id, newStatus)
    }
    setUpdating(false)
  }

  const linkedProjectIds = linkedProjects.map(p => p.id)
  const availableProjects = allProjects
    .filter(p => !linkedProjectIds.includes(p.id))
    .filter(p => searchQuery === '' || p.title.toLowerCase().includes(searchQuery.toLowerCase()))

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
          <h2 className="text-lg font-bold text-white">Feedback Details</h2>
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
            <h3 className="text-xl font-bold text-white mb-2">{feedback.title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={FEEDBACK_TYPE_COLORS[feedback.type]}>
                {feedback.type.toUpperCase()}
              </Badge>
              <Badge className={FEEDBACK_IMPORTANCE_COLORS[feedback.importance]}>
                {feedback.importance.toUpperCase()}
              </Badge>
              <Badge className={FEEDBACK_STATUS_COLORS[feedback.status]}>
                {feedback.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              {feedback.userAvatar ? (
                <img
                  src={feedback.userAvatar}
                  alt={feedback.userName || 'User'}
                  className="w-10 h-10 rounded-full border-2 border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-white">
                  {feedback.userName || 'Unknown User'}
                </div>
                <div className="text-xs text-slate-500">
                  User ID: {feedback.userId.slice(0, 8)}...
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Submitted</span>
              </div>
              <div className="text-sm text-white">{formatDate(feedback.createdAt)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Updated</span>
              </div>
              <div className="text-sm text-white">{formatDate(feedback.updatedAt)}</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </h4>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {feedback.description}
              </p>
            </div>
          </div>

          {/* Status Update */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Update Status
            </h4>
            <FormSelect
              value={feedback.status}
              onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
              size="lg"
              disabled={updating}
            >
              {FEEDBACK_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FormSelect>
          </div>

          {/* Projects */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Projects
            </h4>

            {loadingProjects ? (
              <div className="flex items-center justify-center py-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
                {/* Linked projects list */}
                {linkedProjects.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {linkedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-2 bg-slate-900 rounded-lg group"
                      >
                        <button
                          type="button"
                          onClick={() => handleNavigateToProject(project.id)}
                          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white truncate">{project.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border ${
                                PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS] || 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                              }`}
                            >
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFromProject(project.id)
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove from project"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add to project */}
                {showAddProject ? (
                  <div className="space-y-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary"
                        autoFocus
                      />
                    </div>

                    {/* Project list */}
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
                      {availableProjects.length === 0 ? (
                        <div className="text-center py-3 text-slate-500 text-sm">
                          {searchQuery ? 'No matching projects' : 'No projects available'}
                        </div>
                      ) : (
                        availableProjects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleAddToProject(project.id)}
                            disabled={addingProjectId === project.id}
                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            {addingProjectId === project.id ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                            ) : (
                              <Plus className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span className="text-sm text-white truncate">{project.title}</span>
                            <span className="text-xs text-slate-500 ml-auto shrink-0">
                              {project.status.replace('_', ' ')}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProject(false)
                        setSearchQuery('')
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddProject(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Project
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


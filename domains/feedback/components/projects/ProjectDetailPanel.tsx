import React, { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Loader2, Github, ExternalLink, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { SlidePanel } from '../../../../lib/ui/components/SlidePanel'
import { Button } from '../../../../lib/ui/9ui/button'
import { Textarea } from '../../../../lib/ui/9ui/textarea'
import { FeedbackPicker } from '../feedback/FeedbackPicker'
import {
  updateProject,
  addFeedbackToProject,
  removeFeedbackFromProject,
  fetchProjectFeedback,
} from '../../../../services/feedbackProjectService'
import { FEEDBACK_TYPE_COLORS, FEEDBACK_IMPORTANCE_COLORS, type SimpleFeedbackItem } from '../../types'
import type { Project, ProjectFormData } from '../../projectTypes'

export interface ProjectDetailPanelProps {
  project: Project
  onClose: () => void
  onUpdate: (updates: Partial<Project>) => void
}

export function ProjectDetailPanel({ project, onClose, onUpdate }: ProjectDetailPanelProps) {
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

  useEffect(() => {
    loadLinkedFeedback()
  }, [project.id])

  const loadLinkedFeedback = async () => {
    setLoadingFeedback(true)
    const items = await fetchProjectFeedback(project.id)
    setLinkedFeedback(
      items
        .filter((item) => item.feedback)
        .map((item): SimpleFeedbackItem => ({
          id: item.feedback!.id,
          title: item.feedback!.title,
          description: (item.feedback as any)?.description,
          type: item.feedback!.type as any,
          importance: item.feedback!.importance as any,
          status: item.feedback!.status as any,
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
    <SlidePanel title="Project Details" onClose={onClose}>
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
            <Button
              variant="ghost"
              onClick={handleStartEditDescription}
              className="p-1 text-slate-500 hover:text-white rounded"
              title="Edit description"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={6}
              placeholder="Add a description..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelEditDescription}
                disabled={savingDescription}
                className="flex-1 px-3 py-2 text-sm border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className="flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1"
              >
                {savingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
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
                                FEEDBACK_TYPE_COLORS[item.type] || 'bg-slate-500/20 text-slate-300'
                              }`}
                            >
                              {item.type}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border ${
                                FEEDBACK_IMPORTANCE_COLORS[item.importance] || 'bg-slate-500/20 text-slate-300'
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
    </SlidePanel>
  )
}

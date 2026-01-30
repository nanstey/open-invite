import React from 'react'
import { X, User as UserIcon, Calendar, AlertCircle } from 'lucide-react'
import { FormSelect } from '../../lib/ui/components/FormControls'
import { updateFeedbackStatus } from '../../services/feedbackService'
import {
  FEEDBACK_STATUS_OPTIONS,
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_STATUS_COLORS,
  type Feedback,
  type FeedbackStatus,
} from './types'

interface FeedbackDetailPanelProps {
  feedback: Feedback
  onClose: () => void
  onStatusChange: (id: string, status: FeedbackStatus) => void
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

export function FeedbackDetailPanel({ feedback, onClose, onStatusChange }: FeedbackDetailPanelProps) {
  const [updating, setUpdating] = React.useState(false)

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    setUpdating(true)
    const success = await updateFeedbackStatus(feedback.id, newStatus)
    if (success) {
      onStatusChange(feedback.id, newStatus)
    }
    setUpdating(false)
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[480px] bg-slate-900 z-50 flex flex-col border-l border-slate-700 shadow-2xl animate-slide-in-right">
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
        </div>
      </div>
    </>
  )
}


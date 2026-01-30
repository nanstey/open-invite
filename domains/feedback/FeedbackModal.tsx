import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { FormInput, FormSelect } from '../../lib/ui/components/FormControls'
import { submitFeedback } from '../../services/feedbackService'
import {
  FEEDBACK_TYPE_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  type FeedbackType,
  type FeedbackImportance,
  type FeedbackFormData,
} from './types'

interface FeedbackModalProps {
  onClose: () => void
  onSuccess?: () => void
}

// Threshold for swipe-to-close (in pixels)
const SWIPE_CLOSE_THRESHOLD = 100

export function FeedbackModal({ onClose, onSuccess }: FeedbackModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<FeedbackType>('feature')
  const [importance, setImportance] = useState<FeedbackImportance>('medium')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Bottom sheet drag state
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const dragStartY = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    setLoading(true)

    try {
      const data: FeedbackFormData = {
        title: title.trim(),
        type,
        importance,
        description: description.trim(),
      }

      const result = await submitFeedback(data)

      if (result) {
        setSuccess(true)
        onSuccess?.()
        setTimeout(() => {
          handleClose()
        }, 1500)
      } else {
        setError('Failed to submit feedback. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  // Touch handlers for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track touches on the drag handle area
    const touch = e.touches[0]
    dragStartY.current = touch.clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - dragStartY.current
    // Only allow dragging down
    if (deltaY > 0) {
      setDragY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > SWIPE_CLOSE_THRESHOLD) {
      handleClose()
    } else {
      setDragY(0)
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const formContent = (
    <>
      {success ? (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span className="text-lg">✓</span>
          Thank you! Your feedback has been submitted.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your feedback"
              size="lg"
              disabled={loading}
            />
          </div>

          {/* Type & Importance Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Type
              </label>
              <FormSelect
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                size="lg"
                disabled={loading}
              >
                {FEEDBACK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Importance
              </label>
              <FormSelect
                value={importance}
                onChange={(e) => setImportance(e.target.value as FeedbackImportance)}
                size="lg"
                disabled={loading}
              >
                {FEEDBACK_IMPORTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about your feedback..."
              rows={4}
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      )}
    </>
  )

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Desktop: Centered Modal */}
      <div className="hidden md:flex items-center justify-center h-full p-4">
        <div 
          className={`bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto transition-all duration-300 ${
            isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-fade-in'
          }`}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">Submit Feedback</h2>
          <p className="text-slate-400 text-sm mb-6">
            Help us improve Open Invite by sharing your thoughts.
          </p>

          {formContent}
        </div>
      </div>

      {/* Mobile: Bottom Sheet */}
      <div 
        ref={sheetRef}
        className={`md:hidden absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 ease-out ${
          isClosing ? 'translate-y-full' : 'animate-slide-up'
        }`}
        style={{
          transform: isClosing ? undefined : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {/* Drag Handle */}
        <div 
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white">Submit Feedback</h2>
            <p className="text-slate-400 text-sm">
              Help us improve Open Invite
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
          {formContent}
        </div>
      </div>
    </div>
  )
}

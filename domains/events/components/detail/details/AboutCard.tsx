import * as React from 'react'
import { FormattingHelpModal, FORMATTING_EXAMPLE } from './FormattingHelpModal'
import { MrkdwnRenderer } from './MrkdwnRenderer'

type ViewMode = 'edit' | 'preview'

export function AboutCard(props: {
  isEditMode: boolean
  description: string
  onChangeDescription?: (next: string) => void
  error?: string
}) {
  const { isEditMode, description, onChangeDescription, error } = props
  const [viewMode, setViewMode] = React.useState<ViewMode>('edit')
  const [showFormattingHelp, setShowFormattingHelp] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleInsertExample = () => {
    const separator = description.trim() ? '\n\n' : ''
    onChangeDescription?.(description + separator + FORMATTING_EXAMPLE)
    setShowFormattingHelp(false)
  }

  React.useEffect(() => {
    if (isEditMode) {
      setViewMode('edit')
    }
  }, [isEditMode])

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && viewMode === 'edit') {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(128, textarea.scrollHeight)}px`
    }
  }, [description, viewMode])

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h1 className="text-xl font-bold text-white mb-3">About</h1>
      {isEditMode ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                aria-pressed={viewMode === 'edit'}
                className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                  viewMode === 'edit'
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                aria-pressed={viewMode === 'preview'}
                className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                  viewMode === 'preview'
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Preview
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFormattingHelp(true)}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Formatting help
            </button>
          </div>
          {viewMode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => onChangeDescription?.(e.target.value)}
              placeholder="What's the vibe?"
              required
              className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none min-h-[8rem] resize-none overflow-hidden ${
                error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
              }`}
            />
          ) : (
            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 min-h-[8rem]">
              <MrkdwnRenderer
                content={description}
                className="text-slate-300 leading-relaxed text-base space-y-3"
              />
            </div>
          )}
        </>
      ) : (
        <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4">
          <MrkdwnRenderer
            content={description}
            className="text-slate-300 leading-relaxed text-base space-y-3"
          />
        </div>
      )}
      {isEditMode && error ? <div className="text-xs text-red-400 mt-2">{error}</div> : null}

      {showFormattingHelp && (
        <FormattingHelpModal
          onClose={() => setShowFormattingHelp(false)}
          onInsertExample={handleInsertExample}
        />
      )}
    </div>
  )
}

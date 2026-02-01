import * as React from 'react'
import { FormattingHelpModal, FORMATTING_EXAMPLE } from './FormattingHelpModal'
import { MrkdwnRenderer } from './MrkdwnRenderer'
import { useEmojiAutocomplete } from '../../../../../lib/hooks/useEmojiAutocomplete'
import { Button } from '../../../../../lib/ui/9ui/button'
import { Card } from '../../../../../lib/ui/9ui/card'
import { EmojiPicker } from '../../../../../lib/ui/9ui/emoji-picker'
import { Popover, PopoverContent } from '../../../../../lib/ui/9ui/popover'
import { Textarea } from '../../../../../lib/ui/9ui/textarea'

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
  const handleDescriptionChange = React.useCallback(
    (next: string) => {
      onChangeDescription?.(next)
    },
    [onChangeDescription],
  )

  const emojiAutocomplete = useEmojiAutocomplete({
    value: description,
    onChange: handleDescriptionChange,
    inputRef: textareaRef,
  })

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

  const cardClassName = isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <Card className={cardClassName}>
      <h1 className="text-2xl font-bold text-white mb-3">About</h1>
      {isEditMode ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              <Button
                type="button"
                variant={viewMode === 'edit' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('edit')}
                aria-pressed={viewMode === 'edit'}
                className="px-3 py-1 text-sm font-medium rounded-md"
              >
                Edit
              </Button>
              <Button
                type="button"
                variant={viewMode === 'preview' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('preview')}
                aria-pressed={viewMode === 'preview'}
                className="px-3 py-1 text-sm font-medium rounded-md"
              >
                Preview
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowFormattingHelp(true)}
              className="text-xs text-slate-400 hover:text-slate-200 underline px-0"
            >
              Formatting help
            </Button>
          </div>
          {viewMode === 'edit' ? (
            <Popover open={emojiAutocomplete.isOpen} onOpenChange={emojiAutocomplete.setIsOpen} className="w-full">
              <div className="w-full">
                <Textarea
                  ref={textareaRef}
                  value={description}
                  onChange={emojiAutocomplete.handleChange}
                  onKeyDown={emojiAutocomplete.handleKeyDown}
                  placeholder="What's the vibe?"
                  required
                  className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none min-h-[8rem] resize-none overflow-hidden ${
                    error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
                  }`}
                />
                <PopoverContent
                  align="start"
                  className="mt-0 w-[320px] p-0"
                  style={{
                    left: emojiAutocomplete.popoverPosition.left,
                    top: emojiAutocomplete.popoverPosition.top,
                  }}
                >
                  <EmojiPicker
                    emojis={emojiAutocomplete.emojis}
                    highlightedIndex={emojiAutocomplete.highlightedIndex}
                    onHighlightChange={emojiAutocomplete.setHighlightedIndex}
                    onSelect={emojiAutocomplete.handleEmojiSelect}
                  />
                </PopoverContent>
              </div>
            </Popover>
          ) : (
            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 min-h-[8rem]">
              <MrkdwnRenderer
                content={description}
                className="text-slate-300 leading-relaxed text-base space-y-4"
              />
            </div>
          )}
        </>
      ) : (
        <div className="w-full rounded-lg">
          <MrkdwnRenderer
            content={description}
            className="text-slate-300 leading-relaxed text-base space-y-4"
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
    </Card>
  )
}

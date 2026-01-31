import * as React from 'react'
import { X } from 'lucide-react'

type ViewMode = 'edit' | 'preview'

const FORMATTING_EXAMPLE = `# Welcome to the Event!

We're excited to have you join us for this *amazing* experience. Here's what you need to know:

## What to Expect
- Arrive 15 minutes early
- Bring your _own snacks_ if you'd like
- ~No pets allowed~ Pets are welcome!

> This is going to be the best event of the year!

Check out our website for more details: <https://example.com|Click here>

---

Drop a line in the \`chat\` if you have any questions!

\`\`\`
Dress code: Casual
Parking: Free
\`\`\`
`

const FORMATTING_OPTIONS = [
  { format: 'Bold', syntax: '*text*', example: '*bold*' },
  { format: 'Italic', syntax: '_text_', example: '_italic_' },
  { format: 'Strikethrough', syntax: '~text~', example: '~crossed out~' },
  { format: 'Inline code', syntax: '`code`', example: '`variable`' },
  { format: 'Code block', syntax: '```\\ncode\\n```', example: 'Multi-line code' },
  { format: 'Link', syntax: '<url|text>', example: '<https://...|Click>' },
  { format: 'Blockquote', syntax: '> text', example: '> quoted' },
  { format: 'List', syntax: '- item', example: '- bullet point' },
  { format: 'Header', syntax: '# text', example: '# Title' },
  { format: 'Subheader', syntax: '## text', example: '## Section' },
  { format: 'Horizontal rule', syntax: '---', example: 'Divider line' },
]

function FormattingHelpModal({
  onClose,
  onInsertExample,
}: {
  onClose: () => void
  onInsertExample: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-4">Formatting Help</h2>
        <p className="text-slate-400 text-sm mb-4">
          Use these formatting options to style your description.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-300 font-medium">Format</th>
                <th className="text-left py-2 pr-4 text-slate-300 font-medium">Syntax</th>
                <th className="text-left py-2 text-slate-300 font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              {FORMATTING_OPTIONS.map((opt) => (
                <tr key={opt.format} className="border-b border-slate-700/50">
                  <td className="py-2 pr-4 text-white">{opt.format}</td>
                  <td className="py-2 pr-4">
                    <code className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 text-xs">
                      {opt.syntax}
                    </code>
                  </td>
                  <td className="py-2 text-slate-400">{opt.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onInsertExample}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Insert Example
          </button>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Slack mrkdwn inline formatting:
 * - *bold*
 * - _italic_
 * - ~strikethrough~
 * - `code`
 * - <url|text> or <url> for links
 */
function inlineMrkdwn(value: string) {
  return (
    value
      // Links: <url|text> or <url> (escaped as &lt;...&gt;)
      .replace(
        /&lt;(https?:\/\/[^|&]+)\|([^&]+)&gt;/g,
        '<a class="text-primary underline" href="$1" target="_blank" rel="noreferrer">$2</a>',
      )
      .replace(
        /&lt;(https?:\/\/[^&]+)&gt;/g,
        '<a class="text-primary underline" href="$1" target="_blank" rel="noreferrer">$1</a>',
      )
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-slate-200">$1</code>')
      // Bold: *text*
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      // Italic: _text_
      .replace(/\b_([^_]+)_\b/g, '<em>$1</em>')
      // Strikethrough: ~text~
      .replace(/~([^~]+)~/g, '<s>$1</s>')
  )
}

function renderMrkdwn(mrkdwn: string) {
  const lines = escapeHtml(mrkdwn).split('\n')
  const html: string[] = []
  let inList = false
  let inBlockquote = false
  let inCodeBlock = false
  const codeBlockLines: string[] = []

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push('</blockquote>')
      inBlockquote = false
    }
  }

  const closeBlocks = () => {
    closeList()
    closeBlockquote()
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Code block toggle (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        html.push(
          `<pre class="bg-slate-800 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-slate-200 text-sm">${codeBlockLines.join('\n')}</code></pre>`,
        )
        codeBlockLines.length = 0
        inCodeBlock = false
      } else {
        closeBlocks()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (!trimmed) {
      closeBlocks()
      continue
    }

    // Horizontal rule (---, ***, ___)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeBlocks()
      html.push('<hr class="border-slate-700 my-4" />')
      continue
    }

    // Blockquote (> is escaped to &gt; by escapeHtml)
    const blockquoteMatch = /^&gt;\s?(.*)/.exec(trimmed)
    if (blockquoteMatch) {
      closeList()
      if (!inBlockquote) {
        html.push(
          '<blockquote class="border-l-4 border-primary pl-4 bg-slate-800/60 rounded-r-lg py-3 my-2 italic text-slate-200">',
        )
        inBlockquote = true
      }
      const content = blockquoteMatch[1].trim()
      if (content) {
        html.push(`<p>${inlineMrkdwn(content)}</p>`)
      }
      continue
    }

    closeBlockquote()

    // Lists (- item)
    const listMatch = /^[-•]\s+(.+)/.exec(trimmed)
    if (listMatch) {
      if (!inList) {
        html.push('<ul class="list-disc ml-5 space-y-1">')
        inList = true
      }
      html.push(`<li>${inlineMrkdwn(listMatch[1])}</li>`)
      continue
    }

    closeList()

    // Headers (# and ##)
    if (trimmed.startsWith('## ')) {
      html.push(`<h2 class="text-slate-100 font-semibold text-lg">${inlineMrkdwn(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      html.push(`<h1 class="text-slate-100 font-semibold text-xl">${inlineMrkdwn(trimmed.slice(2))}</h1>`)
      continue
    }

    html.push(`<p>${inlineMrkdwn(trimmed)}</p>`)
  }

  // Close any remaining open code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    html.push(
      `<pre class="bg-slate-800 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-slate-200 text-sm">${codeBlockLines.join('\n')}</code></pre>`,
    )
  }

  closeBlocks()

  return html.join('')
}

function MrkdwnRenderer({ content, className }: { content: string; className?: string }) {
  const html = React.useMemo(() => renderMrkdwn(content), [content])

  if (!content.trim()) {
    return <p className="text-slate-500 italic">No description yet.</p>
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

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


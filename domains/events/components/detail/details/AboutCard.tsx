import * as React from 'react'

type ViewMode = 'edit' | 'preview'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMarkdown(value: string) {
  return value
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a class="text-primary underline" href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-slate-200">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function renderMarkdown(markdown: string) {
  const lines = escapeHtml(markdown).split('\n')
  const html: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      continue
    }

    const listMatch = /^[-*+]\s+(.+)/.exec(trimmed)
    if (listMatch) {
      if (!inList) {
        html.push('<ul class="list-disc ml-5 space-y-1">')
        inList = true
      }
      html.push(`<li>${inlineMarkdown(listMatch[1])}</li>`)
      continue
    }

    closeList()

    if (trimmed.startsWith('### ')) {
      html.push(`<h3 class="text-slate-100 font-semibold text-base">${inlineMarkdown(trimmed.slice(4))}</h3>`)
      continue
    }
    if (trimmed.startsWith('## ')) {
      html.push(`<h2 class="text-slate-100 font-semibold text-lg">${inlineMarkdown(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      html.push(`<h1 class="text-slate-100 font-semibold text-xl">${inlineMarkdown(trimmed.slice(2))}</h1>`)
      continue
    }

    html.push(`<p>${inlineMarkdown(trimmed)}</p>`)
  }

  closeList()

  return html.join('')
}

function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  const html = React.useMemo(() => renderMarkdown(content), [content])

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

  React.useEffect(() => {
    if (isEditMode) {
      setViewMode('edit')
    }
  }, [isEditMode])

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">About</h2>
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
            <a
              className="text-xs text-slate-400 hover:text-slate-200 underline"
              href="https://www.markdownguide.org/basic-syntax/"
              target="_blank"
              rel="noreferrer"
            >
              Markdown help
            </a>
          </div>
          {viewMode === 'edit' ? (
            <textarea
              value={description}
              onChange={(e) => onChangeDescription?.(e.target.value)}
              placeholder="What’s the vibe?"
              required
              className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none h-32 resize-none ${
                error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
              }`}
            />
          ) : (
            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 min-h-[8rem]">
              <MarkdownRenderer
                content={description}
                className="text-slate-300 leading-relaxed text-base space-y-3"
              />
            </div>
          )}
        </>
      ) : (
        <MarkdownRenderer
          content={description}
          className="text-slate-300 leading-relaxed text-base space-y-3"
        />
      )}
      {isEditMode && error ? <div className="text-xs text-red-400 mt-2">{error}</div> : null}
    </div>
  )
}


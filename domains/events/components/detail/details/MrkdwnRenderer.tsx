import * as React from 'react'

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

export function MrkdwnRenderer({ content, className }: { content: string; className?: string }) {
  const html = React.useMemo(() => renderMrkdwn(content), [content])

  if (!content.trim()) {
    return <p className="text-slate-500 italic">No description yet.</p>
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}


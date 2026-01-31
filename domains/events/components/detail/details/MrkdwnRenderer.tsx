import * as React from 'react'

// Styling config - spacing between elements is handled by space-y-4 on the wrapper
const styles = {
  // Extra top margin for headers (creates visual sections)
  h1Spacing: 'mt-2',
  h2Spacing: 'mt-1',
  listItemSpacing: 'space-y-2',

  // Element styles
  codeBlock: 'bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 overflow-x-auto',
  codeText: 'text-slate-200 text-sm font-mono',
  inlineCode: 'px-1.5 py-0.5 rounded-md bg-slate-700/70 text-slate-100 font-mono text-[0.9em]',
  blockquote: 'border-l-4 border-primary pl-4 bg-primary/5 rounded-r-xl py-4 italic text-slate-200',
  list: 'ml-6 [&>li]:relative list-disc',
  hr: 'border-slate-700/60',
  h1: 'text-slate-50 font-bold text-xl border-b border-slate-700/50 pb-2',
  h2: 'text-slate-100 font-semibold text-lg',
  link: 'text-primary underline decoration-primary/40 hover:decoration-primary transition-colors',
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
  // Extract inline code spans first to protect them from subsequent formatting
  const codeSpans: string[] = []
  const PLACEHOLDER = '\x00CODE\x00'
  let processed = value.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code class="${styles.inlineCode}">${code}</code>`)
    return PLACEHOLDER
  })

  processed = processed
    // Links: <url|text> or <url> (escaped as &lt;...&gt;)
    .replace(
      /&lt;(https?:\/\/[^|&]+)\|([^&]+)&gt;/g,
      `<a class="${styles.link}" href="$1" target="_blank" rel="noreferrer">$2</a>`,
    )
    .replace(
      /&lt;(https?:\/\/[^&]+)&gt;/g,
      `<a class="${styles.link}" href="$1" target="_blank" rel="noreferrer">$1</a>`,
    )
    // Bold: *text*
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    // Italic: _text_ (at start of string, after whitespace, or after word boundary)
    .replace(/(^|[\s])_([^_]+)_([\s]|$)/g, '$1<em>$2</em>$3')
    // Strikethrough: ~text~
    .replace(/~([^~]+)~/g, '<s>$1</s>')

  // Restore code spans in order
  let idx = 0
  return processed.replace(new RegExp(PLACEHOLDER, 'g'), () => codeSpans[idx++] ?? '')
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
          `<pre class="${styles.codeBlock}"><code class="${styles.codeText}">${codeBlockLines.join('\n')}</code></pre>`,
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
      html.push(`<hr class="${styles.hr}" />`)
      continue
    }

    // Blockquote (> is escaped to &gt; by escapeHtml)
    const blockquoteMatch = /^&gt;\s?(.*)/.exec(trimmed)
    if (blockquoteMatch) {
      closeList()
      if (!inBlockquote) {
        html.push(`<blockquote class="${styles.blockquote}">`)
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
        html.push(`<ul class="${styles.list} ${styles.listItemSpacing}">`)
        inList = true
      }
      html.push(`<li>${inlineMrkdwn(listMatch[1])}</li>`)
      continue
    }

    closeList()

    // Headers (# and ##)
    if (trimmed.startsWith('## ')) {
      html.push(`<h2 class="${styles.h2} ${styles.h2Spacing}">${inlineMrkdwn(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      html.push(`<h1 class="${styles.h1} ${styles.h1Spacing}">${inlineMrkdwn(trimmed.slice(2))}</h1>`)
      continue
    }

    html.push(`<p>${inlineMrkdwn(trimmed)}</p>`)
  }

  // Close any remaining open code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    html.push(
      `<pre class="${styles.codeBlock}"><code class="${styles.codeText}">${codeBlockLines.join('\n')}</code></pre>`,
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

  return <div className={`mt-6 space-y-6 ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
}


import * as React from 'react'

const styles = {
  // Element styles
  hr: 'border-slate-700/60 my-4',
  h1: 'text-slate-50 font-bold text-xl border-b border-slate-700/50 mb-2',
  h2: 'text-slate-100 font-semibold text-lg pt-2',
  p: 'mt-2 mb-4',
  unorderedList: 'ml-6 [&>li]:relative list-disc space-y-0 mb-4',
  orderedList: 'ml-6 [&>li]:relative list-decimal space-y-0 mb-4',
  link: 'text-primary underline decoration-primary/40 hover:decoration-primary transition-colors',
  codeBlock: 'bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 overflow-x-auto',
  codeText: 'text-slate-200 text-sm font-mono',
  inlineCode: 'px-1.5 py-0.5 rounded-md bg-slate-700/70 text-slate-100 font-mono text-[0.9em]',
  blockquote: 'border-l-4 border-primary pl-4 bg-primary/5 rounded-r-xl py-2 italic text-slate-200 my-4',
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

function isListItem(line: string) {
  const trimmed = line.trim()
  return /^[-•]\s+.+/.test(trimmed) || /^\d+\.\s+.+/.test(trimmed)
}

function renderMrkdwn(mrkdwn: string) {
  const lines = escapeHtml(mrkdwn).split('\n')
  const html: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inBlockquote = false
  let inCodeBlock = false
  const codeBlockLines: string[] = []

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
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

    // Unordered lists (- item or • item)
    const unorderedListMatch = /^[-•]\s+(.+)/.exec(trimmed)
    if (unorderedListMatch) {
      if (listType !== 'ul') {
        closeList()
        html.push(`<ul class="${styles.unorderedList}">`)
        listType = 'ul'
      }
      html.push(`<li>${inlineMrkdwn(unorderedListMatch[1])}</li>`)
      continue
    }

    // Ordered lists (1. item, 2. item, etc.)
    const orderedListMatch = /^(\d+)\.\s+(.+)/.exec(trimmed)
    if (orderedListMatch) {
      if (listType !== 'ol') {
        closeList()
        html.push(`<ol class="${styles.orderedList}">`)
        listType = 'ol'
      }
      html.push(`<li>${inlineMrkdwn(orderedListMatch[2])}</li>`)
      continue
    }

    closeList()

    // Headers (# and ##)
    if (trimmed.startsWith('## ')) {
      html.push(`<h2 class="${styles.h2}">${inlineMrkdwn(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      html.push(`<h1 class="${styles.h1}">${inlineMrkdwn(trimmed.slice(2))}</h1>`)
      continue
    }

    const nextLine = lines[i + 1]
    const pClass = nextLine && isListItem(nextLine) ? 'mt-2 mb-0' : styles.p
    html.push(`<p class="${pClass}">${inlineMrkdwn(trimmed)}</p>`)
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

export function MrkdwnRenderer({ content }: { content: string }) {
  const html = React.useMemo(() => renderMrkdwn(content), [content])

  if (!content.trim()) {
    return <p className="text-slate-500 italic">No description yet.</p>
  }

  return <div className={`text-slate-300 leading-relaxed text-base`} dangerouslySetInnerHTML={{ __html: html }} />
}


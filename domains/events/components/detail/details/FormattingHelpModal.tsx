import * as React from 'react'
import { X } from 'lucide-react'

export const FORMATTING_EXAMPLE = `# Welcome to the Event!

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

export function FormattingHelpModal({
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


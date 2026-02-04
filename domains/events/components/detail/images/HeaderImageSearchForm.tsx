import * as React from 'react'

import { Search } from 'lucide-react'

type HeaderImageSearchFormProps = {
  query: string
  onQueryChange: (next: string) => void
  onSubmit: () => void
}

export function HeaderImageSearchForm(props: HeaderImageSearchFormProps) {
  const { query, onQueryChange, onSubmit } = props

  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search images"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none"
        />
      </div>
    </form>
  )
}

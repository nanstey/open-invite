/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_DEVTOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@tanstack/history' {
  interface HistoryState {
    fromEventsView?: 'list' | 'map' | 'calendar'
  }
}



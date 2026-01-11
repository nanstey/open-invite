/// <reference types="vite/client" />

declare module '@tanstack/history' {
  interface HistoryState {
    fromEventsView?: 'list' | 'map' | 'calendar'
  }
}



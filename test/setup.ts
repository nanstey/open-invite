import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// Silence React act(...) environment warnings in Vitest.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalConsole = globalThis.console
const consoleErrorSpy = vi.fn()
const consoleWarnSpy = vi.fn()
vi.stubGlobal('console', {
  ...originalConsole,
  error: consoleErrorSpy,
  warn: consoleWarnSpy,
})

afterEach(() => {
  consoleErrorSpy.mockReset()
  consoleWarnSpy.mockReset()
})

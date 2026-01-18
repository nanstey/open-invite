export {}

declare global {
  /**
   * Netlify Edge Functions run on Deno, but this project’s TypeScript config is
   * for the web app and doesn’t include Deno libs. This minimal shim prevents
   * `Cannot find name 'Deno'` during `tsc`.
   */
  const Deno: {
    env: {
      get(key: string): string | undefined
    }
  }
}




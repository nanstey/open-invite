---
name: pr-screenshots
description: >-
  Capture screenshots of Open Invite UI and attach them to a pull request, even
  when a live/authenticated environment is not reachable. Use when someone asks
  for screenshots, visual evidence, a UI preview, or "show me what it looks like"
  on a PR, and a logged-in staging/prod session isn't available (no creds, auth
  wall, or blocked CDN). Renders the real components against the app's real theme
  with mocked data, captures with the pre-installed Chromium, and embeds the
  images in a PR comment.
---

# PR screenshots for Open Invite

Produce faithful UI screenshots and attach them to a PR. Prefer a **live
authenticated capture** when you can get one; fall back to a **component-render
harness** when you can't. Always label which one you did.

## 0. Decide the capture mode (30 seconds)

Try live first. It's only possible if ALL of these hold:
- You have `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for a reachable env
  (check `env | grep VITE_`, `.env.local`; they are NOT in the repo).
- You can authenticate (a test email/password account — Google OAuth is not
  automatable headless).
- The account already has the data you need to show (e.g. notifications).
- `https://cdn.tailwindcss.com` is reachable (the app loads Tailwind from this
  CDN at runtime — see the styling gotcha below).

If any fail, use the **component-render harness** (§2). It renders the real
components with the app's real theme and sample data. Be explicit in the PR that
it is a component render, not a live session, and offer to redo it live if the
requester can supply creds + a seeded test account.

## 1. Environment facts (verified in this repo)

- **Chromium is pre-installed** at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Do NOT run `playwright install`.
- **`npm install` fails inside the repo** — pnpm workspace `link:` deps break npm.
  Install Playwright in an **isolated dir** outside the repo instead (§3).
- **Tailwind is CDN-based**, configured inline in `index.html`
  (`<script src="https://cdn.tailwindcss.com">` + a `tailwind.config` with theme
  colors `primary #6366f1`, `secondary #ec4899`, `accent #8b5cf6`,
  `surface #1e293b`, `background #0f172a`). In sandboxes the CDN is often **egress
  blocked (403)** — confirm with `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. If
  blocked, generate a local stylesheet from the same theme (§2a); otherwise the
  render is unstyled.
- **`lib/supabase.ts` degrades to a dummy client** when env vars are missing, so
  importing app modules won't crash without credentials.
- **Public repo** → `raw.githubusercontent.com` URLs render in PR comments. Pin to
  a **commit SHA**, not the branch name (branches contain `/`, which is ambiguous
  in raw URLs).
- **`fuser -k <port>/tcp`** to stop the dev server. Do NOT `pkill -f
  "vite.screenshot"` — the pattern matches its own shell and kills the command.

## 2. Component-render harness

Put all scaffolding under `._shot/` (repo-root, deleted before committing) plus a
`vite.screenshot.config.ts`. Nothing here gets committed.

### 2a. Local Tailwind CSS (only if the CDN is blocked)
```bash
mkdir -p ._shot
printf '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' > ._shot/input.css
# ._shot/tailwind.config.js: content globs = your components + ._shot/**; theme
# colors copied from index.html (primary/secondary/accent/surface/background).
npx --yes tailwindcss@3 -c ._shot/tailwind.config.js -i ._shot/input.css -o ._shot/tw.css --minify
```
The harness `index.html` then links `/tw.css` and Google Fonts (Inter, usually
reachable) instead of the Tailwind CDN. Copy the app's small `<style>` block
(scrollbar, `animate-fade-in`) from `index.html` for parity.

### 2b. Harness Vite config (`vite.screenshot.config.ts`)
Scope `root` to `._shot` so Vite builds ONLY your harness graph (not the real
`index.html`, whose full app graph will otherwise fail the dep scan). Swap
backend-touching modules for static mocks with a `resolveId` plugin — reliable,
unlike regex path aliases:
```ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
const abs = (p: string) => path.resolve(__dirname, '._shot/mocks', p);
const mocks: Record<string, string> = {
  'services/notificationService': abs('notificationService.ts'),
  'services/realtimeService': abs('realtimeService.ts'),
  'services/userService': abs('userService.ts'),
  'auth/AuthProvider': abs('AuthProvider.tsx'),
};
export default defineConfig({
  root: path.resolve(__dirname, '._shot'),
  server: { port: 3999, host: '0.0.0.0' },
  plugins: [
    { name: 'screenshot-mocks', enforce: 'pre',
      resolveId(source) {
        for (const k of Object.keys(mocks)) if (source.endsWith(k)) return mocks[k];
        return null;
      } },
    react(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  envPrefix: 'VITE_',
});
```
Mock notes:
- Mock modules must export EVERY symbol the app imports from that path, even ones
  your screen doesn't use (e.g. `userService` needs both `fetchUsers` and
  `fetchUser`) — otherwise the esbuild dep scan errors.
- Give mocked users **data-URI SVG avatars** so no image network is needed.
- `AuthProvider` mock returns `{ user: { id: 'me' }, loading: false }`.

### 2c. Harness entry (`._shot/main.tsx`)
- Wrap in a **TanStack `createMemoryHistory` router** — `<Link>` in the nav
  components requires a router context. Register the paths the nav links to
  (`/alerts`, `/explore`, `/events`, `/friends`, `/profile`) so `to=` validates.
- Presentational components take props directly (e.g. `DesktopSidebar` wants
  `user`, `activeSection`, `eventsView`, `unreadCount`, `onCreateInvite`); cast
  loosely (`as any`) — esbuild strips types, dev serving doesn't type-check.
- Read a `?screen=desktop|mobile` query param and render the matching composition;
  set the Playwright viewport per screen.

### 2d. Run it
```bash
pnpm exec vite --config vite.screenshot.config.ts >/tmp/vite-shot.log 2>&1 &
sleep 5; head -6 /tmp/vite-shot.log; grep -iE 'error|✘' /tmp/vite-shot.log
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:3999/?screen=desktop"
```

## 3. Capture with Playwright (isolated install)
```bash
SB="$SCRATCH/pw"; mkdir -p "$SB"; cd "$SB"
echo '{"name":"pw","private":true}' > package.json
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright   # npm is fine OUTSIDE the repo
```
Capture script (`shot.mjs`) — launch with explicit `executablePath`,
`deviceScaleFactor: 2`, wait for a known text node before shooting:
```js
import { chromium } from 'playwright';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; // check the real dir
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
async function shot(screen, w, h, file) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:3999/?screen=${screen}`, { waitUntil: 'networkidle' });
  await p.getByText('New invite').first().waitFor();  // ensure content rendered
  await p.waitForTimeout(600);                         // fonts/animation settle
  await p.screenshot({ path: file }); await ctx.close();
}
await shot('desktop', 1280, 860, `${process.env.OUT}/alerts-desktop.png`);
await shot('mobile',  402, 860, `${process.env.OUT}/alerts-mobile.png`);
await b.close();
```
```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers OUT="$SB" node shot.mjs
```
Always `Read` the PNGs yourself to confirm they rendered styled/correct before
publishing.

## 4. Attach to the PR
1. Stop the server (`fuser -k 3999/tcp`) and **delete all scaffolding**
   (`rm -rf ._shot vite.screenshot.config.ts`). Confirm `git status` shows only
   the PNGs.
2. Copy PNGs into the repo (e.g. `docs/screenshots/<feature>/`), commit, push.
3. Verify the raw URLs before commenting:
   ```bash
   curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" \
     "https://raw.githubusercontent.com/<owner>/<repo>/<COMMIT_SHA>/docs/screenshots/<feature>/alerts-desktop.png"
   ```
4. Post a PR comment (issue comment on the PR number) embedding the SHA-pinned
   raw URLs with `![alt](url)`. State plainly whether it's a live or
   component-level capture, and offer to redo live if creds become available.
   Offer to drop the binaries before merge if the team dislikes images in git.

## Pitfalls checklist
- [ ] Confirmed capture mode (live vs harness) and labeled it in the PR.
- [ ] Tailwind actually applied (local CSS if CDN blocked) — not an unstyled page.
- [ ] Vite `root` scoped to `._shot`; mocks export every imported symbol.
- [ ] Playwright installed OUTSIDE the repo; launched with explicit `executablePath`.
- [ ] Read the PNGs to verify before pushing.
- [ ] Harness scaffolding removed; only PNGs committed.
- [ ] Raw URLs return `200 image/png`; pinned to a commit SHA, not the branch.

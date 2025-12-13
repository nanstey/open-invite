<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1i-k0zoit4p6RG6ldnt6oapDfHbbFQpwk

## Run Locally

**Prerequisites:**  Node.js

### Quick Start (Mock Data Mode)

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   ```bash
   pnpm run dev
   ```

The app will run with mock data by default.

### Supabase Local Development Setup

For full database functionality with authentication and real-time features:

1. **Install Supabase CLI** (if not already installed):
   
   **Linux (recommended):**
   ```bash
   cd /tmp && wget -q https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -O supabase.tar.gz && tar -xzf supabase.tar.gz && mkdir -p ~/.local/bin && mv supabase ~/.local/bin/ && rm supabase.tar.gz && chmod +x ~/.local/bin/supabase
   ```
   
   Then ensure `~/.local/bin` is in your PATH:
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```
   
   **macOS:**
   ```bash
   brew install supabase/tap/supabase
   ```
   
   **Or use npx (no installation required):**
   ```bash
   npx supabase --help
   ```
   
   Verify installation:
   ```bash
   supabase --version
   ```

2. **Start local Supabase stack**:
   ```bash
   pnpm run supabase:start
   ```
   This will start PostgreSQL, Auth, Storage, and Realtime services locally. Note the output which includes:
   - API URL (typically `http://127.0.0.1:54321`)
   - Anon Key (labeled as "Publishable" in the output)
   
   **Note:** The vector service (log aggregation) is excluded by default due to Docker socket permission issues. This doesn't affect core functionality.

3. **Configure environment variables**:
   Create or update `.env.local` with:
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<your-anon-key-from-step-2>
   VITE_USE_SUPABASE=true
   GEMINI_API_KEY=<your-gemini-api-key>
   ```

4. **Run database migrations**:
   ```bash
   pnpm run supabase:migrate
   ```
   This creates all necessary tables, indexes, and RLS policies.

5. **Run the app**:
   ```bash
   pnpm run dev
   ```

6. **(Optional) Open Supabase Studio**:
   ```bash
   pnpm run supabase:studio
   ```
   Opens a web UI at `http://localhost:54323` to view and manage your local database.

### Supabase Commands

- `pnpm run supabase:start` - Start local Supabase services
- `pnpm run supabase:stop` - Stop local Supabase services
- `pnpm run supabase:reset` - Reset local database (drops all data)
- `pnpm run supabase:migrate` - Run pending migrations
- `pnpm run supabase:studio` - Open Supabase Studio UI

### Features

- **Authentication**: Sign up/sign in with email and password
- **Real-time Updates**: Live updates for events, comments, reactions, and notifications
- **Database**: PostgreSQL with Row Level Security (RLS) policies
- **Fallback Mode**: Automatically falls back to mock data if Supabase is not configured

### Notes

- Local Supabase data persists in `supabase/.branches` directory
- To disable Supabase and use mock data, set `VITE_USE_SUPABASE=false` in `.env.local` or remove the Supabase environment variables
- The app requires authentication when Supabase is enabled

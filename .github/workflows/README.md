# Deployment Pipeline Documentation

This directory contains GitHub Actions workflows for automated deployment to staging and production environments.

## Workflows

### `deploy-staging.yml`
- **Trigger:** Push to `main` branch or manual dispatch
- **Actions:**
  1. Resets Supabase staging database (`open-invite-staging`)
  2. Applies all migrations
  3. Applies seed data
  4. Builds frontend with staging environment variables
  5. Deploys to Netlify staging site (`staging.openinvite.cc`)

### `deploy-production.yml`
- **Trigger:** Push to `live` branch or manual dispatch
- **Actions:**
  1. Applies new migrations to Supabase production database (`open-invite-prod`)
  2. Builds frontend with production environment variables
  3. Deploys to Netlify production site (`openinvite.cc`)

## Required GitHub Secrets

This project uses **GitHub Environments** to manage environment-specific secrets. This allows us to use the same secret names with different values for staging and production.

### Setting Up GitHub Environments

1. Go to your GitHub repository → Settings → Environments
2. Create two environments:
   - **`staging`** - For staging deployments (main branch)
   - **`production`** - For production deployments (live branch)

### Repository-Level Secrets (Shared Across Environments)

These secrets are the same for both environments and can be set at the repository level (Settings → Secrets and variables → Actions):

- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token (get from https://supabase.com/dashboard/account/tokens)
- `NETLIFY_AUTH_TOKEN` - Netlify API token (create at https://app.netlify.com/user/applications)

### Environment-Specific Secrets

Configure these secrets in each environment (Settings → Environments → [environment name] → Add secret):

#### Staging Environment (`staging`)
- `SUPABASE_PROJECT_REF` - Project reference ID for staging instance (`open-invite-staging`)
- `SUPABASE_DB_PASSWORD` - Database password for staging Supabase project
- `NETLIFY_SITE_ID` - Netlify site ID for staging site (found in Site settings → General → Site details)
- `VITE_SUPABASE_URL` - Staging Supabase URL (e.g., `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Staging Supabase anonymous key

#### Production Environment (`production`)
- `SUPABASE_PROJECT_REF` - Project reference ID for production instance (`open-invite-prod`)
- `SUPABASE_DB_PASSWORD` - Database password for production Supabase project
- `NETLIFY_SITE_ID` - Netlify site ID for production site
- `VITE_SUPABASE_URL` - Production Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Production Supabase anonymous key

**Note:** The same secret names are used in both environments, but with different values. GitHub Environments automatically provides the correct values based on which environment the workflow runs in.

## Netlify Setup

### Initial Setup Steps

1. **Create Netlify Sites:**
   - Go to https://app.netlify.com
   - Create two sites from your GitHub repository:
     - Staging site: Configure to deploy from `main` branch
     - Production site: Configure to deploy from `live` branch
   - Note the Site IDs from each site's settings

2. **Configure Custom Domains:**
   - Staging: Add `staging.openinvite.cc` in Site settings → Domain management
   - Production: Add `openinvite.cc` in Site settings → Domain management
   - Follow DNS configuration instructions provided by Netlify

3. **Environment Variables in Netlify (NOT REQUIRED):**
   - **You do NOT need to set environment variables in Netlify** for this setup
   - Since we build in GitHub Actions and deploy pre-built files, Netlify environment variables are not used
   - All environment variables are provided via GitHub Secrets during the build step in GitHub Actions
   - The built files already contain the environment values baked in

4. **Create Netlify API Token:**
   - Go to https://app.netlify.com/user/applications
   - Create a new access token named "GitHub Actions Deployment"
   - Add this token to GitHub Secrets as `NETLIFY_AUTH_TOKEN`

5. **Optional: Disable Auto-Deploy:**
   - Since we're deploying via GitHub Actions, you may want to disable Netlify's automatic deployments
   - Go to Site settings → Build & deploy → Continuous Deployment
   - Toggle off "Deploy automatically" if desired

## Supabase Setup

### Getting Project References

1. Go to your Supabase project dashboard
2. Navigate to Settings → General
3. Find the "Reference ID" - this is what you need for the `SUPABASE_*_PROJECT_REF` secrets

### Getting Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new access token
3. Add to GitHub Secrets as `SUPABASE_ACCESS_TOKEN`

### Database Password

- This is the password you set when creating your Supabase project
- If you don't remember it, you can reset it in the project settings
- Add to GitHub Secrets as `SUPABASE_DB_PASSWORD` in each environment

## Testing the Workflow

### Test Staging Deployment

1. Make a change to your code
2. Push to `main` branch
3. Check GitHub Actions tab to see the workflow run
4. Verify deployment at `staging.openinvite.cc`

### Test Production Deployment

1. Merge `main` into `live` branch (or push directly to `live`)
2. Check GitHub Actions tab to see the workflow run
3. Verify deployment at `openinvite.cc`

## Troubleshooting

### Supabase CLI Issues

- Ensure `SUPABASE_ACCESS_TOKEN` is valid and has proper permissions
- Verify project references are correct
- Check that database password is correct

### Netlify Deployment Issues

- Verify `NETLIFY_AUTH_TOKEN` is valid
- Check that Site IDs are correct
- Ensure build completes successfully before deployment

### Build Failures

- Check that all environment variables are set correctly
- Verify `pnpm build` works locally
- Check build logs in GitHub Actions for specific errors

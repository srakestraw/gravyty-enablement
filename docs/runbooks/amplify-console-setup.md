# Amplify Console Configuration Guide

## Current Configuration

The `amplify.yml` file is now located at the **root** of the repository (not in `apps/web/`).

## Required Amplify Console Settings

### Step 1: Access Build Settings

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app
3. Go to **App settings** → **Build settings**
4. Click **Edit**

### Step 2: Update Build Configuration

**Important Settings:**

1. **Build specification file path**: `amplify.yml`
   - This should be at the root level (not `apps/web/amplify.yml`)
   - Amplify should auto-detect it, but verify it's set correctly

2. **Base directory**: Leave **empty** (or `/`)
   - This tells Amplify to build from the repository root

3. **App root**: Leave **empty** (or `/`)
   - This is for the application root, which is the repo root for monorepos

### Step 3: Verify Environment Variables

Ensure these environment variables are set in **App settings** → **Environment variables**:

```
VITE_API_BASE_URL=<your-api-url>
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=<your-user-pool-id>
VITE_COGNITO_USER_POOL_CLIENT_ID=<your-client-id>
VITE_COGNITO_DOMAIN=<your-cognito-domain>
VITE_AUTH_MODE=cognito
```

### Step 4: Save and Redeploy

1. Click **Save**
2. Go to the app's main page
3. Click **Redeploy this version** (or push a new commit to trigger a new build)

## Troubleshooting

### Build Still Fails

1. **Check build logs** - Look for which step failed:
   - `npm ci` - Dependency installation
   - `Building domain package...` - Domain package build
   - `Building design-system package...` - Design system build
   - `Building web app...` - Web app build

2. **Verify amplify.yml location** - Ensure it's at the root, not in `apps/web/`

3. **Check environment variables** - All `VITE_*` variables must be set

4. **Verify npm workspaces** - The build should run from repo root where `package.json` has workspaces configured

### Build Uses Wrong amplify.yml

If Amplify is still using the old `apps/web/amplify.yml`:
1. Delete the old file (already done in code)
2. In Amplify Console, manually set the build spec path to `amplify.yml`
3. Save and redeploy

## Build Process

The build process follows these steps:

1. **preBuild**:
   - `npm ci` - Install all workspace dependencies
   - Verify environment variables
   - Check TypeScript availability

2. **build**:
   - Build `packages/domain`
   - Build `packages/design-system`
   - Build `apps/web` (Vite handles TypeScript compilation)

3. **artifacts**:
   - Output directory: `apps/web/dist`
   - All files in dist are deployed




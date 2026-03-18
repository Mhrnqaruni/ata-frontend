# MST Parent Portal

This folder is the parent-portal frontend copied from the current NoobBook parent runtime and prepared to live inside the ATA frontend repo as a separate deployable app.

## Deployment model

- deploy this app as its own Vercel project from `apps/parent-portal`
- keep the teacher app as the main Vercel project from the repo root
- this safe first merge step officially supports prefixed mode only
- set `VITE_PARENT_APP_BASE_PATH=/parent-portal`
- this child app's `vercel.json` is written for that prefixed mode:
  - `/` redirects to `/parent-portal/`
  - `/parent-portal` redirects to `/parent-portal/`
  - `/parent-portal/assets/*` rewrites to the emitted `/assets/*` files
  - `/parent-portal/*` rewrites to `index.html` for SPA routing
- the ATA handoff page should launch this app through `VITE_PARENT_PORTAL_URL`
- if the main ATA Vercel project fronts this child app behind a same-domain route, the outer rewrite should preserve the `/parent-portal` prefix rather than stripping it
- if a future deployment needs true root-domain mode at `/`, that should use a separate Vercel config strategy rather than the current prefixed contract

## Required environment

- `VITE_PARENT_APP_BASE_PATH`
  - `/parent-portal` for the current repo-merge deployment contract
- `VITE_API_HOST`
  - optional host used for asset/file URLs
- `VITE_API_URL`
  - full parent-workspace API URL, for example `https://parent-workspace-api.example.com/api/v1`
- `VITE_ATA_PARENT_APP_URL`
  - URL of the ATA app page that launches the parent portal

## Local commands

```bash
npm install
npm run dev
npm run build
```

## Monorepo install/build contract

From the ATA repo root:

```bash
npm run bootstrap:parent-portal
npm run build:parent-portal
```

The ATA root `package.json` now provides an explicit bootstrap contract for the copied child app. That is intentional: the ATA teacher app and the parent portal currently use different React/type dependency trees, so a naive npm workspace hoist can leak the ATA root React 18 type packages into the React 19 parent-portal build. The root bootstrap script keeps the child install isolated while still making root-level builds truthful on a clean checkout.

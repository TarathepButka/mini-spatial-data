# AGENTS.md

## Purpose

This file contains durable repo guidance for Codex. Keep it practical and scoped to rules that should apply on every task in this repository. Do not add one-off plans, status notes, or broad style preferences here.

## Project Shape

- This is a mini spatial data platform, not a static map demo.
- Keep the full flow connected: React UI -> Go API -> MongoDB.
- Main directories:
  - `backend/`: Go + Gin API, feature-based packages under `internal/`.
  - `frontend/`: React + Vite + TypeScript app.
  - `postman/`: exported Postman collection for API testing.
  - `docker-compose.yml`: local stack for `frontend`, `backend`, and `mongo`.
- Public API routes are versioned under `/api/v1`.

## Backend Rules

- Use Go, Gin, and the official MongoDB Go driver.
- Do not introduce GORM while MongoDB is the database.
- Keep backend feature code grouped by domain, especially `internal/place` and `internal/auth`.
- Return JSON for every API response, including errors.
- Keep GeoJSON response contracts stable:
  - single items are GeoJSON `Feature`
  - list responses wrap a GeoJSON `FeatureCollection` plus pagination `meta`
- Preserve MongoDB geospatial behavior:
  - `geometry` uses GeoJSON Point coordinates `[lng, lat]`
  - `geometry` keeps a `2dsphere` index
  - `bbox` queries use `/api/v1/places?bbox=minLng,minLat,maxLng,maxLat`
- Google login must use backend ID token verification and HttpOnly cookie sessions.
- Do not store app JWTs in frontend localStorage.

## UI Reuse And Theme Rules

- Reuse existing components before creating new ones. Prefer extending small shared components over duplicating table, toolbar, form, modal, button, badge, or map-control patterns.
- Do not scatter hardcoded colors, marker colors, shadows, radii, spacing, or typography values across feature files.
- Put reusable visual decisions in a theme/token layer or a single helper module such as `frontend/src/features/places/styles.ts` until a broader design-system folder exists.
- When adding category/status colors, expose them through named tokens or helper functions instead of inline hex values in JSX.
- Keep Tailwind utility usage consistent with the existing visual system. If a new repeated utility pattern appears more than twice, extract a component or helper.
- Do not create one-off components that differ only by color or label. Use props/variants for repeated UI behavior.
- Keep design primitives stable: buttons, inputs, selects, chips, markers, popups, and table actions should look and behave consistently across the app.

## Frontend Rules

- Use React, TypeScript, MapLibre GL JS, TanStack Query, TanStack Table, and Tailwind.
- The first screen should remain the working dashboard: toolbar, table, map, legend, and create/edit form.
- Do not replace API calls with mock data for app behavior.
- Keep map/table interactions wired together:
  - row focus flies to marker
  - marker popup supports edit/delete
  - map click starts create flow
  - viewport mode sends `bbox` after map movement
- API requests should include cookies with `credentials: "include"` for auth session support.
- When changing public UI behavior, keep mobile and desktop layouts usable.

## Security Rules

- Do not read, print, copy, or summarize real secret files such as `.env`, `.env.local`, `.env.*.local`, private keys, credential exports, or local token stores unless the user explicitly asks for that exact file and understands it may expose secrets.
- Use `backend/.env.example`, `frontend/.env.example`, README docs, or explicit user-provided values when reasoning about required environment variables.
- Never log, commit, or paste secrets including `.env`, `.env.local`, `.env.*.local`, private keys, credential exports, or local token stores.
- Keep auth session tokens in HttpOnly cookies only. Do not reintroduce localStorage/sessionStorage token storage.
- If debugging auth, inspect response status, cookie presence/attributes, and sanitized config names rather than token values.
- Validate and sanitize all external input at API boundaries, especially GeoJSON coordinates, bbox values, ObjectIDs, pagination, and Google login payloads.
- Keep CORS scoped to known frontend origins. Do not use wildcard CORS with credentials.
- Avoid leaking internal errors to clients; return stable JSON errors and keep detailed diagnostics in server logs without secrets.
- Treat Vallaris and map tile APIs as external network dependencies; keep API keys in env vars and never hardcode them in source.

## Data And Auth

- Vallaris seed data is hotspot/fire-detection data normalized into the `places` domain.
- Keep important Vallaris properties when normalizing: `hotspotid`, `confidence`, `frp`, province/amphoe/tambol, date/time, satellite/instrument.
- Development env examples belong in `backend/.env.example` and `frontend/.env.example`; real secrets belong in local `.env` files only.

## Required Checks

Run the smallest relevant checks for the files changed. Before handoff, prefer these checks when applicable:

- Backend changes: `cd backend && go test ./...`
- Frontend changes: `cd frontend && npx tsc --noEmit`
- Frontend build or Vite/Tailwind/config changes: `cd frontend && npm run build`
- Docker or env changes: `docker compose config`
- Postman collection changes: parse the JSON before handoff

If a check cannot be run, report the reason and the risk clearly.

## Documentation And Delivery

- Keep `README.md`, `backend/.env.example`, `frontend/.env.example`, and the Postman collection aligned with API, auth, and Docker changes.
- If endpoint paths change, update all of these together:
  - backend router
  - frontend API clients
  - Postman `baseUrl` and requests
  - README endpoint examples
- Mention any build warnings that remain, especially the expected MapLibre bundle-size warning.

## Do Not Do

- Do not add unrelated refactors while implementing requested changes.
- Do not change the tech stack without explicit user approval.
- Do not remove bonus features unless the user asks: map click create, search/filter, category legend, bbox loading, pagination, edit, Google login.
- Do not make a marketing landing page; this app should open directly to the usable platform.

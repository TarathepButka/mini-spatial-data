# Mini Spatial Data Platform

A full-stack spatial data platform built with Go, Gin, MongoDB, React, Vite, TypeScript, MapLibre GL JS, TanStack Query/Table, and Tailwind CSS.

The app manages GeoJSON `Feature` records, displays them in a table, and renders them on an interactive map. It can seed real Thailand hotspot data from the Vallaris Maps API.

## Features

- REST API for list, get, create, update, delete
- GeoJSON `Feature` and `FeatureCollection` responses for `Point`, `LineString`, and `Polygon`
- MongoDB `2dsphere` index for spatial queries
- BBox query: `GET /api/v1/features?bbox=minLng,minLat,maxLng,maxLat`
- Nearby query: `GET /api/v1/features/nearby?lng=&lat=&radius=`
- Vallaris seed endpoint for Thailand data using `ct_en=Thailand`
- React dashboard with MapLibre map, Terra Draw editor, and TanStack Table
- Click map or draw Point/LineString/Polygon geometry to create a feature
- Edit/delete from table or map popup
- Search, province filter, category legend filter
- Viewport loading via `map.on("moveend")`
- Docker Compose for frontend, backend, and MongoDB
- Postman collection included
- Google login with Google Identity Services, backend ID token verification, and HttpOnly cookie sessions

## Project Structure

```txt
mini-spatial-data/
  backend/
    cmd/api/main.go
    internal/config/
    internal/database/
    internal/http/
    internal/feature/
    internal/seed/
    Dockerfile
  frontend/
    src/api/
    src/config/
    src/features/auth/
    src/features/features/
    src/types/
    Dockerfile
    nginx.conf
  postman/mini-spatial-data.postman_collection.json
  docker-compose.yml
  README.md
  AGENTS.md
```

## Requirements

- Docker and Docker Compose, or
- Go 1.26+
- Node.js 24+
- MongoDB 8+

## Environment Variables

Backend and frontend env files are intentionally separated. Backend env can contain secrets. Frontend env must only contain public `VITE_*` values.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Required in `backend/.env` for seeding:

```txt
VALLARIS_API_KEY=your_api_key_here
```

The seed endpoint also requires an authenticated `admin` user.

Required for Google login:

```txt
# backend/.env
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
AUTH_JWT_SECRET=replace-with-a-long-random-secret
AUTH_REQUIRED=false
AUTH_COOKIE_NAME=mini_spatial_auth
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

Create a Google OAuth **Web application** client id in Google Cloud Console and add these JavaScript origins for local development:

```txt
http://localhost:3000
http://localhost:5173
```

`POST /api/v1/auth/google` verifies the Google ID token, sets an HttpOnly cookie, and returns only the user profile plus expiry metadata. The frontend sends cookies with `credentials: "include"` and does not store the app JWT in `localStorage`.

Google users are stored in the MongoDB `users` collection. On startup, the backend runs an idempotent database seeder that grants `admin` and `user` roles to `tarathep.butka@gmail.com`. Other Google users receive the `user` role by default. A user can hold multiple roles, while the active `role` controls the current permission set. The `user` role has `read`, `create`, and `edit` permissions, plus delete access for records they created. The `admin` role has all permissions, including global `delete` and `seed`.

Create, update, delete, and seed endpoints require the HttpOnly session cookie and check permissions at the API boundary. Read endpoints remain public unless `AUTH_REQUIRED=true`, which also requires `read` permission for list/get/nearby requests. `POST /api/v1/auth/role` switches the active role, validates it against the user's `roles`, and sets a fresh HttpOnly cookie. If `AUTH_REQUIRED=true`, `GOOGLE_CLIENT_ID` is set, or `APP_ENV=production`, the backend requires `AUTH_JWT_SECRET` to be a private value with at least 32 characters.

The frontend stores the backend `permissions` response as UI flags. Delete controls are shown only for admins or for records owned by the current user, and Seed controls are shown only to users with `seed` permission. API permissions remain the source of truth.

For cross-site production deployments, set `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAME_SITE=none`. Keep `CORS_ALLOW_ORIGINS` scoped to explicit frontend origins; wildcard CORS is treated as public and does not allow credentialed cookie requests.

Do not commit real API keys.

## Run With Docker

```bash
docker compose up --build
```

Open:

```txt
http://localhost:3000
```

Backend API:

```txt
http://localhost:8080/api/v1
```

Seed Vallaris Thailand data from the UI using the `Seed` button, or call:

```bash
curl -X POST http://localhost:8080/api/v1/seed/vallaris
```

## Local Development

### Backend

```bash
cd backend
go mod tidy
go run ./cmd/api
```

The backend expects MongoDB at `mongodb://localhost:27017` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

Vite proxies `/api` to `http://localhost:8080` in development, so `/api/v1/...` routes go to the backend.

For the Docker frontend, `frontend/.env` is loaded at container startup and written to `/env.js`, so `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` can be changed without rebuilding the image.

## API Endpoints

```txt
GET    /api/v1/health
POST   /api/v1/auth/google
GET    /api/v1/auth/me
POST   /api/v1/auth/role
POST   /api/v1/auth/logout
GET    /api/v1/features?page=1&limit=20&search=&category=&province=&bbox=minLng,minLat,maxLng,maxLat
GET    /api/v1/features/:id
POST   /api/v1/features
PUT    /api/v1/features/:id
DELETE /api/v1/features/:id
GET    /api/v1/features/nearby?lng=100.5&lat=13.7&radius=5000
POST   /api/v1/seed/vallaris
```

Google login body:

```json
{
  "credential": "google-id-token-from-google-identity-services"
}
```

Create/update body supports `Point`, `LineString`, and `Polygon` GeoJSON geometry:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [100.5018, 13.7563]
  },
  "properties": {
    "name": "Manual feature",
    "category": "manual",
    "province": "Bangkok",
    "description": "Created from map click"
  }
}
```

LineString geometry example:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [100.5018, 13.7563],
      [100.61, 13.82],
      [100.72, 13.78]
    ]
  },
  "properties": {
    "name": "Manual route",
    "category": "manual",
    "province": "Bangkok"
  }
}
```

Polygon geometry example:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [100.48, 13.73],
        [100.56, 13.73],
        [100.56, 13.79],
        [100.48, 13.73]
      ]
    ]
  },
  "properties": {
    "name": "Manual area",
    "category": "manual",
    "province": "Bangkok"
  }
}
```

List response:

```json
{
  "data": {
    "type": "FeatureCollection",
    "features": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Tests

Backend:

```bash
cd backend
go test ./...
```

Frontend:

```bash
cd frontend
npm run test
npx tsc --noEmit
npm run build
```

## Notes

- `POST /api/v1/seed/vallaris` requires the `seed` permission, which is included in the `admin` role.
- Seed failures return a fixed public error message. Detailed upstream errors are sanitized before logging so API keys are not exposed.
- Map tiles are loaded from OpenStreetMap raster tiles, so the map needs internet access.
- The submitted Vallaris dataset is hotspot/fire-detection data. The app normalizes it into GeoJSON feature records while preserving key properties such as hotspot id, confidence, FRP, province, amphoe, and timestamp.

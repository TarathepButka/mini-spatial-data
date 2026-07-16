# Mini Spatial Data Platform

This project is a Full-stack **Spatial Data Platform** developed as part of an assignment using real GeoJSON spatial data of Thailand. The system consists of a Backend API (Go/Gin/MongoDB) and a Frontend UI (React/TypeScript/MapLibre) seamlessly working together.

---

## Features & Requirements Fulfillment

### Core Requirements
- **Backend API:** Developed a robust RESTful API using Go (Gin framework) supporting List/Get, Create, Update, and Delete endpoints.
- **GeoJSON Standard:** All features are stored and transmitted natively as GeoJSON Features.
- **Database:** Uses MongoDB with a `2dsphere` index to support efficient Geospatial queries.
- **Frontend UI:** Built with React + Vite + TypeScript, fetching real data from the API (no mock data).
- **Table View:** Displays features in a clean, modern table using TanStack Table with pagination.
- **Interactive Map:** Renders features on an interactive map using MapLibre GL JS with clustering support.
- **Manage Features:** Users can Create, Update, and Delete features directly from the UI (both via the table and map pop-ups).
- **Postman Collection:** Provided in `postman/mini-spatial-data.postman_collection.json` to test all API endpoints.

### Bonus Features & Creativity
- **Edit Features:** Full support for updating feature properties and geometries.
- **Search & Filters:** Real-time search, category legend filtering, province filtering, and BBox (viewport) filtering.
- **Advanced Geometry:** Support for drawing and managing multiple geometry types (`Point`, `LineString`, and `Polygon`) using Terra Draw.
- **Google OAuth 2.0:** Secure login using Google Identity Services with Role-Based Access Control (Admin/User). Sessions are securely stored in `HttpOnly` Cookies (JWTs are not exposed to LocalStorage).
- **Vallaris Data Seeder:** Automated seeder endpoint that fetches Thailand hotspot data from the Vallaris API and converts it into the platform's GeoJSON structure.
- **Modern & Premium UI:** Designed a high-quality, aesthetic, and user-friendly interface with micro-animations, glassmorphism, and responsive layout.

### What is missing
- (None) All Core and Bonus requirements have been implemented successfully.

---

## Installation and Running the Project

The easiest way to run the project is using **Docker Compose**, which sets up the Backend, Frontend, and MongoDB automatically.

### Running with Docker (Recommended)
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Create `.env` files for both Backend and Frontend (see the Environment Variables section below).
3. Run the following command at the root of the project:
   ```bash
   docker compose up -d --build
   ```
4. Access the application at: **http://localhost:5173**

### Manual Setup (Local Development)
**Prerequisites:** Go 1.26+, Node.js 24+, MongoDB 8+

**1. Run Backend:**
```bash
cd backend
# Make sure backend/.env is created
go mod tidy
go run ./cmd/api
# The API will be available at http://localhost:8080
```
*Note: The backend requires a MongoDB instance running locally at `mongodb://localhost:27017` by default.*

**2. Run Frontend:**
```bash
cd frontend
# Make sure frontend/.env is created
npm install
npm run dev
# The UI will be available at http://localhost:5173
```

---

## Environment Variables

Environment variables are separated for Backend and Frontend.
Copy the provided `.env.example` to `.env` in both directories.

### 1. Backend (`backend/.env`)
```env
# Server & Database Config
APP_ENV=development
PORT=8080
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=mini_spatial_data
MONGO_COLLECTION=features
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173

# Auth & JWT Config
GOOGLE_CLIENT_ID=your-google-client-id
AUTH_REQUIRED=false 
AUTH_JWT_SECRET=your-32-character-secret-key-here
AUTH_TOKEN_TTL_HOURS=24
AUTH_COOKIE_NAME=mini_spatial_auth
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax

# Vallaris Data Seeder
VALLARIS_ITEMS_URL=https://app.vallarismaps.com/core/api/features/1.1/collections/68db604f6d325faa74ba5bbd/items
VALLARIS_API_KEY=your-vallaris-api-key
VALLARIS_IMPORT_LIMIT=100
HTTP_TIMEOUT_SECONDS=30
```
*Note: To enable authentication, set `AUTH_REQUIRED=true` and configure the Google Client ID.*

### 2. Frontend (`frontend/.env`)
```env
# Backend API URL
VITE_API_URL=http://localhost:8080

# Google Client ID for UI login
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Key Project Structure

- `backend/internal/feature/`: Spatial Feature business logic and MongoDB operations.
- `backend/internal/http/`: API Router and Controllers (Gin).
- `frontend/src/features/features/map/`: Map component integrating MapLibre & TerraDraw.
- `frontend/src/features/features/components/`: Dashboard, Forms, and Table components.
- `postman/`: Contains the Postman Collection for API testing.

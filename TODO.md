# TODO: Add Login, Registration & MySQL Database

## Backend
- [x] Create `backend/package.json` with dependencies (express, mysql2, bcryptjs, cors)
- [x] Create `backend/db.js` — MySQL connection pool
- [x] Create `backend/server.js` — Express server with register/login/users endpoints
- [x] Auto-create `car_website` DB and `users` table on startup

## Frontend Pages
- [x] Create `src/Pages/Register.jsx` — Registration form (name, email, password, confirm password)
- [x] Create `src/Pages/Login.jsx` — Login form (email, password)
- [x] Create `src/context/AuthContext.jsx` — Global auth state

## Routing & Navigation
- [x] Update `src/App.jsx` — Add /login and /register routes, wrap with AuthProvider
- [x] Update `src/Components/Nav/Nav.jsx` — Add Login/Register/Logout links

## Configuration
- [x] Update root `package.json` — Add proxy for API requests

## Protected Routes
- [x] Create `src/Components/ProtectedRoute.jsx` — Block unauthenticated access
- [x] Create `src/Components/PublicRoute.jsx` — Block auth pages for logged-in users
- [x] Update `src/App.jsx` — Wrap routes with protectors


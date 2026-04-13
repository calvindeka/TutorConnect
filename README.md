# TutorConnect

Peer tutoring platform — SCMP 318 Software Engineering Project

## Auth Path

**Local Login Path** — email + name login with server-side sessions (express-session).

## How to Run

### Prerequisites
- Node.js 18+
- MariaDB running locally

### 1. Set up the database

```bash
mysql -u root < server/schema.sql
```

### 2. Configure environment

Edit `server/.env` with your MariaDB credentials:
```
PORT=4131
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tutorconnect
SESSION_SECRET=tutorconnect-secret-change-in-production
```

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Start the app

Build the frontend:
```bash
cd client && npm run build
```

Start the server:
```bash
cd ../server && npm start
```

### 5. Open in browser

App: http://10.192.145.179:4131

## Demo Walkthrough

1. Open http://localhost:5173 — you'll see the login page
2. Enter your name and email, click "Sign In"
3. You're now on the dashboard showing your session is active
4. **Refresh the page** — you stay logged in (session persists via cookie)
5. Click "Sign Out" — session is destroyed, redirected to login

## Architecture

- **Frontend**: React (Vite) + React Router + Axios
- **Backend**: Node.js + Express + express-session
- **Database**: MariaDB (mysql2 driver)
- **Sessions**: Server-side via express-session, browser receives httpOnly cookie
- **Auth flow**: POST /auth/login creates or finds user, stores in session. POST /auth/logout destroys session. GET /api/me returns current user from session.

## Project Structure

```
TutorConnect/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── App.jsx              # Router + protected routes
│       ├── context/AuthContext.jsx   # Session-based auth state
│       └── pages/
│           ├── LoginPage.jsx        # Login form
│           └── DashboardPage.jsx    # Authenticated dashboard
├── server/                  # Express backend
│   ├── index.js                 # Express app + session config
│   ├── config/db.js             # MariaDB connection pool
│   ├── routes/auth.js           # POST /auth/login, POST /auth/logout
│   └── schema.sql               # Database schema + seed data
└── .gitignore
```

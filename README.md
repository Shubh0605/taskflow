# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, kanban boards, and real-time task tracking.

## 🚀 Live Demo

> Deploy following the instructions below and add your live URL here.

## 📸 Features

- **Authentication** — JWT-based signup/login with secure password hashing
- **Projects** — Create and manage projects with custom colors and descriptions
- **Team Management** — Invite members by email, assign Admin/Member roles
- **Kanban Board** — Drag-style column view (To Do → In Progress → Review → Done)
- **List View** — Table view with inline status editing
- **Task Management** — Create tasks with title, description, status, priority, assignee, due date, and tags
- **Dashboard** — Overview of active tasks, overdue items, status breakdown, and recent projects
- **My Tasks** — Filtered view of all tasks assigned to you with overdue highlighting
- **Role-Based Access Control** — Admins can manage members and delete projects; Members can manage tasks

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL (Railway) / SQLite (dev) |
| ORM | Sequelize |
| Auth | JWT + bcrypt |
| Styling | Custom CSS (no UI library) |

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── models/         # Sequelize models (User, Project, Task, ProjectMember)
│   ├── routes/         # Express route handlers
│   │   ├── auth.js     # POST /signup, /login, GET /me
│   │   ├── projects.js # CRUD + member management
│   │   └── tasks.js    # CRUD + dashboard + filters
│   ├── middleware/
│   │   └── auth.js     # JWT auth + role guard middleware
│   └── server.js       # Express app + DB sync
├── frontend/
│   └── src/
│       ├── pages/      # Dashboard, Projects, ProjectDetail, MyTasks, Auth
│       ├── components/ # Layout, TaskModal
│       ├── context/    # AuthContext
│       └── api.js      # Axios instance with auth interceptors
├── railway.toml        # Railway deployment config
└── nixpacks.toml       # Build configuration
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd taskflow

# Backend setup
cd backend
npm install
cp ../.env.example .env
# Edit .env — for local dev, SQLite is used automatically if DATABASE_URL is not set

# Start backend (runs on port 3001)
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173 with proxy to backend
```

### Environment Variables (backend/.env)

```env
DATABASE_URL=         # PostgreSQL URL (optional for local — SQLite used by default)
JWT_SECRET=           # Any random string
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## 🚀 Deploying to Railway

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create taskflow --public --push
```

### Step 2 — Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

### Step 3 — Add PostgreSQL

1. In your Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway automatically sets `DATABASE_URL` in your service environment

### Step 4 — Set Environment Variables

In your Railway service → **Variables** tab, add:

```
JWT_SECRET=your_random_secret_string_here
FRONTEND_URL=https://<your-app>.railway.app
```

> `DATABASE_URL` and `PORT` are set automatically by Railway.

### Step 5 — Deploy

Railway auto-deploys on push. Your app will be live at the URL shown in the Railway dashboard.

### Step 6 — Verify

Visit your Railway URL. You should see the TaskFlow login page. Create an account and start managing tasks!

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/projects` | ✅ | List my projects |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects/:id` | Member | Get project details |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Invite member |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |
| PUT | `/api/projects/:id/members/:userId/role` | Admin | Change member role |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks/dashboard` | ✅ | Dashboard summary |
| GET | `/api/tasks` | ✅ | My assigned tasks |
| GET | `/api/tasks/project/:id` | Member | Project tasks |
| POST | `/api/tasks` | Member | Create task |
| PUT | `/api/tasks/:id` | Member | Update task |
| DELETE | `/api/tasks/:id` | Member/Creator | Delete task |

## 🔒 Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiry
- Helmet.js security headers
- Rate limiting (200 req/15min)
- Input validation with express-validator
- Role-based route protection
- SQL injection protection via Sequelize ORM

## 📝 License

MIT

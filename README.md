# Project Manager

A full-featured project management application built with Next.js 16, Tailwind CSS v4, and MongoDB.

## Features

- **Project Hierarchy:** Projects → Components → Phases → Tasks
- **Kanban Board:** Mobile-first drag & drop with status transitions
- **Sprint Planning:** Sprint management with velocity tracking
- **Calendar & Gantt:** Visual timeline and scheduling views
- **AI API:** Smart queue, velocity tracker, automated task updates
- **Real-time Updates:** Server-Sent Events (SSE) for live notifications
- **GitHub Integration:** Link repos, track commits and PRs
- **File Uploads:** AWS S3 integration for attachments
- **Search:** Full-text search across projects and tasks
- **PWA:** Installable as a Progressive Web App
- **Auth:** Secure login with bcrypt, JWT sessions, account lockout
- **User Management:** Admin-only user creation and management
- **Templates:** Reusable project templates
- **Time Reports:** Track time spent per task/phase
- **Export:** PDF and Excel export support
- **Dark Theme:** Glass-morphism design with gradient mesh background

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **Database:** MongoDB + Mongoose
- **Auth:** bcrypt + JWT (jose)
- **Storage:** AWS S3
- **UI:** Inter font, dark glass-morphism theme

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
git clone https://github.com/Youssef-Durgham/project-manager.git
cd project-manager
npm install
```

### 2. Setup Environment & Users

```bash
# Interactive setup — generates .env.local and creates users
npm run setup:env
```

Or manually create `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/project-manager
JWT_SECRET=your-secret-key-here
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=project-manager-uploads
```

Then run user setup:

```bash
npm run setup
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Setup Script

The setup script (`scripts/setup.js`) handles initial configuration:

```bash
npm run setup          # Create/update users (interactive)
npm run setup:env      # Generate .env.local + create users
npm run setup:reset    # Reset all users and recreate
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, projects, AI, etc.)
│   ├── project/       # Project pages (detail, kanban, gantt, etc.)
│   ├── admin/         # Admin pages (user management)
│   ├── login/         # Login page
│   └── search/        # Search page
├── components/        # Reusable UI components
├── lib/               # Utilities (auth, DB, events, types)
└── models/            # Mongoose models
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/auth/login` | User login |
| `POST /api/auth/logout` | User logout |
| `GET /api/auth/me` | Current user info |
| `GET/POST /api/projects` | List/create projects |
| `GET/PUT/DELETE /api/projects/[id]` | Project CRUD |
| `POST /api/ai` | AI task management API |
| `GET /api/ai/feed` | AI activity feed |
| `GET /api/search` | Full-text search |
| `GET /api/notifications` | User notifications |
| `GET /api/events` | SSE real-time events |
| `POST /api/upload` | File upload (S3) |
| `GET/POST /api/sprints` | Sprint management |
| `GET/POST /api/comments` | Task comments |
| `GET/POST /api/templates` | Project templates |

## License

MIT

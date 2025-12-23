# ScholarVault 📚

A comprehensive smart learning platform that combines study notes management, progress analytics, and AI-powered features to help students optimize their learning journey.

## 🎯 Core Features

### Learning Management
- **Smart Notes Management**: PDF viewer with annotation capabilities, powered by AI summaries via Vertex AI
- **Subject Organization**: Organize notes by subjects and semesters, with structured learning paths
- **Progress Tracking**: Real-time tracking of completed units with detailed analytics
- **Year-based Learning**: Support for 1st and 2nd year curricula with semester-level organization
- **Bookmark System**: Save important notes and resources for quick access

### Advanced Analytics & Insights
- **Session Tracking**: Automatic capture of study sessions across login/logout and tab lifecycle
- **Per-Note Time Tracking**: Invisible time tracking for individual notes (>5 second threshold)
- **Comprehensive Analytics**: 
  - Weekly & monthly activity trends with hourly breakdowns
  - Subject-level time aggregation showing hours spent per subject
  - Peak study time detection (morning/afternoon/evening/night)
  - 8-week study velocity graph (notes completed per week)
  - Streak tracking with 15-minute daily threshold
  - Revisit counting for completed notes

### User Management
- **Authentication**: Secure JWT-based authentication with email/password
- **Preferences**: Customizable user preferences (notifications, year selection, study goals)
- **Data Export**: Complete user data export in JSON format
- **Profile Management**: Update email, password, and profile information

### Search & Discovery
- **Full-text Search**: Search across all notes with filtering by subject
- **Search Analytics**: Track popular search queries for insights
- **Subject Discovery**: Browse and enroll in available subjects by branch and semester

### File Management
- **S3 Integration**: Secure file uploads to AWS S3 with CDN distribution
- **OCR Processing**: Automatic OCR for uploaded PDFs via Google Cloud Vision
- **Metadata Management**: Standardized file metadata tracking and management

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL (via Supabase)
- AWS account (S3 access)
- Google Cloud account (Vertex AI, Cloud Vision)

### Installation

**Backend Setup**
```bash
cd backend
npm install
```

Create `.env` file:
```
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
AWS_S3_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
GCP_PROJECT_ID=your-project
VERTEX_AI_LOCATION=us-central1
VERTEX_API_KEY=your-key
```

Start server:
```bash
npm run dev  # Runs on http://localhost:3000
```

**Frontend Setup**
```bash
cd frontend
npm install
```

Create `.env` file:
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=ScholarVault
```

Start development:
```bash
npm run dev  # Runs on http://localhost:5173
```

## 📊 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register with year, goal, notifications
- `POST /login` - Email/password login
- `GET /me` - Current user profile
- `POST /change-password` - Update password
- `POST /change-email` - Change email
- `DELETE /delete-account` - Delete account
- `GET /export` - Export user data

### Subjects (`/api/subjects`)
- `GET /` - List subjects filtered by year
- `GET /:id` - Subject details
- `GET /:id/progress` - Completion status
- `POST /:id/enroll` - Enroll in subject
- `POST /:id/unenroll` - Unenroll from subject

### Notes (`/api/notes`)
- `GET /` - List notes by subject
- `GET /:id` - Note details
- `POST /:id/complete` - Mark as completed
- `POST /:id/uncomplete` - Mark as incomplete
- `POST /:id/summary` - Generate AI summary

### Progress & Analytics (`/api/progress`)
- `POST /session/start` - Begin study session
- `POST /session/end` - End study session
- `GET /analytics` - Comprehensive dashboard analytics
- `POST /note/:noteId/start` - Start note tracking
- `POST /note/:noteId/end` - End note tracking with duration

### Files (`/api/files`)
- `POST /upload` - Upload PDF with OCR
- `GET /sample` - Sample notes

### Search (`/api/search`)
- `GET /` - Full-text search notes
- `GET /analytics` - Search query analytics

### Bookmarks (`/api/bookmarks`)
- `GET /` - User's bookmarks
- `POST /` - Add bookmark
- `DELETE /:id` - Remove bookmark

## 📈 Analytics Breakdown

**Session Management**
- Auto-starts on login, ends on logout/tab close
- Handles midnight-spanning sessions with auto-split
- Stores duration in seconds

**Per-Note Tracking**
- Invisible tracking when note is open
- Records duration on close (>5 second threshold)
- Increments revisit count for completed notes

**Streaks**
- 15-minute daily threshold (150+ minutes = 1 day)
- Consecutive day tracking
- Lifetime highest streak

**Analytics Aggregation**
- 7-day weekly summaries (Sun-Sat)
- 30-day monthly trends
- 8-week velocity (notes/week)
- Subject hours breakdown
- Peak time analysis (4 time blocks)

## 📁 Project Structure

```
ScholarVault/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── db/              # Database operations
│   │   ├── routes/          # API endpoints
│   │   ├── middlewares/     # Auth, CORS, rate limiting
│   │   ├── lib/             # Utilities (S3, AI)
│   │   └── config.js        # Configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── store/           # Zustand state
│   │   ├── api/             # HTTP client
│   │   └── assets/          # Images & icons
│   └── package.json
└── netlify/                 # Edge/serverless functions
```

## 🔒 Security

- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: Bcrypt (10 rounds production)
- **Rate Limiting**: API protection
- **CORS**: Multi-origin support
- **RLS**: Supabase row-level security
- **S3 Validation**: File upload verification

## 🛠️ Development

### Backend Structure
- `controllers/` - Handle HTTP requests
- `services/` - Business logic & AI features
- `db/` - Database CRUD operations
- `routes/` - API endpoint definitions
- `middlewares/` - Auth, CORS, rate limiting
- `lib/` - S3, Supabase, AI service integrations

### Frontend Structure
- `components/` - Reusable UI components
- `pages/` - Full page components
- `store/` - Zustand state management
- `api/` - Axios HTTP client
- `hooks/` - Custom React hooks

## 📱 User Workflows

**Study Session**
1. Login → Session starts automatically
2. Open notes → Per-note timer begins
3. Complete unit → Completion recorded
4. Logout → Session ends, data aggregated
5. View Progress → Analytics updated in real-time

**Dashboard View**
1. Fetch analytics from `/api/progress/analytics`
2. Display weekly/monthly activity
3. Show peak study time & streaks
4. Link to detailed Progress page

## 📦 Deployment

**Frontend** (Netlify)
- Build: `npm run build`
- Hosted with edge functions
- Environment: `VITE_API_URL`

**Backend** (Any Node host)
- Start: `npm run dev` or `npm run start`
- Database: Supabase PostgreSQL
- Environment variables: See `.env` above

## 📞 Support & Documentation

- Review API routes in `backend/src/routes/`
- Check database schema in Supabase console
- Examine service implementations for business logic
- Frontend components are self-documented with JSX comments

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: December 24, 2025

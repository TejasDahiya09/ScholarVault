# ScholarVault - Architecture & Services Document

**Version**: 1.0.0  
**Last Updated**: December 24, 2025  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Architecture](#database-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Services & Integration](#services--integration)
7. [API Design](#api-design)
8. [Analytics Pipeline](#analytics-pipeline)
9. [Security Architecture](#security-architecture)
10. [Performance Optimization](#performance-optimization)

---

## System Overview

ScholarVault is a full-stack learning management system designed to provide students with comprehensive study tools, real-time analytics, and AI-powered insights.

### Core Components
- **Frontend**: React 18 SPA with responsive UI
- **Backend**: Node.js/Express API server
- **Database**: PostgreSQL (Supabase)
- **Cloud Services**: AWS S3, Google Cloud (Vision, Vertex AI)
- **Hosting**: Netlify (frontend), Node host (backend)

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                           │
│                    (React 18, Vite, Zustand)                │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS/REST
             │
┌────────────▼────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│             (Express.js, JWT Auth, Rate Limiting)           │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┐
    │                 │              │              │
┌───▼───┐      ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
│  DB   │      │ S3 Files │  │ GCP Svcs │  │ Cache    │
│ Subase│      │  (CDN)   │  │(OCR/AI)  │  │ (Redis)  │
└───────┘      └──────────┘  └──────────┘  └──────────┘
```

---

## Technology Stack

### Frontend Stack
```
┌─────────────────────────────────────────┐
│  React 18                               │  UI Framework
│  React Router v6                        │  Client routing
│  Zustand                                │  State management
│  Axios                                  │  HTTP client
│  TailwindCSS                            │  Styling
│  PostCSS                                │  CSS processing
│  Vite                                   │  Build tool
└─────────────────────────────────────────┘
```

**Why These Choices?**
- React 18: Latest features, concurrent rendering, good ecosystem
- Router v6: Modern routing with nested routes, lazy loading
- Zustand: Lightweight state (auth, dark mode) vs Redux overhead
- Tailwind: Utility-first CSS, responsive design, dark mode built-in
- Vite: Fast HMR, optimized builds, ES modules

### Backend Stack
```
┌─────────────────────────────────────────┐
│  Node.js 16+                            │  Runtime
│  Express.js                             │  Web framework
│  PostgreSQL (Supabase)                  │  Database
│  JWT                                    │  Authentication
│  Bcrypt                                 │  Password hashing
│  Axios                                  │  External API calls
│  Google Cloud SDK                       │  Vision, Vertex AI
│  AWS SDK                                │  S3 integration
└─────────────────────────────────────────┘
```

**Why These Choices?**
- Express: Lightweight, extensible, large middleware ecosystem
- PostgreSQL: ACID compliance, advanced features (JSON, arrays)
- Supabase: Managed PostgreSQL, auto-scaling, built-in auth
- JWT: Stateless auth, good for microservices
- Google/AWS SDKs: Official, well-maintained integrations

### Cloud & Hosting
```
┌──────────────────────────────────────────┐
│  AWS                                     │
│  ├─ S3: File storage (CDN)              │
│  ├─ CloudFront: CDN caching             │
│  └─ IAM: Access control                 │
├──────────────────────────────────────────┤
│  Google Cloud                            │
│  ├─ Vision API: PDF OCR                 │
│  ├─ Vertex AI: Note summaries           │
│  └─ Cloud Storage: Backup               │
├──────────────────────────────────────────┤
│  Supabase                                │
│  ├─ PostgreSQL: Main database           │
│  ├─ Auth: JWT tokens                    │
│  ├─ RLS: Row-level security             │
│  └─ Realtime: Socket events             │
├──────────────────────────────────────────┤
│  Netlify                                 │
│  ├─ Frontend: Static hosting            │
│  ├─ Functions: Serverless               │
│  └─ Edge: Global CDN                    │
└──────────────────────────────────────────┘
```

---

## Database Architecture

### Schema Overview

```
┌─────────────────────────────────────────────────────────┐
│                      USERS                              │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ email                    | VARCHAR UNIQUE              │
│ password_hash            | VARCHAR                     │
│ name                     | VARCHAR                     │
│ selected_year            | VARCHAR (1st/2nd Year)      │
│ study_goal               | VARCHAR (exam-prep, etc)    │
│ notifications_enabled    | BOOLEAN                     │
│ email_notifications      | BOOLEAN                     │
│ analytics_sharing        | BOOLEAN                     │
│ created_at               | TIMESTAMP                   │
│ updated_at               | TIMESTAMP                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SUBJECTS                             │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ code                     | VARCHAR UNIQUE              │
│ name                     | VARCHAR                     │
│ branch                   | VARCHAR (CSE, ECE, etc)     │
│ semester                 | INT (1-8)                   │
│ credits                  | INT                         │
│ created_at               | TIMESTAMP                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      NOTES                              │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ subject_id (FK)          | UUID                        │
│ unit_number              | INT                         │
│ title                    | VARCHAR                     │
│ content                  | TEXT                        │
│ ocr_text                 | TEXT (indexed GIN)          │
│ is_ocr_done              | BOOLEAN                     │
│ file_url                 | VARCHAR (S3 URL)            │
│ created_at               | TIMESTAMP                   │
│ updated_at               | TIMESTAMP                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              USER_STUDY_SESSIONS                        │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ user_id (FK)             | UUID                        │
│ session_start            | TIMESTAMP                   │
│ session_end              | TIMESTAMP                   │
│ session_date             | DATE (for aggregation)      │
│ duration_seconds         | INT                         │
│ created_at               | TIMESTAMP                   │
│ Indexes: (user_id, session_date), (user_id, created_at)
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            USER_STUDY_PROGRESS                          │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ user_id (FK)             | UUID                        │
│ note_id (FK)             | UUID                        │
│ subject_id (FK)          | UUID                        │
│ is_completed             | BOOLEAN                     │
│ completed_at             | TIMESTAMP                   │
│ total_time_spent         | INT (seconds)               │
│ last_study_date          | DATE                        │
│ revisit_count            | INT (reopen tracking)       │
│ updated_at               | TIMESTAMP                   │
│ Indexes: (user_id, note_id), (user_id, is_completed)
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              USER_BOOKMARKS                             │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ user_id (FK)             | UUID                        │
│ note_id (FK)             | UUID                        │
│ created_at               | TIMESTAMP                   │
│ Constraint: UNIQUE(user_id, note_id)                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              SEARCH_ANALYTICS                           │
├─────────────────────────────────────────────────────────┤
│ id (PK)                  | UUID                        │
│ user_id (FK)             | UUID                        │
│ query                    | VARCHAR                     │
│ results_count            | INT                         │
│ clicked_result_id        | UUID                        │
│ created_at               | TIMESTAMP                   │
│ Indexes: (user_id, created_at), (query)                │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Session Table Separation**
   - `user_study_sessions`: Session lifecycle (login/logout)
   - `user_study_progress`: Note-level completion & time tracking
   - Allows independent querying for different use cases

2. **Midnight Split Logic**
   - Sessions spanning midnight are automatically split
   - Enables accurate daily aggregation
   - Stored in session_date for quick date-based queries

3. **Indexes Strategy**
   - (user_id, session_date) for daily aggregation
   - (user_id, is_completed) for quick completion checks
   - GIN index on notes.ocr_text for full-text search

4. **Time Storage**
   - All times in UTC timestamps
   - Duration stored in seconds (integer)
   - Allows precise calculations without conversion

---

## Backend Architecture

### Directory Structure
```
backend/
├── src/
│   ├── controllers/          # HTTP request handlers
│   │   ├── auth.js          # Auth endpoints
│   │   ├── notes.js         # Note operations
│   │   ├── files.js         # File upload/OCR
│   │   └── search.js        # Search functionality
│   │
│   ├── routes/              # Route definitions
│   │   ├── auth.js          # /api/auth
│   │   ├── notes.js         # /api/notes
│   │   ├── progress.js      # /api/progress
│   │   ├── subjects.js      # /api/subjects
│   │   ├── files.js         # /api/files
│   │   ├── search.js        # /api/search
│   │   ├── bookmarks.js     # /api/bookmarks
│   │   └── admin.js         # /api/admin
│   │
│   ├── services/            # Business logic
│   │   ├── auth.js          # Auth service (register, login)
│   │   ├── ai.js            # AI/ML features
│   │   ├── notes.js         # Note operations
│   │   └── search.js        # Search service
│   │
│   ├── db/                  # Database CRUD
│   │   ├── users.js         # User queries
│   │   ├── notes.js         # Note queries
│   │   ├── subjects.js      # Subject queries
│   │   ├── progress.js      # Progress queries
│   │   ├── studySessions.js # Session aggregation
│   │   └── bookmarks.js     # Bookmark queries
│   │
│   ├── middlewares/         # Express middleware
│   │   ├── auth.js          # JWT verification
│   │   ├── cors.js          # CORS configuration
│   │   └── rateLimiter.js   # Rate limiting
│   │
│   ├── lib/                 # External service integrations
│   │   ├── s3.js            # AWS S3 client
│   │   ├── s3-uploader.js   # File upload pipeline
│   │   └── services.js      # Service initializers
│   │
│   ├── config.js            # Environment configuration
│   └── index.js             # Express app setup
│
└── package.json
```

### Request Flow

```
Request → CORS Middleware → Auth Middleware → Rate Limiter
   ↓
Route Handler (Controller) → Service Layer → Database Layer
   ↓
Response ← Format & Return
```

### Authentication Flow

```
┌──────────────────────────────────────────────┐
│  User Credentials (email, password)          │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────▼────────┐
        │  Bcrypt Verify  │ (10 rounds)
        └────────┬────────┘
                 │
        ┌────────▼────────────┐
        │  Generate JWT Token │ (7 day expiry)
        └────────┬────────────┘
                 │
     ┌───────────▼──────────────┐
     │  Return token + user data│
     └────────────────────────────┘

Subsequent Requests:
┌──────────────────────────────────────┐
│  Authorization: Bearer <JWT>         │
└────────────────┬─────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Verify JWT Token │
        └────────┬──────────┘
                 │
     ┌───────────▼──────────┐
     │  Extract User ID     │
     └──────────────────────┘
```

### Session Management Flow

```
Login (POST /session/start)
  ↓
  Create record in user_study_sessions
  ├─ session_start = now()
  ├─ session_date = today()
  └─ return sessionId

Active Session
  ↓
  Per-note tracking (invisible to user)
  ├─ On note open: POST /note/:id/start
  ├─ Track revisit for completed notes
  └─ On note close: POST /note/:id/end with duration

Logout (POST /session/end)
  ↓
  Update record in user_study_sessions
  ├─ session_end = now()
  ├─ duration_seconds = calculated
  ├─ If midnight crossed: split into 2 records
  └─ Aggregate into daily stats

Analytics Query (GET /analytics)
  ↓
  Aggregate user_study_sessions by session_date
  Aggregate user_study_progress by date
  Calculate streaks, subject hours, velocity
  Return formatted response
```

---

## Frontend Architecture

### Component Hierarchy

```
App.jsx
├── Layout/
│   ├── AppShell.jsx           # Main app wrapper
│   ├── NavBar.jsx             # Top navigation
│   └── Sidebar.jsx            # Left sidebar
│
├── Pages/
│   ├── Landing.jsx            # Public landing
│   ├── Dashboard.jsx          # Home dashboard
│   ├── ProgressPage.jsx       # Analytics dashboard
│   ├── SearchPage.jsx         # Search results
│   ├── SubjectsPage.jsx       # Subject listing
│   ├── BooksPage.jsx          # Books/notes listing
│   ├── Notes/
│   │   └── NotesPage.jsx      # PDF viewer + annotations
│   └── Auth/
│       ├── Login.jsx          # Login form
│       ├── Register.jsx       # Registration form
│       └── OAuthCallback.jsx  # OAuth handler
│
└── Components/
    ├── ErrorBoundary.jsx      # Error handling
    ├── OnboardingModal.jsx    # First-time setup
    ├── YearSelectionModal.jsx # Year selection
    └── ...
```

### State Management with Zustand

```
useAuth.js (Global Store)
├─ user: Current user object
├─ isLoading: Auth state
├─ error: Error message
├─ login(): Authenticate user
├─ register(): Create new account
├─ logout(): Clear session
└─ refresh(): Verify current token

useDarkMode.js (Global Store)
├─ isDarkMode: Current theme
└─ toggleDarkMode(): Switch theme
```

**Why Zustand?**
- Minimal boilerplate vs Redux
- Direct function updates (no actions/reducers)
- Lazy evaluation - only re-render affected components
- Small bundle size (2.8kB)

### API Client Pattern

```
api/client.js
├─ Axios instance with:
│  ├─ Base URL from env
│  ├─ Token injection in headers
│  ├─ Error handling
│  └─ Auto-refresh on 401
│
└─ Request Interceptor:
   ├─ Add Authorization header
   └─ Attach CSRF token

   Response Interceptor:
   ├─ Handle 401 (token expired)
   ├─ Retry with refresh token
   └─ Log errors
```

### Session Lifecycle

```
App Mount
  ↓
  Check if user logged in (useAuth)
  ├─ No: Show Landing page
  └─ Yes: Initialize session
        ↓
        POST /api/progress/session/start
        ├─ Creates session record
        └─ Store sessionId in state

User Navigation
  ↓
  Each page component mounts
  └─ Fetch data from API

Tab/Window Events
  ↓
  beforeunload: POST /session/end
  visibilitychange: POST /session/end (if hidden)

User Logout
  ↓
  POST /session/end (explicit)
  Clear useAuth store
  Navigate to /
```

---

## Services & Integration

### 1. Authentication Service

**File**: `backend/src/services/auth.js`

**Key Functions**:
```javascript
register()      - Create new user with preferences
login()         - Authenticate and return JWT
generateToken() - Create JWT with expiry
verifyToken()   - Validate JWT signature
getCurrentUser() - Fetch user by ID
updateProfile() - Modify user info
updatePreferences() - Update year, goal, notifications
changePassword() - Update hashed password
deleteAccount() - Purge user data
exportUserData() - Full data export in JSON
```

### 2. S3 File Service

**File**: `backend/src/lib/s3.js`, `backend/src/lib/s3-uploader.js`

**Pipeline**:
```
File Upload
  ↓
  Validate MIME type (PDF only)
  ↓
  Upload to S3 with public ACL
  ├─ Key: {userId}/{timestamp}-{filename}
  └─ URL: https://cdn.bucket/...
  ↓
  Trigger OCR (Google Vision)
  ├─ Extract text
  └─ Update note with ocr_text
  ↓
  Return file URL + OCR results
```

**Configuration**:
```javascript
S3Client {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
}

Options {
  Bucket: AWS_S3_BUCKET,
  ACL: 'public-read',
  ContentType: 'application/pdf',
  CacheControl: 'max-age=31536000' (1 year)
}
```

### 3. Google Cloud Services

#### Vision API (OCR)

**File**: `backend/src/services/ai.js`

**Function**: `extractTextFromPDF(fileBuffer)`

```javascript
ImageAnnotatorClient()
  ├─ Batch OCR on PDF pages
  ├─ Extract full text from images
  └─ Return aggregated text

Fallback: Handle non-text-based PDFs
```

#### Vertex AI (Summaries)

**Function**: `generateSummary(noteContent)`

```javascript
VertexAI()
  ├─ Model: text-bison (or latest)
  ├─ Prompt: "Summarize: {content}"
  └─ Return: AI-generated summary

Caching: Store in note.summary to avoid regeneration
```

### 4. Progress Analytics Service

**File**: `backend/src/db/studySessions.js`

**Key Functions**:

```javascript
startSession(userId, startedAt)
  → Create new session record
  → Return { id, session_start }

endSession(userId, endedAt)
  → Find open session
  → If midnight crossed: split into 2 records
  → Calculate duration_seconds
  → Return updated session

getTotalHours(userId)
  → SUM(duration_seconds) / 3600
  → All sessions ever

getMinutesByDay(userId, days)
  → Map { date: minutes }
  → Last N days

getStreaks(userId, minMinutes)
  → Count consecutive days >= minMinutes
  → Return { currentStreak, longestStreak }

getCompletedUnitsByDay(userId, days)
  → COUNT notes with is_completed = true
  → Grouped by date
```

### 5. Search Service

**File**: `backend/src/services/search.js`

**Methods**:
```javascript
searchNotes(userId, query)
  → Full-text search on notes
  → Filter by subject_id (optional)
  → Return ranked results

logSearch(userId, query, resultCount)
  → Record to search_analytics
  → For trending queries

getSearchTrends(userId)
  → Top searches by frequency
  → Used for recommendations
```

---

## API Design

### RESTful Principles

All endpoints follow REST conventions:

```
GET    /resource       - List
GET    /resource/:id   - Fetch one
POST   /resource       - Create
PATCH  /resource/:id   - Update
DELETE /resource/:id   - Delete
POST   /resource/:id/action - Custom action
```

### Response Format

**Success (200)**:
```json
{
  "ok": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error (400+)**:
```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Authentication Header

```
Authorization: Bearer <JWT_TOKEN>

Example:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Rate Limiting

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640376000

Limits:
- Auth endpoints: 5 req/min per IP
- File upload: 1 req/30s per user
- Search: 30 req/min per user
- All others: 100 req/min per user
```

---

## Analytics Pipeline

### Data Flow

```
User Action
  ↓
  Login → POST /session/start → user_study_sessions (insert)
  Open Note → POST /note/:id/start → check revisit count
  Close Note → POST /note/:id/end → user_study_progress (update total_time_spent)
  Complete Note → POST /note/:id/complete → user_study_progress (is_completed=true)
  Logout → POST /session/end → user_study_sessions (update + split)
  ↓
View Analytics
  ↓
  GET /progress/analytics
  ├─ Sessions by date → Weekly/monthly activity
  ├─ Completed notes by week → Velocity
  ├─ Total time per subject → Subject hours
  ├─ Session start hour distribution → Peak time
  └─ Return formatted dashboard
```

### Streak Calculation Algorithm

```javascript
getStreaks(userId, minMinutesPerDay = 15) {
  // Get all sessions, aggregated by date (ascending)
  sessions = GROUP BY session_date SUM(duration_seconds)
  
  currentStreak = 0
  longestStreak = 0
  lastDate = null
  
  FOR EACH session IN sessions {
    IF minutes >= minMinutesPerDay {
      IF lastDate is yesterday OR lastDate is today {
        currentStreak++
      } ELSE {
        currentStreak = 1 // Reset if streak broken
      }
      
      longestStreak = MAX(longestStreak, currentStreak)
      lastDate = session.date
    }
  }
  
  // If last session wasn't today, reset current streak
  IF lastDate != today {
    currentStreak = 0
  }
  
  RETURN { currentStreak, longestStreak }
}
```

### Midnight Split Logic

```javascript
endSession(userId, endedAt) {
  session = FIND {user_id, session_end IS NULL}
  
  sessionStart = session.session_start
  sessionEnd = endedAt
  
  // Check if midnight crossed
  IF DATE(sessionStart) != DATE(sessionEnd) {
    // Split into 2 records
    
    // Record 1: Start to midnight
    Record1 = {
      user_id: userId,
      session_start: sessionStart,
      session_end: DATE(sessionStart) + 23:59:59,
      session_date: DATE(sessionStart),
      duration_seconds: CALC_SECONDS(sessionStart, midnight)
    }
    
    // Record 2: Midnight to end
    Record2 = {
      user_id: userId,
      session_start: DATE(sessionEnd) + 00:00:00,
      session_end: sessionEnd,
      session_date: DATE(sessionEnd),
      duration_seconds: CALC_SECONDS(midnight, sessionEnd)
    }
    
    INSERT Record1
    INSERT Record2
  } ELSE {
    // Same day, update in place
    UPDATE session SET {
      session_end: sessionEnd,
      duration_seconds: CALC_SECONDS(sessionStart, sessionEnd)
    }
  }
}
```

### Peak Time Analysis

```javascript
getPeakStudyTime(userId) {
  sessions = SELECT session_start FROM user_study_sessions
  
  timeBlocks = {
    morning: 0,    // 5 AM - 12 PM
    afternoon: 0,  // 12 PM - 5 PM
    evening: 0,    // 5 PM - 9 PM
    night: 0       // 9 PM - 5 AM
  }
  
  FOR EACH session IN sessions {
    hour = EXTRACT(HOUR FROM session.session_start)
    
    IF hour >= 5 && hour < 12 {
      timeBlocks.morning++
    } ELSE IF hour >= 12 && hour < 17 {
      timeBlocks.afternoon++
    } ELSE IF hour >= 17 && hour < 21 {
      timeBlocks.evening++
    } ELSE {
      timeBlocks.night++
    }
  }
  
  RETURN MAX_KEY(timeBlocks) // Return key with highest count
}
```

---

## Security Architecture

### JWT Token Structure

```javascript
Header: {
  alg: "HS256",
  typ: "JWT"
}

Payload: {
  userId: "uuid",
  email: "user@example.com",
  name: "User Name",
  iat: 1640000000,      // Issued at
  exp: 1640604800       // Expires at (7 days)
}

Signature: HMAC-SHA256(Base64Encode(header) + "." + Base64Encode(payload), SECRET)
```

### Password Hashing

```javascript
// Registration
password_hash = bcrypt.hash(password, 10)
// Cost factor: 10 rounds
// Time: ~100ms per hash

// Login
isValid = bcrypt.compare(inputPassword, password_hash)
// Time: ~100ms per verify (constant time)
```

### CORS Configuration

```javascript
CORS({
  origin: [
    "http://localhost:5173",     // Dev frontend
    "https://scholarvault.app",  // Prod frontend
  ],
  credentials: true,             // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
})
```

### SQL Injection Prevention

```javascript
// Using parameterized queries (Supabase client handles this)

// BAD:
query = `SELECT * FROM users WHERE email = '${email}'`

// GOOD:
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)  // Parameterized
```

### S3 Security

```javascript
// Private files with signed URLs
const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

// ACL: Depends on file type
// Public: OCR text (indexed)
// Private: Raw PDFs (user-specific)

// CORS on bucket:
{
  "CORSRules": [{
    "AllowedOrigins": ["https://scholarvault.app"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"]
  }]
}
```

---

## Performance Optimization

### Database Query Optimization

**Indexes**:
```sql
-- Session aggregation
CREATE INDEX idx_user_sessions_date 
  ON user_study_sessions(user_id, session_date)

-- Quick completion checks
CREATE INDEX idx_progress_completion 
  ON user_study_progress(user_id, is_completed)

-- Full-text search
CREATE INDEX idx_notes_ocr 
  ON notes USING GIN(ocr_text)

-- Time-series queries
CREATE INDEX idx_sessions_created 
  ON user_study_sessions(user_id, created_at DESC)
```

**Query Optimization**:
```javascript
// BAD: N+1 query
subjects.forEach(async s => {
  const progress = await db.query(`SELECT... WHERE subject_id = ${s.id}`)
})

// GOOD: Single aggregation
const progress = await db.query(`
  SELECT subject_id, COUNT(*) as completed
  FROM user_study_progress
  WHERE user_id = $1 AND is_completed = true
  GROUP BY subject_id
`)
```

### Caching Strategy

```javascript
// Session cache (Redis)
Cache {
  key: `session:{userId}`,
  value: { sessionId, startedAt, lastUpdate },
  ttl: 24h
}

// User preferences cache
Cache {
  key: `user:{userId}`,
  value: { selectedYear, studyGoal, ... },
  ttl: 7d
}

// Analytics cache
Cache {
  key: `analytics:{userId}:{date}`,
  value: { dailyMinutes, completedNotes, ... },
  ttl: 1h
}
```

### Frontend Optimization

**Code Splitting**:
```javascript
// Lazy load page components
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const NotesPage = lazy(() => import('./pages/Notes/NotesPage'))

// Only load when needed
<Suspense fallback={<Loading />}>
  <Route path="/progress" element={<ProgressPage />} />
</Suspense>
```

**Asset Optimization**:
- Vite automatically:
  - Tree-shakes dead code
  - Minifies JavaScript/CSS
  - Chunks vendor dependencies
  - Compresses images (WebP)
- Static assets served from Netlify CDN

**Request Optimization**:
```javascript
// Batch API calls
Promise.all([
  client.get('/subjects'),
  client.get('/analytics'),
  client.get('/bookmarks')
])

// Debounce search
const debouncedSearch = debounce((query) => {
  client.get('/search', { params: { q: query } })
}, 300)
```

---

## Deployment & Operations

### Environment Configuration

**Backend .env**:
```
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-string
JWT_EXPIRY=7d
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
GCP_PROJECT_ID=...
VERTEX_API_KEY=...
NODE_ENV=production
LOG_LEVEL=info
```

**Frontend .env**:
```
VITE_API_URL=https://api.scholarvault.app
VITE_APP_NAME=ScholarVault
```

### Deployment Pipeline

```
GitHub Push
  ↓
  ├─ Frontend: Netlify auto-deploy
  │  ├─ npm run build
  │  ├─ Minify/optimize
  │  └─ Deploy to CDN
  │
  └─ Backend: Docker/Node host deploy
     ├─ npm install --production
     ├─ npm start
     └─ Health check + monitoring
```

---

## Monitoring & Logging

### Key Metrics

```
Frontend:
- Page load time (< 3s)
- Time to interactive (< 5s)
- API response latency (< 200ms)
- Error rate (< 0.1%)

Backend:
- Request latency p95 (< 500ms)
- Database query time p95 (< 100ms)
- Error rate (< 0.5%)
- Session creation rate
- File upload success rate (> 99%)
```

### Logging

```javascript
Logger {
  level: INFO | WARN | ERROR,
  format: JSON,
  fields: {
    timestamp,
    userId,
    endpoint,
    method,
    statusCode,
    duration_ms,
    error (if failed)
  }
}
```

---

## Future Enhancements

1. **Real-time Collaboration**: WebSockets for group study
2. **Mobile App**: React Native implementation
3. **Advanced ML**: Personalized recommendations based on learning patterns
4. **Offline Support**: PWA with service workers
5. **Social Features**: Study groups, peer review
6. **Advanced Analytics**: Predictive performance modeling

---

**Document Version**: 1.0.0  
**Last Updated**: December 24, 2025  
**Maintainer**: ScholarVault Development Team

# ScholarVault - Complete Project Summary

## 📚 Project Overview

**ScholarVault** is an AI-powered educational platform designed to help students access, organize, and study academic materials efficiently. It's a full-stack web application that combines document management, intelligent search, AI-powered study assistance, and personalized learning tracking.

**Target Users:** University/College students  
**Primary Goal:** Centralized platform for accessing study materials with AI-enhanced learning features  
**Project Type:** Full-stack MERN-inspired application (React + Node.js + PostgreSQL)

---

## 🏗️ Architecture Overview

### Technology Stack

#### **Backend**
- **Runtime:** Node.js with Express.js
- **Language:** JavaScript (ES6+ modules)
- **Database:** PostgreSQL (via Supabase)
- **AI/ML Services:**
  - Google Cloud Vertex AI (Gemini Pro) - Text generation & summarization
  - Xenova Transformers - Semantic embeddings for search
- **Storage:** AWS S3 - Document storage with CloudFront CDN
- **Authentication:** JWT-based auth with bcrypt password hashing
- **Key Dependencies:**
  - `@supabase/supabase-js` - Database client
  - `@google-cloud/vertexai` - AI service
  - `@aws-sdk/client-s3` - Cloud storage
  - `@xenova/transformers` - ML embeddings
  - `jsonwebtoken` - Auth tokens
  - `cors`, `express`, `dotenv`

#### **Frontend**
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Routing:** React Router DOM v7
- **State Management:** Zustand 5.0.9
- **UI Framework:** Tailwind CSS 4.1.17
- **Component Library:** Headless UI 2.2.9
- **HTTP Client:** Axios 1.13.2
- **Styling:** PostCSS with Autoprefixer

---

## 📂 Project Structure

### Backend Architecture (`/backend`)

```
backend/
├── index.js                      # Express server entry point
├── src/
│   ├── config.js                 # Environment configuration
│   ├── controllers/              # Request handlers
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── notes.js             # Document management endpoints
│   │   └── search.js            # Search endpoints
│   ├── db/                      # Database operations
│   │   ├── bookmarks.js         # User bookmarks CRUD
│   │   ├── notes.js             # Notes/documents CRUD
│   │   ├── progress.js          # Learning progress tracking
│   │   ├── subjects.js          # Subjects management
│   │   └── users.js             # User management
│   ├── lib/                     # Utilities & services
│   │   ├── services.js          # Service initialization (Supabase, Vertex AI)
│   │   └── s3-uploader.js       # AWS S3 upload utilities
│   ├── middlewares/             # Express middlewares
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── cors.js              # CORS configuration
│   ├── routes/                  # API route definitions
│   │   ├── auth.js              # /api/auth routes
│   │   ├── notes.js             # /api/notes routes
│   │   ├── search.js            # /api/search routes
│   │   └── subjects.js          # /api/subjects routes
│   └── services/                # Business logic
│       ├── ai.js                # AI/ML operations (summaries, Q&A)
│       ├── auth.js              # Authentication logic
│       ├── notes.js             # Notes business logic
│       └── search.js            # Hybrid search implementation
├── migrations/                  # Database migrations
│   ├── 001_create_user_bookmarks.sql
│   ├── 002_standardize_s3_metadata.js
│   └── 003_create_search_analytics.sql
├── scholarvault_schema.sql      # Complete database schema
├── vertex-key.json              # Google Cloud credentials
└── gcp_credentials.json         # GCP service account
```

### Frontend Architecture (`/frontend`)

```
frontend/
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Route definitions
│   ├── index.css                # Global styles
│   ├── api/
│   │   └── client.js            # Axios HTTP client configuration
│   ├── components/              # Reusable components
│   │   ├── Breadcrumbs.jsx      # Navigation breadcrumbs
│   │   ├── DarkModeToggle.jsx   # Theme switcher
│   │   ├── InPDFSearch.jsx      # In-document search component
│   │   ├── YearSelectionModal.jsx # Year picker modal
│   │   └── Layout/
│   │       ├── AppShell.jsx     # Main layout wrapper
│   │       ├── NavBar.jsx       # Top navigation bar
│   │       └── SideBar.jsx      # Side navigation menu
│   ├── pages/                   # Page components
│   │   ├── Landing.jsx          # Public landing page
│   │   ├── Dashboard.jsx        # User dashboard
│   │   ├── HomePage.jsx         # Subject browser (Branch→Semester→Subject)
│   │   ├── SearchPage.jsx       # Global search interface
│   │   ├── BooksPage.jsx        # Books library
│   │   ├── ProgressPage.jsx     # Learning progress tracker
│   │   ├── ProfilePage.jsx      # User profile settings
│   │   ├── Auth/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Register.jsx     # Registration page
│   │   │   └── OAuthCallback.jsx # OAuth handler
│   │   └── Notes/
│   │       └── NotesPage.jsx    # Document viewer with AI features
│   └── store/                   # State management
│       ├── useAuth.js           # Authentication state
│       └── useDarkMode.js       # Theme state
├── public/
│   └── assets/
│       ├── icons/               # Icon assets
│       └── images/              # Image assets
├── index.html                   # HTML entry point
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
└── eslint.config.js             # ESLint configuration
```

---

## 🗄️ Database Schema

### Core Tables

#### **1. Users (`auth.users`)**
- User authentication and profile data
- Fields: `id`, `email`, `password_hash`, `name`, `selected_year`, `preferences`
- Managed by Supabase Auth

#### **2. Subjects (`public.subjects`)**
- Academic subjects/courses
- Fields: `id`, `branch`, `semester`, `subject_name`, `subject_code`
- Hierarchical structure: Branch → Semester → Subject

#### **3. Notes (`public.notes`)**
- Central table for all documents (notes, books, PYQs, syllabus)
- Key Fields:
  - `id`, `subject_id`, `branch`, `semester`, `subject`
  - `file_name`, `s3_url`, `s3_key`
  - `unit_number` - Extracted from filename or manual
  - `ocr_text` - Extracted text for search
  - `ocr_embedding` (vector) - Semantic search embedding (1536 dimensions)
  - `has_ocr` - OCR processing status
  - `created_at`, `updated_at`

#### **4. User Bookmarks (`public.user_bookmarks`)**
- Tracks bookmarked notes per user
- Fields: `id`, `user_id`, `note_id`, `bookmarked_at`
- Relations: FK to `auth.users`, FK to `notes`

#### **5. User Progress (`public.user_progress`)**
- Tracks completed/studied materials
- Fields: `id`, `user_id`, `note_id`, `completed`, `completed_at`, `progress_percentage`
- Relations: FK to `auth.users`, FK to `notes`

#### **6. Search Analytics (`public.search_analytics`)**
- Logs search queries for analytics
- Fields: `id`, `user_id`, `query`, `subject_id`, `results_count`, `created_at`
- Used for trending searches and autocomplete

### Database Extensions
- **pg_trgm** - Trigram-based text search
- **vector** - Vector operations for semantic search (pgvector)
- **uuid-ossp** - UUID generation
- **pgcrypto** - Cryptographic functions

---

## 🔑 Core Features

### 1. **Authentication & Authorization**
- **Registration/Login** - Email/password with bcrypt hashing
- **JWT Tokens** - Secure session management (7-day expiry)
- **Protected Routes** - Middleware-based route protection
- **User Profile Management** - Update name, email, password, year selection
- **Data Export** - GDPR-compliant user data export

**Endpoints:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/year` - Select academic year
- `PUT /api/auth/password` - Change password
- `DELETE /api/auth/account` - Delete account

### 2. **Document Management**
- **Hierarchical Navigation** - Branch → Semester → Subject → Notes
- **Document Types:**
  - Study Notes (by unit)
  - Reference Books
  - Previous Year Questions (PYQs)
  - Syllabus Documents
- **Storage:** AWS S3 with CloudFront CDN
- **Metadata:** Automated extraction (unit numbers, file types)
- **Viewer Features:**
  - Inline PDF viewing
  - Image support (PNG, JPG, JPEG, WEBP, GIF, SVG)
  - Zoom controls (50% - 200%)
  - Resizable split-pane viewer
  - In-document search

**Endpoints:**
- `GET /api/subjects` - List subjects (with filters)
- `GET /api/subjects/:id` - Get subject with all resources
- `GET /api/notes` - List all notes
- `GET /api/notes/:id` - Get note details
- `GET /api/notes/:id/file` - Stream document inline

### 3. **Hybrid Search System**

#### **Keyword Search (PostgreSQL Trigram)**
- Fast text matching using `pg_trgm` extension
- Searches: `file_name`, `ocr_text`, `subject`
- Ranking by similarity scores
- Unit number extraction from filenames

#### **Semantic Search (Vector Embeddings)**
- Uses Xenova Transformers (`Xenova/all-MiniLM-L6-v2`)
- 1536-dimensional embeddings stored in `ocr_embedding` field
- Cosine similarity matching via pgvector
- Understands context and meaning

#### **Combined Hybrid Approach**
- Merges keyword + semantic results
- Weighted scoring system
- Deduplication and rank aggregation
- Context snippets with highlighted matches

#### **Search Features**
- **Autocomplete Suggestions** - Real-time query suggestions
- **Search Analytics** - Top queries tracking
- **Result Grouping** - By subject for better organization
- **Snippet Extraction** - Contextual preview with highlights
- **Pagination** - Efficient large result handling
- **In-PDF Search** - Search within specific documents

**Endpoints:**
- `GET /api/search?q=query&page=1&per_page=10` - Hybrid search
- `GET /api/search/suggest?q=query&limit=8` - Autocomplete
- `GET /api/search/analytics` - Top search queries
- `GET /api/notes/:id/search?q=query` - In-document search

### 4. **AI-Powered Study Features**

#### **Document Summarization**
- Uses Google Vertex AI (Gemini Pro)
- Student-friendly summaries
- Clear, organized key points
- Simplified language for learning

#### **Q&A System**
- **General Mode** - Broad knowledge questions
- **RAG Mode** (Retrieval Augmented Generation) - Context-aware answers using document content
- Interactive study assistant
- Encouraging, educational responses

#### **AI Integration**
- Streaming responses for real-time interaction
- Error handling and fallbacks
- Context-length optimization
- Token usage management

**Endpoints:**
- `GET /api/notes/:id/summary` - Generate/retrieve summary
- `POST /api/notes/:id/ask` - Ask questions (with RAG toggle)

### 5. **User Progress Tracking**
- **Bookmarks** - Save important notes
- **Completion Tracking** - Mark notes as studied
- **Progress Dashboard** - Visual progress indicators
- **Study Analytics** - Track learning journey

**Endpoints:**
- `POST /api/notes/:id/bookmark` - Toggle bookmark
- `POST /api/notes/:id/complete` - Mark as completed
- `GET /api/progress` - Get user progress data

### 6. **User Interface Features**

#### **Responsive Design**
- Mobile-first approach
- Tailwind CSS utility classes
- Dark mode support with theme toggle
- Adaptive layouts

#### **Document Viewer**
- **Split-pane Layout** - Document + AI panel
- **Resizable Panels** - Draggable divider (20-95% width)
- **Tabbed Interface** - List/Viewer/AI modes
- **Zoom Controls** - 0.5x to 2x zoom
- **Document Types** - PDF, images, videos
- **In-document Search** - Highlight and navigate matches

#### **Navigation**
- **Breadcrumbs** - Clear hierarchical navigation
- **Sidebar Menu** - Quick access to all sections
- **Search Bar** - Global search from anywhere
- **Filters** - Branch, semester, subject filters

#### **Interactive Components**
- Loading states and skeletons
- Error boundaries and fallbacks
- Toast notifications
- Modal dialogs
- Suggestion dropdowns

---

## 🔄 Data Flow Examples

### **User Journey: Finding and Studying a Note**

1. **Login** → `POST /api/auth/login`
2. **Navigate** → HomePage: Select Branch → Semester → Subject
3. **View Notes** → NotesPage: Load subject resources via `GET /api/subjects/:id`
4. **Open Note** → Fetch PDF via `GET /api/notes/:id/file`
5. **Get Summary** → AI generates summary via `GET /api/notes/:id/summary`
6. **Ask Question** → AI Q&A via `POST /api/notes/:id/ask`
7. **Bookmark** → Save for later via `POST /api/notes/:id/bookmark`
8. **Mark Complete** → Track progress via `POST /api/notes/:id/complete`

### **Search Flow**

1. **User Types Query** → Frontend debounces input
2. **Autocomplete** → `GET /api/search/suggest?q=query`
3. **Full Search** → `GET /api/search?q=query`
   - Backend generates embedding using Transformers
   - Runs parallel keyword + semantic queries
   - Merges and ranks results
   - Extracts and highlights snippets
4. **Results Displayed** → Grouped by subject with context
5. **Analytics Logged** → Query saved to `search_analytics`

---

## 🔧 Configuration & Environment

### **Backend Environment Variables (.env)**

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Google Cloud Vertex AI
VERTEX_PROJECT=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_MODEL_ID=gemini-pro
GOOGLE_APPLICATION_CREDENTIALS=./vertex-key.json

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET=scholarvault-bucket
```

### **Frontend Environment Variables (.env)**

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🚀 Deployment & Running

### **Backend**

```bash
cd backend
npm install
npm start          # Production
npm run dev        # Development with nodemon
```

**Server runs on:** `http://localhost:3000`

### **Frontend**

```bash
cd frontend
npm install
npm run dev        # Development
npm run build      # Production build
npm run preview    # Preview production build
```

**Dev server runs on:** `http://localhost:5173`

---

## 📊 API Documentation

### **Health Check**
- `GET /healthz` - Server status check

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/year` - Update selected year (protected)
- `PUT /api/auth/password` - Change password (protected)
- `DELETE /api/auth/account` - Delete account (protected)

### **Subjects**
- `GET /api/subjects` - List subjects (filter: branch, semester)
- `GET /api/subjects/:id` - Get subject with all resources

### **Notes & Documents**
- `GET /api/notes` - List all notes (filter: branch, semester, subject_id)
- `GET /api/notes/:id` - Get note details
- `GET /api/notes/:id/file` - Stream document inline
- `GET /api/notes/:id/summary` - Get/generate AI summary (protected)
- `POST /api/notes/:id/ask` - Ask AI question (protected)
- `POST /api/notes/:id/bookmark` - Toggle bookmark (protected)
- `POST /api/notes/:id/complete` - Mark as completed (protected)
- `GET /api/notes/:id/search` - In-document search

### **Search**
- `GET /api/search?q=query&page=1&per_page=10` - Hybrid search
- `GET /api/search/suggest?q=query&limit=8` - Autocomplete suggestions
- `GET /api/search/analytics` - Top search queries

---

## 🔐 Security Features

1. **Password Hashing** - bcrypt with salt rounds
2. **JWT Authentication** - Secure token-based sessions
3. **CORS Protection** - Whitelist origins
4. **SQL Injection Protection** - Parameterized queries (Supabase)
5. **Input Validation** - Server-side validation
6. **Protected Routes** - Middleware authentication checks
7. **Environment Secrets** - `.env` for sensitive data
8. **S3 Security** - Pre-signed URLs with expiration
9. **Rate Limiting Ready** - Can be added to Express middleware

---

## 📈 Performance Optimizations

1. **Vector Indexing** - Fast semantic search with HNSW indices
2. **Trigram Indexing** - Efficient keyword search
3. **Caching** - S3 CloudFront CDN for documents
4. **Pagination** - Large result set handling
5. **Lazy Loading** - Load resources on demand
6. **Debouncing** - Reduce API calls for autocomplete
7. **Streaming** - AI responses streamed in real-time
8. **Database Indices** - Optimized query performance

---

## 🧪 Testing & Maintenance Files

- `check-ocr.js` - Verify OCR processing status
- `check-s3-metadata.js` - Audit S3 metadata compliance
- `fix-all-s3-metadata.js` - Batch fix S3 metadata issues
- `get-sample-notes.js` - Extract test data samples

---

## 📝 Database Migrations

1. **001_create_user_bookmarks.sql**
   - Creates `user_bookmarks` table
   - Adds indices for performance

2. **002_standardize_s3_metadata.js**
   - Fixes S3 metadata for existing files
   - Ensures proper Content-Type and Content-Disposition

3. **003_create_search_analytics.sql**
   - Creates `search_analytics` table
   - Tracks search behavior for improvements

---

## 🎯 Key Differentiators

1. **Hybrid Search** - Combines keyword + AI semantic search for best results
2. **AI Study Assistant** - Context-aware Q&A and summarization
3. **Document-Centric** - Built specifically for academic PDFs and notes
4. **Progress Tracking** - Personalized learning journey
5. **Year-Based Filtering** - Automatic content filtering by academic year
6. **In-PDF Search** - Find content within specific documents
7. **Split-Pane Viewer** - Study material + AI assistance side-by-side
8. **Search Analytics** - Trending topics and popular queries

---

## 🛠️ Future Enhancement Opportunities

1. **Real-time Collaboration** - Study groups and shared notes
2. **Mobile Apps** - iOS/Android native apps
3. **Offline Mode** - Download for offline study
4. **Spaced Repetition** - Smart study reminders
5. **Discussion Forums** - Per-subject Q&A boards
6. **Quiz Generation** - AI-generated practice questions
7. **Study Analytics** - Detailed learning insights
8. **Multi-language Support** - Internationalization
9. **Advanced OCR** - Better text extraction for handwritten notes
10. **Social Features** - Share notes, follow students

---

## 🐛 Known Limitations

1. OCR quality depends on document scan quality
2. AI responses limited by Vertex AI rate limits and token costs
3. Search embeddings generation can be slow for large documents
4. No real-time updates (WebSocket not implemented)
5. Limited to PostgreSQL (no multi-database support)

---

## 📚 Dependencies Summary

### **Backend Core (18 packages)**
- Express.js - Web framework
- Supabase - Database client
- AWS SDK - S3 storage
- Vertex AI - Google AI services
- Xenova Transformers - ML embeddings
- JWT - Authentication
- Bcrypt - Password hashing
- Axios - HTTP client
- CORS - Cross-origin requests
- Dotenv - Environment config

### **Frontend Core (9 packages)**
- React 19 - UI library
- React Router - Navigation
- Vite - Build tool
- Tailwind CSS - Styling
- Zustand - State management
- Axios - HTTP client
- Headless UI - Accessible components

---

## 📄 License & Author

- **License:** ISC
- **Type:** Educational Platform
- **Keywords:** education, ai, study, notes, search, machine learning

---

## 🎓 Project Purpose

ScholarVault was built to solve common student problems:
- **Scattered Resources** - Centralize all study materials
- **Time-Consuming Search** - Intelligent search finds content fast
- **Lack of Study Help** - AI assistant provides instant explanations
- **Disorganized Learning** - Track progress and stay organized
- **Poor Document Access** - Easy browsing and viewing

The platform transforms static PDFs and documents into an interactive, intelligent learning environment.

---

## 📞 API Server Startup Message

```
╔═══════════════════════════════════════════════════════════╗
║         🎓 ScholarVault Backend API Server                ║
╚═══════════════════════════════════════════════════════════╝

✨ Server running on: http://localhost:3000
📍 Environment: development
🔐 JWT Secret configured: true
📦 Database configured: true
🤖 Vertex AI configured: true
```

---

## 🎉 Summary

**ScholarVault** is a modern, AI-enhanced study platform that combines:
- **Smart Document Management** (AWS S3 + PostgreSQL)
- **Intelligent Search** (Hybrid keyword + semantic)
- **AI Study Assistant** (Vertex AI Gemini Pro)
- **Progress Tracking** (Bookmarks + completion)
- **Clean UI/UX** (React + Tailwind)

Built with scalability, performance, and student experience in mind, it represents a complete full-stack solution for educational content delivery and enhanced learning.

---

**Total LOC Estimate:** ~8,000-10,000 lines of code  
**Development Stack:** MERN-inspired (React + Node + PostgreSQL)  
**AI Integration:** Google Cloud + Transformers  
**Status:** Fully functional MVP with production-ready features

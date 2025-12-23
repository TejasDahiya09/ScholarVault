# ScholarVault

Single reference for features, setup, and operations.

## Features
- Authentication with JWT; onboarding collects year, study goal, notifications.
- Subjects, notes, books with OCR text; bookmarks; progress tracking (unit + note level).
- Hybrid search (keyword + vector via `document_chunks` + `match_documents_local` RPC) with caching and “Did you mean”.
- AI utilities: summaries, Q&A, RAG; embeddings via transformers.js (all-MiniLM-L6-v2).
- Analytics: search_analytics captures queries; optional analytics_sharing flag.

## Running
- Backend: `cd backend && npm install && npm run start` (requires env: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `VERTEX_*` if using Vertex).
- Frontend: `cd frontend && npm install && npm run dev`.
- Build: `npm run build` in frontend; backend is Express (no build step).

## Database Schema (Postgres/Supabase)
Tables: users, subjects, notes, books, user_bookmarks, user_progress, user_study_progress, search_analytics, unit_quizzes, document_chunks.
Key columns: users.selected_year, study_goal, notifications_enabled, email_notifications, analytics_sharing, updated_at; notes.ocr_text, is_ocr_done, unit_number, subject_id; progress tables track completion.
Indexes: email/year/goal on users; branch/semester/code on subjects; subject_id/unit_number/ocr_text (GIN) on notes; foreign keys with CASCADE where appropriate.

## Migrations
- Apply schema: `backend/migrations/COMPLETE_SCHEMA_SYNC.sql` (idempotent; creates tables/indexes/constraints and sets defaults).
- User prefs quick add: `backend/migrations/006_add_user_preferences_columns.sql` (included in sync script).

## Embedding & Search Ops
- Semantic search uses embeddings on demand; stored in document_chunks.
- Admin endpoints (add to backend/index.js):
  - `POST /api/admin/embed-all` – generate embeddings for all OCR-complete notes (batch, deletes old chunks).
  - `GET /api/admin/embedding-status` – coverage report.
  - `POST /api/admin/embed-note/:noteId` – regenerate one note.
- Uses `aiService.generateEmbeddings` (transformers.js) and Supabase vector column `embedding VECTOR(768)`.

## Onboarding & Preferences
- Frontend `OnboardingModal` posts to `PUT /api/auth/preferences` with selected_year, study_goal, notifications_enabled.
- Backend `authService.updatePreferences` persists all preference fields; users table now contains required columns.

## Bookmarks & Progress
- Bookmarks: user_bookmarks (unique user_id+note_id), exposed via bookmarks routes.
- Progress: user_progress (unit-level) and user_study_progress (note-level with streak/time); mark/unmark via progressDB methods.

## Deployment Notes
- Netlify frontend; Render backend. Enable keep-alive/self-ping on backend for cold-start reduction.
- Cache-Control: GET responses cached 5m (non-auth).

## Troubleshooting
- 500 during onboarding: ensure `COMPLETE_SCHEMA_SYNC.sql` applied so users table has preference columns.
- Vector search empty: run `POST /api/admin/embed-all` after OCR is done; ensure `document_chunks` populated.
- Auth issues: verify JWT_SECRET and Supabase keys.

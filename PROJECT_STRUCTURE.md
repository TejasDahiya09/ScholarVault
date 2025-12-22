# Project Structure

## Backend
```
backend/
├─ package.json
├─ requirements.txt
├─ index.js
├─ .env.example (you: .env / .env.migration)
├─ credentials/
│  └─ aws_keys.csv (gitignored)
├─ migrations/
│  ├─ 001_create_user_bookmarks.sql
│  ├─ 002_standardize_s3_metadata.js
│  └─ 003_create_search_analytics.sql
├─ scripts/
│  ├─ master_migration.py
│  └─ README.md
├─ src/
│  ├─ config.js
│  ├─ controllers/
│  ├─ db/
│  ├─ lib/
│  ├─ middlewares/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
├─ add_selected_year_column.sql
├─ check-ocr.js
├─ fix-all-s3-metadata.js
├─ check-s3-metadata.js (removed/merged)
├─ scholarvault_schema.sql
└─ vertex-key.json
```

## Frontend
```
frontend/
├─ package.json
├─ vite.config.js
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ App.css
│  ├─ api/
│  ├─ assets/
│  ├─ components/
│  │  ├─ Breadcrumbs.jsx
│  │  ├─ DarkModeToggle.jsx
│  │  ├─ InPDFSearch.jsx
│  │  ├─ YearSelectionModal.jsx
│  │  └─ Layout/
│  │     ├─ AppShell.jsx
│  │     ├─ NavBar.jsx
│  │     └─ SideBar.jsx
│  ├─ pages/
│  │  ├─ Dashboard.jsx
│  │  ├─ Landing.jsx
│  │  ├─ SearchPage.jsx
│  │  ├─ BooksPage.jsx
│  │  ├─ ProfilePage.jsx
│  │  ├─ ProgressPage.jsx
│  │  └─ Notes/
│  │     └─ NotesPage.jsx
│  └─ store/
│     ├─ useAuth.js
│     └─ useDarkMode.js
├─ public/
│  └─ assets/
└─ config files: tailwind.config.js, postcss.config.js, eslint.config.js
```

Notes:
- Migration/upload script: backend/scripts/master_migration.py (see scripts/README.md)
- S3 metadata tool: backend/fix-all-s3-metadata.js (check & fix)
- Credentials gitignored: backend/credentials/, backend/.env.migration

# Master Migration Script

This script handles uploading notes and books to AWS S3 and Supabase database with OCR processing using Google Cloud Vision API.

## Location
`backend/scripts/master_migration.py`

## Prerequisites

1. **Python 3.x** installed
2. **Required packages** (install with `pip install -r requirements.txt` from backend folder)
3. **Environment Variables** set up (see Configuration below)
4. **Google Cloud Credentials** for OCR functionality

## Configuration

### Environment Variables
Update your `.env` file in the backend folder with:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
S3_OCR_RESULTS_BUCKET=your_ocr_bucket (optional)

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key

# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=path/to/gcp_credentials.json

# Local Data Path
SCHOLARVAULT_BASE_PATH=C:\path\to\your\data\folder
```

### Google Cloud Credentials
Place your `gcp_credentials.json` in the `backend` folder or set the path in environment variables.

## Features

### S3 Upload with Metadata
The script now uploads files with standardized metadata:
- **Content-Type**: Auto-detected from file extension
- **Content-Disposition**: `inline` for PDFs/images, `attachment` for others
- **Cache-Control**: Optimized caching (30 days for docs, 1 year for images)
- **Custom Metadata**: Archive type and upload date

### OCR Processing
- Automatic text extraction from PDFs and images
- Dynamic chunking for large PDFs (>40MB)
- Google Cloud Vision API integration
- Retry logic with exponential backoff

## Usage

### Interactive Mode
```bash
cd backend
python scripts/master_migration.py
```

Then select from the menu:
1. **Migrate Notes (with OCR)** - Upload notes and extract text
2. **Migrate Notes (without OCR)** - Upload notes only (faster)
3. **Migrate Books (no OCR)** - Upload books
4. **Update Old Notes with OCR** - Add OCR to existing notes
5. **Exit**

### Command Line Mode
```bash
# Migrate notes with OCR
python scripts/master_migration.py --mode migrate_notes

# Migrate notes without OCR (faster)
python scripts/master_migration.py --mode migrate_notes_no_ocr

# Migrate books only
python scripts/master_migration.py --mode migrate_books

# Update existing notes with OCR
python scripts/master_migration.py --mode update_ocr

# Quick OCR availability check (sample)
python scripts/master_migration.py --mode check_ocr

# Custom base path
python scripts/master_migration.py --mode migrate_notes --base-path "C:\custom\path"

# Custom chunk size for PDFs
python scripts/master_migration.py --mode migrate_notes --chunk-pages 10
```

### S3 Metadata Check & Fix (combined JS tool)

Use the merged script `fix-all-s3-metadata.js` for both checking and fixing metadata:

```bash
# Check first 5 notes for inline metadata
node fix-all-s3-metadata.js --check

# Check a specific S3 key
node fix-all-s3-metadata.js --check --key "BTech CSE/1/.../file.pdf"

# Fix all notes metadata to inline (default mode)
node fix-all-s3-metadata.js
```

## File Structure Expected

Your data folder should be organized as:
```
BASE_PATH/
├── Branch/              (e.g., CSE, ECE)
│   ├── Year/Semester/   (e.g., 5, III)
│   │   ├── Subject/     (e.g., Machine Learning)
│   │   │   ├── Notes/   (PDFs, images)
│   │   │   └── Books/   (PDFs)
```

## Credentials Storage

- **AWS Keys**: `backend/credentials/aws_keys.csv` (gitignored)
- **GCP Credentials**: `backend/gcp_credentials.json` (gitignored)
- **Environment Variables**: `backend/.env` or `backend/.env.migration` (gitignored)

## Notes

- The script skips files already in the database
- Progress is shown with ETA
- Automatic retry on transient errors
- Logs are output to console (configurable via SCHOLARVAULT_LOG_LEVEL)

## Adding New Features

When adding new features:
1. Edit `backend/scripts/master_migration.py`
2. Test locally with a small dataset
3. Update this README if needed
4. Run the script manually when ready to update production

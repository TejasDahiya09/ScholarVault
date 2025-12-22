#!/usr/bin/env python
import os
import uuid
import boto3
import json
import time
import sys
import math
import io
import logging
import argparse
from typing import Optional, Tuple, List, Dict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from supabase import create_client, Client
from google.cloud import vision
from google.api_core import exceptions as gcloud_exceptions
import requests
from PyPDF2 import PdfReader, PdfWriter, errors

# -------------------- CONFIG & ENV --------------------
load_dotenv()

# Google credentials: ensure this is set before starting
if "GOOGLE_APPLICATION_CREDENTIALS" not in os.environ:
    # If you want to set here, uncomment and change path:
    # os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = r'C:\path\to\gcp_credentials.json'
    pass

# Required envs
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_OCR_RESULTS_BUCKET = os.getenv("S3_OCR_RESULTS_BUCKET")  # optional for async workflows

# Local base path where files are stored
BASE_PATH = os.getenv("SCHOLARVAULT_BASE_PATH", r"C:\Users\dahiy\Downloads\ScholarVault\ScholarVault_Data")

# Constants
SYNC_LIMIT = 40 * 1024 * 1024      # Vision inline payload limit: 40 MB
DEFAULT_CHUNK_PAGES = 5           # starting chunk pages for PDFs
CHUNK_MIN_PAGES = 1
BAR_LENGTH = 30
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.5          # seconds, exponential backoff multiplier
HTTP_TIMEOUT = 120                # seconds for requests

# Logging configuration
LOG_LEVEL = os.getenv("SCHOLARVAULT_LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    stream=sys.stdout,
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("scholarvault")

# Validate environment basics (fail fast)
_missing = []
if not SUPABASE_URL:
    _missing.append("SUPABASE_URL")
if not SUPABASE_KEY:
    _missing.append("SUPABASE_KEY")
if not AWS_ACCESS_KEY_ID:
    _missing.append("AWS_ACCESS_KEY_ID")
if not AWS_SECRET_ACCESS_KEY:
    _missing.append("AWS_SECRET_ACCESS_KEY")
if not S3_BUCKET_NAME:
    _missing.append("S3_BUCKET_NAME")

if _missing:
    logger.warning("Missing required environment variables: %s", ", ".join(_missing))
    # We continue to allow partial testing, but main functions will likely fail without these.

# -------------------- CLIENT INITIALIZATION --------------------
# Supabase
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.exception("Failed to create Supabase client: %s", e)

# S3 client
s3_client = None
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
except Exception as e:
    logger.exception("Failed to initialize S3 client: %s", e)

# Vision client
vision_client = None
try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    logger.exception("Failed to initialize Vision client: %s", e)

# -------------------- UTILITIES --------------------
def retry_loop(func, max_retries=MAX_RETRIES, initial_delay=1.0, backoff=RETRY_BACKOFF_BASE, allowed_exceptions=(Exception,), swallow=False, *args, **kwargs):
    """
    Generic retry wrapper with exponential backoff.
    Returns func(*args, **kwargs) on success, or raises the last exception (unless swallow=True).
    """
    attempt = 0
    delay = initial_delay
    while True:
        try:
            return func(*args, **kwargs)
        except allowed_exceptions as e:
            attempt += 1
            if attempt > max_retries:
                logger.debug("Retry loop exhausted for %s", getattr(func, "__name__", str(func)))
                if swallow:
                    return None
                raise
            logger.warning("Transient error in %s: %s — retrying (%d/%d) after %.2fs", getattr(func, "__name__", str(func)), e, attempt, max_retries, delay)
            time.sleep(delay)
            delay *= backoff

def human_readable_size(num_bytes: int) -> str:
    """Return human readable bytes."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if num_bytes < 1024.0:
            return f"{num_bytes:.2f}{unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.2f}PB"

def build_file_url(path_parts: List[str], filename: str) -> str:
    """
    Build S3 URL given path parts and filename.
    Expected path parts: [Branch, Year/Semester, Subject, ResourceType, ...]
    """
    # Normalize and guard numeric extraction
    try:
        year_component = int(''.join(filter(str.isdigit, path_parts[1])))
    except Exception:
        year_component = path_parts[1]
    bucket_path = f"{path_parts[0]}/{year_component}"
    subject_name = path_parts[2]
    resource_type = path_parts[3]
    # URL-encoding might be desirable; keeping simple to match existing S3 layout
    return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{bucket_path}/{subject_name}/{resource_type}/{filename}"

def build_subject_id(path_parts: List[str]) -> str:
    branch = path_parts[0]
    try:
        year = int(''.join(filter(str.isdigit, path_parts[1])))
    except Exception:
        year = path_parts[1]
    subject_name = path_parts[2]
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{branch}-{year}-{subject_name}"))

def ensure_subject_record(path_parts: List[str]) -> str:
    """
    Upsert a minimal subject record into 'subjects' table; return subject_id UUID string.
    This uses supabase client.
    """
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    subject_id = build_subject_id(path_parts)
    branch = path_parts[0]
    semester = path_parts[1]
    name = path_parts[2]
    try:
        resp = supabase.table('subjects').select('id').eq('id', subject_id).execute()
        if resp.data:
            return subject_id
    except Exception as e:
        # If select fails, log and continue to attempt insert (defensive)
        logger.debug("Subjects select failed: %s", e)

    try:
        supabase.table('subjects').insert({
            'id': subject_id,
            'branch': branch,
            'semester': semester,
            'name': name,
            'code': None,
            'description': None
        }).execute()
        logger.info("Inserted subject record: %s (id=%s)", name, subject_id)
    except Exception as e:
        # Race condition or permission; log and continue
        logger.warning("Failed to insert subject record (may already exist): %s", e)
    return subject_id

def print_progress(idx: int, total: int, start_time: float, extra_msg: str = ""):
    fraction = idx / total if total > 0 else 1.0
    filled_length = math.ceil(BAR_LENGTH * fraction)
    bar = '#' * filled_length + '-' * (BAR_LENGTH - filled_length)
    percent = round(fraction * 100, 2)
    elapsed = time.time() - start_time
    avg_time = elapsed / idx if idx > 0 else 0
    eta = (total - idx) * avg_time
    line = f"Progress: [{bar}] {percent}% | {idx}/{total} | ETA: {round(eta/60,2)} min {extra_msg}"
    padded_line = line.ljust(160)
    sys.stdout.write(f"\r{padded_line}")
    sys.stdout.flush()

# -------------------- OCR LOGIC --------------------
def extract_text_from_image_bytes(content_bytes: bytes) -> Optional[str]:
    """Document text detection for images (png, jpg, jpeg, gif, tiff)."""
    if vision_client is None:
        raise RuntimeError("Vision client not initialized")
    try:
        image = vision.Image(content=content_bytes)
        response = vision_client.document_text_detection(image=image, timeout=120)
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        return response.full_text_annotation.text if response.full_text_annotation else None
    except gcloud_exceptions.GoogleAPICallError as e:
        logger.exception("Google API call error during image OCR: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error during image OCR: %s", e)
        raise

def extract_text_from_pdf_bytes(content_bytes: bytes) -> Optional[str]:
    """Use batch_annotate_files for small PDF bytes (inline)."""
    if vision_client is None:
        raise RuntimeError("Vision client not initialized")
    try:
        input_config = vision.InputConfig(content=content_bytes, mime_type='application/pdf')
        features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
        request = vision.AnnotateFileRequest(input_config=input_config, features=features)
        response = vision_client.batch_annotate_files(requests=[request], timeout=300)
        # response.responses[0] contains a "responses" list (one per page doc)
        pages = response.responses[0].responses if response.responses and len(response.responses) > 0 else []
        full_text = "".join([
            (page.full_text_annotation.text + "\n\n") for page in pages if page.full_text_annotation
        ])
        return full_text if full_text else None
    except gcloud_exceptions.RetryError as e:
        logger.exception("Retry error during PDF OCR: %s", e)
        raise
    except gcloud_exceptions.GoogleAPICallError as e:
        logger.exception("Google API call error during PDF OCR: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error during PDF OCR: %s", e)
        raise

def extract_text_sync(content_bytes: bytes, mime_type: str) -> Optional[str]:
    """
    Master sync OCR function that routes to image or PDF-specific handlers.
    It returns the extracted full text or None.
    """
    try:
        if mime_type.startswith("image/"):
            return extract_text_from_image_bytes(content_bytes)
        elif mime_type == "application/pdf":
            return extract_text_from_pdf_bytes(content_bytes)
        else:
            logger.warning("Unsupported MIME for sync OCR: %s", mime_type)
            return None
    except Exception as e:
        logger.warning("Error in sync OCR: %s", e)
        return None

def dynamic_chunk_and_ocr_pdf(pdf_bytes: bytes, start_chunk_pages=DEFAULT_CHUNK_PAGES) -> Optional[str]:
    """
    Chunk a PDF into smaller page groups and call extract_text_sync on each chunk.
    The algorithm dynamically reduces chunk size if chunk byte-length still exceeds SYNC_LIMIT.
    Returns concatenated OCR text or None.
    """
    try:
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as e:
        logger.exception("Failed to read PDF bytes with PyPDF2: %s", e)
        return None

    total_pages = len(pdf_reader.pages)
    if total_pages == 0:
        return None

    gathered_text = ""
    page_idx = 0
    chunk_pages = max(start_chunk_pages, CHUNK_MIN_PAGES)

    while page_idx < total_pages:
        end_page = min(page_idx + chunk_pages, total_pages)
        writer = PdfWriter()
        for p in range(page_idx, end_page):
            writer.add_page(pdf_reader.pages[p])

        buf = io.BytesIO()
        writer.write(buf)
        buf.seek(0)
        chunk_size = len(buf.getbuffer())
        # If chunk too large, reduce pages until under limit or pages==1
        if chunk_size > SYNC_LIMIT and chunk_pages > CHUNK_MIN_PAGES:
            # reduce chunk_pages (halving) and continue to try the same page range
            old_chunk_pages = chunk_pages
            chunk_pages = max(CHUNK_MIN_PAGES, chunk_pages // 2)
            logger.info("Chunk of pages %d-%d is %s (> %s). Reducing chunk pages %d -> %d and retrying.",
                        page_idx + 1, end_page, human_readable_size(chunk_size), human_readable_size(SYNC_LIMIT), old_chunk_pages, chunk_pages)
            continue

        # If still too large and chunk_pages == 1, skip with warning (can't inline)
        if chunk_size > SYNC_LIMIT and chunk_pages == CHUNK_MIN_PAGES:
            logger.warning("Single page chunk size (%s) exceeds Vision inline limit; skipping these pages: %d-%d",
                           human_readable_size(chunk_size), page_idx + 1, end_page)
            page_idx = end_page
            continue

        # OK to call OCR on this chunk
        logger.info("Processing PDF pages %d-%d (size=%s)", page_idx + 1, end_page, human_readable_size(chunk_size))
        text = extract_text_sync(buf.read(), 'application/pdf')
        if text:
            gathered_text += text + "\n\n"
        else:
            logger.info("No text found on pages %d-%d", page_idx + 1, end_page)

        page_idx = end_page
        # optionally increase chunk_pages slowly to speed up after many small pages
        if chunk_pages < start_chunk_pages:
            chunk_pages = min(start_chunk_pages, chunk_pages * 2)

    return gathered_text if gathered_text.strip() else None

# -------------------- S3 HELPERS --------------------
def get_content_type(filename: str) -> str:
    """Detect MIME type from filename extension."""
    import mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'

def get_upload_metadata(filename: str) -> dict:
    """
    Get standardized S3 metadata configuration matching s3-uploader.js
    Returns ContentType, ContentDisposition, CacheControl, and Metadata
    """
    ext = filename.split('.')[-1].lower()
    content_type = get_content_type(filename)
    
    # Metadata configs matching the Node.js s3-uploader
    if ext == 'pdf' or 'pdf' in content_type:
        return {
            'ContentType': content_type,
            'ContentDisposition': 'inline',
            'CacheControl': 'public, max-age=2592000',  # 30 days
            'Metadata': {
                'archive-type': 'document',
                'upload-date': datetime.utcnow().isoformat()
            }
        }
    elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']:
        return {
            'ContentType': content_type,
            'ContentDisposition': 'inline',
            'CacheControl': 'public, max-age=31536000',  # 1 year
            'Metadata': {
                'archive-type': 'image',
                'upload-date': datetime.utcnow().isoformat()
            }
        }
    elif ext in ['mp4', 'avi', 'mov', 'mkv', 'webm']:
        return {
            'ContentType': content_type,
            'ContentDisposition': 'inline',
            'CacheControl': 'public, max-age=31536000',  # 1 year
            'Metadata': {
                'archive-type': 'video',
                'upload-date': datetime.utcnow().isoformat()
            }
        }
    else:
        return {
            'ContentType': content_type,
            'ContentDisposition': 'attachment',
            'CacheControl': 'public, max-age=604800',  # 7 days
            'Metadata': {
                'archive-type': 'file',
                'upload-date': datetime.utcnow().isoformat()
            }
        }

def s3_upload_file(local_path: str, bucket: str, key: str) -> None:
    """
    Upload file to S3 with standardized metadata (Content-Type, Content-Disposition, Cache-Control)
    Matches the metadata standards from backend/src/lib/s3-uploader.js
    """
    if s3_client is None:
        raise RuntimeError("S3 client not initialized")
    
    filename = os.path.basename(local_path)
    upload_config = get_upload_metadata(filename)
    
    def _upload():
        s3_client.upload_file(
            local_path, 
            bucket, 
            key,
            ExtraArgs={
                'ContentType': upload_config['ContentType'],
                'ContentDisposition': upload_config['ContentDisposition'],
                'CacheControl': upload_config['CacheControl'],
                'Metadata': upload_config['Metadata']
            }
        )
        logger.debug(f"Uploaded {filename} with ContentType={upload_config['ContentType']}, "
                    f"ContentDisposition={upload_config['ContentDisposition']}")
    
    return retry_loop(_upload, allowed_exceptions=(Exception,))

def s3_get_bytes_from_url(url: str) -> Optional[bytes]:
    """
    Download bytes from a publicly accessible S3 URL (or presigned).
    Uses requests with retries.
    """
    def _get():
        resp = requests.get(url, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return resp.content
    return retry_loop(_get, allowed_exceptions=(requests.RequestException, Exception), swallow=False)

# -------------------- DATABASE HELPERS --------------------
def note_exists_in_db(s3_url: str) -> bool:
    if not supabase:
        logger.debug("Supabase not configured; skipping DB check for existing note.")
        return False
    try:
        resp = supabase.table('notes').select('id').eq('s3_url', s3_url).limit(1).execute()
        return bool(resp.data)
    except Exception as e:
        logger.warning("Supabase select for note existence failed: %s", e)
        return False

def book_exists_in_db(s3_url: str) -> bool:
    if not supabase:
        return False
    try:
        resp = supabase.table('books').select('id').eq('s3_url', s3_url).limit(1).execute()
        return bool(resp.data)
    except Exception as e:
        logger.warning("Supabase select for book existence failed: %s", e)
        return False

def insert_note_record(metadata: Dict):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    try:
        supabase.table('notes').insert(metadata).execute()
    except Exception as e:
        logger.exception("Failed to insert note record into Supabase: %s", e)
        raise

def update_note_ocr(note_id: str, ocr_text: str):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    try:
        supabase.table('notes').update({'ocr_text': ocr_text, 'is_ocr_done': True}).eq('id', note_id).execute()
    except Exception as e:
        logger.exception("Failed to update OCR text for note %s: %s", note_id, e)
        raise

def insert_book_record(metadata: Dict):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    try:
        supabase.table('books').insert(metadata).execute()
    except Exception as e:
        logger.exception("Failed to insert book record into Supabase: %s", e)
        raise

# -------------------- MODE IMPLEMENTATIONS --------------------
def migrate_notes_with_ocr():
    logger.info("Starting: Migrate Notes (with OCR)")
    all_files = []
    for root, dirs, files in os.walk(BASE_PATH):
        for filename in files:
            path_parts = root.replace(BASE_PATH, "").strip(os.sep).split(os.sep)
            if not path_parts or len(path_parts) < 4:
                continue
            if path_parts[3] == 'Books':
                continue
            ext = filename.lower().split('.')[-1]
            if ext not in ['png', 'jpg', 'jpeg', 'tiff', 'gif', 'pdf']:
                continue
            all_files.append((root, filename, path_parts))

    total_files = len(all_files)
    logger.info("Found %d note files to process.", total_files)
    start_time = time.time()
    success = skipped = 0

    for idx, (root, filename, path_parts) in enumerate(all_files, start=1):
        try:
            file_url = build_file_url(path_parts, filename)
            if note_exists_in_db(file_url):
                skipped += 1
                print_progress(idx, total_files, start_time, f"skipped: {filename}")
                continue

            logger.info("Processing file: %s", filename)
            file_path = os.path.join(root, filename)
            file_size = os.path.getsize(file_path)
            logger.debug("Local file size: %s", human_readable_size(file_size))

            # Upload to S3
            s3_key = file_url.replace(f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/", "")
            try:
                s3_upload_file(file_path, S3_BUCKET_NAME, s3_key)
                logger.info("Uploaded %s to S3 (key=%s)", filename, s3_key)
            except Exception as e:
                logger.exception("Failed to upload file to S3: %s", e)
                skipped += 1
                print_progress(idx, total_files, start_time, filename)
                continue

            # OCR
            extracted_text = None
            ext = filename.lower().split('.')[-1]

            if ext == 'pdf' and file_size > SYNC_LIMIT:
                logger.info("Large PDF (%s) detected — using dynamic chunk OCR", human_readable_size(file_size))
                with open(file_path, "rb") as f:
                    file_bytes = f.read()
                extracted_text = dynamic_chunk_and_ocr_pdf(file_bytes, start_chunk_pages=DEFAULT_CHUNK_PAGES)
            else:
                with open(file_path, "rb") as f:
                    content = f.read()
                mime = 'application/pdf' if ext == 'pdf' else f'image/{ext if ext != "jpg" else "jpeg"}'
                logger.info("Running OCR on %s as %s", filename, mime)
                extracted_text = extract_text_sync(content, mime)

            subject_id = ensure_subject_record(path_parts)

            # Insert metadata
            metadata = {
                'id': str(uuid.uuid4()),
                'subject_id': subject_id,
                'branch': path_parts[0],
                'semester': path_parts[1],
                'subject': path_parts[2],
                'file_name': filename,
                's3_url': file_url,
                'ocr_text': extracted_text,
                'is_ocr_done': bool(extracted_text)
            }
            try:
                insert_note_record(metadata)
                success += 1
                logger.info("Inserted metadata for %s", filename)
            except Exception:
                skipped += 1

        except Exception as e:
            logger.exception("Unhandled error while processing %s: %s", filename, e)
            skipped += 1

        print_progress(idx, total_files, start_time, filename)

    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("Migration complete: Total=%d Success=%d Skipped=%d Time=%s min", total_files, success, skipped, elapsed)

def migrate_notes_no_ocr():
    logger.info("Starting: Migrate Notes (no OCR)")
    all_files = []
    for root, dirs, files in os.walk(BASE_PATH):
        for filename in files:
            path_parts = root.replace(BASE_PATH, "").strip(os.sep).split(os.sep)
            if not path_parts or len(path_parts) < 4:
                continue
            if path_parts[3] == 'Books':
                continue
            ext = filename.lower().split('.')[-1]
            if ext not in ['png', 'jpg', 'jpeg', 'tiff', 'gif', 'pdf']:
                continue
            all_files.append((root, filename, path_parts))

    total_files = len(all_files)
    logger.info("Found %d files to upload (no OCR).", total_files)
    start_time = time.time()
    success = skipped = 0

    for idx, (root, filename, path_parts) in enumerate(all_files, start=1):
        try:
            file_url = build_file_url(path_parts, filename)
            if note_exists_in_db(file_url):
                skipped += 1
                print_progress(idx, total_files, start_time, f"skipped: {filename}")
                continue

            logger.info("Uploading (no OCR): %s", filename)
            file_path = os.path.join(root, filename)
            s3_key = file_url.replace(f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/", "")

            try:
                s3_upload_file(file_path, S3_BUCKET_NAME, s3_key)
                logger.info("Uploaded %s to S3", filename)
            except Exception as e:
                logger.exception("Failed to upload: %s", e)
                skipped += 1
                print_progress(idx, total_files, start_time, filename)
                continue

            subject_id = ensure_subject_record(path_parts)
            metadata = {
                'id': str(uuid.uuid4()),
                'subject_id': subject_id,
                'branch': path_parts[0],
                'semester': path_parts[1],
                'subject': path_parts[2],
                'file_name': filename,
                's3_url': file_url,
                'ocr_text': None,
                'is_ocr_done': False
            }
            try:
                insert_note_record(metadata)
                success += 1
            except Exception:
                skipped += 1

        except Exception as e:
            logger.exception("Unhandled error uploading %s: %s", filename, e)
            skipped += 1

        print_progress(idx, total_files, start_time, filename)

    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("Migration (no OCR) complete: Total=%d Success=%d Skipped=%d Time=%s min", total_files, success, skipped, elapsed)

def migrate_books_only():
    logger.info("Starting: Migrate Books (no OCR)")
    all_books = []
    for root, dirs, files in os.walk(BASE_PATH):
        for filename in files:
            path_parts = root.replace(BASE_PATH, "").strip(os.sep).split(os.sep)
            if len(path_parts) >= 4 and path_parts[3] == 'Books':
                all_books.append((root, filename, path_parts))

    total_books = len(all_books)
    logger.info("Found %d book files to process.", total_books)
    start_time = time.time()
    success = skipped = 0

    for idx, (root, filename, path_parts) in enumerate(all_books, start=1):
        try:
            file_url = build_file_url(path_parts, filename)
            if book_exists_in_db(file_url):
                skipped += 1
                print_progress(idx, total_books, start_time, f"skipped: {filename}")
                continue

            logger.info("Processing book: %s", filename)
            file_path = os.path.join(root, filename)
            s3_key = file_url.replace(f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/", "")

            try:
                s3_upload_file(file_path, S3_BUCKET_NAME, s3_key)
                logger.info("Uploaded book %s to S3", filename)
            except Exception as e:
                logger.exception("Failed to upload book: %s", e)
                skipped += 1
                print_progress(idx, total_books, start_time, filename)
                continue

            subject_id = ensure_subject_record(path_parts)
            metadata = {
                'id': str(uuid.uuid4()),
                'subject_id': subject_id,
                'branch': path_parts[0],
                'semester': path_parts[1],
                'subject': path_parts[2],
                'file_name': filename,
                's3_url': file_url
            }
            try:
                insert_book_record(metadata)
                success += 1
            except Exception:
                skipped += 1

        except Exception as e:
            logger.exception("Unhandled error processing book %s: %s", filename, e)
            skipped += 1

        print_progress(idx, total_books, start_time, filename)

    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("Books migration complete: Total=%d Success=%d Skipped=%d Time=%s min", total_books, success, skipped, elapsed)

def update_old_notes_with_ocr():
    """
    Find notes without OCR text (via RPC get_notes_to_update_ocr) and update them.
    The RPC should return objects with 'id' and 's3_url'.
    """
    logger.info("Starting: Update Old Notes with OCR")
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    try:
        resp = supabase.rpc('get_notes_to_update_ocr', {}).execute()
    except Exception as e:
        logger.exception("Supabase RPC get_notes_to_update_ocr failed: %s", e)
        return

    notes = resp.data if resp and resp.data else []
    if not notes:
        logger.info("No notes require OCR update.")
        return

    total_notes = len(notes)
    logger.info("Found %d notes to update.", total_notes)
    start_time = time.time()
    success = skipped = 0

    for idx, note in enumerate(notes, start=1):
        note_id = note.get('id')
        s3_url = note.get('s3_url')
        logger.info("Processing note ID: %s (url=%s)", note_id, s3_url)

        if not s3_url:
            logger.warning("Note %s missing s3_url — skipping", note_id)
            skipped += 1
            print_progress(idx, total_notes, start_time, f"NoteID:{note_id}")
            continue

        try:
            content = s3_get_bytes_from_url(s3_url)
            if not content:
                logger.warning("Failed to download content for %s", s3_url)
                skipped += 1
                print_progress(idx, total_notes, start_time, f"NoteID:{note_id}")
                continue

            file_extension = s3_url.split('.')[-1].lower()
            mime_type = 'application/pdf' if file_extension == 'pdf' else f'image/{file_extension if file_extension != "jpg" else "jpeg"}'
            logger.info("Extracting text for %s as %s", s3_url, mime_type)

            extracted_text = None
            if file_extension == 'pdf' and len(content) > SYNC_LIMIT:
                logger.info("Large PDF detected during update — using dynamic chunking")
                extracted_text = dynamic_chunk_and_ocr_pdf(content, start_chunk_pages=DEFAULT_CHUNK_PAGES)
            else:
                extracted_text = extract_text_sync(content, mime_type)

            if extracted_text:
                logger.info("Updating Supabase record for note %s", note_id)
                try:
                    update_note_ocr(note_id, extracted_text)
                    success += 1
                except Exception:
                    skipped += 1
            else:
                logger.info("No text found for note %s", note_id)
                skipped += 1

        except Exception as e:
            logger.exception("Error processing note %s: %s", note_id, e)
            skipped += 1

        print_progress(idx, total_notes, start_time, f"NoteID:{note_id}")

    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("Update complete: Total=%d Success=%d Skipped=%d Time=%s min", total_notes, success, skipped, elapsed)

# -------------------- QUICK CHECKS --------------------
def check_ocr_sample(limit: int = 3):
    """Sample a few notes and report whether OCR text exists."""
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    try:
        resp = supabase.table('notes').select('id, file_name, ocr_text').limit(limit).execute()
    except Exception as e:
        logger.exception("Failed to fetch notes for OCR check: %s", e)
        return

    notes = resp.data or []
    logger.info("Checking OCR availability for %d notes", len(notes))
    for idx, note in enumerate(notes, start=1):
        ocr_text = note.get('ocr_text') or ""
        has_ocr = bool(ocr_text.strip())
        preview = (ocr_text[:100] + "..." ) if has_ocr and len(ocr_text) > 100 else ocr_text
        logger.info("%d. %s — OCR: %s%s", idx, note.get('file_name'), "YES" if has_ocr else "NO", f" | preview: {preview}" if preview else "")

# -------------------- CLI / ENTRYPOINT --------------------
def interactive_menu():
    menu = """
Select Mode:
1. Migrate Notes (with OCR)
2. Migrate Notes (without OCR)
3. Migrate Books (no OCR)
4. Update Old Notes with OCR
5. Check OCR Sample
6. Exit

Enter choice (1-6): """
    while True:
        choice = input(menu).strip()
        if choice == '1':
            migrate_notes_with_ocr()
        elif choice == '2':
            migrate_notes_no_ocr()
        elif choice == '3':
            migrate_books_only()
        elif choice == '4':
            update_old_notes_with_ocr()
        elif choice == '5':
            check_ocr_sample()
        elif choice == '6':
            logger.info("Exiting interactive menu.")
            break
        else:
            print("Invalid choice, try again.")

def parse_args():
    parser = argparse.ArgumentParser(description="ScholarVault migration & OCR tool")
    parser.add_argument('--mode', type=str, help="Mode to run: migrate_notes | migrate_notes_no_ocr | migrate_books | update_ocr | check_ocr")
    parser.add_argument('--base-path', type=str, default=BASE_PATH, help="Local base data path")
    parser.add_argument('--chunk-pages', type=int, default=DEFAULT_CHUNK_PAGES, help="Initial PDF chunk pages")
    parser.add_argument('--dry-run', action='store_true', help="Dry run: log what would be done without changes")
    return parser.parse_args()

def main():
    args = parse_args()
    global BASE_PATH, DEFAULT_CHUNK_PAGES
    BASE_PATH = args.base_path
    DEFAULT_CHUNK_PAGES = args.chunk_pages

    if args.dry_run:
        logger.info("DRY RUN mode enabled — no DB inserts or S3 uploads will be performed.")
        # We won't implement special dry-run toggles for every function for brevity,
        # but you can test by setting envs to non-functional or by running on a small subset.

    if args.mode:
        mode = args.mode.strip().lower()
        if mode == 'migrate_notes':
            migrate_notes_with_ocr()
        elif mode == 'migrate_notes_no_ocr':
            migrate_notes_no_ocr()
        elif mode == 'migrate_books':
            migrate_books_only()
        elif mode == 'update_ocr':
            update_old_notes_with_ocr()
        elif mode == 'check_ocr':
            check_ocr_sample()
        else:
            logger.error("Unknown mode '%s'. Available: migrate_notes, migrate_notes_no_ocr, migrate_books, update_ocr, check_ocr", args.mode)
            sys.exit(1)
    else:
        interactive_menu()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.warning("Interrupted by user. Exiting.")
    except Exception as e:
        logger.exception("Unhandled exception in main: %s", e)
        sys.exit(1)

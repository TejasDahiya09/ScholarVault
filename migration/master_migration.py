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
import mimetypes
from typing import Optional, Tuple, List, Dict, Callable
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client
from google.cloud import vision
from google.api_core import exceptions as gcloud_exceptions
import requests
from PyPDF2 import PdfReader, PdfWriter, errors

# -------------------- CONFIG & ENV --------------------
load_dotenv()

# Custom exception for duplicate records
class DuplicateRecordError(Exception):
    """Raised when trying to insert a duplicate record."""
    pass

# Google credentials: ensure this is set before starting
if "GOOGLE_APPLICATION_CREDENTIALS" not in os.environ:
    # Set the path to gcp_credentials.json
    gcp_creds_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gcp_credentials.json')
    if os.path.exists(gcp_creds_path):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = gcp_creds_path
        logger.info(f"Set GOOGLE_APPLICATION_CREDENTIALS to: {gcp_creds_path}")
    else:
        logger.warning(f"Google credentials file not found at: {gcp_creds_path}")

# Required envs
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_REGION = os.getenv("S3_REGION", "eu-north-1")
S3_OCR_RESULTS_BUCKET = os.getenv("S3_OCR_RESULTS_BUCKET")  # optional for async workflows

# Local base path where files are stored
DEFAULT_BASE_PATH = Path(__file__).resolve().parent.parent / "ScholarVault_Data"
BASE_PATH = os.getenv("SCHOLARVAULT_BASE_PATH", str(DEFAULT_BASE_PATH))

# Constants
SYNC_LIMIT = 40 * 1024 * 1024      # Vision inline payload limit: 40 MB
DEFAULT_CHUNK_PAGES = 5           # starting chunk pages for PDFs
CHUNK_MIN_PAGES = 1
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.5          # seconds, exponential backoff multiplier
HTTP_TIMEOUT = 120                # seconds for requests
MAX_WORKERS = 2                   # Parallel upload/OCR workers (reduced for Windows socket stability)
VALID_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'gif', 'pdf'}
OCR_BATCH_SIZE = 10               # Process N files concurrently for OCR
OCR_MIN_CONFIDENCE = 0.3          # Minimum confidence threshold for OCR results
OCR_TEXT_MIN_LENGTH = 10          # Minimum characters to consider valid OCR

# Logging configuration
LOG_LEVEL = os.getenv("SCHOLARVAULT_LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    stream=sys.stdout,
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("scholarvault")

# Global state for dry-run mode
DRY_RUN = False
FORCE_OCR = False  # Force re-OCR even if exists
STATS = {"total": 0, "success": 0, "skipped": 0, "failed": 0}

def validate_startup():
    """Validate all startup requirements before starting migration."""
    errors = []
    
    # Check environment variables
    if not SUPABASE_URL:
        errors.append("SUPABASE_URL not set")
    if not SUPABASE_KEY:
        errors.append("SUPABASE_KEY not set")
    if not AWS_ACCESS_KEY_ID:
        errors.append("AWS_ACCESS_KEY_ID not set")
    if not AWS_SECRET_ACCESS_KEY:
        errors.append("AWS_SECRET_ACCESS_KEY not set")
    if not S3_BUCKET_NAME:
        errors.append("S3_BUCKET_NAME not set")
    
    # Check base path exists
    if not os.path.isdir(BASE_PATH):
        errors.append(f"BASE_PATH does not exist: {BASE_PATH}")
    
    # Check Google credentials
    if "GOOGLE_APPLICATION_CREDENTIALS" not in os.environ:
        errors.append("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
    
    if errors:
        logger.error("❌ Startup validation failed:")
        for err in errors:
            logger.error("   - %s", err)
        sys.exit(1)
    
    logger.info("✅ Startup validation passed")

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
    # Configure boto3 with connection pooling settings for better stability
    from botocore.config import Config
    config = Config(
        max_pool_connections=10,
        retries={'max_attempts': 3, 'mode': 'adaptive'},
        connect_timeout=30,
        read_timeout=120
    )
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        config=config
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

def build_s3_key(path_parts: List[str], filename: str) -> str:
    """
    Build S3 key given path parts and filename.
    Expected path parts: [Branch, Year/Semester, Subject, ResourceType, ...]
    Format: {branch}/{year}/{subject}/{resource_type}/{filename}
    """
    try:
        year_component = int(''.join(filter(str.isdigit, path_parts[1])))
    except (ValueError, IndexError):
        year_component = path_parts[1] if len(path_parts) > 1 else "unknown"
    
    branch = path_parts[0]
    subject = path_parts[2] if len(path_parts) > 2 else "unknown"
    resource_type = path_parts[3] if len(path_parts) > 3 else "Notes"
    
    return f"{branch}/{year_component}/{subject}/{resource_type}/{filename}"

def build_file_url(path_parts: List[str], filename: str) -> str:
    """Build S3 URL from S3 key."""
    s3_key = build_s3_key(path_parts, filename)
    return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{s3_key}"

def build_subject_id(path_parts: List[str]) -> str:
    branch = path_parts[0]
    try:
        year = int(''.join(filter(str.isdigit, path_parts[1])))
    except (ValueError, IndexError):
        year = path_parts[1] if len(path_parts) > 1 else "unknown"
    subject_name = path_parts[2] if len(path_parts) > 2 else "unknown"
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
    semester = path_parts[1] if len(path_parts) > 1 else "unknown"
    name = path_parts[2] if len(path_parts) > 2 else "unknown"
    
    if DRY_RUN:
        logger.info("[DRY-RUN] Would insert subject: %s (id=%s)", name, subject_id)
        return subject_id
    
    try:
        resp = supabase.table('subjects').select('id').eq('id', subject_id).execute()
        if resp.data:
            return subject_id
    except Exception as e:
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
        logger.warning("Failed to insert subject record (may already exist): %s", e)
    return subject_id

# -------------------- OCR LOGIC --------------------
def clean_ocr_text(raw_text: str) -> str:
    """
    Clean and normalize OCR output.
    - Remove excessive whitespace
    - Fix common OCR artifacts
    - Preserve paragraph structure
    """
    if not raw_text:
        return None
    
    # Remove null characters and control characters
    text = ''.join(char for char in raw_text if ord(char) >= 32 or char in '\n\t\r')
    
    # Fix multiple spaces
    text = ' '.join(text.split())
    
    # Fix multiple newlines (keep max 2)
    while '\n\n\n' in text:
        text = text.replace('\n\n\n', '\n\n')
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text if len(text) >= OCR_TEXT_MIN_LENGTH else None

def extract_text_from_image_bytes(content_bytes: bytes, filename: str = "") -> Optional[str]:
    """
    Enhanced image OCR with document text detection.
    Uses DOCUMENT_TEXT_DETECTION for better accuracy on scanned/printed text.
    """
    if vision_client is None:
        raise RuntimeError("Vision client not initialized")
    
    try:
        # Use DOCUMENT_TEXT_DETECTION for better accuracy on documents
        image = vision.Image(content=content_bytes)
        
        # Try document text detection first (better for scans/books)
        response = vision_client.document_text_detection(image=image, timeout=120)
        
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        # Extract full text with structure
        if response.full_text_annotation:
            text = response.full_text_annotation.text
            
            # Calculate confidence from all blocks
            confidence_scores = []
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    for paragraph in block.paragraphs:
                        for word in paragraph.words:
                            for symbol in word.symbols:
                                if symbol.confidence > 0:
                                    confidence_scores.append(symbol.confidence)
            
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            # Log confidence
            if avg_confidence < OCR_MIN_CONFIDENCE:
                logger.warning("Low OCR confidence (%.2f%%) for %s - may need manual review",
                              avg_confidence * 100, filename)
            
            # Clean and return
            cleaned = clean_ocr_text(text)
            if cleaned:
                logger.info("OCR completed for %s (confidence: %.1f%%, %d chars)",
                           filename, avg_confidence * 100, len(cleaned))
            return cleaned
        
        return None
        
    except gcloud_exceptions.GoogleAPICallError as e:
        logger.exception("Google API call error during image OCR: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error during image OCR: %s", e)
        raise

def extract_text_from_pdf_bytes(content_bytes: bytes, filename: str = "") -> Optional[str]:
    """
    Enhanced PDF OCR with batch processing and page-level error handling.
    """
    if vision_client is None:
        raise RuntimeError("Vision client not initialized")
    
    try:
        input_config = vision.InputConfig(content=content_bytes, mime_type='application/pdf')
        features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
        request = vision.AnnotateFileRequest(input_config=input_config, features=features)
        
        response = vision_client.batch_annotate_files(requests=[request], timeout=300)
        
        # Extract text with confidence tracking
        full_text = ""
        page_count = 0
        confidence_scores = []
        
        if response.responses and len(response.responses) > 0:
            pages = response.responses[0].responses if response.responses[0].responses else []
            
            for page_idx, page in enumerate(pages, 1):
                page_count += 1
                
                if page.full_text_annotation:
                    text = page.full_text_annotation.text
                    full_text += text + "\n\n"
                    
                    # Calculate per-page confidence
                    for block in page.full_text_annotation.pages:
                        for b in block.blocks:
                            for paragraph in b.paragraphs:
                                for word in paragraph.words:
                                    for symbol in word.symbols:
                                        if symbol.confidence > 0:
                                            confidence_scores.append(symbol.confidence)
                else:
                    logger.debug("No text found on page %d of %s", page_idx, filename)
        
        # Clean result
        cleaned = clean_ocr_text(full_text)
        
        # Log statistics
        if confidence_scores:
            avg_conf = sum(confidence_scores) / len(confidence_scores)
            logger.info("PDF OCR completed: %s | Pages: %d | Confidence: %.1f%% | Text: %d chars",
                       filename, page_count, avg_conf * 100, len(cleaned) if cleaned else 0)
        
        return cleaned if cleaned else None
        
    except gcloud_exceptions.RetryError as e:
        logger.exception("Retry error during PDF OCR: %s", e)
        raise
    except gcloud_exceptions.GoogleAPICallError as e:
        logger.exception("Google API call error during PDF OCR: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error during PDF OCR: %s", e)
        raise

def extract_text_sync(content_bytes: bytes, mime_type: str, filename: str = "") -> Optional[str]:
    """
    Master sync OCR function with enhanced routing and error handling.
    """
    try:
        if mime_type.startswith("image/"):
            return extract_text_from_image_bytes(content_bytes, filename)
        elif mime_type == "application/pdf":
            return extract_text_from_pdf_bytes(content_bytes, filename)
        else:
            logger.warning("Unsupported MIME for OCR: %s", mime_type)
            return None
    except Exception as e:
        logger.warning("Error in sync OCR for %s: %s", filename, e)
        return None

def dynamic_chunk_and_ocr_pdf(pdf_bytes: bytes, filename: str = "", start_chunk_pages=DEFAULT_CHUNK_PAGES) -> Optional[str]:
    """
    Enhanced PDF chunking with better error handling and performance.
    Intelligently chunks large PDFs to avoid Vision API limits.
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
    total_chunks = 0
    successful_chunks = 0

    while page_idx < total_pages:
        end_page = min(page_idx + chunk_pages, total_pages)
        writer = PdfWriter()
        
        try:
            for p in range(page_idx, end_page):
                writer.add_page(pdf_reader.pages[p])

            buf = io.BytesIO()
            writer.write(buf)
            buf.seek(0)
            chunk_size = len(buf.getbuffer())
            total_chunks += 1
            
            # If chunk too large, reduce pages until under limit or pages==1
            if chunk_size > SYNC_LIMIT and chunk_pages > CHUNK_MIN_PAGES:
                old_chunk_pages = chunk_pages
                chunk_pages = max(CHUNK_MIN_PAGES, chunk_pages // 2)
                logger.info("Chunk of pages %d-%d is %s (> %s). Reducing chunk pages %d -> %d",
                           page_idx + 1, end_page, human_readable_size(chunk_size), 
                           human_readable_size(SYNC_LIMIT), old_chunk_pages, chunk_pages)
                continue

            # If still too large and chunk_pages == 1, skip with warning
            if chunk_size > SYNC_LIMIT and chunk_pages == CHUNK_MIN_PAGES:
                logger.warning("Single page chunk size (%s) exceeds Vision limit; skipping pages %d-%d",
                              human_readable_size(chunk_size), page_idx + 1, end_page)
                page_idx = end_page
                continue

            # Process this chunk
            logger.debug("Processing PDF chunk: pages %d-%d of %d (%s)",
                        page_idx + 1, end_page, total_pages, human_readable_size(chunk_size))
            
            text = extract_text_sync(buf.getvalue(), 'application/pdf', 
                                    f"{filename} (pages {page_idx + 1}-{end_page})")
            
            if text:
                gathered_text += text + "\n\n"
                successful_chunks += 1
            else:
                logger.info("No text found on pages %d-%d of %s", page_idx + 1, end_page, filename)

            page_idx = end_page
            
            # Gradually increase chunk_pages after successful processing
            if chunk_pages < start_chunk_pages:
                chunk_pages = min(start_chunk_pages, chunk_pages * 2)
                
        except Exception as e:
            logger.exception("Error processing chunk (pages %d-%d): %s", page_idx + 1, end_page, e)
            page_idx = end_page
            continue

    logger.info("PDF chunking completed for %s: %d chunks processed, %d successful",
               filename, total_chunks, successful_chunks)
    
    return clean_ocr_text(gathered_text) if gathered_text else None

# -------------------- S3 HELPERS --------------------
def get_s3_metadata(filename: str) -> Dict[str, str]:
    """
    Generate standardized S3 metadata based on file type.
    Applies proper Content-Type, Content-Disposition, and Cache-Control headers.
    """
    ext = filename.lower().split('.')[-1]
    
    # Determine MIME type
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    
    # PDF: Display inline in browser
    if ext == 'pdf':
        return {
            'ContentType': 'application/pdf',
            'ContentDisposition': 'inline',
            'CacheControl': 'public, max-age=2592000',  # 30 days
            'Metadata': {
                'archive-type': 'document',
                'display-mode': 'inline'
            }
        }
    
    # Images: Display inline, cache long
    if ext in {'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'svg'}:
        return {
            'ContentType': mime_type,
            'ContentDisposition': 'inline',
            'CacheControl': 'public, max-age=31536000',  # 1 year
            'Metadata': {
                'archive-type': 'image',
                'display-mode': 'inline'
            }
        }
    
    # Default: Download
    return {
        'ContentType': mime_type,
        'ContentDisposition': 'attachment',
        'CacheControl': 'public, max-age=604800',  # 7 days
        'Metadata': {
            'archive-type': 'file',
            'display-mode': 'download'
        }
    }

def s3_upload_file(local_path: str, bucket: str, key: str, metadata: Dict = None) -> None:
    """Upload file to S3 with proper metadata."""
    if s3_client is None:
        raise RuntimeError("S3 client not initialized")
    
    if DRY_RUN:
        logger.info("[DRY-RUN] Would upload to S3: s3://%s/%s", bucket, key)
        return
    
    filename = os.path.basename(local_path)
    if metadata is None:
        metadata = get_s3_metadata(filename)
    
    def _upload():
        extra_args = {
            'ContentType': metadata['ContentType'],
            'ContentDisposition': metadata['ContentDisposition'],
            'CacheControl': metadata['CacheControl'],
        }
        if metadata.get('Metadata'):
            extra_args['Metadata'] = metadata['Metadata']
        
        s3_client.upload_file(local_path, bucket, key, ExtraArgs=extra_args)
        logger.debug("S3 upload complete: %s", key)
    
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

def note_needs_ocr_update(s3_url: str) -> bool:
    """Check if note needs OCR update (no OCR yet or forced update)."""
    if FORCE_OCR:
        return True  # Always update if force flag set
    
    if not supabase:
        return False
    
    try:
        resp = supabase.table('notes').select('is_ocr_done').eq('s3_url', s3_url).limit(1).execute()
        if resp.data:
            return not resp.data[0].get('is_ocr_done', True)
        return False
    except Exception as e:
        logger.warning("OCR check failed for %s: %s", s3_url, e)
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
    
    if DRY_RUN:
        logger.info("[DRY-RUN] Would insert note: %s", metadata.get('file_name'))
        return
    
    try:
        supabase.table('notes').insert(metadata).execute()
    except Exception as e:
        # Check if it's a duplicate key error
        error_str = str(e)
        if 'duplicate key' in error_str.lower() or '23505' in error_str:
            # This is a duplicate - treat as already exists
            logger.info("Note already exists (caught duplicate): %s", metadata.get('file_name'))
            raise DuplicateRecordError(f"Duplicate: {metadata.get('file_name')}")
        logger.exception("Failed to insert note record into Supabase: %s", e)
        raise

def update_note_ocr(note_id: str, ocr_text: str):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    
    if DRY_RUN:
        logger.info("[DRY-RUN] Would update OCR for note: %s", note_id)
        return
    
    try:
        supabase.table('notes').update({'ocr_text': ocr_text, 'is_ocr_done': True}).eq('id', note_id).execute()
    except Exception as e:
        logger.exception("Failed to update OCR text for note %s: %s", note_id, e)
        raise

def insert_book_record(metadata: Dict):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    
    if DRY_RUN:
        logger.info("[DRY-RUN] Would insert book: %s", metadata.get('file_name'))
        return
    
    try:
        supabase.table('books').insert(metadata).execute()
    except Exception as e:
        logger.exception("Failed to insert book record into Supabase: %s", e)
        raise

# -------------------- MODE IMPLEMENTATIONS --------------------
def collect_files_from_path(exclude_books: bool = False) -> List[Tuple[str, str, List[str]]]:
    """
    Collect all valid files from BASE_PATH.
    Returns list of (root, filename, path_parts) tuples.
    """
    all_files = []
    
    if not os.path.isdir(BASE_PATH):
        logger.error("Base path does not exist: %s", BASE_PATH)
        return all_files
    
    for root, dirs, files in os.walk(BASE_PATH):
        for filename in files:
            path_parts = root.replace(BASE_PATH, "").strip(os.sep).split(os.sep)
            
            # Validate path structure
            if not path_parts or len(path_parts) < 3:
                continue
            
            # Skip Books folder if requested
            if exclude_books and len(path_parts) > 3 and path_parts[3] == 'Books':
                continue
            
            # Filter by valid extensions
            ext = filename.lower().split('.')[-1]
            if ext not in VALID_EXTENSIONS:
                continue
            
            all_files.append((root, filename, path_parts))
    
    return all_files

def process_file(file_tuple: Tuple[str, str, List[str]], mode: str) -> Dict:
    """
    Process a single file (upload + OCR if requested).
    Returns status dict with keys: success, reason, filename
    """
    root, filename, path_parts = file_tuple
    result = {"success": False, "reason": "", "filename": filename}
    
    try:
        file_path = os.path.join(root, filename)
        file_size = os.path.getsize(file_path)
        file_url = build_file_url(path_parts, filename)
        s3_key = build_s3_key(path_parts, filename)
        
        # Check if already exists
        is_note = mode != "books"
        exists_checker = note_exists_in_db if is_note else book_exists_in_db
        
        if exists_checker(file_url):
            result["reason"] = "already_exists"
            return result
        
        # Upload to S3
        logger.info("Uploading: %s (%s)", filename, human_readable_size(file_size))
        s3_upload_file(file_path, S3_BUCKET_NAME, s3_key)
        
        if DRY_RUN:
            result["success"] = True
            result["reason"] = "dry_run"
            return result
        
        # Get subject ID
        subject_id = ensure_subject_record(path_parts)
        
        # Prepare metadata
        base_metadata = {
            'id': str(uuid.uuid4()),
            'subject_id': subject_id,
            'branch': path_parts[0],
            'semester': path_parts[1] if len(path_parts) > 1 else "unknown",
            'subject': path_parts[2] if len(path_parts) > 2 else "unknown",
            'file_name': filename,
            's3_url': file_url,
        }
        
        # Handle OCR if needed
        if mode == "notes_with_ocr":
            ext = filename.lower().split('.')[-1]
            extracted_text = None
            
            # Determine if we need dynamic chunking
            if ext == 'pdf' and file_size > SYNC_LIMIT:
                logger.info("Large PDF detected — using dynamic chunk OCR")
                with open(file_path, "rb") as f:
                    file_bytes = f.read()
                extracted_text = dynamic_chunk_and_ocr_pdf(file_bytes)
            else:
                with open(file_path, "rb") as f:
                    content = f.read()
                mime = 'application/pdf' if ext == 'pdf' else f'image/{ext if ext != "jpg" else "jpeg"}'
                extracted_text = extract_text_sync(content, mime)
            
            base_metadata['ocr_text'] = extracted_text
            base_metadata['is_ocr_done'] = bool(extracted_text)
        else:
            # Notes without OCR
            if mode == "notes_no_ocr":
                base_metadata['ocr_text'] = None
                base_metadata['is_ocr_done'] = False
        
        # Insert record
        if mode == "books":
            insert_book_record(base_metadata)
        else:
            insert_note_record(base_metadata)
        
        result["success"] = True
        logger.info("✅ Processed: %s", filename)
        return result
        
    except DuplicateRecordError:
        # Handle duplicate records gracefully - treat as already exists
        result["reason"] = "already_exists_duplicate"
        result["success"] = False
        logger.debug("Duplicate record detected for: %s", filename)
        return result
    except Exception as e:
        logger.exception("Error processing %s: %s", filename, e)
        result["reason"] = str(e)[:200]  # Increased from 50 to 200 for better error details
        result["error_details"] = str(e)
        return result

def migrate_with_mode(mode: str):
    """
    Unified migration function supporting all modes.
    Modes: 'notes_with_ocr', 'notes_no_ocr', 'books'
    """
    logger.info("=" * 80)
    logger.info("Starting migration mode: %s", mode.upper())
    logger.info("=" * 80)
    
    exclude_books = (mode != "books")
    all_files = collect_files_from_path(exclude_books=exclude_books)
    
    if not all_files:
        logger.warning("No files found to process.")
        return
    
    total_files = len(all_files)
    logger.info("Found %d files to process", total_files)
    
    start_time = time.time()
    success = skipped = failed = 0
    
    # Parallel processing
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_file, file_tuple, mode): file_tuple 
            for file_tuple in all_files
        }
        
        completed = 0
        failed_files = []  # Track failed files for detailed reporting
        for future in as_completed(futures):
            completed += 1
            try:
                result = future.result()
                if result["success"]:
                    success += 1
                elif result["reason"] in ["already_exists", "already_exists_duplicate"]:
                    skipped += 1
                else:
                    failed += 1
                    # Log detailed failure information
                    failed_info = {
                        "filename": result.get("filename", "unknown"),
                        "reason": result.get("reason", "unknown"),
                        "details": result.get("error_details", "no details available")
                    }
                    failed_files.append(failed_info)
                    logger.error("❌ FAILED: %s - Reason: %s", failed_info["filename"], failed_info["reason"])
                
                # Progress
                fraction = completed / total_files
                percent = round(fraction * 100, 2)
                logger.info("Progress: %d/%d (%.1f%%) | Success: %d | Skipped: %d | Failed: %d",
                           completed, total_files, percent, success, skipped, failed)
                
            except Exception as e:
                logger.exception("Future error: %s", e)
                failed += 1
    
    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("=" * 80)
    logger.info("Migration complete: Total=%d | Success=%d | Skipped=%d | Failed=%d | Time=%.2f min",
               total_files, success, skipped, failed, elapsed)
    logger.info("=" * 80)
    
    # Report failed files if any
    if failed > 0 and failed_files:
        logger.error("\n" + "=" * 80)
        logger.error("FAILED FILES SUMMARY (%d total):", failed)
        logger.error("=" * 80)
        for idx, fail in enumerate(failed_files, 1):
            logger.error("%d. %s", idx, fail["filename"])
            logger.error("   Reason: %s", fail["reason"])
            if fail.get("details"):
                logger.error("   Details: %s", fail["details"][:200])
        logger.error("=" * 80 + "\n")

def update_old_notes_with_ocr():
    """
    Find notes without OCR text and update them.
    If FORCE_OCR=True, re-processes all notes including those with existing OCR.
    The RPC should return objects with 'id' and 's3_url'.
    """
    logger.info("=" * 80)
    if FORCE_OCR:
        logger.info("Starting: Force Re-OCR All Notes (replacing existing OCR)")
    else:
        logger.info("Starting: Update Old Notes with OCR")
    logger.info("=" * 80)
    
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    
    try:
        if FORCE_OCR:
            # Get all notes regardless of OCR status
            resp = supabase.table('notes').select('id, s3_url').execute()
        else:
            # Get only notes without OCR
            resp = supabase.rpc('get_notes_to_update_ocr', {}).execute()
    except Exception as e:
        logger.exception("Supabase RPC/select failed: %s", e)
        return

    notes = resp.data if resp and resp.data else []
    if not notes:
        logger.info("No notes require OCR update.")
        return

    total_notes = len(notes)
    logger.info("Found %d notes to process (FORCE_OCR=%s)", total_notes, FORCE_OCR)
    
    start_time = time.time()
    success = skipped = failed = 0

    def update_single_note(note: Dict) -> Dict:
        """Update a single note with OCR - enhanced version."""
        note_id = note.get('id')
        s3_url = note.get('s3_url')
        
        result = {"success": False, "note_id": note_id, "s3_url": s3_url}
        
        if not s3_url:
            logger.warning("Note %s missing s3_url", note_id)
            return result
        
        try:
            logger.debug("Downloading %s", s3_url)
            content = s3_get_bytes_from_url(s3_url)
            if not content:
                logger.warning("Failed to download: %s", s3_url)
                return result

            # Determine file extension and MIME type
            file_extension = s3_url.split('.')[-1].lower()
            mime_type = 'application/pdf' if file_extension == 'pdf' else f'image/{file_extension if file_extension != "jpg" else "jpeg"}'
            
            # Extract filename for logging
            filename = s3_url.split('/')[-1]
            logger.info("Processing OCR for: %s (%s)", filename, mime_type)

            extracted_text = None
            file_size = len(content)
            
            # Smart processing based on file size and type
            if file_extension == 'pdf' and file_size > SYNC_LIMIT:
                logger.info("Large PDF (%s) - using dynamic chunking", human_readable_size(file_size))
                extracted_text = dynamic_chunk_and_ocr_pdf(content, filename=filename, 
                                                          start_chunk_pages=DEFAULT_CHUNK_PAGES)
            else:
                logger.info("Processing %s (%s) with direct OCR", filename, human_readable_size(file_size))
                extracted_text = extract_text_sync(content, mime_type, filename)

            if extracted_text:
                logger.info("✅ OCR extracted %d characters from: %s", len(extracted_text), filename)
                update_note_ocr(note_id, extracted_text)
                result["success"] = True
                logger.info("Updated database for: %s", filename)
            else:
                logger.warning("⚠️  No text extracted from: %s", filename)

        except Exception as e:
            logger.exception("Error processing note %s (%s): %s", note_id, s3_url, e)
        
        return result

    # Parallel processing with better concurrency
    processed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(update_single_note, note): note 
            for note in notes
        }
        
        for future in as_completed(futures):
            processed += 1
            try:
                result = future.result()
                if result["success"]:
                    success += 1
                else:
                    failed += 1
                
                percent = round((processed / total_notes) * 100, 2)
                logger.info("Progress: %d/%d (%.1f%%) | Success: %d | Failed: %d | URL: %s",
                           processed, total_notes, percent, success, failed, result.get("s3_url", "")[:50])
                
            except Exception as e:
                logger.exception("Future error: %s", e)
                failed += 1

    elapsed = round((time.time() - start_time) / 60, 2)
    logger.info("=" * 80)
    logger.info("OCR Update complete: Total=%d | Success=%d | Failed=%d | Time=%.2f min",
               total_notes, success, failed, elapsed)
    logger.info("=" * 80)

# -------------------- CLI / ENTRYPOINT --------------------
def interactive_menu():
    """Interactive menu for selecting migration mode."""
    menu = """
╔════════════════════════════════════════╗
║    ScholarVault Migration Tool         ║
╚════════════════════════════════════════╝

Select Mode:
  1. Migrate Notes (with OCR)
  2. Migrate Notes (without OCR)
  3. Migrate Books (no OCR)
  4. Update Old Notes with OCR
  5. Force Re-OCR All Notes (replace existing)
  6. Exit

Enter choice (1-6): """
    
    while True:
        try:
            choice = input(menu).strip()
            if choice == '1':
                migrate_with_mode('notes_with_ocr')
            elif choice == '2':
                migrate_with_mode('notes_no_ocr')
            elif choice == '3':
                migrate_with_mode('books')
            elif choice == '4':
                update_old_notes_with_ocr()
            elif choice == '5':
                global FORCE_OCR
                FORCE_OCR = True
                logger.warning("⚠️  FORCE-OCR MODE: Will replace all existing OCR data")
                time.sleep(2)
                update_old_notes_with_ocr()
            elif choice == '6':
                logger.info("Exiting. Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please enter 1-6.")
        except KeyboardInterrupt:
            logger.info("\nExiting on user interrupt.")
            break
        except Exception as e:
            logger.exception("Error in menu: %s", e)

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="ScholarVault Migration & OCR Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python master_migration.py --mode notes_with_ocr
  python master_migration.py --mode books --dry-run
  python master_migration.py --mode update_ocr --workers 2
  python master_migration.py --mode update_ocr --force-ocr  (replace all OCR)
        """)
    parser.add_argument('--mode', type=str, 
                       choices=['notes_with_ocr', 'notes_no_ocr', 'books', 'update_ocr'],
                       help="Migration mode")
    parser.add_argument('--base-path', type=str, default=BASE_PATH, 
                       help="Local base data path")
    parser.add_argument('--chunk-pages', type=int, default=DEFAULT_CHUNK_PAGES, 
                       help="Initial PDF chunk pages (default: 5)")
    parser.add_argument('--workers', type=int, default=MAX_WORKERS,
                       help="Number of parallel workers (default: 4)")
    parser.add_argument('--dry-run', action='store_true', 
                       help="Simulate run without actual uploads/inserts")
    parser.add_argument('--force-ocr', action='store_true',
                       help="Force re-OCR all notes (replace existing OCR data)")
    parser.add_argument('--log-level', type=str, default=LOG_LEVEL,
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help="Logging level")
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Update globals
    global BASE_PATH, DEFAULT_CHUNK_PAGES, MAX_WORKERS, DRY_RUN, FORCE_OCR
    BASE_PATH = args.base_path
    DEFAULT_CHUNK_PAGES = args.chunk_pages
    MAX_WORKERS = args.workers
    DRY_RUN = args.dry_run
    FORCE_OCR = args.force_ocr
    
    # Update logger level
    logger.setLevel(getattr(logging, args.log_level.upper(), logging.INFO))
    
    # Validate startup
    validate_startup()
    
    if DRY_RUN:
        logger.warning("⚠️  DRY-RUN MODE ENABLED ⚠️")
        logger.warning("No actual uploads or database changes will be made.")
        time.sleep(2)
    
    if FORCE_OCR:
        logger.warning("⚠️  FORCE-OCR MODE ENABLED ⚠️")
        logger.warning("All existing OCR data will be replaced with new OCR results.")
        time.sleep(2)
    
    if args.mode:
        mode = args.mode.lower()
        if mode == 'update_ocr':
            update_old_notes_with_ocr()
        else:
            migrate_with_mode(mode)
    else:
        interactive_menu()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.warning("\nInterrupted by user. Exiting.")
        sys.exit(0)
    except Exception as e:
        logger.exception("Fatal error: %s", e)
        sys.exit(1)

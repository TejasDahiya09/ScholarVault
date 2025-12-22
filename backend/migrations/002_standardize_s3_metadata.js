#!/usr/bin/env node
/**
 * Migration: S3 Upload Metadata Standardization
 * 
 * This script ensures all documents uploaded to S3 have correct metadata:
 * - Content-Type: Detected from file extension
 * - Content-Disposition: "inline" (for PDFs/images to display in browser)
 * - Cache-Control: Optimized for different file types
 * - Custom metadata tags for tracking
 * 
 * Run: node migrations/002_standardize_s3_metadata.js
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import mime from "mime-types";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;

/**
 * Standard metadata configurations by file type
 */
const metadataConfig = {
  pdf: {
    ContentType: "application/pdf",
    ContentDisposition: "inline",
    CacheControl: "public, max-age=2592000", // 30 days
    Metadata: {
      "archive-type": "document",
      "display-mode": "inline"
    }
  },
  image: {
    ContentType: null, // Will be auto-detected
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000", // 1 year
    Metadata: {
      "archive-type": "image",
      "display-mode": "inline"
    }
  },
  default: {
    ContentType: "application/octet-stream",
    ContentDisposition: "attachment",
    CacheControl: "public, max-age=604800", // 7 days
    Metadata: {
      "archive-type": "file",
      "display-mode": "download"
    }
  }
};

/**
 * Determine metadata config for a file
 */
function getMetadataConfig(key) {
  const ext = key.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    return metadataConfig.pdf;
  }
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return metadataConfig.image;
  }
  
  return metadataConfig.default;
}

/**
 * Apply standardized metadata to a single S3 object
 */
async function standardizeObjectMetadata(key) {
  try {
    const config = getMetadataConfig(key);
    const contentType = config.ContentType || mime.lookup(key) || "application/octet-stream";
    
    console.log(`\n   📄 ${key}`);
    console.log(`      Content-Type: ${contentType}`);
    console.log(`      Disposition: ${config.ContentDisposition}`);
    console.log(`      Cache: ${config.CacheControl}`);

    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: key,
      ContentType: contentType,
      ContentDisposition: config.ContentDisposition,
      CacheControl: config.CacheControl,
      Metadata: config.Metadata,
      MetadataDirective: "REPLACE",
    });

    await s3Client.send(copyCommand);
    console.log(`      ✅ Standardized`);
    return true;
  } catch (err) {
    console.error(`      ❌ Error: ${err.message}`);
    return false;
  }
}

/**
 * Main migration: fix all existing documents
 */
async function migrateAllDocuments() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔧 S3 Metadata Standardization Migration`);
  console.log(`📦 Bucket: ${bucket}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // Fetch all notes from database
    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, file_name, s3_url");

    if (error) {
      console.error("❌ Database error:", error);
      return;
    }

    console.log(`📋 Found ${notes.length} documents to standardize\n`);
    console.log(`Processing:\n`);

    let success = 0;
    let failed = 0;

    for (const note of notes) {
      if (!note.s3_url) {
        console.log(`   ⏭️  Skipped (no S3 URL): ${note.file_name}`);
        continue;
      }

      // Extract S3 key from URL: https://bucket.s3.amazonaws.com/KEY
      const key = decodeURIComponent(note.s3_url.split('.amazonaws.com/')[1]);
      
      const result = await standardizeObjectMetadata(key);
      if (result) success++;
      else failed++;
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Migration Summary`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   ✅ Standardized: ${success}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${notes.length}\n`);

    if (failed === 0) {
      console.log(`✨ All documents now have standardized metadata!\n`);
    } else {
      console.log(`⚠️  Some documents failed. Retry with: node migrations/002_standardize_s3_metadata.js\n`);
    }

  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

/**
 * Verify metadata for a single document (utility)
 */
async function verifyMetadata(s3Url) {
  try {
    const key = decodeURIComponent(s3Url.split('.amazonaws.com/')[1]);
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    console.log(`\n✅ Document Metadata Verification`);
    console.log(`   File: ${key}`);
    console.log(`   Content-Type: ${response.ContentType}`);
    console.log(`   Disposition: ${response.ContentDisposition || "(not set)"}`);
    console.log(`   Cache-Control: ${response.CacheControl || "(not set)"}`);
    console.log(`   Custom Metadata:`, response.Metadata || "(none)");
    
    const config = getMetadataConfig(key);
    if (response.ContentDisposition === config.ContentDisposition) {
      console.log(`   ✅ Metadata is correct\n`);
    } else {
      console.log(`   ❌ Metadata needs update\n`);
    }
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
  }
}

// Run migration
migrateAllDocuments().catch(console.error);

// Export for use in other scripts
export { getMetadataConfig, standardizeObjectMetadata, verifyMetadata };

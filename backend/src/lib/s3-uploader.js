/**
 * S3 Upload Utility with Standardized Metadata
 * 
 * This module ensures all files uploaded to S3 automatically have:
 * - Correct Content-Type based on file extension
 * - Proper Content-Disposition for browser display
 * - Optimized Cache-Control headers
 * - Custom metadata for document tracking
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;

/**
 * Metadata configurations by document type
 */
const metadataConfigs = {
  document: {
    ContentDisposition: "inline",
    CacheControl: "public, max-age=2592000", // 30 days
    archiveType: "document",
  },
  image: {
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000", // 1 year
    archiveType: "image",
  },
  video: {
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000", // 1 year
    archiveType: "video",
  },
  default: {
    ContentDisposition: "attachment",
    CacheControl: "public, max-age=604800", // 7 days
    archiveType: "file",
  },
};

/**
 * Determine document type and metadata config
 */
function getUploadConfig(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const mimeType = mime.lookup(filename) || "application/octet-stream";

  let config;
  
  if (ext === "pdf" || mimeType.includes("pdf")) {
    config = metadataConfigs.document;
  } else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    config = metadataConfigs.image;
  } else if (["mp4", "avi", "mov", "mkv", "webm"].includes(ext)) {
    config = metadataConfigs.video;
  } else {
    config = metadataConfigs.default;
  }

  return {
    ContentType: mimeType,
    ContentDisposition: config.ContentDisposition,
    CacheControl: config.CacheControl,
    Metadata: {
      "archive-type": config.archiveType,
      "upload-date": new Date().toISOString(),
    },
  };
}

/**
 * Upload a file to S3 with standardized metadata
 * 
 * @param {string} key - S3 key path (e.g., "users/123/notes/file.pdf")
 * @param {Buffer|Stream} body - File contents
 * @param {string} filename - Original filename (for content-type detection)
 * @param {object} customMetadata - Additional metadata to include
 * @returns {Promise<object>} - Upload result with URL
 */
export async function uploadToS3(key, body, filename, customMetadata = {}) {
  const uploadConfig = getUploadConfig(filename);
  
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: uploadConfig.ContentType,
    ContentDisposition: uploadConfig.ContentDisposition,
    CacheControl: uploadConfig.CacheControl,
    Metadata: {
      ...uploadConfig.Metadata,
      ...customMetadata,
    },
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);

    // Construct public URL
    const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log(`✅ Uploaded: ${filename} → ${key}`);
    console.log(`   Content-Type: ${uploadConfig.ContentType}`);
    console.log(`   Disposition: ${uploadConfig.ContentDisposition}`);

    return {
      success: true,
      key,
      url: s3Url,
      metadata: uploadConfig.Metadata,
      etag: response.ETag,
    };
  } catch (error) {
    console.error(`❌ Upload failed for ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for upload (for direct browser uploads)
 * Client will upload to this URL with correct metadata
 * 
 * @param {string} key - S3 key path
 * @param {string} filename - Original filename
 * @param {number} expiresIn - URL expiration in seconds
 * @returns {Promise<string>} - Pre-signed URL
 */
export async function getPresignedUploadUrl(key, filename, expiresIn = 3600) {
  const uploadConfig = getUploadConfig(filename);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: uploadConfig.ContentType,
    ContentDisposition: uploadConfig.ContentDisposition,
    CacheControl: uploadConfig.CacheControl,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`✅ Generated pre-signed URL for: ${filename}`);
    return url;
  } catch (error) {
    console.error(`❌ Failed to generate pre-signed URL:`, error.message);
    throw error;
  }
}

/**
 * Upload multiple files in batch
 * 
 * @param {Array<object>} files - Array of {key, body, filename}
 * @returns {Promise<object>} - Batch results
 */
export async function batchUploadToS3(files) {
  console.log(`\n📦 Batch Upload: ${files.length} files\n`);

  const results = {
    success: [],
    failed: [],
  };

  for (const file of files) {
    try {
      const result = await uploadToS3(file.key, file.body, file.filename);
      results.success.push(result);
    } catch (error) {
      results.failed.push({
        filename: file.filename,
        error: error.message,
      });
    }
  }

  console.log(`\n📊 Batch Summary:`);
  console.log(`   ✅ Successful: ${results.success.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}\n`);

  return results;
}

export default {
  uploadToS3,
  getPresignedUploadUrl,
  batchUploadToS3,
  getUploadConfig,
};

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config.js";
import s3Client from "../lib/s3.js";

// Helper: normalize S3 key (ensure not URL-encoded)
function normalizeKey(key) {
  if (!key) return "";
  try {
    // If key contains percent-encoding, decode it
    return key.includes("%") ? decodeURIComponent(key) : key;
  } catch {
    return key; // fallback to original if decode fails
  }
}

export const getSignedFileUrl = async (req, res) => {
  try {
    const { key, mode } = req.query;
    if (!key) {
      return res.status(400).json({ error: "Missing required query param: key" });
    }

    const bucket = config.S3_BUCKET || process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;
    if (!bucket) {
      return res.status(500).json({ error: "S3 bucket not configured" });
    }

    const normalizedKey = normalizeKey(String(key));
    const disposition = (mode === "download" ? "attachment" : "inline") + `; filename="${normalizedKey.split('/').pop() || 'file'}"`;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      ResponseContentDisposition: disposition,
    });

    // 1 hour expiry
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return res.json({ url });
  } catch (err) {
    console.error("signed-url error:", err);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }
};

export default { getSignedFileUrl };

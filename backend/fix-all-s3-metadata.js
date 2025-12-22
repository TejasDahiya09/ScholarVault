import { S3Client, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import mime from "mime-types";

dotenv.config();

const s3Client = new S3Client({
  region: "eu-north-1",
  endpoint: "https://s3.eu-north-1.amazonaws.com",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;

console.log(`\n🔧 S3 Metadata Tool`);
console.log(`📦 Bucket: ${bucket}\n`);

function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args.includes("--check") ? "check" : "fix";
  const keyIndex = args.indexOf("--key");
  const limitIndex = args.indexOf("--limit");
  const key = keyIndex !== -1 ? args[keyIndex + 1] : null;
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : null;
  return { mode, key, limit: limit || 5 };
}

async function headMetadata(key) {
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  return s3Client.send(command);
}

async function fixMetadata(key) {
  try {
    const contentType = mime.lookup(key) || "application/octet-stream";
    console.log(`   Fixing: ${key}`);
    console.log(`   Content-Type: ${contentType}`);

    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: key,
      ContentType: contentType,
      ContentDisposition: "inline",
      MetadataDirective: "REPLACE",
    });

    await s3Client.send(copyCommand);
    console.log("   ✅ Fixed\n");
    return true;
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}\n`);
    return false;
  }
}

function extractKeyFromUrl(s3Url) {
  if (!s3Url) return null;
  const parts = s3Url.split(".amazonaws.com/");
  return parts[1] ? decodeURIComponent(parts[1]) : null;
}

async function checkKey(key) {
  try {
    const meta = await headMetadata(key);
    console.log(`🔍 ${key}`);
    console.log(`   Content-Type: ${meta.ContentType}`);
    console.log(`   Content-Disposition: ${meta.ContentDisposition || "(not set)"}`);
    console.log(`   Size: ${meta.ContentLength} bytes`);
    const isInline = meta.ContentDisposition === "inline";
    console.log(isInline ? "   ✅ inline" : "   ❌ not inline");
    console.log();
    return isInline;
  } catch (err) {
    console.error(`❌ Error checking ${key}: ${err.message}`);
    return false;
  }
}

async function checkSample(limit) {
  const { data: notes, error } = await supabase.from("notes").select("s3_url").limit(limit);
  if (error) {
    console.error("❌ Database error:", error);
    return;
  }
  console.log(`📝 Checking first ${notes.length} notes\n`);
  let inlineCount = 0;
  for (const note of notes) {
    const key = extractKeyFromUrl(note.s3_url);
    if (!key) continue;
    const isInline = await checkKey(key);
    inlineCount += isInline ? 1 : 0;
  }
  console.log(`Summary: inline ${inlineCount}/${notes.length}`);
}

async function fixAll() {
  const { data: notes, error } = await supabase.from("notes").select("s3_url");
  if (error) {
    console.error("❌ Database error:", error);
    return;
  }

  console.log(`📝 Found ${notes.length} notes in database\n`);

  let fixed = 0;
  let failed = 0;

  for (const note of notes) {
    const key = extractKeyFromUrl(note.s3_url);
    if (!key) continue;

    const success = await fixMetadata(key);
    if (success) fixed++;
    else failed++;
  }

  console.log("\n✅ Summary:");
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${notes.length}\n`);
}

async function main() {
  const { mode, key, limit } = parseArgs();

  if (mode === "check") {
    if (key) {
      await checkKey(key);
    } else {
      await checkSample(limit);
    }
    return;
  }

  await fixAll();
}

main().catch(console.error);

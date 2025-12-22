import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,

  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",

  // Redis (Upstash)
  REDIS_URL: process.env.UPSTASH_REDIS_REST_URL,
  REDIS_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  SESSION_TTL_SECONDS: Number(process.env.SESSION_TTL_SECONDS || 1200),

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
    : [],

  // AI/ML
  GOOGLE_APPLICATION_CREDENTIALS: "./vertex-key.json",
  VERTEX_PROJECT: process.env.VERTEX_PROJECT,
  VERTEX_LOCATION: process.env.VERTEX_LOCATION || "us-central1",
  VERTEX_MODEL_ID: process.env.VERTEX_MODEL_ID || "gemini-pro",

  // AWS
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
};

export default config;

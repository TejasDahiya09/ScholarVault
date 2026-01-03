import { createClient } from "@supabase/supabase-js";
import { VertexAI } from "@google-cloud/vertexai";
import config from "../config.js";

/**
 * Backend Supabase client using SERVICE ROLE KEY
 * CRITICAL: This bypasses RLS for backend operations
 * - Uses service role key (NOT anon key)
 * - Required for writes with RLS enabled
 * - Never expose this key to frontend
 */
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // No session persistence needed for API
      autoRefreshToken: false,
    },
  global: {
    headers: {
      'x-application-name': 'scholarvault-api',
    },
  },
  // Connection pooling optimization
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Initialize Vertex AI
process.env.GOOGLE_APPLICATION_CREDENTIALS = config.GOOGLE_APPLICATION_CREDENTIALS;

export const vertex = new VertexAI({
  project: config.VERTEX_PROJECT,
  location: config.VERTEX_LOCATION,
});

export const vertexModel = vertex.getGenerativeModel({
  model: config.VERTEX_MODEL_ID,
});

export default {
  supabase,
  vertex,
  vertexModel,
};

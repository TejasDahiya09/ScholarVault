import { createClient } from "@supabase/supabase-js";
import { VertexAI } from "@google-cloud/vertexai";
import config from "../config.js";

// Initialize Supabase
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

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

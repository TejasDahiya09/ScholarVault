import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getSampleNote() {
  const { data, error } = await supabase
    .from("notes")
    .select("id, file_name, s3_url")
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n📝 Sample notes from database:\n");
  data.forEach((note, i) => {
    console.log(`${i + 1}. ID: ${note.id}`);
    console.log(`   File: ${note.file_name}`);
    console.log(`   S3 URL: ${note.s3_url}`);
    console.log();
  });
}

getSampleNote();

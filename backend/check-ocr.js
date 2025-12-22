import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkOCR() {
  const { data, error } = await supabase
    .from("notes")
    .select("id, file_name, ocr_text")
    .limit(3);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n📝 Checking OCR text availability:\n");
  data.forEach((note, i) => {
    const hasOCR = note.ocr_text && note.ocr_text.trim().length > 0;
    console.log(`${i + 1}. ${note.file_name}`);
    console.log(`   OCR available: ${hasOCR ? '✅ YES' : '❌ NO'}`);
    if (hasOCR) {
      console.log(`   OCR length: ${note.ocr_text.length} characters`);
      console.log(`   Preview: ${note.ocr_text.substring(0, 100)}...`);
    }
    console.log();
  });
}

checkOCR();

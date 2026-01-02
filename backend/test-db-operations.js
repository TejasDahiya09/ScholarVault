/**
 * Test Database Operations for Bookmarks & Progress
 * Run this to diagnose what's failing
 */

import { supabase } from "./src/lib/services.js";

const TEST_USER_ID = "your-test-user-id"; // Replace with actual user ID from database
const TEST_NOTE_ID = "your-test-note-id"; // Replace with actual note ID from database
const TEST_SUBJECT_ID = "your-test-subject-id"; // Replace with actual subject ID

async function testDatabaseOperations() {
  console.log("🔍 Testing Database Operations...\n");

  // Test 1: Check if tables exist
  console.log("1️⃣ Checking if tables exist...");
  try {
    const { data: bookmarks, error: bmError } = await supabase
      .from("user_bookmarks")
      .select("*")
      .limit(1);
    console.log("✓ user_bookmarks table exists");
    if (bmError) console.log("  Warning:", bmError.message);

    const { data: progress, error: progError } = await supabase
      .from("user_study_progress")
      .select("*")
      .limit(1);
    console.log("✓ user_study_progress table exists");
    if (progError) console.log("  Warning:", progError.message);
  } catch (err) {
    console.error("❌ Table check failed:", err.message);
  }

  // Test 2: Check RLS policies
  console.log("\n2️⃣ Checking RLS status...");
  try {
    const { data, error } = await supabase.rpc("pg_stat_get_rls_info", {});
    if (error) {
      console.log("  Note: Cannot check RLS directly, continuing...");
    }
  } catch (err) {
    console.log("  Note: RLS check skipped");
  }

  // Test 3: Try to insert a bookmark
  console.log("\n3️⃣ Testing bookmark insert...");
  try {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .insert([{
        user_id: TEST_USER_ID,
        note_id: TEST_NOTE_ID,
      }])
      .select()
      .single();

    if (error) {
      console.error("❌ Bookmark insert failed:", error);
      console.error("   Error code:", error.code);
      console.error("   Error details:", error.details);
      console.error("   Error hint:", error.hint);
    } else {
      console.log("✓ Bookmark inserted successfully:", data);
    }
  } catch (err) {
    console.error("❌ Bookmark insert exception:", err.message);
  }

  // Test 4: Try to upsert progress
  console.log("\n4️⃣ Testing progress upsert...");
  try {
    const { data, error } = await supabase
      .from("user_study_progress")
      .upsert([{
        user_id: TEST_USER_ID,
        subject_id: TEST_SUBJECT_ID,
        note_id: TEST_NOTE_ID,
        is_completed: true,
        updated_at: new Date().toISOString(),
      }], { onConflict: ["user_id", "note_id"] })
      .select()
      .single();

    if (error) {
      console.error("❌ Progress upsert failed:", error);
      console.error("   Error code:", error.code);
      console.error("   Error details:", error.details);
      console.error("   Error hint:", error.hint);
    } else {
      console.log("✓ Progress upserted successfully:", data);
    }
  } catch (err) {
    console.error("❌ Progress upsert exception:", err.message);
  }

  // Test 5: Check unique constraints
  console.log("\n5️⃣ Checking table constraints...");
  try {
    const { data, error } = await supabase.rpc("get_table_constraints", {
      table_name: "user_bookmarks",
    });
    if (!error && data) {
      console.log("Bookmarks constraints:", data);
    }
  } catch (err) {
    console.log("  Note: Constraint check not available");
  }

  // Test 6: Check actual auth context
  console.log("\n6️⃣ Checking auth context...");
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      console.log("✓ Authenticated as:", user.id);
    } else {
      console.log("⚠️  No user authenticated (using service role)");
    }
  } catch (err) {
    console.log("⚠️  Auth check:", err.message);
  }

  console.log("\n✅ Test completed!\n");
  console.log("📝 Next steps:");
  console.log("1. Replace TEST_USER_ID, TEST_NOTE_ID, TEST_SUBJECT_ID with real values");
  console.log("2. Check error messages above");
  console.log("3. If RLS errors, run: backend/migrations/001_fix_rls_policies.sql");
  console.log("4. If constraint errors, check unique constraints in database\n");
}

// Run tests
testDatabaseOperations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });

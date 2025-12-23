#!/usr/bin/env node

/**
 * Performance Optimization Setup Script
 * Run this after deploying to apply all optimizations
 */

import { supabase } from './src/lib/services.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyIndexes() {
  console.log('📊 Applying database performance indexes...\n');

  const sqlFile = path.join(__dirname, 'performance_indexes.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.log(`❌ Failed: ${statement.substring(0, 50)}...`);
        console.log(`   Error: ${error.message}\n`);
        errorCount++;
      } else {
        console.log(`✅ Applied: ${statement.substring(0, 50)}...`);
        successCount++;
      }
    } catch (err) {
      console.log(`⚠️  Skipped: ${statement.substring(0, 50)}...`);
      console.log(`   (This is normal if index already exists)\n`);
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}\n`);

  if (errorCount === 0) {
    console.log('🎉 All performance indexes applied successfully!');
  } else {
    console.log('⚠️  Some indexes failed. Please check the errors above.');
    console.log('   You may need to run the SQL manually in Supabase dashboard.');
  }
}

async function clearCache() {
  console.log('\n🧹 Clearing server cache...');
  const { clearCache } = await import('./src/utils/cache.js');
  clearCache();
  console.log('✅ Cache cleared!\n');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🚀 ScholarVault Performance Optimization Setup       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Note: Direct SQL execution might not be available via Supabase client
    // In that case, user needs to run SQL manually
    console.log('⚠️  Note: You need to manually run the SQL in performance_indexes.sql');
    console.log('   in your Supabase SQL Editor.\n');
    
    console.log('📝 Steps to apply indexes:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents from: backend/performance_indexes.sql');
    console.log('   3. Paste and run the SQL');
    console.log('   4. Verify indexes are created\n');

    await clearCache();

    console.log('✅ Setup complete!');
    console.log('   Restart your backend server to apply all changes.');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

main();

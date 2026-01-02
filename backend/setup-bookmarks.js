#!/usr/bin/env node
/**
 * Database Setup Script for Bookmarks Feature
 * Run this to create the user_bookmarks table in your Supabase database
 * 
 * Usage: node setup-bookmarks.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const createBookmarksTableSQL = `
-- Create user_bookmarks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    note_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, note_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_created_at ON public.user_bookmarks(created_at DESC);

-- Add comment
COMMENT ON TABLE public.user_bookmarks IS 'Stores user bookmarked notes for quick access';
`;

async function setupBookmarksTable() {
  console.log('🔧 Setting up bookmarks table...\n');

  try {
    // Check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_bookmarks')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code === 'PGRST116') {
      console.log('✅ user_bookmarks table already exists or can be created');
    }

    // Note: Supabase client doesn't support raw SQL execution directly
    // You need to run the SQL in Supabase dashboard SQL editor
    console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('=' .repeat(80));
    console.log(createBookmarksTableSQL);
    console.log('=' .repeat(80));
    
    console.log('\n📝 Instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute');
    console.log('\n✨ After running the SQL, bookmarks feature will be fully functional!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupBookmarksTable();

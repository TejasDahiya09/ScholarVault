#!/usr/bin/env node

/**
 * BOOKMARK & MARK-AS-COMPLETE FEATURE - VERIFICATION CHECKLIST
 * 
 * This checklist verifies all 3 blockers have been fixed:
 * ✅ BLOCKER 1: Table names (bookmarks → user_bookmarks, note_progress → user_study_progress)
 * ✅ BLOCKER 2: Routes are mounted under /api
 * ✅ BLOCKER 3: Backend exposes both POST endpoints
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔍 VERIFICATION CHECKLIST: Bookmark + Mark-as-Complete Features');
console.log('='.repeat(80) + '\n');

const checks = [
  // BLOCKER 1: Table Names
  {
    name: 'Bookmarks table name (user_bookmarks)',
    file: 'backend/src/db/bookmarks.js',
    patterns: [
      { search: '.from("user_bookmarks")', count: 3, description: 'Uses correct table name' }
    ]
  },
  {
    name: 'Progress table name (user_study_progress)',
    file: 'backend/src/db/progress.js',
    patterns: [
      { search: '.from("user_study_progress")', count: 2, description: 'Uses correct table name' }
    ]
  },
  {
    name: 'Safe query handling (maybeSingle)',
    file: 'backend/src/db/bookmarks.js',
    patterns: [
      { search: '.maybeSingle()', count: 1, description: 'Uses maybeSingle for null safety' }
    ]
  },
  {
    name: 'Safe query handling (maybeSingle)',
    file: 'backend/src/db/progress.js',
    patterns: [
      { search: '.maybeSingle()', count: 1, description: 'Uses maybeSingle for null safety' }
    ]
  },
  
  // BLOCKER 2: Routes mounted under /api
  {
    name: 'Bookmarks route mounted',
    file: 'backend/index.js',
    patterns: [
      { search: 'app.use("/api/bookmarks", bookmarksRoutes)', count: 1, description: 'Route mounted under /api' }
    ]
  },
  {
    name: 'Progress route mounted',
    file: 'backend/index.js',
    patterns: [
      { search: 'app.use("/api/progress", progressRoutes)', count: 1, description: 'Route mounted under /api' }
    ]
  },
  
  // BLOCKER 3: Backend endpoints exist
  {
    name: 'Bookmark toggle endpoint',
    file: 'backend/src/routes/bookmarks.js',
    patterns: [
      { search: 'router.post("/notes/:noteId", authenticate, toggleBookmark)', count: 1, description: 'Endpoint exists' }
    ]
  },
  {
    name: 'Completion toggle endpoint',
    file: 'backend/src/routes/progress.js',
    patterns: [
      { search: 'router.post("/notes/:noteId/complete", authenticate, toggleNoteCompletion)', count: 1, description: 'Endpoint exists' }
    ]
  },
  
  // Frontend API Routes
  {
    name: 'Frontend bookmark API (/api prefix)',
    file: 'frontend/src/api/bookmarks.js',
    patterns: [
      { search: 'client.post(`/api/bookmarks/notes/${noteId}`)', count: 1, description: 'Uses /api prefix' }
    ]
  },
  {
    name: 'Frontend progress API (/api prefix)',
    file: 'frontend/src/api/progress.js',
    patterns: [
      { search: 'client.post(`/api/progress/notes/${noteId}/complete`', count: 1, description: 'Uses /api prefix' }
    ]
  }
];

let passCount = 0;
let failCount = 0;

checks.forEach((check, idx) => {
  const filePath = path.join(__dirname, '..', check.file);
  
  console.log(`${idx + 1}. ${check.name}`);
  console.log(`   File: ${check.file}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let checkPassed = true;
    
    check.patterns.forEach(pattern => {
      const occurrences = (content.match(new RegExp(pattern.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (occurrences >= pattern.count) {
        console.log(`   ✅ ${pattern.description} (found ${occurrences}x)`);
        passCount++;
      } else {
        console.log(`   ❌ ${pattern.description} (found ${occurrences}x, expected ${pattern.count}x)`);
        failCount++;
        checkPassed = false;
      }
    });
    
  } catch (err) {
    console.log(`   ❌ File not found: ${err.message}`);
    failCount++;
  }
  
  console.log('');
});

console.log('='.repeat(80));
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(80) + '\n');

if (failCount === 0) {
  console.log('🎉 ALL CHECKS PASSED! Features should be working now.\n');
  console.log('📋 NEXT STEPS:');
  console.log('1. Restart backend server: npm start');
  console.log('2. Open ScholarVault app');
  console.log('3. Click bookmark icon → should save to database');
  console.log('4. Click mark complete → should save to database');
  console.log('5. Refresh page → bookmarks and completion should persist\n');
  process.exit(0);
} else {
  console.log('🔴 SOME CHECKS FAILED! Please review and fix.\n');
  process.exit(1);
}

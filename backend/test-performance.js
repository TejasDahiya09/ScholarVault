#!/usr/bin/env node

/**
 * Quick Performance Test Script
 * Tests various optimizations
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       🔬 ScholarVault Performance Test Suite             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function testEndpoint(name, url) {
  const start = Date.now();
  try {
    await axios.get(`${API_BASE}${url}`);
    const duration = Date.now() - start;
    console.log(`✅ ${name}: ${duration}ms`);
    return duration;
  } catch (err) {
    console.log(`❌ ${name}: FAILED`);
    return null;
  }
}

async function testCache(name, url) {
  console.log(`\n🧪 Testing cache for: ${name}`);
  
  // First request (cache miss)
  const start1 = Date.now();
  await axios.get(`${API_BASE}${url}`);
  const duration1 = Date.now() - start1;
  console.log(`   1st request: ${duration1}ms (cache miss)`);
  
  // Second request (cache hit)
  await new Promise(resolve => setTimeout(resolve, 100));
  const start2 = Date.now();
  await axios.get(`${API_BASE}${url}`);
  const duration2 = Date.now() - start2;
  console.log(`   2nd request: ${duration2}ms (cache hit)`);
  
  const improvement = Math.round(((duration1 - duration2) / duration1) * 100);
  console.log(`   📊 Improvement: ${improvement}% faster`);
  
  return improvement;
}

async function runTests() {
  try {
    console.log('🔌 Testing API Endpoints...\n');
    
    // Health check
    await testEndpoint('Health Check', '/healthz');
    
    // Main endpoints
    await testEndpoint('Get Subjects', '/api/subjects');
    await testEndpoint('Get Notes', '/api/notes');
    
    // Cache tests
    await testCache('Subjects Cache', '/api/subjects');
    await testCache('Notes Cache', '/api/notes');
    
    console.log('\n✅ All tests completed!\n');
    
    console.log('💡 Tips:');
    console.log('   - Second requests should be significantly faster');
    console.log('   - Compression should reduce payload by 60-80%');
    console.log('   - Check DevTools Network tab for gzip encoding\n');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.log('\n⚠️  Make sure your backend server is running:');
    console.log('   cd backend && npm start\n');
  }
}

runTests();

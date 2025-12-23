import { supabase } from "../lib/services.js";
import aiService from "./ai.js";
import NodeCache from "node-cache";
import { distance } from "fastest-levenshtein";
import stringSimilarity from "string-similarity";

// Cache for search results (TTL: 5 minutes, check period: 60s)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Cache for embeddings (TTL: 1 hour)
const embeddingCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Cache for suggestions (TTL: 10 minutes)
const suggestionCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

/**
 * Extract unit number from filename
 * Handles: "Unit 1", "U1", "Unit-I", "Chapter 3", etc.
 */
function extractUnitNumber(fileName) {
  if (!fileName) return null;
  
  const patterns = [
    /unit[\s-]*(\d+)/i,
    /u[\s-]*(\d+)/i,
    /chapter[\s-]*(\d+)/i,
    /ch[\s-]*(\d+)/i,
    /unit[\s-]*(i+|iv|v|vi+|ix|x)/i, // Roman numerals
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      const value = match[1].toLowerCase();
      // Convert roman numerals to numbers
      const romanMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
      return romanMap[value] || parseInt(value, 10);
    }
  }
  
  return null;
}

/**
 * Extract snippet from OCR text around matched keyword
 */
function extractSnippet(text, keyword, maxLength = 200) {
  if (!text || !keyword) return "";
  
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  // Try to find the keyword or its variations
  let index = lowerText.indexOf(lowerKeyword);
  
  // If exact match not found, try word boundary match
  if (index === -1) {
    const words = lowerKeyword.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        index = lowerText.indexOf(word);
        if (index !== -1) break;
      }
    }
  }
  
  if (index === -1) {
    // Return beginning if no match found
    return text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");
  }
  
  // Extract context around the match
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + keyword.length + 120);
  
  let snippet = text.substring(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  
  return snippet;
}

/**
 * Highlight matched terms in snippet with markers
 */
function highlightMatches(snippet, query) {
  if (!snippet || !query) return snippet;
  
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  let highlighted = snippet;
  
  // Sort terms by length (longest first) to avoid partial replacements
  terms.sort((a, b) => b.length - a.length);
  
  for (const term of terms) {
    // Use word boundary regex for more accurate matching
    const regex = new RegExp(`\\b(${escapeRegex(term)}\\w*)\\b`, 'gi');
    highlighted = highlighted.replace(regex, '<<$1>>');
  }
  
  return highlighted;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Common stopwords to remove from search queries
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'about', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'can'
]);

/**
 * Common synonyms for technical terms
 */
const SYNONYMS = {
  'algo': 'algorithm',
  'db': 'database',
  'os': 'operating system',
  'ds': 'data structure',
  'oop': 'object oriented programming',
  'ml': 'machine learning',
  'ai': 'artificial intelligence',
  'dl': 'deep learning',
  'nn': 'neural network',
  'cn': 'computer network',
};

/**
 * Preprocess query: normalize, expand synonyms, remove stopwords
 */
function preprocessQuery(query) {
  if (!query) return { original: '', processed: '', terms: [] };
  
  // Normalize whitespace and lowercase
  let processed = query.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Expand common synonyms
  Object.entries(SYNONYMS).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, 'gi');
    processed = processed.replace(regex, full);
  });
  
  // Split into terms
  const allTerms = processed.split(/\s+/);
  
  // Keep both with and without stopwords for different match types
  const terms = allTerms.filter(term => term.length > 1 && !STOPWORDS.has(term));
  
  return {
    original: query.trim(),
    processed: processed,
    terms: terms.length > 0 ? terms : allTerms, // Fallback if all stopwords
    allTerms: allTerms
  };
}

/**
 * Calculate term frequency for TF-IDF-like scoring
 */
function calculateTermFrequency(text, terms) {
  if (!text || !terms.length) return 0;
  
  const textLower = text.toLowerCase();
  let totalMatches = 0;
  
  terms.forEach(term => {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\w*\\b`, 'g');
    const matches = textLower.match(regex);
    if (matches) totalMatches += matches.length;
  });
  
  // Normalize by document length (longer docs need more matches)
  const normalizedTF = totalMatches / Math.sqrt(text.length / 1000 + 1);
  return normalizedTF;
}

/**
 * Check if text contains exact phrase match
 */
function hasExactPhrase(text, phrase) {
  if (!text || !phrase) return false;
  return text.toLowerCase().includes(phrase.toLowerCase());
}

/**
 * Calculate query coverage - what % of query terms are in the document
 */
function calculateQueryCoverage(text, terms) {
  if (!text || !terms.length) return 0;
  
  const textLower = text.toLowerCase();
  const matchedTerms = terms.filter(term => {
    const regex = new RegExp(`\\b${escapeRegex(term)}`, 'i');
    return regex.test(textLower);
  });
  
  return matchedTerms.length / terms.length;
}

/**
 * Find similar terms using fuzzy matching (typo tolerance)
 */
function findSimilarTerms(query, corpus) {
  if (!query || !corpus || corpus.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  const matches = [];
  
  corpus.forEach(item => {
    const itemLower = item.toLowerCase();
    
    // Exact match
    if (itemLower === queryLower) {
      matches.push({ term: item, score: 1.0, type: 'exact' });
      return;
    }
    
    // Prefix match
    if (itemLower.startsWith(queryLower)) {
      matches.push({ term: item, score: 0.9, type: 'prefix' });
      return;
    }
    
    // Levenshtein distance for typo tolerance
    const dist = distance(queryLower, itemLower);
    const maxLen = Math.max(queryLower.length, itemLower.length);
    const similarity = 1 - (dist / maxLen);
    
    // Only consider if similarity > 0.7 (70%)
    if (similarity > 0.7) {
      matches.push({ term: item, score: similarity, type: 'fuzzy' });
    }
  });
  
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Generate "Did you mean?" suggestions
 */
async function getDidYouMeanSuggestions(query) {
  if (!query || query.length < 3) return null;
  
  try {
    // Get common search terms from analytics
    const { data: popularQueries } = await supabase
      .from("search_analytics")
      .select("query")
      .limit(1000);
    
    if (!popularQueries || popularQueries.length === 0) return null;
    
    const corpus = [...new Set(popularQueries.map(q => q.query))];
    const similar = findSimilarTerms(query, corpus);
    
    // Only suggest if not exact match and has good fuzzy match
    const bestMatch = similar.find(m => m.type === 'fuzzy' && m.score > 0.75);
    
    return bestMatch ? bestMatch.term : null;
  } catch (err) {
    console.error('Did you mean error:', err);
    return null;
  }
}

/**
 * Diversify results - prevent too many from same subject/unit
 */
function diversifyResults(results, maxPerGroup = 3) {
  const subjectCounts = new Map();
  const unitCounts = new Map();
  const diversified = [];
  
  for (const result of results) {
    const subjectKey = result.subject_id || 'unknown';
    const unitKey = `${subjectKey}-${result.unit_number || 0}`;
    
    const subjectCount = subjectCounts.get(subjectKey) || 0;
    const unitCount = unitCounts.get(unitKey) || 0;
    
    // Allow through if not over-represented
    if (unitCount < maxPerGroup && subjectCount < maxPerGroup * 2) {
      diversified.push(result);
      subjectCounts.set(subjectKey, subjectCount + 1);
      unitCounts.set(unitKey, unitCount + 1);
    } else if (diversified.length < results.length * 0.8) {
      // Still add some if we don't have enough diverse results
      diversified.push(result);
    }
  }
  
  // If too much filtering, add back top results
  if (diversified.length < Math.min(10, results.length * 0.5)) {
    return results;
  }
  
  return diversified;
}

/**
 * Search Service - Hybrid Search System
 */
export const searchService = {
  /**
   * Main Hybrid Search Endpoint
   * Combines keyword search (ILIKE) + semantic vector search
   */
  async hybridSearch(query, options = {}) {
    const {
      subjectId = null,
      noteId = null,
      page = 1,
      perPage = 10,
      userId = null,
    } = options;

    if (!query || query.trim().length === 0) {
      return {
        results: [],
        grouped_results: {},
        total_results: 0,
        page,
        per_page: perPage,
        next_page: null,
      };
    }

    // Check cache for this exact query + options combination (page 1 only)
    const cacheKey = `search:${query}:${subjectId}:${noteId}:${page}:${perPage}`;
    if (page === 1) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
    }

    const results = new Map(); // Use Map to deduplicate by note_id

    // 1. KEYWORD SEARCH using ILIKE on ocr_text and file_name
    try {
      let keywordQuery = supabase
        .from("notes")
        .select("*")
        .or(`ocr_text.ilike.%${query}%,file_name.ilike.%${query}%,subject.ilike.%${query}%`);

      if (subjectId) keywordQuery = keywordQuery.eq("subject_id", subjectId);
      if (noteId) keywordQuery = keywordQuery.eq("id", noteId);

      const { data: keywordResults, error: keywordError } = await keywordQuery.limit(100);

      if (!keywordError && keywordResults) {
        keywordResults.forEach((note) => {
          const snippet = extractSnippet(note.ocr_text || note.file_name, query);
          const highlighted = highlightMatches(snippet, query);
          const unitNumber = note.unit_number || extractUnitNumber(note.file_name);
          
          // Calculate keyword match strength
          const textLower = (note.ocr_text || "").toLowerCase();
          const fileNameLower = (note.file_name || "").toLowerCase();
          const queryLower = query.toLowerCase();
          
          // Preprocess query for better matching
          const queryInfo = preprocessQuery(query);
          
          // Calculate different match types
          const hasExactMatch = fileNameLower === queryLower || textLower === queryLower;
          const hasPhraseMatch = hasExactPhrase(note.ocr_text || note.file_name, queryInfo.processed);
          const termFrequency = calculateTermFrequency(note.ocr_text || '', queryInfo.terms);
          const queryCoverage = calculateQueryCoverage(note.ocr_text || note.file_name, queryInfo.terms);
          
          // Count occurrences (keeping original for backward compatibility)
          const occurrences = (textLower.match(new RegExp(escapeRegex(queryLower), 'g')) || []).length;
          
          // Advanced scoring algorithm
          let keywordScore = 0.5; // Base score
          
          // Exact match bonus (highest priority)
          if (hasExactMatch) keywordScore += 10.0;
          
          // Phrase match in different fields (position-based weighting)
          if (hasPhraseMatch) {
            if (fileNameLower.includes(queryInfo.processed)) keywordScore += 5.0; // Title phrase match
            else keywordScore += 3.0; // Content phrase match
          }
          
          // Partial match in title (very important)
          if (fileNameLower.includes(queryLower)) keywordScore += 3.5;
          queryInfo.terms.forEach(term => {
            if (fileNameLower.includes(term)) keywordScore += 1.5;
          });
          
          // Subject match
          if (note.subject) {
            const subjectLower = note.subject.toLowerCase();
            if (subjectLower.includes(queryLower)) keywordScore += 2.0;
            queryInfo.terms.forEach(term => {
              if (subjectLower.includes(term)) keywordScore += 0.8;
            });
          }
          
          // TF-IDF-like scoring for content relevance
          keywordScore += Math.min(termFrequency * 0.5, 3.0);
          
          // Query coverage bonus (how many query terms appear)
          keywordScore += queryCoverage * 2.0;
          
          // Occurrence count with diminishing returns
          keywordScore += Math.log10(occurrences + 1) * 0.8;

          results.set(note.id, {
            ...note,
            snippet: highlighted,
            match_count: Math.max(1, occurrences),
            keyword_match: true,
            semantic_match: false,
            similarity: 0,
            unit_number: unitNumber,
            weighted_score: keywordScore,
          });
        });
      }
    } catch (err) {
      console.error("Keyword search error:", err);
    }

    // 2. SEMANTIC VECTOR SEARCH using embeddings
    try {
      // Use processed query for better semantic matching
      const queryInfo = preprocessQuery(query);
      const semanticQuery = queryInfo.processed || query;
      
      // Check embedding cache first
      const embeddingKey = `embedding:${semanticQuery}`;
      let embedding = embeddingCache.get(embeddingKey);
      
      if (!embedding) {
        embedding = await aiService.generateEmbedding(semanticQuery);
        if (embedding) {
          embeddingCache.set(embeddingKey, embedding);
        }
      }
      
      if (embedding && embedding.length > 0) {
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          "match_documents_local",
          {
            query_embedding: embedding,
            match_count: 50, // Increased for better coverage
          }
        );

        if (!vectorError && vectorResults) {
          // Group chunks by note_id and get note details
          const noteIds = [...new Set(vectorResults.map(r => r.note_id))];
          
          let notesQuery = supabase
            .from("notes")
            .select("*")
            .in("id", noteIds);

          if (subjectId) notesQuery = notesQuery.eq("subject_id", subjectId);
          if (noteId) notesQuery = notesQuery.eq("id", noteId);

          const { data: vectorNotes, error: notesError } = await notesQuery;

          if (!notesError && vectorNotes) {
            vectorNotes.forEach((note) => {
              const chunks = vectorResults.filter(r => r.note_id === note.id);
              const bestChunk = chunks[0]; // Highest similarity
              
              // Calculate average similarity with exponential weighting (favor best matches)
              const weightedSimilarity = chunks.reduce((sum, c, idx) => {
                const weight = Math.pow(0.7, idx); // Exponential decay
                return sum + (1 - c.similarity) * weight;
              }, 0) / chunks.reduce((sum, _, idx) => sum + Math.pow(0.7, idx), 0);
              
              // Normalize similarity score to 0-1 range (higher is better)
              const normalizedSimilarity = Math.max(0, 1 - weightedSimilarity);

              const snippet = bestChunk.content.substring(0, 200) + "...";
              const highlighted = highlightMatches(snippet, query);
              const unitNumber = note.unit_number || extractUnitNumber(note.file_name);

              if (results.has(note.id)) {
                // Already exists from keyword search, boost the score significantly
                const existing = results.get(note.id);
                existing.semantic_match = true;
                existing.similarity = normalizedSimilarity;
                // Hybrid match gets exponential boost (both keyword and semantic)
                existing.weighted_score += Math.pow(normalizedSimilarity, 0.8) * 5.0;
                existing.match_count += chunks.length;
                // Use semantic snippet if it's better (higher similarity)
                if (normalizedSimilarity > 0.7) {
                  existing.snippet = highlighted;
                }
              } else {
                // New result from semantic search only
                const semanticScore = Math.pow(normalizedSimilarity, 0.8) * 3.0;
                results.set(note.id, {
                  ...note,
                  snippet: highlighted,
                  match_count: chunks.length,
                  keyword_match: false,
                  semantic_match: true,
                  similarity: normalizedSimilarity,
                  unit_number: unitNumber,
                  weighted_score: semanticScore,
                });
              }
            });
          }
        }
      }
    } catch (err) {
      console.error("Semantic search error:", err);
    }

    // 3. ADVANCED RELEVANCE BOOSTING
    const queryInfo = preprocessQuery(query);
    const queryLower = query.toLowerCase();
    
    results.forEach((result, noteId) => {
      let score = result.weighted_score;

      // Field-specific boosting with position weighting
      const fileNameLower = (result.file_name || "").toLowerCase();
      const subjectLower = (result.subject || "").toLowerCase();
      
      // Exact filename match (extremely strong signal)
      if (fileNameLower === queryLower) {
        score += 8.0;
      } else if (fileNameLower === queryInfo.processed) {
        score += 7.0;
      }
      
      // Filename starts with query (very strong signal)
      if (fileNameLower.startsWith(queryLower)) {
        score += 4.0;
      } else if (queryInfo.terms.some(term => fileNameLower.startsWith(term))) {
        score += 2.5;
      }
      
      // Subject exact or phrase match
      if (subjectLower === queryLower) {
        score += 3.0;
      } else if (subjectLower.includes(queryLower)) {
        score += 1.8;
      }

      // Match count with logarithmic scaling
      score += Math.log10(result.match_count + 1) * 0.7;

      // Unit-specific search boost
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (word.match(/unit|chapter|module|lesson/i)) {
          const numMatch = word.match(/\d+/);
          if (numMatch && parseInt(numMatch[0]) === result.unit_number) {
            score += 3.0; // Specific unit search gets strong boost
          }
        }
      }
      
      // Unit number in filename should match better
      if (result.unit_number && fileNameLower.includes(`unit ${result.unit_number}`)) {
        score += 1.5;
      }

      // Freshness boost (decaying over time)
      if (result.created_at) {
        const daysSinceCreation = (Date.now() - new Date(result.created_at)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) {
          score += 0.8; // Very recent
        } else if (daysSinceCreation < 30) {
          score += 0.4; // Recent
        } else if (daysSinceCreation < 90) {
          score += 0.2; // Somewhat recent
        }
      }
      
      // Quality signals
      // Penalize very short content (likely incomplete or low quality)
      if (result.ocr_text) {
        const contentLength = result.ocr_text.length;
        if (contentLength < 100) {
          score *= 0.5; // Strong penalty for very short content
        } else if (contentLength < 500) {
          score *= 0.8; // Moderate penalty for short content
        } else if (contentLength > 5000) {
          score *= 1.1; // Small boost for comprehensive content
        }
      }
      
      // Hybrid match bonus (appeared in both keyword and semantic)
      if (result.keyword_match && result.semantic_match) {
        score *= 1.3; // 30% multiplicative boost for hybrid matches
      }

      result.weighted_score = score;
    });

    // 4. SORT BY WEIGHTED SCORE
    const sortedResults = Array.from(results.values()).sort(
      (a, b) => b.weighted_score - a.weighted_score
    );
    
    // 4.5 DIVERSIFY RESULTS (prevent over-representation)
    const diversifiedResults = diversifyResults(sortedResults, 3);

    // 5. GROUP BY UNIT
    const groupedResults = {};
    diversifiedResults.forEach((result) => {
      const unit = result.unit_number ? `Unit ${result.unit_number}` : "Other";
      if (!groupedResults[unit]) {
        groupedResults[unit] = [];
      }
      groupedResults[unit].push(result);
    });

    // 6. PAGINATION
    const totalResults = diversifiedResults.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedResults = diversifiedResults.slice(startIndex, endIndex);
    const hasNextPage = endIndex < totalResults;
    
    // 6.5 GET "DID YOU MEAN" SUGGESTION
    let didYouMean = null;
    if (totalResults === 0 && page === 1) {
      didYouMean = await getDidYouMeanSuggestions(query);
    }

    // 7. LOG ANALYTICS (respect user preference)
    if (userId) {
      try {
        // Check if user has opted in to analytics sharing
        const { data: pref, error: prefError } = await supabase
          .from("users")
          .select("analytics_sharing")
          .eq("id", userId)
          .single();

        if (!prefError && pref?.analytics_sharing) {
          await supabase.from("search_analytics").insert({
            user_id: userId,
            query: query.trim(),
            subject_id: subjectId,
            results_count: totalResults,
          });
        }
      } catch (err) {
        console.error("Analytics logging error:", err);
      }
    }

    const response = {
      results: paginatedResults,
      grouped_results: groupedResults,
      total_results: totalResults,
      page,
      per_page: perPage,
      next_page: hasNextPage ? page + 1 : null,
      did_you_mean: didYouMean,
      performance: {
        cached: page === 1 && searchCache.has(cacheKey),
        result_count: paginatedResults.length,
      }
    };

    // Cache the response (page 1 only)
    if (page === 1) {
      searchCache.set(cacheKey, response);
    }

    return response;
  },

  /**
   * Autocomplete / Suggest
   * Returns smart suggestions while typing
   */
  async suggest(query, options = {}) {
    const { limit = 12 } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    // Check cache first
    const cacheKey = `suggest:${query}:${limit}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions = new Map(); // Use Map to track with scores

    try {
      // Search in file names (high priority)
      const { data: fileMatches } = await supabase
        .from("notes")
        .select("file_name, subject, unit_number")
        .ilike("file_name", `%${query}%`)
        .limit(8);

      if (fileMatches) {
        fileMatches.forEach((n) => {
          if (n.file_name) {
            const key = n.file_name.toLowerCase();
            const score = key.startsWith(query.toLowerCase()) ? 10 : 5; // Prefix match scores higher
            if (!suggestions.has(key) || suggestions.get(key).score < score) {
              suggestions.set(key, { text: n.file_name, score });
            }
          }
        });
      }

      // Search in subjects
      const { data: subjectMatches } = await supabase
        .from("subjects")
        .select("name, code")
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .limit(8);

      if (subjectMatches) {
        subjectMatches.forEach((s) => {
          if (s.name) {
            const key = s.name.toLowerCase();
            const score = key.startsWith(query.toLowerCase()) ? 8 : 4;
            if (!suggestions.has(key) || suggestions.get(key).score < score) {
              suggestions.set(key, { text: s.name, score });
            }
          }
          if (s.code) {
            const key = s.code.toLowerCase();
            const score = 6;
            if (!suggestions.has(key) || suggestions.get(key).score < score) {
              suggestions.set(key, { text: s.code, score });
            }
          }
        });
      }

      // Semantic suggestions (only for longer queries)
      if (query.length >= 4) {
        try {
          const embedding = await aiService.generateEmbedding(query);
          if (embedding) {
            const { data: vectorMatches } = await supabase.rpc("match_documents_local", {
              query_embedding: embedding,
              match_count: 5,
            });

            if (vectorMatches) {
              const noteIds = [...new Set(vectorMatches.slice(0, 3).map(r => r.note_id))];
              const { data: notes } = await supabase
                .from("notes")
                .select("file_name, subject")
                .in("id", noteIds);

              if (notes) {
                notes.forEach((n) => {
                  if (n.file_name) {
                    const key = n.file_name.toLowerCase();
                    const score = 3; // Lower score for semantic matches
                    if (!suggestions.has(key) || suggestions.get(key).score < score) {
                      suggestions.set(key, { text: n.file_name, score });
                    }
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error("Semantic suggest error:", err);
        }
      }
    } catch (err) {
      console.error("Suggest error:", err);
    }

    // Sort by score and return text only
    const result = Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.text);
    
    // Cache the result
    suggestionCache.set(cacheKey, result);
    
    return result;
  },

  /**
   * Get Search Analytics - Top queries
   */
  async getAnalytics(options = {}) {
    const { limit = 20, days = 30 } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from("search_analytics")
        .select("query, results_count, created_at")
        .gte("created_at", cutoffDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Aggregate by query
      const queryMap = new Map();
      data.forEach((row) => {
        const q = row.query.toLowerCase().trim();
        if (!queryMap.has(q)) {
          queryMap.set(q, { query: q, count: 0, avg_results: 0 });
        }
        const entry = queryMap.get(q);
        entry.count += 1;
        entry.avg_results += row.results_count;
      });

      // Calculate averages and sort
      const topQueries = Array.from(queryMap.values())
        .map((entry) => ({
          ...entry,
          avg_results: Math.round(entry.avg_results / entry.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return topQueries;
    } catch (err) {
      console.error("Analytics error:", err);
      return [];
    }
  },

  /**
   * Search inside a single note/PDF
   */
  async searchInNote(noteId, query, options = {}) {
    return this.hybridSearch(query, { ...options, noteId });
  },

  /**
   * Batch analytics logging (non-blocking)
   */
  async logAnalyticsBatch(events, userId = null) {
    if (!events || events.length === 0) return;

    try {
      // Respect user preference: only log if analytics_sharing is true
      let canLog = true;
      if (userId) {
        const { data: pref, error: prefError } = await supabase
          .from("users")
          .select("analytics_sharing")
          .eq("id", userId)
          .single();
        canLog = !prefError && !!pref?.analytics_sharing;
      }

      if (canLog) {
        const records = events.map(event => ({
          user_id: userId,
          query: event.query?.trim() || '',
          results_count: event.result_count || 0,
          clicked_item: event.clicked_item || null,
          created_at: event.timestamp || new Date().toISOString()
        }));

        await supabase.from("search_analytics").insert(records);
      }
    } catch (err) {
      console.error("Batch analytics error:", err);
    }
  },
};

export default searchService;

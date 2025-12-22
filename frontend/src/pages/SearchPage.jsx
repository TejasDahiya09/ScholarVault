import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import client from "../api/client";
import { Link, useLocation } from "react-router-dom";
import Fuse from "fuse.js";

// Add animation styles
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  kbd {
    font-family: ui-monospace, monospace;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Search state machine
const SEARCH_STATES = {
  IDLE: 'idle',
  FOCUSED: 'focused',
  SEARCHING: 'searching',
  RESULTS: 'results',
  EMPTY: 'empty'
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchState, setSearchState] = useState(SEARCH_STATES.IDLE);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, date, name
  const [filters, setFilters] = useState({ semester: '', unit: '' });
  const [recentSearches, setRecentSearches] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [searchPerformance, setSearchPerformance] = useState(null);
  const [allNotesMetadata, setAllNotesMetadata] = useState([]);
  const [useClientSearch, setUseClientSearch] = useState(false);
  
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const resultsCache = useRef(new Map());
  const fuseRef = useRef(null);
  const analyticsQueueRef = useRef([]);
  const analyticsTimerRef = useRef(null);
  const location = useLocation();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Global keyboard shortcut: Ctrl/Cmd+K to focus search
  useEffect(() => {
    const handleGlobalKeyboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchState(SEARCH_STATES.FOCUSED);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyboard);
    return () => document.removeEventListener('keydown', handleGlobalKeyboard);
  }, []);

  // Clear search on route change
  useEffect(() => {
    return () => {
      setQuery("");
      setResults([]);
      setSearchState(SEARCH_STATES.IDLE);
      setShowSuggestions(false);
      // Flush analytics queue on unmount
      if (analyticsQueueRef.current.length > 0) {
        flushAnalytics();
      }
    };
  }, [location.pathname, flushAnalytics]);

  // Load all notes metadata for client-side search on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const res = await client.get('/api/notes/metadata');
        if (res.data) {
          setAllNotesMetadata(res.data);
          console.log(`Loaded ${res.data.length} notes for instant search`);
          // Initialize Fuse.js
          fuseRef.current = new Fuse(res.data, {
            keys: [
              { name: 'file_name', weight: 0.4 },
              { name: 'subject', weight: 0.3 },
              { name: 'unit_number', weight: 0.2 },
              { name: 'ocr_text', weight: 0.1 }
            ],
            threshold: 0.4,
            includeScore: true,
            minMatchCharLength: 2
          });
          setUseClientSearch(true);
        }
      } catch (err) {
        console.log('Client-side search not available:', err.message);
      }
    };
    loadMetadata();
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // Batched analytics logging (non-blocking)
  const logSearchAnalytics = useCallback((query, resultCount, clickedItem = null) => {
    analyticsQueueRef.current.push({
      query,
      result_count: resultCount,
      clicked_item: clickedItem,
      timestamp: new Date().toISOString()
    });

    // Clear existing timer
    if (analyticsTimerRef.current) {
      clearTimeout(analyticsTimerRef.current);
    }

    // Flush after 2 seconds or when queue reaches 10 items
    if (analyticsQueueRef.current.length >= 10) {
      flushAnalytics();
    } else {
      analyticsTimerRef.current = setTimeout(() => {
        flushAnalytics();
      }, 2000);
    }
  }, [flushAnalytics]);

  // Flush analytics queue to backend
  const flushAnalytics = useCallback(async () => {
    if (analyticsQueueRef.current.length === 0) return;

    const batch = [...analyticsQueueRef.current];
    analyticsQueueRef.current = [];

    try {
      await client.post('/api/search/analytics/batch', { events: batch });
    } catch (err) {
      console.error('Analytics batch failed:', err);
    }
  }, []);

  // Client-side fuzzy search for instant results
  const performClientSearch = useCallback((searchQuery) => {
    if (!fuseRef.current || !searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setGroupedResults({});
      return [];
    }

    const fuseResults = fuseRef.current.search(searchQuery);
    const formatted = fuseResults.slice(0, 50).map(r => ({
      ...r.item,
      weighted_score: (1 - r.score) * 10, // Convert Fuse score to our scale
      snippet: `${r.item.file_name} - ${r.item.subject}`,
      match_count: 1,
      keyword_match: true,
      semantic_match: false
    }));

    return formatted;
  }, []);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        if (!query.trim()) {
          setSearchState(SEARCH_STATES.IDLE);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  // Autocomplete suggestions with strict validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await client.get(`/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}&limit=8`);
        setSuggestions(res.data || []);
        if (searchState === SEARCH_STATES.FOCUSED && (res.data || []).length > 0) {
          setShowSuggestions(true);
        }
      } catch (e) {
        console.error("Autocomplete error:", e);
      }
    }, 300);
  }, [query, searchState]);

  // Main search function with caching and strict validation
  const performSearch = async (searchQuery, pageNum = 1, append = false) => {
    const trimmedQuery = searchQuery.trim();
    
    // Strict validation: no search for empty or too short queries
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([]);
      setGroupedResults({});
      setSearchState(trimmedQuery ? SEARCH_STATES.FOCUSED : SEARCH_STATES.IDLE);
      return;
    }

    // Use client-side search for instant results while backend loads
    if (useClientSearch && pageNum === 1) {
      const clientResults = performClientSearch(trimmedQuery);
      if (clientResults.length > 0) {
        setResults(clientResults);
        setSearchState(SEARCH_STATES.RESULTS);
        // Continue with backend search in background
      }
    }

    // Check cache for this query (page 1 only)
    if (pageNum === 1 && resultsCache.current.has(trimmedQuery)) {
      const cached = resultsCache.current.get(trimmedQuery);
      setResults(cached.results);
      setGroupedResults(cached.grouped_results);
      setTotalResults(cached.total_results);
      setHasMore(!!cached.next_page);
      setPage(1);
      setSearchState(cached.results.length > 0 ? SEARCH_STATES.RESULTS : SEARCH_STATES.EMPTY);
      return;
    }

    try {
      setLoading(true);
      setSearchState(SEARCH_STATES.SEARCHING);
      setErr("");
      
      const res = await client.get(`/api/search?q=${encodeURIComponent(trimmedQuery)}&page=${pageNum}&per_page=10`);
      const data = res.data;

      if (append) {
        setResults((prev) => [...prev, ...(data.results || [])]);
      } else {
        setResults(data.results || []);
        setGroupedResults(data.grouped_results || {});
        
        // Cache first page results
        if (pageNum === 1) {
          resultsCache.current.set(trimmedQuery, {
            results: data.results || [],
            grouped_results: data.grouped_results || {},
            total_results: data.total_results || 0,
            next_page: data.next_page
          });
        }
      }
      
      setTotalResults(data.total_results || 0);
      setHasMore(!!data.next_page);
      setPage(pageNum);
      
      // Set did-you-mean suggestion
      setDidYouMean(data.did_you_mean || null);
      
      // Set performance metrics
      setSearchPerformance(data.performance || null);
      
      // Update state based on results
      if ((data.results || []).length > 0) {
        setSearchState(SEARCH_STATES.RESULTS);
      } else {
        setSearchState(SEARCH_STATES.EMPTY);
      }

      // Log analytics (batched, non-blocking)
      if (pageNum === 1) {
        logSearchAnalytics(trimmedQuery, data.total_results || 0);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Search failed");
      setResults([]);
      setGroupedResults({});
      setSearchState(SEARCH_STATES.EMPTY);
      logSearchAnalytics(trimmedQuery, 0);
    } finally {
      setLoading(false);
    }
  };

  // Handle search submission
  const handleSearch = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // If a suggestion is selected, use it
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      const suggestion = suggestions[selectedSuggestionIndex];
      setQuery(suggestion);
      saveRecentSearch(suggestion);
      performSearch(suggestion, 1, false);
    } else {
      saveRecentSearch(query);
      performSearch(query, 1, false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    saveRecentSearch(suggestion);
    performSearch(suggestion, 1, false);
  };
  
  // Apply sorting to results
  const sortResults = useCallback((resultsToSort) => {
    const sorted = [...resultsToSort];
    
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'name':
        sorted.sort((a, b) => (a.file_name || '').localeCompare(b.file_name || ''));
        break;
      case 'relevance':
      default:
        // Already sorted by weighted_score from backend
        break;
    }
    
    return sorted;
  }, [sortBy]);
  
  // Apply filters to results
  const filterResults = useCallback((resultsToFilter) => {
    return resultsToFilter.filter(result => {
      if (filters.semester && result.semester !== parseInt(filters.semester)) return false;
      if (filters.unit && result.unit_number !== parseInt(filters.unit)) return false;
      return true;
    });
  }, [filters]);
  
  // Export results to CSV
  const exportResults = useCallback(() => {
    if (processedResults.length === 0) return;
    
    const csvContent = [
      ['File Name', 'Subject', 'Semester', 'Unit', 'Branch', 'Relevance Score'],
      ...processedResults.map(r => [
        r.file_name || '',
        r.subject || '',
        r.semester || '',
        r.unit_number || '',
        r.branch || '',
        r.weighted_score?.toFixed(2) || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${query.replace(/\\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedResults, query]);

  // Handle keyboard navigation with Escape to close
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      if (!query.trim()) {
        setSearchState(SEARCH_STATES.IDLE);
      }
      searchInputRef.current?.blur();
      return;
    }
    
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => prev > 0 ? prev - 1 : -1);
    }
  };

  // Load more results with strict validation
  const loadMore = () => {
    const trimmedQuery = query.trim();
    if (!loading && hasMore && trimmedQuery.length >= 2 && results.length >= 10) {
      performSearch(trimmedQuery, page + 1, true);
    }
  };

  // Highlight matched text with markers <<...>>
  const renderHighlightedText = (text) => {
    if (!text) return "";
    
    const parts = text.split(/<<|>>/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <mark key={i} className="bg-yellow-200 px-0.5">{part}</mark>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const showEmpty = useMemo(() => 
    searchState === SEARCH_STATES.EMPTY && query.trim().length >= 2 && !loading, 
    [searchState, query, loading]
  );
  
  const showLoadMore = useMemo(() => 
    hasMore && !loading && query.trim().length >= 2 && results.length >= 10,
    [hasMore, loading, query, results.length]
  );
  
  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
  
  // Processed results with sorting and filtering
  const processedResults = useMemo(() => {
    return sortResults(filterResults(results));
  }, [results, sortResults, filterResults]);
  
  // Update grouped results when processed results change
  useEffect(() => {
    if (processedResults.length > 0) {
      const grouped = {};
      processedResults.forEach((result) => {
        const unit = result.unit_number ? `Unit ${result.unit_number}` : "Other";
        if (!grouped[unit]) {
          grouped[unit] = [];
        }
        grouped[unit].push(result);
      });
      setGroupedResults(grouped);
    }
  }, [processedResults]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
                🔍 Intelligent Search
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm">
                Hybrid keyword + semantic search across all your notes
              </p>
            </div>
            <button
              onClick={() => setShowTips(!showTips)}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              title="Search Tips"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips
            </button>
          </div>
          
          {/* Search Tips Panel */}
          {showTips && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Search Tips:</h3>
              <ul className="space-y-1 text-blue-800">
                <li>• Use <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+K</kbd> to quickly focus search</li>
                <li>• 🚀 Instant results from client-side fuzzy search</li>
                <li>• Search by unit: "unit 3" or "chapter 2"</li>
                <li>• Use abbreviations: "algo" → "algorithm", "db" → "database"</li>
                <li>• Semantic search understands concepts, not just keywords</li>
                <li>• Filter by semester and unit for precise results</li>
                <li>• Export results to CSV for offline analysis</li>
              </ul>
            </div>
          )}
        </div>

        {/* Search Box with Autocomplete */}
        <div ref={searchContainerRef} className="relative mb-4 sm:mb-6">
          <form onSubmit={handleSearch}>
            <div 
              onClick={() => searchInputRef.current?.focus()}
              className={`bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all cursor-text ${searchState !== SEARCH_STATES.IDLE ? 'p-3 sm:p-4' : 'p-2 sm:p-3'}`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setSearchState(SEARCH_STATES.FOCUSED);
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!query.trim()) {
                        setSearchState(SEARCH_STATES.IDLE);
                      }
                    }, 200);
                  }}
                  placeholder="Search notes by topic, subject, unit, or keyword..."
                  className="flex-1 outline-none text-sm sm:text-base"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setGroupedResults({});
                      setSuggestions([]);
                      setSearchState(SEARCH_STATES.IDLE);
                      setShowSuggestions(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !query.trim() || query.trim().length < 2}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm flex-shrink-0"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-10 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-2.5 transition-colors text-sm border-b border-gray-100 last:border-0 ${
                    i === selectedSuggestionIndex 
                      ? 'bg-indigo-100 text-indigo-900' 
                      : 'hover:bg-indigo-50 text-slate-700'
                  }`}
                >
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters and Sort Controls */}
        {(searchState === SEARCH_STATES.RESULTS || searchState === SEARCH_STATES.EMPTY) && (
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 hidden sm:inline">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Newest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
            
            {/* Semester Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 hidden sm:inline">Semester:</label>
              <select
                value={filters.semester}
                onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Semesters</option>
                <option value="1">Sem 1</option>
                <option value="2">Sem 2</option>
                <option value="3">Sem 3</option>
                <option value="4">Sem 4</option>
                <option value="5">Sem 5</option>
                <option value="6">Sem 6</option>
                <option value="7">Sem 7</option>
                <option value="8">Sem 8</option>
              </select>
            </div>
            
            {/* Unit Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 hidden sm:inline">Unit:</label>
              <select
                value={filters.unit}
                onChange={(e) => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Units</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(unit => (
                  <option key={unit} value={unit}>Unit {unit}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters */}
            {(filters.semester || filters.unit || sortBy !== 'relevance') && (
              <button
                onClick={() => {
                  setFilters({ semester: '', unit: '' });
                  setSortBy('relevance');
                }}
                className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear All
              </button>
            )}
            
            {/* Export Button */}
            {processedResults.length > 0 && (
              <button
                onClick={exportResults}
                className="ml-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                title="Export results to CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            
            {/* Results Counter */}
            <div className="w-full sm:w-auto text-xs sm:text-sm text-slate-600">
              Showing {processedResults.length} of {totalResults} results
            </div>
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
            {err}
          </div>
        )}

        {/* Results Count */}
        {totalResults > 0 && (
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div className="text-xs sm:text-sm text-slate-600">
              Found <span className="font-semibold text-slate-900">{totalResults}</span> results
              {searchPerformance?.cached && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">⚡ Cached</span>
              )}
              {useClientSearch && results.length > 0 && !loading && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">🚀 Instant</span>
              )}
            </div>
          </div>
        )}
        
        {/* Did You Mean Suggestion */}
        {didYouMean && searchState === SEARCH_STATES.EMPTY && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Did you mean:{' '}
              <button
                onClick={() => {
                  setQuery(didYouMean);
                  performSearch(didYouMean, 1, false);
                }}
                className="font-semibold text-yellow-900 underline hover:text-yellow-700"
              >
                {didYouMean}
              </button>
              ?
            </p>
          </div>
        )}

        {/* Idle State */}
        {searchState === SEARCH_STATES.IDLE && !query.trim() && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-slate-600 font-medium">Start typing to search notes</p>
            <p className="text-sm text-slate-500 mt-1">Search across all subjects, units, and materials</p>
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mt-8 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Recent Searches</h3>
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(search);
                        performSearch(search, 1, false);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-700 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {searchState === SEARCH_STATES.SEARCHING && page === 1 && (
          <LoadingSkeleton />
        )}

        {/* No Results */}
        {showEmpty && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-600 font-medium">No results found for "{query}"</p>
            <div className="mt-3 text-sm text-slate-500 space-y-1">
              <p>Try different keywords or check your spelling</p>
              <p>• Remove filters to see more results</p>
              <p>• Try broader search terms</p>
              <p>• Use synonyms or related terms</p>
            </div>
          </div>
        )}

        {/* Grouped Results */}
        {!loading && Object.keys(groupedResults).length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(groupedResults).map(([unit, unitResults]) => (
              <div key={unit} className="animate-fadeIn">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 sm:h-6 bg-indigo-600 rounded"></span>
                  {unit}
                  <span className="text-xs sm:text-sm font-normal text-slate-500">({unitResults.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {unitResults.map((result, idx) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 transform hover:-translate-y-1"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-2 flex-1">
                          {result.file_name}
                        </h3>
                        <div className="flex gap-1 flex-shrink-0">
                          {result.keyword_match && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs rounded" title="Keyword Match">K</span>
                          )}
                          {result.semantic_match && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs rounded" title="Semantic Match">S</span>
                          )}
                          {result.weighted_score >= 10 && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs rounded font-semibold" title="High Relevance">⭐</span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[10px] sm:text-xs text-slate-600 mb-2">
                        {result.subject || "Unknown"} • Semester {result.semester || "-"}
                      </p>
                      
                      <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 line-clamp-2">
                        {renderHighlightedText(result.snippet)}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/notes?branch=${encodeURIComponent(result.branch || '')}&semester=${encodeURIComponent(result.semester || '')}&subjectName=${encodeURIComponent(result.subject || '')}&subjectId=${result.subject_id || ''}&noteId=${result.id}`}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm hover:bg-indigo-500 transition-colors whitespace-nowrap"
                        >
                          Open PDF
                        </Link>
                        <Link
                          to={`/notes?branch=${encodeURIComponent(result.branch || '')}&semester=${encodeURIComponent(result.semester || '')}&subjectName=${encodeURIComponent(result.subject || '')}&subjectId=${result.subject_id || ''}`}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Details
                        </Link>
                        {result.match_count > 1 && (
                          <span className="text-[10px] sm:text-xs text-slate-500 w-full sm:w-auto sm:ml-auto">
                            {result.match_count} matches
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button - Only show when query is valid and there are more results */}
        {showLoadMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="px-6 py-2.5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              Load More Results
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && page > 1 && (
          <div className="text-center mt-8">
            <div className="inline-block w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}

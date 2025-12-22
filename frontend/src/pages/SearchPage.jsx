import { useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client";
import { Link } from "react-router-dom";

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
  
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const resultsCache = useRef(new Map());

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
      
      // Update state based on results
      if ((data.results || []).length > 0) {
        setSearchState(SEARCH_STATES.RESULTS);
      } else {
        setSearchState(SEARCH_STATES.EMPTY);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Search failed");
      setResults([]);
      setGroupedResults({});
      setSearchState(SEARCH_STATES.EMPTY);
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
      performSearch(suggestion, 1, false);
    } else {
      performSearch(query, 1, false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    performSearch(suggestion, 1, false);
  };

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

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
            🔍 Intelligent Search
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm">
            Hybrid keyword + semantic search across all your notes
          </p>
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

        {/* Error */}
        {err && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
            {err}
          </div>
        )}

        {/* Results Count */}
        {totalResults > 0 && (
          <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-600">
            Found <span className="font-semibold text-slate-900">{totalResults}</span> results
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
          </div>
        )}

        {/* Loading */}
        {searchState === SEARCH_STATES.SEARCHING && page === 1 && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-3 text-slate-600">Searching...</p>
          </div>
        )}

        {/* No Results */}
        {showEmpty && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-600 font-medium">No results found for "{query}"</p>
            <p className="text-sm text-slate-500 mt-1">Try different keywords or check your spelling</p>
          </div>
        )}

        {/* Grouped Results */}
        {!loading && Object.keys(groupedResults).length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(groupedResults).map(([unit, unitResults]) => (
              <div key={unit}>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 sm:h-6 bg-indigo-600 rounded"></span>
                  {unit}
                  <span className="text-xs sm:text-sm font-normal text-slate-500">({unitResults.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {unitResults.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-2 flex-1">
                          {result.file_name}
                        </h3>
                        <div className="flex gap-1 flex-shrink-0">
                          {result.keyword_match && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs rounded">K</span>
                          )}
                          {result.semantic_match && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs rounded">S</span>
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

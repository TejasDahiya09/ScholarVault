import { useState, useRef, useEffect } from "react";
import client from "../api/client";

/**
 * InPDFSearch Component
 * Searches within a single PDF/note document
 */
export default function InPDFSearch({ noteId, onResultClick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await client.get(
          `/api/notes/${noteId}/search?q=${encodeURIComponent(query)}&per_page=5`
        );
        setResults(res.data.results || []);
      } catch (e) {
        console.error("In-PDF search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query, noteId]);

  // Highlight matched text with markers <<...>>
  const renderHighlightedText = (text) => {
    if (!text) return "";

    const parts = text.split(/<<|>>/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <mark key={i} className="bg-yellow-200 px-0.5">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
        title="Search in this document"
      >
        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden sm:inline">Find in PDF</span>
        <span className="sm:hidden">Find</span>
      </button>

      {/* Search Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 sm:p-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in this PDF..."
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg shrink-0"
                title="Close"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-600">Searching...</div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-600">No matches found</div>
            )}

            {!loading && results.length > 0 && (
              <div className="divide-y divide-gray-100">
                {results.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onResultClick?.(result);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 sm:p-3 hover:bg-indigo-50 transition-colors"
                  >
                    <p className="text-xs text-slate-700 line-clamp-3">
                      {renderHighlightedText(result.snippet)}
                    </p>
                    {result.match_count > 1 && (
                      <span className="text-xs text-slate-500 mt-1 inline-block">
                        {result.match_count} matches
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

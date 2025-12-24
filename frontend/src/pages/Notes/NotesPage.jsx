import React, { useEffect, useState, useRef, Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Switch } from "@headlessui/react";
import Breadcrumbs from "../../components/Breadcrumbs";
import InPDFSearch from "../../components/InPDFSearch";
import ErrorBoundary from "../../components/ErrorBoundary";
import client from "../../api/client";
import { getSignedPdfUrl, resolveKeyFromUrl } from "../../api/files";

// Lazy load PDF viewer component for performance
// Reduces initial bundle size and speeds up page load
const PdfViewerSection = lazy(() => Promise.resolve({
  default: ({ children }) => <>{children}</>
}));

/**
 * NotesPage - Smart Notes + Books + PYQ viewer with AI features
 * PERFORMANCE: Lazy loads PDF viewer, streams PDFs from backend with aggressive caching
 */
export default function NotesPage() {
  const navigate = useNavigate();
  const [query] = useSearchParams();

  // Extract URL data
  const branch = query.get("branch") || "";
  const semester = query.get("semester") || "";
  const subjectName = query.get("subjectName") || "";
  const subjectId = query.get("subjectId");
  const noteId = query.get("noteId"); // Auto-open note if provided

  // States
  const [notesList, setNotesList] = useState([]);
  const [pptList, setPptList] = useState([]);
  const [booksList, setBooksList] = useState([]);
  const [pyqList, setPyqList] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarkedNotes, setBookmarkedNotes] = useState(new Set());
  const [completedNotes, setCompletedNotes] = useState(new Set());
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [bookmarkPopup, setBookmarkPopup] = useState({ show: false, noteId: null });
  const [completePopup, setCompletePopup] = useState({ show: false, noteId: null });

  // Viewer
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeTab, setActiveTab] = useState("list"); 
  const [zoom, setZoom] = useState(1);
  const [viewerWidth, setViewerWidth] = useState(80); // 80% for viewer by default (notes bigger)
  const [showResizeHint, setShowResizeHint] = useState(false); // Show resize hint on open

  // AI
  const [aiMode, setAiMode] = useState("summary");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [ragEnabled, setRagEnabled] = useState(false);
  
  // Use refs for immediate updates without React batching
  const responseRef = useRef("");
  
  // Session storage key for summaries (per note)
  const getSummaryCacheKey = (noteId) => `sv_summary_${noteId}`;
  
  // Drag state refs for reliable slider functionality
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const containerWidthRef = useRef(0);
  const dividerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Detect file type - Check both filename and S3 URL for robustness
  const fileName = selectedNote?.file_name?.toLowerCase() || "";
  const s3Url = selectedNote?.s3_url?.toLowerCase() || "";
  const isPDF = fileName.endsWith(".pdf") || s3Url.includes(".pdf");
  const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(fileName) || /\.(png|jpg|jpeg|webp|gif|svg)/i.test(s3Url);
    // Signed URL for viewer
    const [signedViewUrl, setSignedViewUrl] = useState("")

  
  // Document type tracking
  const isNote = !selectedNote?.isBook && !selectedNote?.isPyQ && !selectedNote?.isSyllabus;
  const isBook = selectedNote?.isBook;
  const isPyQ = selectedNote?.isPyQ;
  const isSyllabus = selectedNote?.isSyllabus;
  const isPpt = selectedNote?.isPpt || false;

  // Extract unit number from DB field or filename fallback (handles "Unit-2", "Unit -2", "u2", or any digits)
  const getUnitNumber = (item) => {
    if (!item) return Number.MAX_SAFE_INTEGER;

    // Trust DB value first
    const dbUnit = parseInt(item.unit_number, 10);
    if (!Number.isNaN(dbUnit)) return dbUnit;

    const name = (item.file_name || "").toLowerCase();

    // Robust patterns for unit detection
    const patterns = [
      /unit[\s._-]*([0-9]+)/i,  // "Unit-2", "Unit - 2", "unit_2"
      /\bu\s*([0-9]+)/i,        // "u2", "u 2"
      /([0-9]+)/,               // any number as last resort
    ];

    for (const pat of patterns) {
      const m = name.match(pat);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!Number.isNaN(num)) return num;
      }
    }

    return Number.MAX_SAFE_INTEGER;
  };

  // Natural sort by unit number, fallback to filename
  const sortByUnitNumber = (list = []) => {
    return [...list].sort((a, b) => {
      const unitA = getUnitNumber(a);
      const unitB = getUnitNumber(b);
      if (unitA !== unitB) return unitA - unitB;
      return (a.file_name || "").localeCompare(b.file_name || "");
    });
  };

  // Fetch user bookmarks on mount
  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const res = await client.get('/api/bookmarks');
        const bookmarkIds = res.data?.bookmarks || [];
        setBookmarkedNotes(new Set(bookmarkIds));
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
      }
    }
    fetchBookmarks();
  }, []);

  // Fetch subject data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        if (subjectId) {
          const subjectRes = await client.get(`/api/subjects/${subjectId}`);
          const subject = subjectRes.data;

          setSubjectDetails(subject);
          const allNotes = subject.notes || [];

          const isPptFile = (item) => {
            const name = (item.file_name || "").toLowerCase();
            const url = (item.s3_url || "").toLowerCase();
            const key = (item.s3_key || "").toLowerCase();
            // Check if file has .ppt or .pptx anywhere in name, URL, or S3 key
            return name.includes('.ppt') || url.includes('.ppt') || key.includes('.ppt') || 
                   name.includes('ppt') || url.includes('ppt') || key.includes('ppt');
          };

          const pptItems = allNotes.filter(isPptFile);
          const regularNotes = allNotes.filter((n) => !isPptFile(n));

          setNotesList(sortByUnitNumber(regularNotes));
          setPptList(sortByUnitNumber(pptItems));
          setBooksList(subject.books || []);
          setPyqList(subject.pyqs || []);
          setSyllabusList(subject.syllabus || []);
          
          // Auto-select note if noteId is provided in URL
          if (noteId && subject.notes) {
            const noteToOpen = subject.notes.find(n => n.id === noteId);
            if (noteToOpen) {
              setSelectedNote(noteToOpen);
              setActiveTab('viewer');
            }
          }
        }
      } catch (err) {
        console.error("Load error:", err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subjectId, noteId]);

  // Fetch completion status for current subject so buttons reflect saved progress
  useEffect(() => {
    if (!subjectId) return;

    async function fetchCompletion() {
      try {
        const res = await client.get(`/api/subjects/${subjectId}/progress`);
        const completedIds = res.data?.completed_note_ids || [];
        setCompletedNotes(new Set(completedIds));
      } catch (err) {
        console.error("Failed to load completion status:", err);
      }
    }

    fetchCompletion();
  }, [subjectId]);

  // Load cached summary when note changes or AI mode switches
  useEffect(() => {
    if (selectedNote?.id && aiMode === "summary") {
      const cachedSummary = sessionStorage.getItem(getSummaryCacheKey(selectedNote.id));
      if (cachedSummary) {
        setAiResponse(cachedSummary);
        responseRef.current = cachedSummary;
      } else {
        setAiResponse("");
        responseRef.current = "";
      }
    } else if (aiMode === "ask") {
      // Don't clear Q&A responses when switching modes
      // Keep the last answer visible
    }
  }, [selectedNote?.id, aiMode]);

  // AI Summary
  const handleSummarize = async () => {
    if (!selectedNote?.id) return;
    
    // Check cache first
    const cachedSummary = sessionStorage.getItem(getSummaryCacheKey(selectedNote.id));
    if (cachedSummary) {
      setAiResponse(cachedSummary);
      responseRef.current = cachedSummary;
      return;
    }
    
    try {
      setAiLoading(true);
      setAiResponse("");
      responseRef.current = "";
      console.log("Starting summary stream...");
      
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE}/api/notes/${selectedNote.id}/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sv_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream complete");
          break;
        }

        // Decode and add to buffer
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines[lines.length - 1];
        
        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              if (data.done) {
                console.log("Summary stream finished");
              } else if (data.error) {
                throw new Error(data.error);
              } else if (data.chunk) {
                responseRef.current += data.chunk;
                setAiResponse(responseRef.current);
                console.log("Chunk received:", data.chunk.substring(0, 30));
              }
            } catch (e) {
              console.error('JSON parse error:', e);
            }
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const jsonStr = buffer.trim().slice(6);
          const data = JSON.parse(jsonStr);
          if (data.chunk) {
            responseRef.current += data.chunk;
            setAiResponse(responseRef.current);
            console.log("Final chunk, total:", responseRef.current.length);
          }
        } catch (e) {
          console.error('Final buffer parse error:', e);
        }
      }
      
      // Save to session storage for this session
      if (responseRef.current && selectedNote?.id) {
        sessionStorage.setItem(getSummaryCacheKey(selectedNote.id), responseRef.current);
        console.log("Summary cached for note:", selectedNote.id);
      }
    } catch (err) {
      console.error("Summary error:", err);
      setAiResponse("Error: " + (err.message || "Failed to generate summary"));
    } finally {
      setAiLoading(false);
    }
  };

  // AI Q&A
  const handleAskQuestion = async () => {
    if (!selectedNote?.id || !question.trim()) return;
    try {
      setAiLoading(true);
      setAiResponse("");
      responseRef.current = "";
      console.log("Starting question stream...");
      
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE}/api/notes/${selectedNote.id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sv_token')}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          useRag: ragEnabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to answer question');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream complete");
          break;
        }

        // Decode and add to buffer
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines[lines.length - 1];
        
        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              if (data.done) {
                console.log("Question stream finished");
              } else if (data.error) {
                throw new Error(data.error);
              } else if (data.chunk) {
                responseRef.current += data.chunk;
                setAiResponse(responseRef.current);
                console.log("Chunk received:", data.chunk.substring(0, 30));
              }
            } catch (e) {
              console.error('JSON parse error:', e);
            }
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const jsonStr = buffer.trim().slice(6);
          const data = JSON.parse(jsonStr);
          if (data.chunk) {
            responseRef.current += data.chunk;
            setAiResponse(responseRef.current);
            console.log("Final chunk, total:", responseRef.current.length);
          }
        } catch (e) {
          console.error('Final buffer parse error:', e);
        }
      }
      
      setQuestion("");
    } catch (err) {
      console.error("Question error:", err);
      setAiResponse("Error: " + (err.message || "Failed to answer question"));
    } finally {
      setAiLoading(false);
    }
  };

  // Viewer open
  const openNoteViewer = (note) => {
    setSelectedNote(note);
    setActiveTab("viewer");
    setZoom(1);
    setAiMode("summary");
    // Load cached summary if available
    const cachedSummary = sessionStorage.getItem(getSummaryCacheKey(note.id));
    setAiResponse(cachedSummary || "");
    responseRef.current = cachedSummary || "";
    setQuestion("");
    setRagEnabled(false);
    setShowResizeHint(true); // Show resize hint when opening document
    setSignedViewUrl("");
    // User must click "Got it" to close - no auto-hide
  };
  // Generate signed URL when a PDF note is selected
  useEffect(() => {
    let active = true;
    async function gen() {
      try {
        if (!selectedNote) return;
        const fname = selectedNote?.file_name?.toLowerCase() || "";
        const surl = selectedNote?.s3_url || "";
        const isPdf = fname.endsWith(".pdf") || (surl && surl.toLowerCase().includes(".pdf"));
        if (!isPdf) {
          setSignedViewUrl("");
          return;
        }
        const key = selectedNote.s3_key || resolveKeyFromUrl(selectedNote.s3_url);
        if (!key) return;
        const url = await getSignedPdfUrl(key, "view");
        if (active) setSignedViewUrl(url);
      } catch (e) {
        console.error("Failed to get signed viewer URL:", e);
        if (active) setSignedViewUrl("");
      }
    }
    gen();
    return () => { active = false; };
  }, [selectedNote]);


  const closeViewer = () => {
    setActiveTab("list");
    setSelectedNote(null);
  };

  // Track note study time invisibly (no timer UI)
  useEffect(() => {
    if (!selectedNote || !subjectId) return;

    const startTime = Date.now();
    const noteId = selectedNote.id;

    // Silent start tracking
    client.post(`/api/progress/note/${noteId}/start`, {
      startedAt: new Date().toISOString()
    }).catch(() => {}); // Ignore errors silently

    // On unmount or note change, send duration
    return () => {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      if (durationSeconds > 5) { // Only track if studied for more than 5 seconds
        client.post(`/api/progress/note/${noteId}/end`, {
          subjectId,
          durationSeconds
        }).catch(() => {}); // Ignore errors silently
      }
    };
  }, [selectedNote, subjectId]);

  // Handle resize divider drag - optimized for smooth performance
  useEffect(() => {
    let lastClientX = 0;

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      
      moveEvent.preventDefault();
      lastClientX = moveEvent.clientX;

      // Cancel previous animation frame if exists
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const diff = lastClientX - startXRef.current;
        const percentChange = (diff / containerWidthRef.current) * 100;
        const newWidth = Math.max(40, Math.min(80, startWidthRef.current + percentChange));
        setViewerWidth(newWidth);
      });
    };

    const handleMouseUp = (upEvent) => {
      if (!isDraggingRef.current) return;
      
      upEvent.preventDefault();
      isDraggingRef.current = false;

      // Cancel pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Reset visual feedback
      if (dividerRef.current) {
        dividerRef.current.style.backgroundColor = '';
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
    };

    // Keyboard shortcuts for resizing
    const handleKeyDown = (keyEvent) => {
      if (!selectedNote || !isPDF || !isNote) return;

      if (keyEvent.ctrlKey || keyEvent.metaKey) {
        if (keyEvent.key === 'ArrowRight') {
          keyEvent.preventDefault();
          setViewerWidth(prev => Math.min(80, prev + 5));
        } else if (keyEvent.key === 'ArrowLeft') {
          keyEvent.preventDefault();
          setViewerWidth(prev => Math.max(40, prev - 5));
        } else if (keyEvent.key === '1') {
          keyEvent.preventDefault();
          setViewerWidth(80); // Notes Focus (increased)
        } else if (keyEvent.key === '2') {
          keyEvent.preventDefault();
          setViewerWidth(60); // Balanced split (changed to 60-40)
        } else if (keyEvent.key === '3') {
          keyEvent.preventDefault();
          setViewerWidth(40); // AI Focus (minimum 40 for notes)
        }
      }
    };

    // Attach listeners with capture and passive option where applicable
    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false });
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false });
    window.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false });
    window.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false });
    document.addEventListener('keydown', handleKeyDown, false);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('keydown', handleKeyDown, false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedNote, isPDF, isNote]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = viewerWidth;
    
    const container = document.querySelector('.viewer-container');
    if (!container) {
      isDraggingRef.current = false;
      return;
    }
    containerWidthRef.current = container.offsetWidth;
    
    // Add visual feedback
    const divider = e.currentTarget;
    dividerRef.current = divider;
    divider.style.backgroundColor = '#3b82f6';
    divider.style.width = '4px';
    divider.style.marginLeft = '-1.5px';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.documentElement.style.cursor = 'col-resize';
  };

  // Breadcrumbs with proper navigation
  const crumbs = [
    { label: "Subjects", to: "/home" },
    subjectName && { label: subjectName, onClick: () => window.location.reload() },
  ].filter(Boolean);

  // Download 
  const handleDownload = async () => {
    try {
      if (!selectedNote) return;
      const key = selectedNote.s3_key || resolveKeyFromUrl(selectedNote.s3_url);
      if (!key) return;
      const url = await getSignedPdfUrl(key, "download");
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedNote.file_name || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  // Open in new tab
  const handleOpenNewTab = async () => {
    try {
      if (!selectedNote) return;
      const key = selectedNote.s3_key || resolveKeyFromUrl(selectedNote.s3_url);
      if (!key) return;
      const url = await getSignedPdfUrl(key, "view");
      window.open(url, "_blank");
    } catch (e) {
      console.error("Open new tab failed:", e);
    }
  };

  // Handle mark as complete
  const handleMarkComplete = async (e, noteId) => {
    e.stopPropagation();
    try {
      const isCompleted = completedNotes.has(noteId);
      await client.post(`/api/notes/${noteId}/complete`, {
        subjectId: subjectId,
        completed: !isCompleted,
      });
      
      const newCompleted = new Set(completedNotes);
      if (isCompleted) {
        newCompleted.delete(noteId);
        setToast({ show: true, message: "Marked as incomplete", type: "info" });
      } else {
        newCompleted.add(noteId);
        setToast({ show: true, message: "✓ Marked as complete!", type: "success" });
        setCompletePopup({ show: true, noteId });
        setTimeout(() => setCompletePopup({ show: false, noteId: null }), 3000);
      }
      setCompletedNotes(newCompleted);
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    } catch (err) {
      console.error("Failed to mark note complete:", err);
      setToast({ show: true, message: "Failed to update completion status", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  // Handle bookmark toggle
  const handleToggleBookmark = async (e, noteId) => {
    e.stopPropagation();
    try {
      const isBookmarked = bookmarkedNotes.has(noteId);
      await client.post(`/api/notes/${noteId}/bookmark`);
      
      const newBookmarked = new Set(bookmarkedNotes);
      if (isBookmarked) {
        newBookmarked.delete(noteId);
        setToast({ show: true, message: "Bookmark removed", type: "info" });
      } else {
        newBookmarked.add(noteId);
        // Show bookmark popup for new bookmarks
        setBookmarkPopup({ show: true, noteId });
        setTimeout(() => setBookmarkPopup({ show: false, noteId: null }), 3000);
      }
      setBookmarkedNotes(newBookmarked);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      setToast({ show: true, message: "Failed to update bookmark", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  // ------------------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------------------

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <>
      {/* Bookmark Saved Popup */}
      {bookmarkPopup.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-in fade-in zoom-in duration-300 pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm border border-gray-200">
              <div className="text-5xl mb-4">⭐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Saved!</h2>
              <p className="text-gray-600">This note has been saved for future learning</p>
              <p className="text-sm text-gray-500 mt-3">You can access it anytime from your bookmarks</p>
            </div>
          </div>
        </div>
      )}
      {completePopup.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-in fade-in zoom-in duration-300 pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm border border-gray-200">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Completed!</h2>
              <p className="text-gray-600">Marked as done and tracked in your progress</p>
              <p className="text-sm text-gray-500 mt-3">You can revisit or unmark anytime</p>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg font-medium text-white ${
            toast.type === "success" ? "bg-green-500" :
            toast.type === "error" ? "bg-red-500" :
            "bg-blue-500"
          }`}>
            {toast.message}
          </div>
        </div>
      )}
      {/* Normal Page */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-8 sm:pb-10 md:pb-12">
        <Breadcrumbs crumbs={crumbs} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{subjectName}</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm sm:text-base whitespace-nowrap"
          >
            ← Back
          </button>
        </div>

        {/* Notes Section */}
        {notesList.length > 0 && (
          <Section
            title="📝 Notes"
            items={notesList}
            onClick={openNoteViewer}
            onToggleBookmark={handleToggleBookmark}
            onMarkComplete={handleMarkComplete}
            bookmarkedNotes={bookmarkedNotes}
            completedNotes={completedNotes}
            showMarkComplete={true}
          />
        )}

        {/* PPT Section */}
        {pptList.length > 0 && (
          <Section
            title="📑 PPTs"
            items={pptList}
            onClick={(ppt) => openNoteViewer({ ...ppt, isPpt: true })}
            onToggleBookmark={handleToggleBookmark}
            onMarkComplete={handleMarkComplete}
            bookmarkedNotes={bookmarkedNotes}
            completedNotes={completedNotes}
            showMarkComplete={false}
          />
        )}

        {/* PYQ Section */}
        {pyqList.length > 0 && (
          <Section
            title="❓ Previous Year Questions"
            items={pyqList}
            onClick={(pyq) => openNoteViewer({ ...pyq, isPyQ: true })}
            onToggleBookmark={handleToggleBookmark}
            onMarkComplete={handleMarkComplete}
            bookmarkedNotes={bookmarkedNotes}
            completedNotes={completedNotes}
            showMarkComplete={false}
          />
        )}

        {/* Syllabus (PNG/JPG) */}
        {syllabusList.length > 0 && (
          <Section
            title="📋 Syllabus"
            items={syllabusList}
            onClick={(syll) => openNoteViewer({ ...syll, isSyllabus: true })}
            onToggleBookmark={handleToggleBookmark}
            onMarkComplete={handleMarkComplete}
            bookmarkedNotes={bookmarkedNotes}
            completedNotes={completedNotes}
            showMarkComplete={false}
          />
        )}

        {/* Books */}
        {booksList.length > 0 && (
          <Section
            title="📚 Books"
            items={booksList}
            onClick={(book) => openNoteViewer({ ...book, isBook: true })}
            onToggleBookmark={handleToggleBookmark}
            onMarkComplete={handleMarkComplete}
            bookmarkedNotes={bookmarkedNotes}
            completedNotes={completedNotes}
            showMarkComplete={false}
          />
        )}
      </div>

      {/* Blur background when viewer open */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"></div>
      )}

      {/* VIEWER MODAL */}
      {selectedNote && (
        <ErrorBoundary>
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="bg-white rounded-lg p-6 shadow-2xl"><p className="text-gray-700 font-semibold">Loading PDF viewer...</p><div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 animate-pulse"></div></div></div></div>}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2" data-viewer-modal="true">
          <div className="bg-white w-full h-full max-w-full rounded-none sm:rounded-lg shadow-xl flex flex-col overflow-hidden mx-0 sm:mx-2">

            {/* Header */}
            <div className="flex justify-between items-center px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b bg-gray-50">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate">{selectedNote.file_name}</h2>
              </div>

              <button
                onClick={closeViewer}
                className="text-2xl sm:text-3xl font-light text-gray-500 hover:text-gray-700 shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden viewer-container bg-white dark:bg-white" data-theme="light">

              {/* Viewer */}
              <div 
                style={{ width: isNote ? `${viewerWidth}%` : '100%' }} 
                className={`flex flex-col overflow-hidden bg-white dark:bg-white ${!isNote ? 'mx-auto max-w-6xl' : ''}`}
              >

                {/* Toolbar */}
                <div className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 md:gap-3 bg-white border-b flex-wrap">
                  <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded text-sm sm:text-base"
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  >➖</button>

                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded bg-white text-xs sm:text-sm">{Math.round(zoom * 100)}%</span>

                  <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded text-sm sm:text-base"
                    onClick={() => setZoom(z => z + 0.1)}
                  >➕</button>

                  <div className="flex-1" />

                  {/* In-PDF Search */}
                  {selectedNote?.id && (
                    <InPDFSearch
                      noteId={selectedNote.id}
                      onResultClick={(result) => {
                        // Optional: could scroll to result or show snippet
                        console.log("Search result clicked:", result);
                      }}
                    />
                  )}

                  <button
                    onClick={handleDownload}
                    className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-blue-600 text-white rounded text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">⬇ Download</span>
                    <span className="sm:hidden">⬇</span>
                  </button>

                  {isNote && (
                    <button
                      onClick={(e) => handleMarkComplete(e, selectedNote?.id)}
                      className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded text-xs sm:text-sm whitespace-nowrap font-medium transition-all ${
                        completedNotes.has(selectedNote?.id)
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                      title="Mark as complete"
                    >
                      <span className="hidden sm:inline">{completedNotes.has(selectedNote?.id) ? "✓ Completed" : "Mark Complete"}</span>
                      <span className="sm:hidden">{completedNotes.has(selectedNote?.id) ? "✓" : "Done"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleOpenNewTab}
                    className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-indigo-600 text-white rounded text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Open ↗</span>
                    <span className="sm:hidden">↗</span>
                  </button>
                </div>

                {/* Viewer area - force light theme */}
                <div className="flex-1 overflow-auto p-2 bg-white dark:bg-white" style={{ colorScheme: 'light' }}>

                  {/* PDF VIEW */}
                  {isPDF && (
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        width: `${100 / zoom}%`,
                      }}
                    >
                      <iframe
                        src={signedViewUrl || "about:blank"}
                        className="w-full h-screen bg-white dark:bg-white"
                        style={{ border: "none", background: '#ffffff', colorScheme: 'light' }}
                        allow="fullscreen"
                        title="PDF Viewer"
                      />
                    </div>
                  )}

                  {/* IMAGE VIEW (PNG/JPG) */}
                  {isImage && (
                    <div className="flex justify-center p-4">
                      <img
                        src={selectedNote.s3_url}
                        alt={selectedNote.file_name}
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: "top left",
                          filter: 'none',
                        }}
                        className="max-w-none dark:invert-0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Resizable Divider with Preset Buttons */}
              {isPDF && isNote && (
                <>
                  <div className="flex flex-col items-center gap-1 bg-gray-50 py-2 px-0.5">
                    {/* Preset Layout Buttons */}
                    <div className="flex gap-0.5 flex-col w-full">
                      <button
                        onClick={() => setViewerWidth(80)}
                        title="Notes Focus (Ctrl+1)"
                        className={`px-2 py-1.5 text-xs font-semibold rounded transition-all whitespace-nowrap ${
                          viewerWidth >= 78 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📄 Notes
                      </button>
                      <button
                        onClick={() => setViewerWidth(60)}
                        title="Balanced (Ctrl+2)"
                        className={`px-2 py-1.5 text-xs font-semibold rounded transition-all whitespace-nowrap ${
                          viewerWidth >= 58 && viewerWidth <= 62
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ⚖️ Split
                      </button>
                      <button
                        onClick={() => setViewerWidth(40)}
                        title="AI Focus (Ctrl+3)"
                        className={`px-2 py-1.5 text-xs font-semibold rounded transition-all whitespace-nowrap ${
                          viewerWidth <= 42
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        🤖 AI
                      </button>
                    </div>
                  </div>

                  {/* Draggable Divider */}
                  <div
                    ref={dividerRef}
                    onMouseDown={handleMouseDown}
                    className="select-none group"
                    style={{ 
                      width: '2px',
                      background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      flexShrink: 0,
                      transition: 'all 0.3s ease',
                      cursor: 'col-resize',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.width = '4px';
                      e.currentTarget.style.background = 'linear-gradient(180deg, rgba(59, 130, 246, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)';
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(59, 130, 246, 0.5), inset 0 0 8px rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isDraggingRef.current) {
                        e.currentTarget.style.width = '2px';
                        e.currentTarget.style.background = 'linear-gradient(180deg, rgba(59, 130, 246, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)';
                        e.currentTarget.style.boxShadow = '';
                      }
                    }}
                    title="Drag to resize panels • Ctrl+1/2/3 for presets • Ctrl+Arrow keys to adjust"
                  />
                  
                  {/* Resize Hint Popup */}
                  {showResizeHint && (
                    <div className="fixed top-1/2 transform -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 max-w-sm border border-gray-200" style={{ right: '24px', backdropFilter: 'blur(10px)' }}>
                      <style>{`
                        @keyframes slideInRight {
                          0% {
                            transform: translateX(500px);
                            opacity: 0;
                          }
                          70% {
                            transform: translateX(-8px);
                          }
                          100% {
                            transform: translateX(0);
                            opacity: 1;
                          }
                        }
                        .resize-hint-popup {
                          animation: slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                        @keyframes fadeOut {
                          to {
                            opacity: 0;
                            transform: translateX(20px);
                          }
                        }
                        .resize-hint-popup.fade-out {
                          animation: fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                        }
                      `}</style>
                      <div className="resize-hint-popup">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg">⚙️</div>
                            <h3 className="font-semibold text-lg text-gray-900">Panel Control</h3>
                          </div>
                          <button
                            onClick={() => setShowResizeHint(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-light w-6 h-6 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Method 1: Drag */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="text-sm">1️⃣</span>
                            <span>Drag Divider</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed ml-6">Click and drag the subtle line between panels to adjust sizes smoothly</p>
                        </div>

                        {/* Method 2: Preset Buttons */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                            <span className="text-sm">2️⃣</span>
                            <span>Quick Presets</span>
                          </div>
                          <div className="space-y-1.5 ml-6">
                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium">📄 Notes Focus</span>
                              <span className="bg-white text-gray-600 px-2.5 py-1 rounded text-xs font-mono font-semibold border border-gray-300">Ctrl+1</span>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium">⚖️ Balanced</span>
                              <span className="bg-white text-gray-600 px-2.5 py-1 rounded text-xs font-mono font-semibold border border-gray-300">Ctrl+2</span>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium">🤖 AI Focus</span>
                              <span className="bg-white text-gray-600 px-2.5 py-1 rounded text-xs font-mono font-semibold border border-gray-300">Ctrl+3</span>
                            </div>
                          </div>
                        </div>

                        {/* Method 3: Keyboard */}
                        <div className="mb-6">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                            <span className="text-sm">3️⃣</span>
                            <span>Keyboard Control</span>
                          </div>
                          <div className="space-y-1.5 ml-6">
                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium">Expand Notes</span>
                              <span className="bg-white text-gray-600 px-2.5 py-1 rounded text-xs font-mono font-semibold border border-gray-300">Ctrl + →</span>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium">Shrink Notes</span>
                              <span className="bg-white text-gray-600 px-2.5 py-1 rounded text-xs font-mono font-semibold border border-gray-300">Ctrl + ←</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Button */}
                        <button
                          onClick={() => setShowResizeHint(false)}
                          className="w-full py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-base hover:shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                        >
                          Got It
                        </button>
                      </div>
                      {/* Close popup container */}
                    </div>
                  )}
                </>
              )}

              {/* AI PANEL (NOTES & PPT) */}
              {selectedNote && isNote && (
                <div style={{ width: `${100 - viewerWidth}%` }} className="border-l bg-white flex flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b">
                    {!isPpt && (
                      <button
                        className={`flex-1 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ${aiMode === "summary" ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600" : "text-gray-600"}`}
                        onClick={() => { setAiMode("summary"); setAiResponse(""); }}
                      >
                        Summarize
                      </button>
                    )}

                    <button
                      className={`flex-1 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ${aiMode === "qa" ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600" : "text-gray-600"}`}
                      onClick={() => { setAiMode("qa"); setAiResponse(""); }}
                    >
                      Ask AI
                    </button>
                  </div>

                  {/* RAG Toggle */}
                  {aiMode === "qa" && (
                    <div className="p-2 sm:p-3 border-b">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs sm:text-sm">Use Notes Context (RAG)</span>
                        <Switch
                          checked={ragEnabled}
                          onChange={setRagEnabled}
                          className={`${ragEnabled ? "bg-indigo-600" : "bg-gray-300"} relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full shrink-0`}
                        >
                          <span
                            className={`${ragEnabled ? "translate-x-5 sm:translate-x-6" : "translate-x-1"} inline-block h-3 w-3 sm:h-4 sm:w-4 transform bg-white rounded-full`}
                          />
                        </Switch>
                      </div>
                      {ragEnabled && (
                        <style>{`
                          @keyframes popIn {
                            0% { 
                              transform: scale(0.5) translateY(-10px);
                              opacity: 0;
                            }
                            50% {
                              transform: scale(1.05);
                            }
                            100% {
                              transform: scale(1) translateY(0);
                              opacity: 1;
                            }
                          }
                          .rag-disclaimer {
                            animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                          }
                        `}</style>
                      )}
                      {ragEnabled && (
                        <div className="rag-disclaimer mt-2 p-2 sm:p-2.5 bg-linear-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-md">
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-900 flex items-center gap-1 sm:gap-1.5">
                            <span className="text-xs sm:text-sm">🎯</span>
                            <span className="line-clamp-2">RAG Mode Active: Using your notes for context-aware answers</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Output */}
                  <div className="flex-1 overflow-auto p-3 sm:p-4 bg-gray-50">
                    {aiLoading ? (
                      <div className="text-center text-gray-500">
                        <div className="text-xs sm:text-sm">Generating...</div>
                        <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Streaming output in real-time</div>
                      </div>
                    ) : aiResponse ? (
                      <div className="prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed">
                        <div className="whitespace-pre-wrap text-gray-700">{aiResponse}</div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-6 sm:py-8 text-xs">
                        {aiMode === "summary" ? "Click summarize to begin" : "Ask a question"}
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-3 sm:p-4 border-t bg-gray-50">
                    {aiMode === "summary" ? (
                      <button
                        onClick={handleSummarize}
                        className="w-full py-2 sm:py-2.5 bg-indigo-600 text-white rounded text-sm sm:text-base font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Summarize
                      </button>
                    ) : (
                      <>
                        <input
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded mb-2 text-sm sm:text-base"
                          placeholder="Ask a question..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAskQuestion();
                            }
                          }}
                        />
                        <button
                          onClick={handleAskQuestion}
                          className="w-full py-2 sm:py-2.5 bg-indigo-600 text-white rounded text-sm sm:text-base font-medium hover:bg-indigo-700 transition-colors"
                        >
                          Send
                        </button>
                      </>
                    )}
                  </div>
                </div>
                )}

            </div>
          </div>
        </div>
          </Suspense>
        </ErrorBoundary>
      )}

    </>
  );
}

/** Reusable Section Component **/
function Section({ title, items, onClick, onToggleBookmark, onMarkComplete, bookmarkedNotes, completedNotes, showMarkComplete = false }) {
  return (
    <div className="my-4 sm:my-5 md:my-6">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{title} ({items.length})</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-4 sm:p-5 text-left hover:shadow-lg hover:border-indigo-200 transition cursor-pointer group relative"
          >
            {/* Star Bookmark Button */}
            <button
              onClick={(e) => onToggleBookmark(e, item.id)}
              className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xl sm:text-2xl opacity-60 hover:opacity-100 transition-opacity z-10"
              title={bookmarkedNotes?.has(item.id) ? "Remove bookmark" : "Add bookmark"}
            >
              {bookmarkedNotes?.has(item.id) ? "⭐" : "☆"}
            </button>

            {/* Main Content */}
            <button
              onClick={() => onClick(item)}
              className="w-full text-left"
            >
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4 pr-8">
                <div className="text-2xl sm:text-3xl md:text-4xl shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm sm:text-base text-gray-900 line-clamp-2">{item.file_name}</h4>
                </div>
              </div>
              <div className="text-indigo-600 text-xs sm:text-sm">Click to view →</div>
            </button>

            {/* Mark Complete Button - Only show for actual notes */}
            {showMarkComplete && (
              <button
                onClick={(e) => onMarkComplete(e, item.id)}
                className={`w-full mt-3 sm:mt-4 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                  completedNotes?.has(item.id)
                    ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {completedNotes?.has(item.id) ? "✓ Completed" : "Mark as Complete"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

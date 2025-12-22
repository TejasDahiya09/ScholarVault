import { useEffect } from 'react';

/**
 * useClickOutside Hook
 * 
 * Performance optimized click-outside detection
 * Handles clicks, touches, and escape key
 * 
 * @param {React.RefObject} ref - Element ref to detect clicks outside of
 * @param {Function} handler - Callback when click outside occurs
 * @param {boolean} enabled - Whether the listener is active
 */
export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handler(event);
      }
    };

    // Use capture phase for better performance
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [ref, handler, enabled]);
}

export default useClickOutside;

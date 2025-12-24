import { create } from "zustand";

const useDarkMode = create((set) => ({
  darkMode: localStorage.getItem("sv_darkMode") === "true" || false,
  
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    localStorage.setItem("sv_darkMode", newDarkMode.toString());
    
    // Apply transitions to app root (not body) to allow viewer isolation
    const rootEl = document.getElementById('root') || document.body;
    rootEl.style.transition = 'filter 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Small delay to ensure transition is registered before changes
    setTimeout(() => {
      // Apply premium dark mode with smooth invert filter
      if (newDarkMode) {
        rootEl.style.filter = 'invert(0.93) hue-rotate(180deg)';
        rootEl.style.backgroundColor = '#0a0a0a';
        
        // Exclude notes viewer from dark inversion
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'none';
          viewerModal.style.backgroundColor = '#ffffff';
        }
      } else {
        rootEl.style.filter = 'none';
        rootEl.style.backgroundColor = '';
        
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'none';
        }
      }
    }, 0);
    
    return { darkMode: newDarkMode };
  }),
  
  setDarkMode: (value) => set(() => {
    localStorage.setItem("sv_darkMode", value.toString());
    
    const rootEl = document.getElementById('root') || document.body;
    rootEl.style.transition = 'filter 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Small delay to ensure transition is registered before changes
    setTimeout(() => {
      if (value) {
        rootEl.style.filter = 'invert(0.93) hue-rotate(180deg)';
        rootEl.style.backgroundColor = '#0a0a0a';
        
        // Exclude notes viewer from dark inversion
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'none';
          viewerModal.style.backgroundColor = '#ffffff';
        }
      } else {
        rootEl.style.filter = 'none';
        rootEl.style.backgroundColor = '';
        
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'none';
        }
      }
    }, 0);
    
    return { darkMode: value };
  }),
}));

export default useDarkMode;
import { create } from "zustand";

const useDarkMode = create((set) => ({
  darkMode: localStorage.getItem("sv_darkMode") === "true" || false,
  
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    localStorage.setItem("sv_darkMode", newDarkMode.toString());
    
    // Add smooth transition to body
    document.body.style.transition = 'filter 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Small delay to ensure transition is registered before changes
    setTimeout(() => {
      // Apply premium dark mode with smooth invert filter
      if (newDarkMode) {
        document.body.style.filter = 'invert(0.93) hue-rotate(180deg)';
        document.body.style.backgroundColor = '#0a0a0a';
        
        // Prevent dark mode from affecting viewer
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'invert(0.93) hue-rotate(180deg)';
        }
      } else {
        document.body.style.filter = 'none';
        document.body.style.backgroundColor = '';
        
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
    
    // Add smooth transition to body
    document.body.style.transition = 'filter 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Small delay to ensure transition is registered before changes
    setTimeout(() => {
      if (value) {
        document.body.style.filter = 'invert(0.93) hue-rotate(180deg)';
        document.body.style.backgroundColor = '#0a0a0a';
        
        // Prevent dark mode from affecting viewer
        const viewerModal = document.querySelector('[data-viewer-modal="true"]');
        if (viewerModal) {
          viewerModal.style.filter = 'invert(0.93) hue-rotate(180deg)';
        }
      } else {
        document.body.style.filter = 'none';
        document.body.style.backgroundColor = '';
        
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
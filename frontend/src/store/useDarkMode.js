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
        
        // Exclude elements marked with data-no-dark-mode (e.g., NotesPage viewer)
        const noDarkModeElements = document.querySelectorAll('[data-no-dark-mode="true"]');
        noDarkModeElements.forEach(el => {
          el.style.filter = 'invert(0.93) hue-rotate(180deg)';
          el.style.isolation = 'isolate';
        });
      } else {
        document.body.style.filter = 'none';
        document.body.style.backgroundColor = '';
        
        const noDarkModeElements = document.querySelectorAll('[data-no-dark-mode="true"]');
        noDarkModeElements.forEach(el => {
          el.style.filter = 'none';
          el.style.isolation = 'auto';
        });
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
        
        // Exclude elements marked with data-no-dark-mode (e.g., NotesPage viewer)
        const noDarkModeElements = document.querySelectorAll('[data-no-dark-mode="true"]');
        noDarkModeElements.forEach(el => {
          el.style.filter = 'invert(0.93) hue-rotate(180deg)';
          el.style.isolation = 'isolate';
        });
      } else {
        document.body.style.filter = 'none';
        document.body.style.backgroundColor = '';
        
        const noDarkModeElements = document.querySelectorAll('[data-no-dark-mode="true"]');
        noDarkModeElements.forEach(el => {
          el.style.filter = 'none';
          el.style.isolation = 'auto';
        });
      }
    }, 0);
    
    return { darkMode: value };
  }),
}));

export default useDarkMode;
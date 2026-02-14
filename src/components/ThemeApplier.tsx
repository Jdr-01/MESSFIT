'use client';

import { useEffect } from 'react';

export default function ThemeApplier() {
  useEffect(() => {
    const applyThemeSettings = () => {
      try {
        // Read the current theme from ThemeContext's localStorage
        const currentTheme = localStorage.getItem('theme') || 'light';
        const isDark = currentTheme === 'dark';

        // Apply the appropriate background based on current theme
        if (isDark) {
          document.body.style.background = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)';
        } else {
          document.body.style.background = 'linear-gradient(180deg, #F5F7FB 0%, #EEF2F9 50%, #FFFFFF 100%)';
        }
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.minHeight = '100vh';
      } catch (error) {
        console.error('Error applying theme settings:', error);
        // Fallback to light
        document.body.style.background = 'linear-gradient(180deg, #F5F7FB 0%, #EEF2F9 50%, #FFFFFF 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.minHeight = '100vh';
      }
    };

    applyThemeSettings();

    // Listen for theme changes
    window.addEventListener('storage', applyThemeSettings);
    
    // Also listen for custom theme-change event
    window.addEventListener('theme-change', applyThemeSettings);
    
    return () => {
      window.removeEventListener('storage', applyThemeSettings);
      window.removeEventListener('theme-change', applyThemeSettings);
    };
  }, []);

  return null;
}

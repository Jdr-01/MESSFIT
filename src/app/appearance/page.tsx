'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface ThemeSettings {
  backgroundPreset: 'dark' | 'blue' | 'purple' | 'light';
  glassIntensity: number; // 0-100
  increaseContrast: boolean;
  reduceTransparency: boolean;
}

const BACKGROUND_PRESETS = {
  dark: {
    name: 'Dark Glass',
    subtitle: 'Premium & Best Contrast',
    gradient: 'from-[#2E2E2E] via-[#3A3A3A] to-[#262626]',
    preview: 'linear-gradient(to bottom, #2E2E2E, #3A3A3A, #262626)',
  },
  blue: {
    name: 'Soft Blue',
    subtitle: 'Calm & Health-Friendly',
    gradient: 'from-[#1F2A44] via-[#2A3B66] to-[#1A2238]',
    preview: 'linear-gradient(to bottom, #1F2A44, #2A3B66, #1A2238)',
  },
  purple: {
    name: 'Soft Purple',
    subtitle: 'Modern & Subtle',
    gradient: 'from-[#2A2438] via-[#3B2F5A] to-[#241C36]',
    preview: 'linear-gradient(to bottom, #2A2438, #3B2F5A, #241C36)',
  },
  light: {
    name: 'Light Glass',
    subtitle: 'Clean & Minimal',
    gradient: 'from-[#F6F8FC] via-[#EEF2F9] to-[#FFFFFF]',
    preview: 'linear-gradient(to bottom, #F6F8FC, #EEF2F9, #FFFFFF)',
  },
};

export default function AppearancePage() {
  const [userId, setUserId] = useState('');
  const [settings, setSettings] = useState<ThemeSettings>({
    backgroundPreset: 'light',
    glassIntensity: 50,
    increaseContrast: false,
    reduceTransparency: false,
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.uid);
      await loadSettings(user.uid);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadSettings = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.themeSettings) {
          setSettings(data.themeSettings);
          applyTheme(data.themeSettings);
        }
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  };

  const applyTheme = (themeSettings: ThemeSettings) => {
    // Store in localStorage for immediate access on page load
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
    
    // Apply to body or root element
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme-preset', themeSettings.backgroundPreset);
      document.documentElement.setAttribute('data-glass-intensity', themeSettings.glassIntensity.toString());
      document.documentElement.setAttribute('data-increase-contrast', themeSettings.increaseContrast.toString());
      document.documentElement.setAttribute('data-reduce-transparency', themeSettings.reduceTransparency.toString());
    }
  };

  const saveSettings = async (newSettings: ThemeSettings, reload = false) => {
    if (!userId) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        themeSettings: newSettings,
      });
      setSettings(newSettings);
      applyTheme(newSettings);
      
      if (reload) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving theme settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePresetChange = (preset: 'dark' | 'blue' | 'purple' | 'light') => {
    const newSettings = { ...settings, backgroundPreset: preset };
    saveSettings(newSettings, true);
  };

  const handleIntensityChange = (value: number) => {
    const newSettings = { ...settings, glassIntensity: value };
    setSettings(newSettings);
    applyTheme(newSettings);
  };

  const handleIntensityChangeEnd = () => {
    saveSettings(settings);
  };

  const handleToggle = (key: 'increaseContrast' | 'reduceTransparency') => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleReset = async () => {
    if (!confirm('Reset to default appearance settings?')) return;
    
    const defaultSettings: ThemeSettings = {
      backgroundPreset: 'light',
      glassIntensity: 50,
      increaseContrast: false,
      reduceTransparency: false,
    };
    
    await saveSettings(defaultSettings, true);
  };

  const currentPreset = BACKGROUND_PRESETS[settings.backgroundPreset];
  const isLightTheme = settings.backgroundPreset === 'light';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentPreset.gradient} pb-24`}>
      {/* Header */}
      <div className={`${isLightTheme ? 'bg-black/10' : 'bg-white/15'} backdrop-blur-3xl border-b ${isLightTheme ? 'border-black/20' : 'border-white/20'} shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] px-6 py-4`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className={`${isLightTheme ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'} transition-all duration-300 hover:scale-110`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className={`text-xl font-bold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Appearance</h1>
            <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>Customize your app experience</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Section 1: Background Theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isLightTheme ? 'bg-white/60' : 'bg-white/15'} backdrop-blur-3xl border ${isLightTheme ? 'border-black/20' : 'border-white/20'} shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-2xl p-6`}
        >
          <div className="mb-4">
            <h2 className={`text-lg font-bold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Background</h2>
            <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>Applies across the entire app</p>
          </div>

          {/* Background Presets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(BACKGROUND_PRESETS).map(([key, preset]) => {
              const isSelected = settings.backgroundPreset === key;
              return (
                <motion.button
                  key={key}
                  onClick={() => handlePresetChange(key as any)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={saving}
                  className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? 'ring-4 ring-cyan-400 shadow-[0_0_24px_0_rgba(6,182,212,0.5)]'
                      : 'ring-2 ring-white/20 hover:ring-white/40'
                  }`}
                >
                  {/* Preview */}
                  <div
                    className="h-24 w-full"
                    style={{ background: preset.preview }}
                  />
                  
                  {/* Checkmark */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Info */}
                  <div className={`p-3 ${key === 'light' ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-md`}>
                    <p className={`font-semibold text-sm ${key === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      {preset.name}
                    </p>
                    <p className={`text-xs ${key === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                      {preset.subtitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Section 2: Glass Intensity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${isLightTheme ? 'bg-white/60' : 'bg-white/15'} backdrop-blur-3xl border ${isLightTheme ? 'border-black/20' : 'border-white/20'} shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-2xl p-6`}
        >
          <div className="mb-4">
            <h2 className={`text-lg font-bold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Glass Transparency</h2>
            <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
              Adjust blur and opacity for comfort
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className={isLightTheme ? 'text-gray-600' : 'text-gray-300'}>Low</span>
              <span className={`font-semibold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
                {settings.glassIntensity}%
              </span>
              <span className={isLightTheme ? 'text-gray-600' : 'text-gray-300'}>High</span>
            </div>
            
            <input
              type="range"
              min="0"
              max="100"
              value={settings.glassIntensity}
              onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
              onMouseUp={handleIntensityChangeEnd}
              onTouchEnd={handleIntensityChangeEnd}
              disabled={saving}
              className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${settings.glassIntensity}%, rgba(255,255,255,0.2) ${settings.glassIntensity}%, rgba(255,255,255,0.2) 100%)`,
              }}
            />

            <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
              💡 Lower values increase clarity, higher values create more depth
            </p>
          </div>
        </motion.div>

        {/* Section 3: Accessibility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${isLightTheme ? 'bg-white/60' : 'bg-white/15'} backdrop-blur-3xl border ${isLightTheme ? 'border-black/20' : 'border-white/20'} shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-2xl p-6`}
        >
          <div className="mb-4">
            <h2 className={`text-lg font-bold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Accessibility</h2>
            <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
              Improve readability
            </p>
          </div>

          <div className="space-y-4">
            {/* Increase Text Contrast */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggle('increaseContrast')}
              disabled={saving}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                settings.increaseContrast
                  ? isLightTheme
                    ? 'bg-cyan-500/20 border-2 border-cyan-500'
                    : 'bg-cyan-500/20 border-2 border-cyan-400'
                  : isLightTheme
                  ? 'bg-white/40 border-2 border-black/10 hover:bg-white/50'
                  : 'bg-white/10 border-2 border-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  settings.increaseContrast
                    ? 'bg-cyan-400 text-white'
                    : isLightTheme
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-white/20 text-gray-300'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
                    Increase Text Contrast
                  </p>
                  <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                    Darker text & stronger backgrounds
                  </p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                settings.increaseContrast
                  ? 'bg-cyan-400 border-cyan-400'
                  : isLightTheme
                  ? 'border-gray-400'
                  : 'border-white/40'
              }`}>
                {settings.increaseContrast && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>

            {/* Reduce Transparency */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggle('reduceTransparency')}
              disabled={saving}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                settings.reduceTransparency
                  ? isLightTheme
                    ? 'bg-cyan-500/20 border-2 border-cyan-500'
                    : 'bg-cyan-500/20 border-2 border-cyan-400'
                  : isLightTheme
                  ? 'bg-white/40 border-2 border-black/10 hover:bg-white/50'
                  : 'bg-white/10 border-2 border-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  settings.reduceTransparency
                    ? 'bg-cyan-400 text-white'
                    : isLightTheme
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-white/20 text-gray-300'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
                    Reduce Transparency
                  </p>
                  <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                    Less blur, more opacity
                  </p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                settings.reduceTransparency
                  ? 'bg-cyan-400 border-cyan-400'
                  : isLightTheme
                  ? 'border-gray-400'
                  : 'border-white/40'
              }`}>
                {settings.reduceTransparency && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Footer: Reset Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleReset}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-semibold transition-all duration-300 ${
              isLightTheme
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-lg'
                : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-white/15 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
            } disabled:opacity-50`}
          >
            {saving ? '⏳ Applying...' : '↺ Reset to Default'}
          </button>
        </motion.div>

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`${isLightTheme ? 'bg-blue-100/60' : 'bg-cyan-500/10'} backdrop-blur-xl border ${isLightTheme ? 'border-blue-200' : 'border-cyan-400/30'} rounded-xl p-4`}
        >
          <p className={`text-sm ${isLightTheme ? 'text-gray-700' : 'text-gray-300'}`}>
            💡 <span className="font-semibold">Tip:</span> Changes apply immediately and are saved to your account.
            The page will refresh to ensure all screens use your new theme.
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.5);
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
}

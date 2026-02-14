'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { User, WaterLog } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDateString } from '@/lib/dateUtils';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function WaterLogPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMl, setCurrentMl] = useState(0);
  const [waterLogId, setWaterLogId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [displayMl, setDisplayMl] = useState(0);
  const router = useRouter();

  // Animated counter
  useEffect(() => {
    const duration = 600;
    const steps = 25;
    const startVal = displayMl;
    const increment = (currentMl - startVal) / steps;
    let current = startVal;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      setDisplayMl(Math.round(current));
      if (step >= steps) {
        setDisplayMl(currentMl);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMl]);

  const autoCalculate = user?.waterSettings?.autoCalculate ?? true;
  const glassSizeMl = user?.waterSettings?.glassSizeMl ?? 250;
  const customTargetMl = user?.waterSettings?.customTargetMl ?? 2000;

  const targetMl = autoCalculate
    ? Math.round((user?.weight || 70) * 35)
    : customTargetMl;

  const targetGlasses = Math.ceil(targetMl / glassSizeMl);
  const currentGlasses = Math.floor(currentMl / glassSizeMl);
  const percentage = Math.min((currentMl / targetMl) * 100, 100);

  const loadTodayWater = useCallback(async (userId: string) => {
    try {
      const today = getLocalDateString();
      const waterQuery = query(
        collection(db, 'water_logs'),
        where('userId', '==', userId),
        where('date', '==', today)
      );

      const snapshot = await getDocs(waterQuery);
      if (!snapshot.empty) {
        const log = snapshot.docs[0];
        const data = log.data() as WaterLog;
        const ml = data.amountMl ?? (data.glasses ? data.glasses * 250 : 0);
        setCurrentMl(ml);
        setWaterLogId(log.id);
      }
    } catch (error) {
      console.error('Error loading water logs:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: authUser.uid, ...userDoc.data() } as User);
          await loadTodayWater(authUser.uid);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, loadTodayWater]);

  const updateWater = async (newMl: number) => {
    if (newMl < 0 || !user) return;

    try {
      const today = getLocalDateString();

      if (waterLogId) {
        await updateDoc(doc(db, 'water_logs', waterLogId), {
          amountMl: newMl,
          timestamp: new Date(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'water_logs'), {
          userId: user.uid,
          date: today,
          amountMl: newMl,
          timestamp: new Date(),
        });
        setWaterLogId(docRef.id);
      }

      setCurrentMl(newMl);

      if (newMl >= targetMl && currentMl < targetMl) {
        toast.success('🎉 Water goal reached!');
      }
    } catch (error) {
      console.error('Error updating water log:', error);
      toast.error('Failed to update water');
    }
  };

  const addWater = (ml: number) => {
    updateWater(currentMl + ml);
  };

  const handleCustomAdd = () => {
    const ml = parseInt(customInput);
    if (!isNaN(ml) && ml > 0) {
      addWater(ml);
      setCustomInput('');
    }
  };

  const updateWaterSettings = async (newSettings: Partial<NonNullable<User['waterSettings']>>) => {
    if (!user) return;

    try {
      const updatedSettings = {
        autoCalculate: newSettings.autoCalculate ?? autoCalculate,
        glassSizeMl: newSettings.glassSizeMl ?? glassSizeMl,
        customTargetMl: newSettings.customTargetMl ?? customTargetMl,
      };

      await updateDoc(doc(db, 'users', user.uid), {
        waterSettings: updatedSettings,
      });

      setUser({ ...user, waterSettings: updatedSettings });
      toast.success('Settings updated!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  if (loading) {
    return <Loading text="Loading water tracker..." />;
  }

  return (
    <div className="min-h-screen pb-12">
      {/* ========== HEADER ========== */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-14 pb-5">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
          >
            <span className="mr-1.5">←</span> Back
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">💧 Water Tracker</h1>
              <p className="text-sm text-gray-400">Stay hydrated throughout the day</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-lg mx-auto px-5 pt-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ========== SETTINGS PANEL ========== */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-6 overflow-hidden"
            >
              <h3 className="text-base font-semibold text-gray-800 mb-4">⚙️ Water Settings</h3>

              {/* Auto Calculate */}
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalculate}
                    onChange={(e) => updateWaterSettings({ autoCalculate: e.target.checked })}
                    className="w-5 h-5 rounded accent-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-calculate from weight</span>
                </label>
                {autoCalculate && (
                  <p className="text-xs text-gray-400 mt-1 ml-8">
                    {user?.weight || 70} kg × 35 = {targetMl} ml/day
                  </p>
                )}
              </div>

              {/* Custom Target */}
              {!autoCalculate && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1.5">Custom Daily Target (ml)</label>
                  <input
                    type="number"
                    value={customTargetMl}
                    onChange={(e) => updateWaterSettings({ customTargetMl: parseInt(e.target.value) || 2000 })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none"
                  />
                </div>
              )}

              {/* Glass Size */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Glass Size</label>
                <div className="flex gap-2">
                  {[200, 250, 300, 350].map((size) => (
                    <button
                      key={size}
                      onClick={() => updateWaterSettings({ glassSizeMl: size })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        glassSizeMl === size
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {size}ml
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== PROGRESS RING ========== */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-8"
        >
          <div className="flex flex-col items-center">
            {/* Large ring */}
            <div className="relative w-56 h-56 mb-6">
              <svg className="w-full h-full -rotate-90">
                <circle cx="112" cy="112" r="100" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                <motion.circle
                  cx="112" cy="112" r="100"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 628 }}
                  animate={{ strokeDashoffset: 628 - (628 * percentage) / 100 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ strokeDasharray: 628 }}
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl mb-1">💧</span>
                <p className="text-3xl font-extrabold text-blue-600">{displayMl}</p>
                <p className="text-sm text-gray-400">of {targetMl} ml</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {currentGlasses} of {targetGlasses} glasses
                </p>
              </div>
            </div>

            {/* Slim bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-xs text-gray-400">{percentage.toFixed(0)}% of daily goal</p>
          </div>
        </motion.div>

        {/* ========== QUICK ADD ========== */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-6"
        >
          <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Add</h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => addWater(glassSizeMl)}
              className="py-3.5 rounded-2xl bg-blue-500 text-white font-semibold text-sm shadow-sm active:bg-blue-600"
            >
              +1 Glass ({glassSizeMl}ml)
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => addWater(500)}
              className="py-3.5 rounded-2xl bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-100 active:bg-gray-100"
            >
              +500 ml
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => addWater(250)}
              className="py-3.5 rounded-2xl bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-100 active:bg-gray-100"
            >
              +250 ml
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => addWater(1000)}
              className="py-3.5 rounded-2xl bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-100 active:bg-gray-100"
            >
              +1 Liter
            </motion.button>
          </div>

          {/* Custom input */}
          <div className="flex gap-3">
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Custom ml"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-300 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleCustomAdd}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm shadow-sm"
            >
              Add
            </motion.button>
          </div>
        </motion.div>

        {/* ========== UNDO / RESET ========== */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => updateWater(Math.max(0, currentMl - glassSizeMl))}
            className="flex-1 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 font-medium text-sm active:bg-gray-100"
          >
            −1 Glass
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (confirm('Reset today\'s water intake?')) {
                updateWater(0);
              }
            }}
            className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-400 font-medium text-sm active:bg-red-100"
          >
            Reset
          </motion.button>
        </motion.div>

        {/* ========== GOAL CELEBRATION ========== */}
        <AnimatePresence>
          {currentMl >= targetMl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-green-50 border border-green-100 rounded-3xl p-6 text-center"
            >
              <p className="text-3xl mb-1">🎉</p>
              <h3 className="text-lg font-bold text-green-700 mb-0.5">Goal Achieved!</h3>
              <p className="text-sm text-green-500">You&apos;ve reached your daily water target</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== TIP ========== */}
        <motion.div
          variants={itemVariants}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-4"
        >
          <p className="text-sm text-blue-600">
            💡 <strong>Tip:</strong> Your target is {user?.weight || 70} kg × 35 ml = {targetMl} ml.
            Adjust glass size or set a custom target in settings.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

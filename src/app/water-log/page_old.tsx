'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { User, WaterLog } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDateString } from '@/lib/dateUtils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  hover: { scale: 1.05, boxShadow: '0 10px 30px rgba(34, 211, 238, 0.3)' },
  tap: { scale: 0.95 },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

const rippleVariants = {
  initial: { scale: 0, opacity: 0.5 },
  animate: {
    scale: 4,
    opacity: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const },
  },
};
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

export default function WaterLogPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMl, setCurrentMl] = useState(0);
  const [waterLogId, setWaterLogId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showRipple, setShowRipple] = useState(false);
  const [displayMl, setDisplayMl] = useState(0);
  const router = useRouter();

  // Animate the ml counter
  useEffect(() => {
    const duration = 800;
    const steps = 30;
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

  // Water settings with defaults
  const autoCalculate = user?.waterSettings?.autoCalculate ?? true;
  const glassSizeMl = user?.waterSettings?.glassSizeMl ?? 250;
  const customTargetMl = user?.waterSettings?.customTargetMl ?? 2000;

  // Calculate target based on settings
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
        // Support both old (glasses) and new (amountMl) format
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
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 800);
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

      setUser({
        ...user,
        waterSettings: updatedSettings,
      });

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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-3xl border-b border-white/20 text-white py-6 px-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-cyan-300 hover:text-cyan-200 hover:scale-110 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">💧 Water Tracker</h1>
              <p className="text-gray-300">Stay hydrated throughout the day</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <motion.div 
        className="max-w-2xl mx-auto p-4 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-white/15 backdrop-blur-3xl rounded-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 overflow-hidden"
            >
            <h3 className="text-lg font-bold text-white mb-4">⚙️ Water Settings</h3>

            {/* Auto Calculate Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalculate}
                  onChange={(e) => updateWaterSettings({ autoCalculate: e.target.checked })}
                  className="w-5 h-5 rounded accent-cyan-500"
                />
                <span className="text-white">Auto-calculate from weight</span>
              </label>
              {autoCalculate && (
                <p className="text-sm text-gray-400 mt-1 ml-8">
                  {user?.weight || 70} kg × 35 = {targetMl} ml/day
                </p>
              )}
            </div>

            {/* Custom Target (when auto is off) */}
            {!autoCalculate && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Custom Daily Target (ml)</label>
                <input
                  type="number"
                  value={customTargetMl}
                  onChange={(e) => updateWaterSettings({ customTargetMl: parseInt(e.target.value) || 2000 })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            )}

            {/* Glass Size */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Glass Size</label>
              <div className="flex gap-2">
                {[200, 250, 300, 350].map((size, index) => (
                  <motion.button
                    key={size}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateWaterSettings({ glassSizeMl: size })}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      glassSizeMl === size
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {size} ml
                  </motion.button>
                ))}
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Progress Ring */}
        <motion.div
          variants={itemVariants}
          className="bg-white/15 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-8 relative overflow-hidden"
        >
          {/* Animated Background Bubbles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-4 rounded-full bg-cyan-400/20"
                initial={{ 
                  x: Math.random() * 100 + '%', 
                  y: '100%',
                  scale: Math.random() * 0.5 + 0.5 
                }}
                animate={{ 
                  y: '-20%',
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 4,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          <div className="flex flex-col items-center relative z-10">
            {/* Large Progress Ring */}
            <motion.div 
              className="relative w-64 h-64 mb-6"
              animate={currentMl >= targetMl ? 'pulse' : undefined}
              variants={pulseVariants}
            >
              {/* Ripple Effect */}
              <AnimatePresence>
                {showRipple && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    variants={rippleVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-cyan-400/30" />
                  </motion.div>
                )}
              </AnimatePresence>

              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                  fill="none"
                />
                {/* Progress Circle */}
                <motion.circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="url(#waterGradientLarge)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 691 }}
                  animate={{ strokeDashoffset: 691 - (691 * percentage) / 100 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ strokeDasharray: 691 }}
                />
                <defs>
                  <linearGradient id="waterGradientLarge" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  className="text-5xl mb-2"
                  animate={{ 
                    y: [0, -5, 0],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  💧
                </motion.span>
                <motion.p 
                  className="text-4xl font-black text-cyan-300"
                  key={displayMl}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {displayMl}
                </motion.p>
                <p className="text-lg text-gray-300">of {targetMl} ml</p>
                <motion.p 
                  className="text-sm text-gray-400 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {currentGlasses} of {targetGlasses} glasses
                </motion.p>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="text-sm text-gray-400">{percentage.toFixed(0)}% of daily goal</p>
          </div>
        </motion.div>

        {/* Quick Add Buttons */}
        <motion.div
          variants={itemVariants}
          className="bg-white/15 backdrop-blur-3xl rounded-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6"
        >
          <motion.h3 
            className="text-lg font-bold text-white mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            Quick Add
          </motion.h3>

          <motion.div 
            className="grid grid-cols-2 gap-3 mb-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => addWater(glassSizeMl)}
              className="py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold shadow-lg relative overflow-hidden group"
            >
              <motion.span
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative z-10">+1 Glass ({glassSizeMl} ml)</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => addWater(500)}
              className="py-4 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-cyan-500/20"
                initial={{ scale: 0, borderRadius: '100%' }}
                whileHover={{ scale: 2, borderRadius: '0%' }}
                transition={{ duration: 0.4 }}
              />
              <span className="relative z-10">+500 ml</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => addWater(250)}
              className="py-4 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-cyan-500/20"
                initial={{ scale: 0, borderRadius: '100%' }}
                whileHover={{ scale: 2, borderRadius: '0%' }}
                transition={{ duration: 0.4 }}
              />
              <span className="relative z-10">+250 ml</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => addWater(1000)}
              className="py-4 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-cyan-500/20"
                initial={{ scale: 0, borderRadius: '100%' }}
                whileHover={{ scale: 2, borderRadius: '0%' }}
                transition={{ duration: 0.4 }}
              />
              <span className="relative z-10">+1 Liter</span>
            </motion.button>
          </motion.div>

          {/* Custom Input */}
          <div className="flex gap-3">
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Custom ml"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCustomAdd}
              className="px-6 py-3 rounded-xl bg-cyan-500 text-white font-semibold"
            >
              Add
            </motion.button>
          </div>
        </motion.div>

        {/* Undo / Reset */}
        <motion.div 
          className="flex gap-3"
          variants={itemVariants}
        >
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateWater(Math.max(0, currentMl - glassSizeMl))}
            className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-gray-300"
          >
            -1 Glass
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(239,68,68,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (confirm('Reset today\'s water intake?')) {
                updateWater(0);
              }
            }}
            className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300"
          >
            Reset
          </motion.button>
        </motion.div>

        {/* Goal Reached Celebration */}
        <AnimatePresence>
          {currentMl >= targetMl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 backdrop-blur-3xl border border-green-400/40 rounded-2xl p-6 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl mb-2"
              >
                🎉
              </motion.div>
              <h3 className="text-xl font-bold text-green-300 mb-1">Goal Achieved!</h3>
              <p className="text-green-200/80">You&apos;ve reached your daily water target</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <motion.div 
          variants={itemVariants}
          className="bg-cyan-500/20 backdrop-blur-3xl border border-cyan-400/30 rounded-2xl p-4"
          whileHover={{ scale: 1.01 }}
        >
          <motion.p 
            className="text-sm text-cyan-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            💡 <strong>Tip:</strong> Your target is calculated as {user?.weight || 70} kg × 35 ml = {targetMl} ml. 
            Adjust your glass size or set a custom target in settings.
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}

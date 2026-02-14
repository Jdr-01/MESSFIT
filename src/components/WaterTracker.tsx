'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WaterLog, User } from '@/types';
import { motion } from 'framer-motion';
import { getLocalDateString } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

interface WaterTrackerProps {
  userId: string;
  compact?: boolean;
}

export default function WaterTracker({ userId, compact = false }: WaterTrackerProps) {
  const [currentMl, setCurrentMl] = useState(0);
  const [waterLogId, setWaterLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userWeight, setUserWeight] = useState(70);
  const [waterSettings, setWaterSettings] = useState<User['waterSettings']>({
    autoCalculate: true,
    glassSizeMl: 250,
  });
  const router = useRouter();

  const autoCalculate = waterSettings?.autoCalculate ?? true;
  const glassSizeMl = waterSettings?.glassSizeMl ?? 250;
  const customTargetMl = waterSettings?.customTargetMl ?? 2000;

  const targetMl = autoCalculate
    ? Math.round(userWeight * 35)
    : customTargetMl;

  const targetGlasses = Math.ceil(targetMl / glassSizeMl);
  const currentGlasses = Math.floor(currentMl / glassSizeMl);
  const percentage = Math.min((currentMl / targetMl) * 100, 100);

  const loadTodayWater = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserWeight(userData.weight || 70);
        if (userData.waterSettings) {
          setWaterSettings(userData.waterSettings);
        }
      }

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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTodayWater();
  }, [userId, loadTodayWater]);

  const updateWater = async (newMl: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (newMl < 0) return;

    try {
      const today = getLocalDateString();

      if (waterLogId) {
        await updateDoc(doc(db, 'water_logs', waterLogId), {
          amountMl: newMl,
          timestamp: new Date(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'water_logs'), {
          userId,
          date: today,
          amountMl: newMl,
          timestamp: new Date(),
        });
        setWaterLogId(docRef.id);
      }

      setCurrentMl(newMl);
    } catch (error) {
      console.error('Error updating water log:', error);
    }
  };

  const handleClick = () => {
    router.push('/water-log');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-100 rounded w-1/3 mb-3"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // ====== COMPACT (Dashboard circle) ======
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ delay: 0.15 }}
        onClick={handleClick}
        className="relative w-32 h-32 rounded-full bg-blue-50 border border-blue-100 shadow-[0_4px_16px_rgba(59,130,246,0.08)] cursor-pointer"
      >
        {/* SVG Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="56" stroke="#E0E7FF" strokeWidth="4" fill="none" />
          <motion.circle
            cx="64" cy="64" r="56"
            stroke="#3B82F6"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: 352 }}
            animate={{ strokeDashoffset: 352 - (352 * percentage) / 100 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ strokeDasharray: 352 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-2xl mb-0.5">💧</span>
          <p className="text-base font-bold text-blue-600 leading-none">{currentMl}</p>
          <p className="text-[9px] text-gray-400">of {targetMl} ml</p>

          {/* Quick add */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => updateWater(currentMl + glassSizeMl, e)}
            className="mt-1 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-sm"
          >
            +
          </motion.button>
        </div>

        {/* Goal check */}
        {currentMl >= targetMl && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm z-20"
          >
            <span className="text-white text-[10px]">✓</span>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ====== FULL CARD ======
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-6 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-gray-800">💧 Water Intake</h3>
        <span className="text-sm text-gray-400 font-medium">{currentMl} / {targetMl} ml</span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="text-gray-400">{currentGlasses} of {targetGlasses} glasses</span>
          <span className="text-blue-500 font-semibold">{Math.round(percentage)}%</span>
        </div>
      </div>

      {/* Quick buttons */}
      <div className="flex gap-2 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => updateWater(currentMl + glassSizeMl, e)}
          className="px-4 py-2 bg-blue-500 text-white rounded-2xl font-semibold text-sm shadow-sm"
        >
          +1 Glass
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => updateWater(currentMl + 500, e)}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm"
        >
          +500 ml
        </motion.button>
      </div>

      {currentMl >= targetMl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-2 bg-green-50 rounded-xl text-center"
        >
          <p className="text-green-600 font-semibold text-sm">🎉 Daily goal reached!</p>
        </motion.div>
      )}

      <p className="text-[11px] text-gray-300 text-center mt-2">Tap to open water log</p>
    </motion.div>
  );
}

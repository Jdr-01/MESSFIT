'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { motion } from 'framer-motion';
import { getLocalDateString, getLocalDateStringDaysAgo } from '@/lib/dateUtils';
import BottomNavigation from '@/components/BottomNavigation';
import WaterTracker from '@/components/WaterTracker';
import { SkeletonDashboard } from '@/components/Skeleton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [mealTotals, setMealTotals] = useState({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          await loadTodayMeals(firebaseUser.uid);
          await calculateStreak(firebaseUser.uid);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadTodayMeals = async (userId: string) => {
    const today = getLocalDateString();
    const logsQuery = query(
      collection(db, 'meal_logs'),
      where('userId', '==', userId),
      where('date', '==', today)
    );

    const snapshot = await getDocs(logsQuery);
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLog[];

    setTodayLogs(logs);

    const totals = {
      breakfast: logs.filter((l) => l.mealType === 'breakfast').reduce((sum, l) => sum + l.calories, 0),
      lunch: logs.filter((l) => l.mealType === 'lunch').reduce((sum, l) => sum + l.calories, 0),
      dinner: logs.filter((l) => l.mealType === 'dinner').reduce((sum, l) => sum + l.calories, 0),
      snacks: logs.filter((l) => l.mealType === 'snacks').reduce((sum, l) => sum + l.calories, 0),
    };

    setMealTotals(totals);
  };

  const calculateStreak = async (userId: string) => {
    try {
      const mealsQuery = query(
        collection(db, 'meal_logs'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(mealsQuery);
      if (snapshot.empty) return;

      const dates = new Set<string>();
      snapshot.forEach((doc) => dates.add(doc.data().date));
      const sortedDates = Array.from(dates).sort().reverse();

      let streak = 0;
      const today = getLocalDateString();
      const yesterday = getLocalDateStringDaysAgo(1);

      if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
        let currentDate = sortedDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
        for (const date of sortedDates) {
          const checkDate = getLocalDateString(currentDate);
          if (date === checkDate) {
            streak++;
            currentDate = new Date(currentDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }
      setCurrentStreak(streak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonDashboard />
        <BottomNavigation />
      </>
    );
  }

  if (!user) return null;

  const totalCalories = Object.values(mealTotals).reduce((sum, val) => sum + val, 0);
  const calorieTarget = user.dailyCalorieTarget || user.rda || 2000;
  const remaining = calorieTarget - totalCalories;
  const progressPercent = Math.min((totalCalories / calorieTarget) * 100, 100);

  const totalProtein = todayLogs.reduce((sum, log) => sum + log.protein, 0);
  const totalCarbs = todayLogs.reduce((sum, log) => sum + log.carbs, 0);
  const totalFats = todayLogs.reduce((sum, log) => sum + log.fats, 0);

  const proteinTarget = user.weight * 2;
  const carbsTarget = user.weight * 4;
  const fatsTarget = user.weight * 1;

  const mealCards = [
    { type: 'breakfast', label: 'Breakfast', icon: '🌅', cal: mealTotals.breakfast },
    { type: 'lunch', label: 'Lunch', icon: '🍛', cal: mealTotals.lunch },
    { type: 'dinner', label: 'Dinner', icon: '🌙', cal: mealTotals.dinner },
    { type: 'snacks', label: 'Snacks', icon: '🍪', cal: mealTotals.snacks },
  ];

  return (
    <div className="min-h-screen pb-28">
      {/* ========== HEADER BAR ========== */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-5 pt-12 pb-2"
      >
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none px-5 py-4">
          <div>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Good {getGreeting()}</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {user.name.split(' ')[0]}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Streak Pill */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
            className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/30 px-4 py-2.5 rounded-full"
          >
            <span className="text-lg">🔥</span>
            <div className="text-right">
              <p className="text-lg font-bold text-orange-600 leading-none">{currentStreak}</p>
              <p className="text-[10px] text-orange-400 font-medium">day streak</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="px-5 pt-6 space-y-8 max-w-lg mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ========== CALORIE HERO CARD ========== */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-none dark:border dark:border-gray-700"
        >
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center mb-4">
            Today&apos;s Calories
          </p>

          {/* Big number */}
          <div className="text-center mb-5">
            <motion.p
              key={remaining}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-6xl font-extrabold leading-none"
              style={{ color: remaining >= 0 ? '#10B981' : '#EF4444' }}
            >
              {Math.abs(remaining)}
            </motion.p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
              {remaining >= 0 ? 'remaining' : 'over target'}
            </p>
          </div>

          {/* Progress bar (6px) */}
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: progressPercent > 100
                  ? 'linear-gradient(90deg, #F87171, #EF4444)'
                  : 'linear-gradient(90deg, #10B981, #34D399)',
              }}
            />
          </div>

          {/* 3-column stats */}
          <div className="flex justify-between text-center">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Goal</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{calorieTarget}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Consumed</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalCalories}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Burned</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">0</p>
            </div>
          </div>
        </motion.div>

        {/* ========== MACRO CARDS ========== */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          {/* Protein */}
          <div className="bg-[#FFF4F4] dark:bg-red-900/20 rounded-[20px] p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E85D5D]" />
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protein</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalProtein}g</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">of {proteinTarget.toFixed(0)}g</p>
            <div className="h-1 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#E85D5D]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalProtein / proteinTarget) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-[#F3F7FF] dark:bg-blue-900/20 rounded-[20px] p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4A7BF7]" />
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Carbs</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalCarbs}g</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">of {carbsTarget.toFixed(0)}g</p>
            <div className="h-1 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#4A7BF7]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalCarbs / carbsTarget) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="bg-[#FFF8EC] dark:bg-yellow-900/20 rounded-[20px] p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fats</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalFats}g</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">of {fatsTarget.toFixed(0)}g</p>
            <div className="h-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#F5A623]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalFats / fatsTarget) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        </motion.div>

        {/* ========== LOG YOUR MEALS ========== */}
        <motion.div variants={itemVariants}>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Log Your Meals</h2>

          <div className="space-y-3">
            {mealCards.map((meal, idx) => (
              <motion.button
                key={meal.type}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/meal-selection?type=${meal.type}`)}
                className="w-full bg-white dark:bg-gray-800 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-4 flex items-center gap-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
              >
                <span className="text-3xl">{meal.icon}</span>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{meal.label}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {meal.cal > 0 ? `${meal.cal} cal logged` : 'Not logged yet'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-300 text-sm font-bold">+</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Water Tracker */}
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/water-log')}
            className="w-full bg-white dark:bg-gray-800 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-4 flex items-center gap-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors mt-3"
          >
            <span className="text-3xl">💧</span>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Water</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Track your water intake</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
              <span className="text-blue-400 text-sm font-bold">+</span>
            </div>
          </motion.button>
        </motion.div>

        {/* ========== SECONDARY ACTIONS ========== */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <button
            onClick={() => router.push('/daily-summary')}
            className="flex-1 bg-white dark:bg-gray-800 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-4 text-center active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          >
            <span className="text-2xl mb-1.5 block">📊</span>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">View Details</p>
          </button>
          <button
            onClick={() => router.push('/weekly-summary')}
            className="flex-1 bg-white dark:bg-gray-800 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-4 text-center active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          >
            <span className="text-2xl mb-1.5 block">📈</span>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Weekly Report</p>
          </button>
        </motion.div>
      </motion.div>

      <BottomNavigation />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

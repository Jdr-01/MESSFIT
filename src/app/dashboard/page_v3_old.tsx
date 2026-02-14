'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDateString, getLocalDateStringDaysAgo } from '@/lib/dateUtils';
import BottomNavigation from '@/components/BottomNavigation';
import WaterTracker from '@/components/WaterTracker';
import { SkeletonDashboard } from '@/components/Skeleton';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const }
  },
};

const numberVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 }
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
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

    const debugData = {
      todayDate: today,
      istTime: istTime,
      mealsFound: logs.length,
      mealDates: [...new Set(logs.map(l => l.date))],
    };
    
    console.log('Dashboard - Loading meals for IST date:', today, '(Current time:', istTime, ') - Found:', logs.length, 'meals');
    setDebugInfo(debugData);
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
      
      if (snapshot.empty) {
        return;
      }

      // Get unique dates
      const dates = new Set<string>();
      snapshot.forEach((doc) => {
        dates.add(doc.data().date);
      });

      const sortedDates = Array.from(dates).sort().reverse();
      
      // Calculate current streak
      let streak = 0;
      const today = getLocalDateString();
      const yesterday = getLocalDateStringDaysAgo(1);
      
      // Check if logged today or yesterday (to keep streak alive)
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

  const proteinTarget = user.weight * 2; // 2g per kg
  const carbsTarget = user.weight * 4; // 4g per kg
  const fatsTarget = user.weight * 1; // 1g per kg

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card border-b border-white/10 px-6 py-5"
      >
        <div className="flex justify-between items-center">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-white mb-1"
            >
              Hello, <span className="text-gradient-cyan">{user.name.split(' ')[0]}</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base text-gray-400"
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </motion.p>
          </div>
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="glass-btn px-4 py-2 rounded-2xl cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-2xl"
                animate={{ 
                  scale: currentStreak > 0 ? [1, 1.2, 1] : 1,
                  filter: currentStreak > 0 ? ['drop-shadow(0 0 0px #f97316)', 'drop-shadow(0 0 12px #f97316)', 'drop-shadow(0 0 0px #f97316)'] : 'none'
                }}
                transition={{ duration: 0.8, repeat: currentStreak > 0 ? Infinity : 0, repeatDelay: 1.5 }}
              >
                🔥
              </motion.span>
              <div className="text-right">
                <motion.p 
                  key={currentStreak}
                  variants={numberVariants}
                  initial="initial"
                  animate="animate"
                  className="text-2xl font-black text-gradient-orange leading-none"
                >
                  {currentStreak}
                </motion.p>
                <p className="text-xs font-medium text-orange-300/80">day streak</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        className="px-6 py-6 space-y-6 max-w-2xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Calorie Hero Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card glass-card-hover rounded-3xl p-8 cursor-pointer relative overflow-hidden"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-cyan-500/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Floating orbs */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-green-500/20 rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-2">
                Today's Calories
              </p>
              <div className="relative inline-block">
                <motion.div
                  key={remaining}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="text-7xl font-black mb-1"
                  style={{ 
                    color: remaining >= 0 ? '#4ade80' : '#f87171',
                    textShadow: remaining >= 0 
                      ? '0 0 30px rgba(74, 222, 128, 0.5), 0 0 60px rgba(74, 222, 128, 0.3)' 
                      : '0 0 30px rgba(248, 113, 113, 0.5), 0 0 60px rgba(248, 113, 113, 0.3)'
                  }}
                >
                  {Math.abs(remaining)}
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-semibold text-gray-200"
                >
                  {remaining >= 0 ? 'remaining' : 'over'}
                </motion.p>
              </div>
            </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: progressPercent > 100 ? '#ef4444' : '#10b981',
                }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex justify-between text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm text-gray-300 mb-1">Goal</p>
              <motion.p 
                className="text-2xl font-bold text-white"
                key={calorieTarget}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {calorieTarget}
              </motion.p>
            </motion.div>
            <div className="w-px bg-white/20" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-sm text-gray-300 mb-1">Consumed</p>
              <motion.p 
                className="text-2xl font-bold text-white"
                key={totalCalories}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {totalCalories}
              </motion.p>
            </motion.div>
            <div className="w-px bg-white/20" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-gray-300 mb-1">Burned</p>
              <p className="text-2xl font-bold text-white">0</p>
            </motion.div>
          </div>
          </div>
        </motion.div>

        {/* Macros Strip */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer"
        >
          <div className="grid grid-cols-3 gap-4">
            {/* Protein */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div 
                  className="w-3 h-3 rounded-full glow-orange" 
                  style={{ backgroundColor: '#F77F5B' }}
                  animate={{ scale: [1, 1.3, 1], boxShadow: ['0 0 10px rgba(247, 127, 91, 0.3)', '0 0 20px rgba(247, 127, 91, 0.6)', '0 0 10px rgba(247, 127, 91, 0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Protein</p>
              </div>
              <motion.p 
                className="text-xl font-bold text-white"
                key={totalProtein}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                style={{ textShadow: '0 0 20px rgba(247, 127, 91, 0.3)' }}
              >
                {totalProtein}g
              </motion.p>
              <p className="text-xs text-gray-500">of {proteinTarget.toFixed(0)}g</p>
              <div className="mt-2 h-1.5 progress-bar-glass rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalProtein / proteinTarget) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    background: 'linear-gradient(90deg, #F77F5B, #fb923c)',
                    boxShadow: '0 0 10px rgba(247, 127, 91, 0.5)',
                  }}
                />
              </div>
            </motion.div>

            {/* Carbs */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: '#3b82f6' }}
                  animate={{ scale: [1, 1.3, 1], boxShadow: ['0 0 10px rgba(59, 130, 246, 0.3)', '0 0 20px rgba(59, 130, 246, 0.6)', '0 0 10px rgba(59, 130, 246, 0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Carbs</p>
              </div>
              <motion.p 
                className="text-xl font-bold text-white"
                key={totalCarbs}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}
              >
                {totalCarbs}g
              </motion.p>
              <p className="text-xs text-gray-500">of {carbsTarget.toFixed(0)}g</p>
              <div className="mt-2 h-1.5 progress-bar-glass rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalCarbs / carbsTarget) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                  style={{
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  }}
                />
              </div>
            </motion.div>

            {/* Fats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: '#f59e0b' }}
                  animate={{ scale: [1, 1.3, 1], boxShadow: ['0 0 10px rgba(245, 158, 11, 0.3)', '0 0 20px rgba(245, 158, 11, 0.6)', '0 0 10px rgba(245, 158, 11, 0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fats</p>
              </div>
              <motion.p 
                className="text-xl font-bold text-white"
                key={totalFats}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                style={{ textShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}
              >
                {totalFats}g
              </motion.p>
              <p className="text-xs text-gray-500">of {fatsTarget.toFixed(0)}g</p>
              <div className="mt-2 h-1.5 progress-bar-glass rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalFats / fatsTarget) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  style={{
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                  }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Radial Hub Layout - Cards wrap around circle with cutouts */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg font-bold text-white mb-4 px-2">
            <span className="text-gradient-purple">Log Your Meals</span>
          </h2>
          
          {/* Compact radial container */}
          <div className="relative h-[220px] max-w-[464px] mx-auto">
            {/* Water Circle - Center anchor point */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <WaterTracker userId={user.uid} compact={true} />
            </div>

            {/* Top-Left: Breakfast - cutout on bottom-right */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05, y: -6 }}
              onClick={() => router.push('/meal-selection?type=breakfast')}
              className="absolute w-[264px] h-[114px] bg-white/15 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/25 hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
              style={{ 
                left: '-65px',
                top: 'calc(50% - 68px - 57px)',
                borderRadius: '16px 16px 80px 16px'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative h-full flex items-center px-5 gap-3.5">
                <span className="text-4xl">🌅</span>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-0.5">
                    Breakfast
                  </h3>
                  <p className="text-sm text-gray-300">
                    {mealTotals.breakfast > 0 ? (
                      <span className="font-medium text-white">
                        {mealTotals.breakfast} cal
                      </span>
                    ) : (
                      'Not logged'
                    )}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] border border-white/30 flex items-center justify-center flex-shrink-0 hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <span className="text-white text-lg font-bold">+</span>
                </div>
              </div>
            </motion.button>

            {/* Top-Right: Lunch - cutout on bottom-left */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              whileHover={{ scale: 1.05, y: -6 }}
              onClick={() => router.push('/meal-selection?type=lunch')}
              className="absolute w-[264px] h-[114px] bg-white/15 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/25 hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
              style={{ 
                right: '-65px',
                top: 'calc(50% - 68px - 57px)',
                borderRadius: '16px 16px 16px 80px'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative h-full flex items-center px-5 gap-3.5">
                <span className="text-4xl">🍛</span>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-0.5">
                    Lunch
                  </h3>
                  <p className="text-sm text-gray-300">
                    {mealTotals.lunch > 0 ? (
                      <span className="font-medium text-white">
                        {mealTotals.lunch} cal
                      </span>
                    ) : (
                      'Not logged'
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] border border-white/30 flex items-center justify-center flex-shrink-0 hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <span className="text-white text-lg font-bold">+</span>
                </div>
              </div>
            </motion.button>

            {/* Bottom-Left: Dinner - cutout on top-right */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05, y: -6 }}
              onClick={() => router.push('/meal-selection?type=dinner')}
              className="absolute w-[264px] h-[114px] bg-white/15 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/25 hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
              style={{ 
                left: '-65px',
                top: 'calc(50% + 68px - 57px)',
                borderRadius: '16px 80px 16px 16px'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative h-full flex items-center px-5 gap-3.5">
                <span className="text-4xl">🌙</span>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-0.5">
                    Dinner
                  </h3>
                  <p className="text-sm text-gray-300">
                    {mealTotals.dinner > 0 ? (
                      <span className="font-medium text-white">
                        {mealTotals.dinner} cal
                      </span>
                    ) : (
                      'Not logged'
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] border border-white/30 flex items-center justify-center flex-shrink-0 hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <span className="text-white text-lg font-bold">+</span>
                </div>
              </div>
            </motion.button>

            {/* Bottom-Right: Snacks - cutout on top-left */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ scale: 1.05, y: -6 }}
              onClick={() => router.push('/meal-selection?type=snacks')}
              className="absolute w-[264px] h-[114px] bg-white/15 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/25 hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
              style={{ 
                right: '-65px',
                top: 'calc(50% + 68px - 57px)',
                borderRadius: '80px 16px 16px 16px'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative h-full flex items-center px-5 gap-3.5">
                <span className="text-4xl">🍪</span>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-0.5">
                    Snacks
                  </h3>
                  <p className="text-sm text-gray-300">
                    {mealTotals.snacks > 0 ? (
                      <span className="font-medium text-white">
                        {mealTotals.snacks} cal
                      </span>
                    ) : (
                      'Not logged'
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] border border-white/30 flex items-center justify-center flex-shrink-0 hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <span className="text-white text-lg font-bold">+</span>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className="flex gap-3"
        >
          <button
            onClick={() => router.push('/daily-summary')}
            className="flex-1 bg-white/15 backdrop-blur-3xl rounded-xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-4 text-center hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-300"
          >
            <span className="text-2xl mb-1 block">📊</span>
            <p className="text-sm font-medium text-gray-200">View Details</p>
          </button>
          <button
            onClick={() => router.push('/weekly-summary')}
            className="flex-1 bg-white/15 backdrop-blur-3xl rounded-xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-4 text-center hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-300"
          >
            <span className="text-2xl mb-1 block">📈</span>
            <p className="text-sm font-medium text-gray-200">Weekly Report</p>
          </button>
        </motion.div>

        {/* Admin Section */}
        <AnimatePresence>
          {user.isAdmin && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-bold text-white mb-4 px-2">
                Admin Tools
              </h2>
              <motion.div
                className="grid grid-cols-3 gap-3"
                variants={containerVariants}
              >
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/admin/add-food')}
                className="bg-white/15 backdrop-blur-3xl rounded-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-5 text-center hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300"
              >
                <span className="text-3xl mb-2 block">➕</span>
                <p className="text-sm font-semibold text-white">Add Food</p>
              </motion.button>
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/admin/approve-foods')}
                className="bg-white/15 backdrop-blur-3xl rounded-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-5 text-center hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300"
              >
                <span className="text-3xl mb-2 block">✅</span>
                <p className="text-sm font-semibold text-white">Approve</p>
              </motion.button>
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/admin/manage-foods')}
                className="bg-white/15 backdrop-blur-3xl rounded-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-5 text-center hover:bg-white/22 hover:border-white/35 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300"
              >
                <span className="text-3xl mb-2 block">⚙️</span>
                <p className="text-sm font-semibold text-white">Manage</p>
              </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <BottomNavigation />
    </div>
  );
}

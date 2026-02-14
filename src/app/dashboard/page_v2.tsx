'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import Loading from '@/components/Loading';
import CircularProgress from '@/components/CircularProgress';
import MacroBar from '@/components/MacroBar';
import WeeklyGraph from '@/components/WeeklyGraph';
import WaterTracker from '@/components/WaterTracker';
import StreakTracker from '@/components/StreakTracker';
import BottomNavigation from '@/components/BottomNavigation';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState('');
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFats, setTodayFats] = useState(0);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      setUserId(firebaseUser.uid);

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);

          // Get today's meals
          const today = new Date().toISOString().split('T')[0];
          const mealsQuery = query(
            collection(db, 'meal_logs'),
            where('userId', '==', firebaseUser.uid),
            where('date', '==', today)
          );

          const mealsSnapshot = await getDocs(mealsQuery);
          let totalCal = 0;
          let totalProt = 0;
          let totalCarbs = 0;
          let totalFats = 0;

          mealsSnapshot.forEach((doc) => {
            const meal = doc.data() as MealLog;
            totalCal += meal.calories;
            totalProt += meal.protein;
            totalCarbs += meal.carbs;
            totalFats += meal.fats;
          });

          setTodayCalories(totalCal);
          setTodayProtein(totalProt);
          setTodayCarbs(totalCarbs);
          setTodayFats(totalFats);

          // Get weekly data
          await loadWeeklyData(firebaseUser.uid);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadWeeklyData = async (uid: string) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data: { day: string; calories: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const mealsQuery = query(
        collection(db, 'meal_logs'),
        where('userId', '==', uid),
        where('date', '==', dateStr)
      );

      const snapshot = await getDocs(mealsQuery);
      let dayCalories = 0;

      snapshot.forEach((doc) => {
        const meal = doc.data() as MealLog;
        dayCalories += meal.calories;
      });

      data.push({
        day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        calories: dayCalories,
      });
    }

    setWeeklyData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-gray-900">
        <Loading text="Loading dashboard..." />
      </div>
    );
  }

  if (!user) return null;

  const proteinTarget = Math.round(user.weight * 2); // 2g per kg
  const fatsTarget = Math.round((user.rda * 0.25) / 9); // 25% of calories
  const carbsTarget = Math.round((user.rda - (proteinTarget * 4) - (fatsTarget * 9)) / 4);

  const getMealIcon = (type: string) => {
    const icons: Record<string, string> = {
      breakfast: '🌅',
      lunch: '🍛',
      snacks: '🍪',
      dinner: '🌙',
    };
    return icons[type] || '🍽️';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 pb-24 transition-colors duration-300">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-800 shadow-md px-6 py-4"
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm text-mediumGray dark:text-gray-400">
              {getGreeting()}, {user.name}! 👋
            </p>
            <p className="text-xs text-lightGray dark:text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Circular Progress */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center py-8"
        >
          <CircularProgress
            current={todayCalories}
            target={user.rda}
            size={220}
            strokeWidth={16}
            label="kcal"
            color="#F77F5B"
          />
        </motion.div>

        {/* Macro Bars */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-darkGray dark:text-white mb-4">
            🎯 Today's Macros
          </h3>
          
          <MacroBar
            label="Protein"
            current={todayProtein}
            target={proteinTarget}
            color="#CFE57A"
            icon="🥚"
          />
          
          <MacroBar
            label="Fats"
            current={todayFats}
            target={fatsTarget}
            color="#F9D85C"
            icon="🥑"
          />
          
          <MacroBar
            label="Carbs"
            current={todayCarbs}
            target={carbsTarget}
            color="#D7C3F8"
            icon="🍞"
          />
        </motion.div>

        {/* Weekly Graph */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <WeeklyGraph data={weeklyData} />
        </motion.div>

        {/* Meal Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-darkGray dark:text-white mb-4">
            🍽️ Log Your Meals
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map((type, index) => (
              <motion.button
                key={type}
                onClick={() => router.push(`/meal-selection?type=${type}`)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-gradient-to-br from-coral/10 to-yellow/10 hover:from-coral/20 hover:to-yellow/20 rounded-xl p-4 transition-all border-2 border-transparent hover:border-coral"
              >
                <div className="text-3xl mb-2">{getMealIcon(type)}</div>
                <div className="font-semibold text-darkGray dark:text-white capitalize">
                  {type}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Water & Streak */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <WaterTracker userId={userId} />
          <StreakTracker userId={userId} />
        </motion.div>

        {/* Quick Action - Daily Summary */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => router.push('/daily-summary')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-coral"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div className="text-left">
                <div className="font-bold text-darkGray dark:text-white">
                  View Daily Summary
                </div>
                <div className="text-sm text-mediumGray dark:text-gray-400">
                  Complete breakdown of today's nutrition
                </div>
              </div>
            </div>
            <span className="text-coral text-xl">→</span>
          </div>
        </motion.button>

        {/* Admin Section */}
        {user.isAdmin && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-purple/20 to-coral/10 rounded-2xl shadow-lg p-6 border-2 border-purple/30"
          >
            <h3 className="text-lg font-bold text-darkGray dark:text-white mb-4 flex items-center gap-2">
              <span>🔧</span> Admin Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/admin/approve-foods')}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl font-semibold text-sm hover:bg-coral hover:text-white transition-all"
              >
                ✅ Approve Foods
              </button>
              <button
                onClick={() => router.push('/admin/add-food')}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl font-semibold text-sm hover:bg-coral hover:text-white transition-all"
              >
                ➕ Add Food
              </button>
              <button
                onClick={() => router.push('/admin/bulk-import')}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl font-semibold text-sm hover:bg-coral hover:text-white transition-all"
              >
                📁 Bulk Import
              </button>
              <button
                onClick={() => router.push('/admin/manage-foods')}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl font-semibold text-sm hover:bg-coral hover:text-white transition-all"
              >
                🗂️ Manage Foods
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

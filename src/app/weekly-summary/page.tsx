'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import BottomNavigation from '@/components/BottomNavigation';
import { getLocalDateString } from '@/lib/dateUtils';

export default function WeeklySummaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgCalories: 0,
    avgProtein: 0,
    avgRDA: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'lifetime'>('week');
  const router = useRouter();

  const rangeLabels = {
    week: { title: 'Weekly Progress', subtitle: 'Last 7 days', days: 7 },
    month: { title: 'Monthly Progress', subtitle: 'Last 30 days', days: 30 },
    lifetime: { title: 'Lifetime Progress', subtitle: 'All time', days: 365 },
  };
  
  const currentRange = rangeLabels[timeRange];

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
          await loadData(firebaseUser.uid, userData.dailyCalorieTarget || userData.rda, timeRange);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, timeRange]);

  const loadData = async (userId: string, rda: number, range: 'week' | 'month' | 'lifetime') => {
    const numDays = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    // Get dates based on selected range
    const dates: string[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(date.getTime() + istOffset);
      istTime.setUTCDate(istTime.getUTCDate() - i);
      dates.push(getLocalDateString(new Date(istTime.getTime() - istOffset)));
    }

    // Fetch ALL meals for this user (no date filter) to debug
    const mealsQuery = query(
      collection(db, 'meal_logs'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(mealsQuery);
    const allMeals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MealLog);
    
    // Get all unique dates from Firebase
    const allFirebaseDates = [...new Set(allMeals.map(m => m.date))].sort();
    
    // Filter meals to only the selected date range
    const meals = allMeals.filter(meal => dates.includes(meal.date));

    const debugData = {
      dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
      allDates: dates,
      totalMealsInFirebase: allMeals.length,
      totalMealsInRange: meals.length,
      allFirebaseDates: allFirebaseDates,
      mealDates: [...new Set(meals.map(m => m.date))].sort(),
      currentISTTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      missingDates: dates.filter(d => !meals.some(m => m.date === d)),
    };
    
    console.log('Weekly Summary Debug:', debugData);
    setDebugInfo(debugData);

    // Group by date
    const dailyTotals: Record<string, { calories: number; protein: number }> = {};
    dates.forEach((date) => {
      dailyTotals[date] = { calories: 0, protein: 0 };
    });

    meals.forEach((meal) => {
      if (dailyTotals[meal.date]) {
        dailyTotals[meal.date].calories += meal.calories;
        dailyTotals[meal.date].protein += meal.protein;
      }
    });

    // Prepare chart data
    const chartData = dates.map((date) => {
      // Parse the YYYY-MM-DD date correctly for IST
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day); // Create date in local time
      
      return {
        date: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: Math.round(dailyTotals[date].calories),
        protein: Math.round(dailyTotals[date].protein),
      };
    });

    setWeeklyData(chartData);

    // Calculate averages
    const totalCalories = Object.values(dailyTotals).reduce((sum, day) => sum + day.calories, 0);
    const totalProtein = Object.values(dailyTotals).reduce((sum, day) => sum + day.protein, 0);
    const daysWithData = Object.values(dailyTotals).filter((day) => day.calories > 0).length;

    setStats({
      avgCalories: daysWithData > 0 ? Math.round(totalCalories / daysWithData) : 0,
      avgProtein: daysWithData > 0 ? Math.round(totalProtein / daysWithData) : 0,
      avgRDA: daysWithData > 0 && rda > 0 ? Math.round((totalCalories / daysWithData / rda) * 100) : 0,
      totalDays: daysWithData,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentRange.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentRange.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Time Range Toggle */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-3">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <button
            onClick={() => setTimeRange('week')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
              timeRange === 'week'
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
              timeRange === 'month'
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('lifetime')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
              timeRange === 'lifetime'
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Lifetime
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Days Logged */}
        {stats.totalDays > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-3xl p-8 text-center transition-all duration-300"
          >
            <div className="text-6xl mb-4">
              {stats.totalDays === currentRange.days ? '🎉' : stats.totalDays >= currentRange.days * 0.7 ? '🔥' : '💪'}
            </div>
            <div className="text-6xl font-black text-green-600 dark:text-green-400 mb-2">{stats.totalDays}</div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              day{stats.totalDays !== 1 ? 's' : ''} logged
            </p>
            {stats.totalDays === currentRange.days && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Perfect {timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year'}! 🌟
              </p>
            )}
            {stats.totalDays < currentRange.days && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {currentRange.days - stats.totalDays} more to go for a perfect {timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year'}!
              </p>
            )}
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-2xl p-5 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Calories</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.avgCalories}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">per day</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-2xl p-5 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Protein</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.avgProtein}g
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">per day</p>
          </motion.div>
        </div>

        {/* Calorie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-2xl p-5 transition-all duration-300"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {timeRange === 'week' ? 'Daily Calories' : timeRange === 'month' ? 'Daily Trends' : 'Calorie History'}
          </h2>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#e5e7eb"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#e5e7eb"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#374151',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p>No data yet. Start logging meals!</p>
            </div>
          )}
        </motion.div>

        {/* Daily Breakdown */}
        {weeklyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-2xl p-5"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Daily Breakdown
            </h2>
            <div className="space-y-3">
              {weeklyData.map((day, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{day.date}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{day.fullDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {day.calories > 0 ? `${day.calories} cal` : '—'}
                    </p>
                    {day.protein > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{day.protein}g protein</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Goal Info */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none rounded-2xl p-5 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {user.goal === 'lose' && '🔥'}
                {user.goal === 'maintain' && '⚖️'}
                {user.goal === 'gain' && '💪'}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Your Goal</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {user.goal === 'lose' ? 'Lose Weight' : user.goal === 'maintain' ? 'Maintain Weight' : 'Gain Weight'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.dailyCalorieTarget || user.rda} cal/day target
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

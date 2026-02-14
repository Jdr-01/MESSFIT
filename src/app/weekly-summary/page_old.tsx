'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToCSV, exportToJSON } from '@/lib/exportUtils';
import toast from 'react-hot-toast';

export default function WeeklySummaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [allMeals, setAllMeals] = useState<MealLog[]>([]);
  const [stats, setStats] = useState({
    avgCalories: 0,
    avgProtein: 0,
    avgRDA: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState(true);
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
          await loadWeeklyData(firebaseUser.uid, userData.rda);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadWeeklyData = async (userId: string, rda: number) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const mealsQuery = query(
      collection(db, 'meal_logs'),
      where('userId', '==', userId),
      where('date', '>=', dates[0]),
      where('date', '<=', dates[6])
    );

    const snapshot = await getDocs(mealsQuery);
    const meals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MealLog);
    setAllMeals(meals);

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
      const dateObj = new Date(date);
      return {
        date: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
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

  const handleExport = (format: 'csv' | 'json') => {
    if (allMeals.length === 0) {
      toast.error('No meals to export');
      return;
    }
    if (format === 'csv') {
      exportToCSV(allMeals, `messfit-meals-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Meals exported as CSV!');
    } else {
      exportToJSON(allMeals, `messfit-meals-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Meals exported as JSON!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'cut': return 'text-blue-600';
      case 'bulk': return 'text-orange-600';
      default: return 'text-green-600';
    }
  };

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case 'cut': return '📉';
      case 'bulk': return '📈';
      default: return '➡️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-green-100 hover:text-white"
          >
            <span className="mr-2">←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">Weekly Summary</h1>
          <p className="text-green-100">Last 7 days overview</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Export Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex gap-3 justify-center">
          <button
            onClick={() => handleExport('csv')}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            📄 Export JSON
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg Daily Calories</div>
            <div className="text-3xl font-bold text-primary">{stats.avgCalories}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">kcal per day</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg Protein</div>
            <div className="text-3xl font-bold text-blue-600">{stats.avgProtein}g</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">per day</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg RDA %</div>
            <div className="text-3xl font-bold text-secondary">{stats.avgRDA}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stats.totalDays} days logged</div>
          </div>
        </div>

        {/* Goal Indicator */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Your Goal</h2>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{getGoalIcon(user.goal)}</span>
              <div>
                <div className={`text-2xl font-bold capitalize ${getGoalColor(user.goal)}`}>
                  {user.goal}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Target: {user.rda} kcal/day
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calories Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Daily Calories</h2>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No data available for the chart
            </div>
          )}
        </div>

        {/* Protein Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Daily Protein</h2>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="protein" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No data available for the chart
            </div>
          )}
        </div>

        {/* Keep Going Card */}
        {stats.totalDays > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl shadow p-6 text-center transition-colors duration-300">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Keep it up!</h3>
            <p className="text-gray-700 dark:text-gray-300">
              You&apos;ve logged meals for {stats.totalDays} day{stats.totalDays !== 1 ? 's' : ''} this week.
              {stats.totalDays < 7 && ' Try to log every day for better insights!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

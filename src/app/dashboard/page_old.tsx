'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import MealHistory from '@/components/MealHistory';
import NutritionGoals from '@/components/NutritionGoals';
import Loading from '@/components/Loading';
import WaterTracker from '@/components/WaterTracker';
import StreakTracker from '@/components/StreakTracker';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState('');
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFats, setTodayFats] = useState(0);
  const [rdaPercentage, setRdaPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
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
          setRdaPercentage(userData.rda ? Math.round((totalCal / userData.rda) * 100) : 0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loading text="Loading dashboard..." />
      </div>
    );
  }

  if (!user) return null;

  const mealTypes = [
    { name: 'Breakfast', path: '/meal-selection?type=breakfast', icon: '🌅' },
    { name: 'Lunch', path: '/meal-selection?type=lunch', icon: '🍛' },
    { name: 'Snacks', path: '/meal-selection?type=snacks', icon: '🍪' },
    { name: 'Dinner', path: '/meal-selection?type=dinner', icon: '🌙' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-primary to-secondary text-white py-6 px-4 shadow-lg"
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">MessFit</h1>
            <p className="text-green-100">Welcome, {user.name}! 👋</p>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/profile')}
              className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition"
            >
              👤 Profile
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto p-4 space-y-6"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-transparent hover:border-primary transition-all duration-300"
          >
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Today&apos;s Calories</div>
            <div className="text-3xl font-bold text-primary">{todayCalories}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">of {user.rda} kcal</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-transparent hover:border-secondary transition-all duration-300"
          >
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">RDA Progress</div>
            <div className="relative pt-1">
              <div className="text-3xl font-bold text-secondary mb-2">{rdaPercentage}%</div>
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(rdaPercentage, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    rdaPercentage > 100 ? 'bg-red-500' : 'bg-secondary'
                  }`}
                ></motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-transparent hover:border-accent transition-all duration-300"
          >
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Protein Today</div>
            <div className="text-3xl font-bold text-accent">{todayProtein.toFixed(1)}g</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">Keep it up! 💪</div>
          </motion.div>
        </motion.div>

        {/* Water Tracker & Streak Tracker */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WaterTracker userId={userId} />
          <StreakTracker userId={userId} />
        </motion.div>

        {/* Meal Buttons */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">🍽️ Log Your Meal</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mealTypes.map((meal, index) => (
              <motion.button
                key={meal.name}
                onClick={() => router.push(meal.path)}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-xl transition border-2 border-transparent hover:border-primary"
              >
                <div className="text-4xl mb-2">{meal.icon}</div>
                <div className="font-semibold text-gray-800 dark:text-white">{meal.name}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            onClick={() => router.push('/daily-summary')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition text-left border-2 border-transparent hover:border-primary"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold text-lg text-gray-800 dark:text-white">Daily Summary</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">View today&apos;s complete breakdown</div>
          </motion.button>

          <motion.button
            onClick={() => router.push('/weekly-summary')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition text-left border-2 border-transparent hover:border-secondary"
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="font-semibold text-lg text-gray-800 dark:text-white">Weekly Summary</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Track your weekly progress</div>
          </motion.button>

          <motion.button
            onClick={() => router.push('/meal-templates')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition text-left border-2 border-transparent hover:border-purple-500"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold text-lg text-gray-800 dark:text-white">Meal Templates</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Save & reuse favorite meals</div>
          </motion.button>
        </motion.div>

        {/* Nutrition Goals */}
        <motion.div variants={itemVariants}>
          <NutritionGoals
            userId={userId}
            currentTotals={{
              calories: todayCalories,
              protein: todayProtein,
              carbs: todayCarbs,
              fats: todayFats,
            }}
          />
        </motion.div>

        {/* Meal History */}
        <motion.div variants={itemVariants}>
          <MealHistory userId={userId} />
        </motion.div>

        {/* User Section - Submit Food */}
        {!user.isAdmin && (
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl shadow-lg p-6 border border-blue-100 dark:border-blue-800"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">➕ Contribute</h2>
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/submit-food')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-md hover:shadow-lg transition"
            >
              📝 Submit New Food for Approval
            </motion.button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              Help expand the food database
            </p>
          </motion.div>
        )}

        {/* Admin Section */}
        {user.isAdmin && (
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl shadow-lg p-6 border border-purple-100 dark:border-purple-800"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">🔧 Admin Tools</h2>
            <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/approve-foods')}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 shadow-md hover:shadow-lg transition"
            >
              ✅ Approve Food Submissions
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/add-food')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition"
            >
              ➕ Add Single Food
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/bulk-import')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-md hover:shadow-lg transition"
            >
              📁 Bulk Import Foods (CSV/Excel)
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/manage-foods')}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 shadow-md hover:shadow-lg transition"
            >
              🗂️ Manage Foods (View/Delete)
            </motion.button>
          </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

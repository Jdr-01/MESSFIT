'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { motion } from 'framer-motion';
import { getLocalDateString } from '@/lib/dateUtils';
import BottomNavigation from '@/components/BottomNavigation';
import { SkeletonDashboard } from '@/components/Skeleton';

export default function DailySummaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sugars: 0,
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
          await loadMeals(firebaseUser.uid);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadMeals = async (userId: string) => {
    const today = getLocalDateString();
    console.log('Daily Summary - Loading meals for IST date:', today);
    
    const mealsQuery = query(
      collection(db, 'meal_logs'),
      where('userId', '==', userId),
      where('date', '==', today)
    );

    const snapshot = await getDocs(mealsQuery);
    const mealList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLog[];

    setMeals(mealList);

    const total = mealList.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fats: acc.fats + (meal.fats || 0),
        fiber: acc.fiber + (meal.fiber || 0),
        sugars: acc.sugars + (meal.sugars || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugars: 0 }
    );

    setTotals(total);
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm('Delete this meal entry?')) return;

    try {
      await deleteDoc(doc(db, 'meal_logs', mealId));
      if (user) {
        await loadMeals(user.uid);
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete. Please try again.');
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

  const mealIcons: Record<string, string> = {
    breakfast: '🌅',
    lunch: '🍛',
    snacks: '🍪',
    dinner: '🌙',
  };

  const mealsByType = {
    breakfast: meals.filter((m) => m.mealType === 'breakfast'),
    lunch: meals.filter((m) => m.mealType === 'lunch'),
    snacks: meals.filter((m) => m.mealType === 'snacks'),
    dinner: meals.filter((m) => m.mealType === 'dinner'),
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all duration-300 hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Today's Meals</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Nutrition Stats with RDA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5"
        >
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Nutrition Breakdown
          </h3>
          <div className="space-y-4">
            {/* Protein */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Protein</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(totals.protein)}g
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {user ? Math.round(user.weight * 1.6) : 100}g
                    </span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-red-500"
                  style={{
                    width: `${Math.min((totals.protein / (user ? user.weight * 1.6 : 100)) * 100, 100)}%`,
                    minWidth: totals.protein > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Carbs</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(totals.carbs)}g
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {user ? Math.round((user.dailyCalorieTarget || user.rda) * 0.5 / 4) : 250}g
                    </span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-blue-500"
                  style={{
                    width: `${Math.min((totals.carbs / (user ? (user.dailyCalorieTarget || user.rda) * 0.5 / 4 : 250)) * 100, 100)}%`,
                    minWidth: totals.carbs > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>

            {/* Fats */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fats</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(totals.fats)}g
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {user ? Math.round((user.dailyCalorieTarget || user.rda) * 0.3 / 9) : 67}g
                    </span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-amber-500"
                  style={{
                    width: `${Math.min((totals.fats / (user ? (user.dailyCalorieTarget || user.rda) * 0.3 / 9 : 67)) * 100, 100)}%`,
                    minWidth: totals.fats > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>

            {/* Fiber */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fiber</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(totals.fiber)}g
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {user?.gender === 'female' ? '25' : '38'}g
                    </span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-green-500"
                  style={{
                    width: `${Math.min((totals.fiber / (user?.gender === 'female' ? 25 : 38)) * 100, 100)}%`,
                    minWidth: totals.fiber > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>

            {/* Sugars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sugars</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(totals.sugars)}g
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {user?.gender === 'female' ? '25' : '36'}g
                    </span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-violet-500"
                  style={{
                    width: `${Math.min((totals.sugars / (user?.gender === 'female' ? 25 : 36)) * 100, 100)}%`,
                    minWidth: totals.sugars > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Meals by Type */}
        {meals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-12 text-center"
          >
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No meals logged yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start tracking your nutrition by logging a meal
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
            >
              Log a Meal
            </button>
          </motion.div>
        ) : (
          <>
            {Object.entries(mealsByType).map(([type, typeMeals], index) => {
              if (typeMeals.length === 0) return null;
              
              const typeTotal = typeMeals.reduce((sum, m) => sum + m.calories, 0);
              
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{mealIcons[type]}</span>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">{type}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{typeTotal} cal</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {typeMeals.map((meal) => (
                      <motion.div
                        key={meal.id}
                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl transition-all duration-300"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{meal.foodName}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span className="text-green-600 dark:text-green-400 font-semibold">{meal.calories} cal</span>
                            <span>•</span>
                            <span>{meal.protein}g protein</span>
                            <span>•</span>
                            <span>{meal.quantity} {meal.unit}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(meal.id)}
                          className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all duration-300 hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}

        {/* Add More Button */}
        {meals.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05, y: -4 }}
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-semibold shadow-sm hover:shadow-md transition-all duration-300"
          >
            + Add Another Meal
          </motion.button>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

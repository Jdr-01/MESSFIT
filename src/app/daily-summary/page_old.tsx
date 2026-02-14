'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

export default function DailySummaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    rdaPercentage: 0,
  });
  const [visibleMetrics, setVisibleMetrics] = useState({
    calories: true,
    protein: true,
    carbs: true,
    fats: true,
    fiber: true,
    rda: true,
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
          await loadMeals(firebaseUser.uid, userData.rda);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadMeals = async (userId: string, rda: number) => {
    const today = new Date().toISOString().split('T')[0];
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

    // Calculate totals
    const total = mealList.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
        fiber: acc.fiber + meal.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    setTotals({
      ...total,
      rdaPercentage: Math.round((total.calories / rda) * 100),
    });
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteDoc(doc(db, 'meal_logs', mealId));
      setMeals(meals.filter((m) => m.id !== mealId));
      
      // Recalculate totals
      if (user) {
        await loadMeals(user.uid, user.rda);
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const getChartData = () => {
    const data: any[] = [];
    
    if (visibleMetrics.calories) {
      data.push({ name: 'Calories', value: totals.calories, color: '#10b981' });
    }
    if (visibleMetrics.protein) {
      data.push({ name: 'Protein (g)', value: totals.protein, color: '#8b5cf6' });
    }
    if (visibleMetrics.carbs) {
      data.push({ name: 'Carbs (g)', value: totals.carbs, color: '#f59e0b' });
    }
    if (visibleMetrics.fats) {
      data.push({ name: 'Fats (g)', value: totals.fats, color: '#ef4444' });
    }
    if (visibleMetrics.fiber) {
      data.push({ name: 'Fiber (g)', value: totals.fiber, color: '#14b8a6' });
    }
    if (visibleMetrics.rda) {
      data.push({ name: 'RDA %', value: totals.rdaPercentage, color: '#3b82f6' });
    }
    
    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-800 dark:text-white">Loading...</div>
      </div>
    );
  }

  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const mealIcons: Record<string, string> = {
    breakfast: '🌅',
    lunch: '🍛',
    snacks: '🍪',
    dinner: '🌙',
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
          <h1 className="text-2xl font-bold">Daily Summary</h1>
          <p className="text-green-100">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Total Nutrition Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Today&apos;s Totals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{totals.calories.toFixed(0)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Calories</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totals.rdaPercentage}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">RDA</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totals.protein.toFixed(1)}g</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Protein</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{totals.carbs.toFixed(1)}g</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Carbs</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{totals.fats.toFixed(1)}g</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Fats</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totals.fiber.toFixed(1)}g</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Fiber</div>
            </div>
          </div>

          {/* RDA Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>RDA Progress</span>
              <span>{totals.calories.toFixed(0)} / {user?.rda} kcal</span>
            </div>
            <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                style={{ width: `${Math.min(totals.rdaPercentage, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                  totals.rdaPercentage > 100 ? 'bg-red-500' : 'bg-primary'
                }`}
              ></div>
            </div>
          </div>
        </div>

        {/* Nutrition Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300"
        >
          <h2 className="text-xl font-bold mb-4 dark:text-white">📊 Nutrition Overview</h2>
          
          {/* Toggle Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'calories', label: 'Calories', color: 'bg-green-500' },
              { key: 'protein', label: 'Protein', color: 'bg-purple-500' },
              { key: 'carbs', label: 'Carbs', color: 'bg-orange-500' },
              { key: 'fats', label: 'Fats', color: 'bg-red-500' },
              { key: 'fiber', label: 'Fiber', color: 'bg-teal-500' },
              { key: 'rda', label: 'RDA %', color: 'bg-blue-500' },
            ].map((metric) => (
              <motion.button
                key={metric.key}
                onClick={() => toggleMetric(metric.key as keyof typeof visibleMetrics)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 ${
                  visibleMetrics[metric.key as keyof typeof visibleMetrics]
                    ? metric.color
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                {visibleMetrics[metric.key as keyof typeof visibleMetrics] ? '✓ ' : ''}
                {metric.label}
              </motion.button>
            ))}
          </div>

          {/* Chart */}
          {getChartData().length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  className="text-gray-600 dark:text-gray-400"
                  style={{ fontSize: '14px' }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  style={{ fontSize: '14px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  formatter={(value: any) => [value.toFixed(1), 'Value']}
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  animationBegin={0}
                >
                  {getChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📈</div>
              <div>Select metrics above to view chart</div>
            </div>
          )}
        </motion.div>

        {/* Meals by Type */}
        {mealTypes.map((mealType) => {
          const mealItems = meals.filter((m) => m.mealType === mealType);
          if (mealItems.length === 0) return null;

          return (
            <div key={mealType} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{mealIcons[mealType]}</span>
                <h3 className="text-lg font-bold capitalize dark:text-white">{mealType}</h3>
              </div>
              <div className="space-y-3">
                {mealItems.map((meal) => (
                  <div key={meal.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-300">
                    <div>
                      <div className="font-semibold dark:text-white">{meal.foodName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {meal.quantity} {meal.unit} • {meal.calories.toFixed(0)} kcal • {meal.protein.toFixed(1)}g protein
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {meals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No meals logged today</div>
            <div className="text-gray-600 dark:text-gray-400 mb-6">Start tracking your meals to see your summary</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition"
            >
              Log a Meal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

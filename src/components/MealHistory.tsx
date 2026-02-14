'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MealLog } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDateString, getLocalDateStringDaysAgo } from '@/lib/dateUtils';

interface MealHistoryProps {
  userId: string;
}

export default function MealHistory({ userId }: MealHistoryProps) {
  const [history, setHistory] = useState<Record<string, MealLog[]>>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const sevenDaysAgoStr = getLocalDateStringDaysAgo(7);

      const historyQuery = query(
        collection(db, 'meal_logs'),
        where('userId', '==', userId),
        where('date', '>=', sevenDaysAgoStr),
        orderBy('date', 'desc'),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(historyQuery);
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealLog[];

      // Group by date
      const grouped: Record<string, MealLog[]> = {};
      logs.forEach((log) => {
        if (!grouped[log.date]) {
          grouped[log.date] = [];
        }
        grouped[log.date].push(log);
      });

      setHistory(grouped);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const todayStr = getLocalDateString();
    const yesterdayStr = getLocalDateStringDaysAgo(1);

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' });
    }
  };

  const getDayTotals = (meals: MealLog[]) => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading history...</div>;
  }

  const dates = Object.keys(history).sort().reverse();

  if (dates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No meal history yet. Start logging your meals!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Meal History (7 Days)</h2>
      {dates.map((date) => {
        const meals = history[date];
        const totals = getDayTotals(meals);
        const isExpanded = expandedDays.has(date);

        return (
          <motion.div
            key={date}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <button
              onClick={() => toggleDay(date)}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="text-left">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{formatDate(date)}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {meals.length} meal{meals.length !== 1 ? 's' : ''} • {Math.round(totals.calories)} kcal
                </p>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl text-gray-600 dark:text-gray-400"
              >
                ▼
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-2 border-t border-gray-200 dark:border-gray-700">
                    {meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{meal.foodName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {meal.mealType} • {meal.quantity} {meal.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {Math.round(meal.calories)} kcal
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            P: {Math.round(meal.protein)}g
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="font-bold text-gray-900 dark:text-white">Day Total</p>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Calories</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{Math.round(totals.calories)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Protein</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{Math.round(totals.protein)}g</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Carbs</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{Math.round(totals.carbs)}g</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Fats</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{Math.round(totals.fats)}g</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

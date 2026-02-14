'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface NutritionGoalsProps {
  userId: string;
  currentTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export default function NutritionGoals({ userId, currentTotals }: NutritionGoalsProps) {
  const [goals, setGoals] = useState<NutritionGoals>({
    calories: 2000,
    protein: 50,
    carbs: 250,
    fats: 67,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      const goalsDoc = await getDoc(doc(db, 'user_goals', userId));
      if (goalsDoc.exists()) {
        setGoals(goalsDoc.data() as NutritionGoals);
        setTempGoals(goalsDoc.data() as NutritionGoals);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const saveGoals = async () => {
    try {
      await setDoc(doc(db, 'user_goals', userId), tempGoals);
      setGoals(tempGoals);
      setIsEditing(false);
      toast.success('Goals updated successfully!');
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Failed to save goals');
    }
  };

  const getProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getProgressColor = (current: number, goal: number) => {
    const percentage = (current / goal) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const metrics = [
    { key: 'calories', label: 'Calories', unit: 'kcal', color: 'text-orange-600 dark:text-orange-400' },
    { key: 'protein', label: 'Protein', unit: 'g', color: 'text-red-600 dark:text-red-400' },
    { key: 'carbs', label: 'Carbs', unit: 'g', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'fats', label: 'Fats', unit: 'g', color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Goals</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Edit Goals
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveGoals}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setTempGoals(goals);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {metrics.map(({ key, label, unit, color }) => {
          const goalKey = key as keyof NutritionGoals;
          const current = currentTotals[goalKey];
          const goal = goals[goalKey];
          const progress = getProgress(current, goal);
          const progressColor = getProgressColor(current, goal);

          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-semibold ${color}`}>{label}</span>
                {!isEditing ? (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(current)} / {goal} {unit}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Goal:</span>
                    <input
                      type="number"
                      value={tempGoals[goalKey]}
                      onChange={(e) => setTempGoals({ ...tempGoals, [goalKey]: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{unit}</span>
                  </div>
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className={`h-full ${progressColor} flex items-center justify-end px-2`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {progress > 20 && (
                    <span className="text-xs font-semibold text-white">{Math.round(progress)}%</span>
                  )}
                </motion.div>
              </div>
              {current >= goal && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Goal reached!</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Goal = 'lose' | 'maintain' | 'gain';

const goals = [
  {
    value: 'lose' as Goal,
    emoji: '🔥',
    title: 'Lose Weight',
    description: 'Create a calorie deficit',
    color: '#F77F5B',
  },
  {
    value: 'maintain' as Goal,
    emoji: '⚖️',
    title: 'Maintain Weight',
    description: 'Stay at current weight',
    color: '#F9D85C',
  },
  {
    value: 'gain' as Goal,
    emoji: '💪',
    title: 'Gain Weight',
    description: 'Build muscle and strength',
    color: '#CFE57A',
  },
];

export default function GoalPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const handleContinue = () => {
    if (!selectedGoal) return;
    localStorage.setItem('onboarding_goal', selectedGoal);
    router.push('/onboarding/gender');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="text-coral font-semibold"
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-darkGray dark:text-white mb-3">
            What's your goal?
          </h1>
          <p className="text-mediumGray dark:text-gray-400">
            We'll adjust your calorie targets accordingly
          </p>
        </motion.div>

        {/* Goal Cards */}
        <div className="w-full max-w-md space-y-4">
          {goals.map((goal, index) => (
            <motion.button
              key={goal.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedGoal(goal.value)}
              className={`w-full p-6 rounded-2xl text-left transition-all ${
                selectedGoal === goal.value
                  ? 'bg-white dark:bg-gray-800 shadow-xl border-3 scale-105'
                  : 'bg-white dark:bg-gray-800 shadow-md hover:shadow-lg'
              }`}
              style={{
                borderColor: selectedGoal === goal.value ? goal.color : 'transparent',
                borderWidth: selectedGoal === goal.value ? '3px' : '1px',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{goal.emoji}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-darkGray dark:text-white mb-1">
                    {goal.title}
                  </h3>
                  <p className="text-mediumGray dark:text-gray-400 text-sm">
                    {goal.description}
                  </p>
                </div>
                {selectedGoal === goal.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: goal.color }}
                  >
                    <span className="text-white text-xl">✓</span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-6 bg-white dark:bg-gray-800 shadow-lg">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: selectedGoal ? 1.02 : 1 }}
          whileTap={{ scale: selectedGoal ? 0.98 : 1 }}
          onClick={handleContinue}
          disabled={!selectedGoal}
          className="w-full py-4 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#F77F5B' }}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}

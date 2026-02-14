'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

type Gender = 'male' | 'female' | 'other';

const genders = [
  {
    value: 'male' as Gender,
    emoji: '👨',
    title: 'Male',
    color: '#60A5FA',
  },
  {
    value: 'female' as Gender,
    emoji: '👩',
    title: 'Female',
    color: '#F472B6',
  },
  {
    value: 'other' as Gender,
    emoji: '🧑',
    title: 'Other',
    color: '#A78BFA',
  },
];

export default function GenderPage() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedGender || !auth.currentUser) return;

    setIsLoading(true);
    try {
      // Get all onboarding data from localStorage
      const age = parseInt(localStorage.getItem('onboarding_age') || '25');
      const weight = parseInt(localStorage.getItem('onboarding_weight') || '70');
      const goal = localStorage.getItem('onboarding_goal') || 'maintain';

      // Calculate daily calorie target based on goal
      const baseCalories = 2000;
      let calorieTarget = baseCalories;
      if (goal === 'lose') calorieTarget = baseCalories - 500;
      if (goal === 'gain') calorieTarget = baseCalories + 500;

      // Update user document in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        age,
        weight,
        goal,
        gender: selectedGender,
        dailyCalorieTarget: calorieTarget,
        onboardingCompleted: true,
      });

      // Clear onboarding data from localStorage
      localStorage.removeItem('onboarding_age');
      localStorage.removeItem('onboarding_weight');
      localStorage.removeItem('onboarding_goal');

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="text-coral font-semibold"
          disabled={isLoading}
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
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-3xl font-bold text-darkGray dark:text-white mb-3">
            Select your gender
          </h1>
          <p className="text-mediumGray dark:text-gray-400">
            Almost done! This helps us personalize your experience
          </p>
        </motion.div>

        {/* Gender Cards */}
        <div className="w-full max-w-md space-y-4">
          {genders.map((gender, index) => (
            <motion.button
              key={gender.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedGender(gender.value)}
              disabled={isLoading}
              className={`w-full p-6 rounded-2xl text-left transition-all ${
                selectedGender === gender.value
                  ? 'bg-white dark:bg-gray-800 shadow-xl border-3 scale-105'
                  : 'bg-white dark:bg-gray-800 shadow-md hover:shadow-lg'
              }`}
              style={{
                borderColor: selectedGender === gender.value ? gender.color : 'transparent',
                borderWidth: selectedGender === gender.value ? '3px' : '1px',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{gender.emoji}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-darkGray dark:text-white">
                    {gender.title}
                  </h3>
                </div>
                {selectedGender === gender.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: gender.color }}
                  >
                    <span className="text-white text-xl">✓</span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-mediumGray dark:text-gray-400 mb-3">Setup Progress</p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="w-12 h-2 rounded-full"
                style={{ backgroundColor: '#F77F5B' }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Button */}
      <div className="p-6 bg-white dark:bg-gray-800 shadow-lg">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: selectedGender && !isLoading ? 1.02 : 1 }}
          whileTap={{ scale: selectedGender && !isLoading ? 0.98 : 1 }}
          onClick={handleComplete}
          disabled={!selectedGender || isLoading}
          className="w-full py-4 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#F77F5B' }}
        >
          {isLoading ? 'Setting up your profile...' : 'Complete Setup 🎉'}
        </motion.button>
      </div>
    </div>
  );
}

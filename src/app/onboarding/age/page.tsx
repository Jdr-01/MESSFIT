'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ScrollPicker from '@/components/ScrollPicker';

export default function AgePage() {
  const router = useRouter();
  const [age, setAge] = useState(25);
  const ages = Array.from({ length: 66 }, (_, i) => i + 15); // 15-80

  const handleContinue = () => {
    localStorage.setItem('onboarding_age', age.toString());
    router.push('/onboarding/weight');
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
          <div className="text-6xl mb-4">🎂</div>
          <h1 className="text-3xl font-bold text-darkGray dark:text-white mb-3">
            How old are you?
          </h1>
          <p className="text-mediumGray dark:text-gray-400">
            We use this to calculate your daily calorie needs
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <ScrollPicker
            values={ages}
            initialValue={age}
            onChange={setAge}
            unit=" years"
          />
        </motion.div>

        {/* Selected age display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-mediumGray dark:text-gray-400 mb-2">Selected Age</p>
          <p className="text-5xl font-bold text-coral">{age}</p>
        </motion.div>
      </div>

      {/* Bottom Button */}
      <div className="p-6 bg-white dark:bg-gray-800 shadow-lg">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-bold text-white shadow-lg"
          style={{ backgroundColor: '#F77F5B' }}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}

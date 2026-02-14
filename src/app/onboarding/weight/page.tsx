'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function WeightPage() {
  const router = useRouter();
  const [weight, setWeight] = useState(70);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  const minWeight = unit === 'kg' ? 30 : 66;
  const maxWeight = unit === 'kg' ? 200 : 440;

  const convertWeight = (value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs') => {
    if (from === to) return value;
    if (from === 'kg') return Math.round(value * 2.20462);
    return Math.round(value / 2.20462);
  };

  const toggleUnit = () => {
    const newUnit = unit === 'kg' ? 'lbs' : 'kg';
    const convertedWeight = convertWeight(weight, unit, newUnit);
    setUnit(newUnit);
    setWeight(convertedWeight);
  };

  const handleContinue = () => {
    const weightInKg = unit === 'kg' ? weight : Math.round(weight / 2.20462);
    localStorage.setItem('onboarding_weight', weightInKg.toString());
    router.push('/onboarding/goal');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-coral font-semibold"
        >
          ← Back
        </button>
        
        {/* Unit Toggle */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => unit === 'lbs' && toggleUnit()}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              unit === 'kg'
                ? 'bg-coral text-white'
                : 'text-mediumGray dark:text-gray-400'
            }`}
          >
            Kg
          </button>
          <button
            onClick={() => unit === 'kg' && toggleUnit()}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              unit === 'lbs'
                ? 'bg-coral text-white'
                : 'text-mediumGray dark:text-gray-400'
            }`}
          >
            Lbs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="text-6xl mb-4">⚖️</div>
          <h1 className="text-3xl font-bold text-darkGray dark:text-white mb-3">
            What's your weight?
          </h1>
          <p className="text-mediumGray dark:text-gray-400">
            Help us personalize your nutrition goals
          </p>
        </motion.div>

        {/* Weight Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="text-center">
            <p className="text-7xl font-bold text-coral mb-2">
              {weight}
            </p>
            <p className="text-2xl text-mediumGray dark:text-gray-400">{unit}</p>
          </div>
        </motion.div>

        {/* Slider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md px-6"
        >
          <input
            type="range"
            min={minWeight}
            max={maxWeight}
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer slider-coral"
            style={{
              background: `linear-gradient(to right, #F77F5B 0%, #F77F5B ${((weight - minWeight) / (maxWeight - minWeight)) * 100}%, #E5E7EB ${((weight - minWeight) / (maxWeight - minWeight)) * 100}%, #E5E7EB 100%)`,
            }}
          />
          
          <div className="flex justify-between mt-3 text-sm text-mediumGray dark:text-gray-400">
            <span>{minWeight}</span>
            <span>{maxWeight}</span>
          </div>
        </motion.div>

        {/* Quick Select Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 mt-8"
        >
          {[
            unit === 'kg' ? 50 : 110,
            unit === 'kg' ? 70 : 154,
            unit === 'kg' ? 90 : 198,
          ].map((quickWeight) => (
            <button
              key={quickWeight}
              onClick={() => setWeight(quickWeight)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                weight === quickWeight
                  ? 'bg-coral text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-mediumGray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {quickWeight}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Bottom Button */}
      <div className="p-6 bg-white dark:bg-gray-800 shadow-lg">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-yellow/20 to-success/20 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center"
      >
        {/* App Icon/Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-8xl mb-6"
        >
          🥗
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold mb-4"
          style={{ color: '#F77F5B' }}
        >
          MessFit
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-mediumGray dark:text-gray-400 mb-8"
        >
          Track your nutrition, achieve your goals, and live healthier every day! 🎯
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-8 text-left"
        >
          {[
            { icon: '📊', text: 'Track calories & macros effortlessly' },
            { icon: '🎯', text: 'Set personalized fitness goals' },
            { icon: '📈', text: 'Monitor your progress over time' },
            { icon: '💪', text: 'Build healthy eating habits' },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-cream dark:bg-gray-700 rounded-xl"
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-darkGray dark:text-white">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Buttons */}
        <div className="space-y-3">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/onboarding/age')}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all"
            style={{ backgroundColor: '#F77F5B' }}
          >
            🚀 Get Started
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-darkGray dark:text-white rounded-xl font-semibold transition-all"
          >
            Already have an account? Login
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

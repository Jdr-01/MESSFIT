'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MotivationalMessageProps {
  show: boolean;
  onComplete: () => void;
}

const motivationalQuotes = [
  { text: "Every meal logged is a step towards your goal! 🎯", emoji: "💪" },
  { text: "Consistency is the key to success! Keep tracking! 📊", emoji: "🌟" },
  { text: "You're investing in your health today! 🌱", emoji: "💚" },
  { text: "Small steps lead to big changes! 🚀", emoji: "✨" },
  { text: "Your body is your temple. Fuel it wisely! 🏛️", emoji: "🍎" },
  { text: "Progress, not perfection! Keep going! 📈", emoji: "🔥" },
  { text: "You're stronger than you think! 💪", emoji: "⚡" },
  { text: "Make today count! Track your nutrition! 📝", emoji: "🎯" },
  { text: "Great job! You're taking care of yourself! 🌈", emoji: "🎉" },
  { text: "Your health journey starts now! Let's go! 🚴", emoji: "💫" },
  { text: "Believe in yourself. You've got this! 🌟", emoji: "🏆" },
  { text: "Every healthy choice matters! 🥗", emoji: "💎" },
  { text: "You're creating a healthier version of yourself! 🦸", emoji: "🌸" },
  { text: "Stay committed to your goals! 🎪", emoji: "🎭" },
  { text: "Track it, own it, achieve it! 📊", emoji: "🎖️" },
];

export default function MotivationalMessage({ show, onComplete }: MotivationalMessageProps) {
  const [quote, setQuote] = useState(motivationalQuotes[0]);

  useEffect(() => {
    if (show) {
      // Select random quote
      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      setQuote(randomQuote);

      // Auto-complete after 3 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-7xl mb-4"
            >
              {quote.emoji}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-800 dark:text-white mb-4"
            >
              Welcome Back!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 dark:text-gray-300 mb-6"
            >
              {quote.text}
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'linear' }}
              className="h-2 bg-gradient-to-r from-primary to-secondary rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

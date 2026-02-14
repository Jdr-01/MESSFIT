'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';import { getLocalDateString, getLocalDateStringDaysAgo } from '@/lib/dateUtils';
interface StreakTrackerProps {
  userId: string;
}

export default function StreakTracker({ userId }: StreakTrackerProps) {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const calculateStreak = useCallback(async () => {
    try {
      // Get all meal logs ordered by date
      const mealsQuery = query(
        collection(db, 'meal_logs'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(mealsQuery);
      
      if (snapshot.empty) {
        setLoading(false);
        return;
      }

      // Get unique dates
      const dates = new Set<string>();
      snapshot.forEach((doc) => {
        dates.add(doc.data().date);
      });

      const sortedDates = Array.from(dates).sort().reverse();
      
      // Calculate current streak
      let streak = 0;
      const today = getLocalDateString();
      const yesterday = getLocalDateStringDaysAgo(1);
      
      // Check if logged today or yesterday (to keep streak alive)
      if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
        let currentDate = sortedDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
        
        for (const date of sortedDates) {
          const checkDate = getLocalDateString(currentDate);
          
          if (date === checkDate) {
            streak++;
            currentDate = new Date(currentDate.getTime() - 86400000); // Go back one day
          } else {
            break;
          }
        }
      }

      setCurrentStreak(streak);

      // Calculate longest streak
      let maxStreak = 0;
      let tempStreak = 1;
      
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const date1 = new Date(sortedDates[i]);
        const date2 = new Date(sortedDates[i + 1]);
        const diffDays = Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);
      setLongestStreak(Math.max(maxStreak, streak));
      
    } catch (error) {
      console.error('Error calculating streak:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    calculateStreak();
  }, [userId, calculateStreak]);

  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your streak today! 🚀";
    if (currentStreak === 1) return "Great start! Keep going! 💪";
    if (currentStreak < 7) return "You're on fire! 🔥";
    if (currentStreak < 30) return "Incredible consistency! ⭐";
    return "You're a legend! 👑";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
    >
      <h3 className="text-lg font-bold text-darkGray dark:text-white mb-4">
        🔥 Logging Streak
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            className="text-5xl font-bold"
            style={{ color: '#F77F5B' }}
          >
            {currentStreak}
          </motion.div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Current Streak
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
            className="text-5xl font-bold"
            style={{ color: '#F9D85C' }}
          >
            {longestStreak}
          </motion.div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Longest Streak
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {longestStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Fire Icons */}
      {currentStreak > 0 && (
        <div className="flex justify-center gap-1 mb-4">
          {[...Array(Math.min(currentStreak, 10))].map((_, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="text-2xl"
            >
              🔥
            </motion.span>
          ))}
          {currentStreak > 10 && (
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              +{currentStreak - 10}
            </span>
          )}
        </div>
      )}

      {/* Motivational Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center p-3 bg-coral/10 rounded-xl"
      >
        <p className="text-darkGray dark:text-white font-semibold" style={{ color: '#F77F5B' }}>
          {getStreakMessage()}
        </p>
      </motion.div>

      {/* Milestone Progress */}
      {currentStreak > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Next milestone: {currentStreak < 7 ? '7 days 🎯' : currentStreak < 30 ? '30 days 🏆' : '100 days 👑'}
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${currentStreak < 7 
                  ? (currentStreak / 7) * 100 
                  : currentStreak < 30 
                  ? (currentStreak / 30) * 100 
                  : (currentStreak / 100) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
            style={{ backgroundColor: '#F77F5B' }}
            ></motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

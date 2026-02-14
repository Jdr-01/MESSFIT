'use client';

import { motion } from 'framer-motion';

interface CircularProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export default function CircularProgress({
  current,
  target,
  size = 200,
  strokeWidth = 12,
  label = 'Calories',
  color = '#F77F5B',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((current / target) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="text-4xl font-bold text-darkGray dark:text-white"
        >
          {current}
        </motion.span>
        <span className="text-sm text-mediumGray dark:text-gray-400">
          of {target}
        </span>
        <span className="text-xs text-lightGray dark:text-gray-500 mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
  icon?: string;
}

export default function MacroBar({
  label,
  current,
  target,
  unit = 'g',
  color,
  icon,
}: MacroBarProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <span className="text-sm font-semibold text-darkGray dark:text-white">
            {label}
          </span>
        </div>
        <span className="text-sm text-mediumGray dark:text-gray-400">
          {current.toFixed(1)}/{target}{unit}
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

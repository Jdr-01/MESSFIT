'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { x: '100%' },
};

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const baseStyles = 'bg-gray-100 overflow-hidden relative';
  
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    >
      {animation === 'wave' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/60 to-transparent"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
      {animation === 'pulse' && (
        <motion.div
          className="absolute inset-0 bg-gray-200/30"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}

// Pre-built skeleton components for common UI patterns

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" className="w-3/4 mb-2" height={20} />
          <Skeleton variant="text" className="w-1/2" height={16} />
        </div>
      </div>
      <Skeleton variant="rounded" className="w-full" height={100} />
    </div>
  );
}

export function SkeletonMealCard() {
  return (
    <div className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-4">
      <div className="flex justify-between items-center mb-3">
        <Skeleton variant="text" width={100} height={20} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width={50} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCircularProgress() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton variant="circular" width={160} height={160} />
      <Skeleton variant="text" className="mt-4" width={100} height={24} />
      <Skeleton variant="text" className="mt-2" width={150} height={16} />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-4">
          <Skeleton variant="text" width="50%" height={14} className="mb-2" />
          <Skeleton variant="text" width="70%" height={28} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton variant="text" width={100} height={16} className="mb-2" />
            <Skeleton variant="text" width={150} height={28} className="mb-1" />
            <Skeleton variant="text" width={120} height={14} />
          </div>
          <Skeleton variant="rounded" width={80} height={44} className="rounded-full" />
        </div>
      </div>

      <div className="px-5 pt-6 space-y-8 max-w-lg mx-auto">
        {/* Calorie Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-7">
          <Skeleton variant="text" width={120} height={14} className="mx-auto mb-4" />
          <Skeleton variant="text" width={140} height={52} className="mx-auto mb-2" />
          <Skeleton variant="text" width={80} height={14} className="mx-auto mb-4" />
          <Skeleton variant="rounded" width="100%" height={6} className="rounded-full mb-6" />
          <div className="flex justify-between">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton variant="text" width={40} height={12} className="mx-auto mb-1" />
                <Skeleton variant="text" width={50} height={22} className="mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Macro Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-[20px] p-4">
              <Skeleton variant="text" width={50} height={12} className="mb-2" />
              <Skeleton variant="text" width={40} height={22} className="mb-1" />
              <Skeleton variant="text" width={45} height={10} className="mb-2" />
              <Skeleton variant="rounded" width="100%" height={4} className="rounded-full" />
            </div>
          ))}
        </div>

        {/* Meal Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-4 flex items-center gap-4">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1">
                <Skeleton variant="text" width={80} height={16} className="mb-1" />
                <Skeleton variant="text" width={60} height={12} />
              </div>
              <Skeleton variant="circular" width={32} height={32} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonFoodList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-4"
        >
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <Skeleton variant="text" width="70%" height={20} className="mb-2" />
              <Skeleton variant="text" width="40%" height={14} />
            </div>
            <Skeleton variant="rounded" width={60} height={32} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Skeleton variant="circular" width={96} height={96} className="mx-auto mb-4" />
          <Skeleton variant="text" width={150} height={28} className="mx-auto mb-2" />
          <Skeleton variant="text" width={200} height={18} className="mx-auto" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-6">
            <Skeleton variant="text" width={100} height={18} className="mb-3" />
            <Skeleton variant="rounded" width="100%" height={48} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;

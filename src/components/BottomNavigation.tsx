'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  activeIcon: string;
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: '🏠', activeIcon: '🏠' },
  { name: 'Progress', path: '/weekly-summary', icon: '📊', activeIcon: '📈' },
  { name: 'Profile', path: '/profile', icon: '👤', activeIcon: '👤' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-4 left-4 right-4 z-50"
    >
      <div className="max-w-md mx-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-gray-100/60 dark:border-gray-700/60 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <motion.button
                key={item.path}
                onClick={() => router.push(item.path)}
                whileTap={{ scale: 0.9 }}
                className={`relative flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-250 ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">
                  {isActive ? item.activeIcon : item.icon}
                </span>
                <span
                  className={`text-[11px] font-semibold transition-colors duration-200 ${
                    isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.name}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-green-500 rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

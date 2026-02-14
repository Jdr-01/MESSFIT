'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, MealLog, WaterLog } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCSV, exportToJSON, exportToMail, calculateSummary } from '@/lib/exportUtils';
import BottomNavigation from '@/components/BottomNavigation';
import { SkeletonProfile } from '@/components/Skeleton';

type ExportFormat = 'csv' | 'json' | 'mail';
type DateRangePreset = '7days' | '30days' | '90days' | 'all' | 'custom';

export default function ExportPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  
  // Export options
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRangePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      try {
        // Load user data
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: userDoc.id, ...userDoc.data() } as User);
        }

        // Load all meals
        const mealsQuery = query(
          collection(db, 'meal_logs'),
          where('userId', '==', firebaseUser.uid)
        );
        const mealsSnapshot = await getDocs(mealsQuery);
        const mealsData = mealsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MealLog[];
        mealsData.sort((a, b) => b.date.localeCompare(a.date));
        setMeals(mealsData);

        // Load water logs
        const waterQuery = query(
          collection(db, 'water_logs'),
          where('userId', '==', firebaseUser.uid)
        );
        const waterSnapshot = await getDocs(waterQuery);
        const waterData = waterSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WaterLog[];
        waterData.sort((a, b) => b.date.localeCompare(a.date));
        setWaterLogs(waterData);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getDateRange = (): { start: string; end: string } | null => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (dateRange) {
      case '7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        return { start: formatDate(week), end: formatDate(today) };
      case '30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        return { start: formatDate(month), end: formatDate(today) };
      case '90days':
        const quarter = new Date(today);
        quarter.setDate(quarter.getDate() - 90);
        return { start: formatDate(quarter), end: formatDate(today) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return null;
      case 'all':
      default:
        return null;
    }
  };

  const getFilteredMeals = (): MealLog[] => {
    const range = getDateRange();
    if (!range) return meals;
    return meals.filter(m => m.date >= range.start && m.date <= range.end);
  };

  const getFilteredWaterLogs = (): WaterLog[] => {
    const range = getDateRange();
    if (!range) return waterLogs;
    return waterLogs.filter(w => w.date >= range.start && w.date <= range.end);
  };

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const filteredMeals = getFilteredMeals();
      const range = getDateRange();
      const timestamp = new Date().toISOString().split('T')[0];
      
      const filteredWater = getFilteredWaterLogs();

      switch (format) {
        case 'csv':
          exportToCSV(filteredMeals, `messfit-meals-${timestamp}.csv`, {
            includeSummary: true,
            dateRange: range || undefined,
          }, filteredWater);
          break;
        case 'json':
          exportToJSON(filteredMeals, `messfit-meals-${timestamp}.json`, {
            includeSummary: true,
            dateRange: range || undefined,
          }, filteredWater);
          break;
        case 'mail':
          exportToMail(filteredMeals, user || undefined, filteredWater);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filteredMeals = getFilteredMeals();
  const summary = calculateSummary(filteredMeals);

  if (loading) {
    return (
      <>
        <SkeletonProfile />
        <BottomNavigation />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-6 py-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Download your nutrition tracking data</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="px-6 py-6 space-y-6 max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none transition-all duration-300"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Data Preview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredMeals.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Meals to export</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.daysTracked}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Days tracked</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.avgCaloriesPerDay}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg cal/day</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{getFilteredWaterLogs().length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Water entries</p>
            </div>
          </div>
        </motion.div>

        {/* Date Range Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none transition-all duration-300"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📅 Date Range</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: '7days', label: 'Last 7 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: '90days', label: 'Last 90 Days' },
              { value: 'all', label: 'All Time' },
            ].map((option) => (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDateRange(option.value as DateRangePreset)}
                className={`p-4 rounded-xl text-sm font-medium transition-all border ${
                  dateRange === option.value
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setDateRange('custom')}
            className={`w-full mt-3 p-4 rounded-xl text-sm font-medium transition-all border ${
              dateRange === 'custom'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Custom Range
          </motion.button>

          <AnimatePresence>
            {dateRange === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-400 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-400 focus:outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Format Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none transition-all duration-300"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📁 Export Format</h2>
          <div className="space-y-3">
            {[
              { value: 'csv', label: 'CSV (Spreadsheet)', icon: '📊', desc: 'Open in Excel, Sheets' },
              { value: 'json', label: 'JSON (Data)', icon: '🔧', desc: 'For developers' },
              { value: 'mail', label: 'Mail', icon: '📧', desc: 'Send via email' },
            ].map((option) => (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormat(option.value as ExportFormat)}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all border ${
                  format === option.value
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="text-left">
                  <p className={`font-medium ${format === option.value ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                </div>
                {format === option.value && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-green-600 dark:text-green-400"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Export Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          disabled={exporting || filteredMeals.length === 0}
          className={`w-full p-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 border ${
            exporting || filteredMeals.length === 0
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
              : 'bg-green-500 hover:bg-green-600 text-white border-green-400 shadow-md hover:shadow-lg'
          }`}
        >
          {exporting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              />
              Exporting...
            </>
          ) : (
            <>
              <span className="text-2xl">⬇️</span>
              Export {filteredMeals.length} Meals
            </>
          )}
        </motion.button>

        {filteredMeals.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500 dark:text-gray-400 text-sm"
          >
            No meals found in the selected date range
          </motion.p>
        )}
      </motion.div>

      <BottomNavigation />
    </div>
  );
}

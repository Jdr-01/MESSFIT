'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SubmitFoodPage() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    calories_per_portion: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    fiber_g: '',
    sugar_g: '',
    unit: 'piece' as 'piece' | 'bowl' | 'cup' | 'ml' | 'bar' | 'can',
    grams_per_unit: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.uid);
      
      // Get user name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name || user.email || 'Unknown User');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pending_foods'), {
        name: formData.name,
        calories_per_portion: parseFloat(formData.calories_per_portion),
        protein_g: parseFloat(formData.protein_g),
        carbs_g: parseFloat(formData.carbs_g),
        fat_g: parseFloat(formData.fat_g),
        fiber_g: parseFloat(formData.fiber_g),
        sugar_g: parseFloat(formData.sugar_g) || 0,
        unit: formData.unit,
        grams_per_unit: parseFloat(formData.grams_per_unit),
        submittedBy: userId,
        submittedByName: userName,
        status: 'pending',
        submittedAt: new Date(),
      });

      toast.success('Food submitted for admin approval!');
      
      // Reset form
      setFormData({
        name: '',
        calories_per_portion: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        fiber_g: '',
        sugar_g: '',
        unit: 'piece',
        grams_per_unit: '',
      });
    } catch (error) {
      console.error('Error submitting food:', error);
      toast.error('Failed to submit food');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 hover:text-green-500 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit New Food</h1>
          <p className="text-gray-500 dark:text-gray-400">Your submission will be reviewed by admin</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Food Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Chicken Biryani"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit *
              </label>
              <select
                name="unit"
                required
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="piece">piece (dosa, chapathi, idli, vada, naan)</option>
                <option value="bowl">bowl (rice, dal, curry, biryani)</option>
                <option value="cup">cup (tea, coffee, buttermilk)</option>
                <option value="ml">ml (liquids)</option>
                <option value="bar">bar (chocolates)</option>
                <option value="can">can (soft drinks)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grams per Unit *
              </label>
              <input
                type="number"
                name="grams_per_unit"
                required
                step="1"
                value={formData.grams_per_unit}
                onChange={handleChange}
                placeholder="e.g., 40 for chapathi"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calories (kcal) *
              </label>
              <input
                type="number"
                name="calories_per_portion"
                required
                step="0.1"
                value={formData.calories_per_portion}
                onChange={handleChange}
                placeholder="e.g., 120"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Protein (g) *
              </label>
              <input
                type="number"
                name="protein_g"
                required
                step="0.1"
                value={formData.protein_g}
                onChange={handleChange}
                placeholder="e.g., 4"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Carbs (g) *
              </label>
              <input
                type="number"
                name="carbs_g"
                required
                step="0.1"
                value={formData.carbs_g}
                onChange={handleChange}
                placeholder="e.g., 20"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fat (g) *
              </label>
              <input
                type="number"
                name="fat_g"
                required
                step="0.1"
                value={formData.fat_g}
                onChange={handleChange}
                placeholder="e.g., 3"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fiber (g) *
              </label>
              <input
                type="number"
                name="fiber_g"
                required
                step="0.1"
                value={formData.fiber_g}
                onChange={handleChange}
                placeholder="e.g., 3"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sugars (g)
            </label>
            <input
              type="number"
              name="sugar_g"
              step="0.1"
              value={formData.sugar_g}
              onChange={handleChange}
              placeholder="e.g., 5"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Admin will review and approve your submission
          </p>
        </motion.form>
      </div>
    </div>
  );
}

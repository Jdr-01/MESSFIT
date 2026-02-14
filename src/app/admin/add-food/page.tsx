'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Food } from '@/types';

export default function AdminAddFoodPage() {
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const foodData: Omit<Food, 'id'> = {
        name: formData.name,
        calories_per_portion: parseFloat(formData.calories_per_portion),
        protein_g: parseFloat(formData.protein_g),
        carbs_g: parseFloat(formData.carbs_g),
        fat_g: parseFloat(formData.fat_g),
        fiber_g: parseFloat(formData.fiber_g),
        sugar_g: parseFloat(formData.sugar_g) || 0,
        unit: formData.unit,
        grams_per_unit: parseFloat(formData.grams_per_unit),
      };

      await addDoc(collection(db, 'food_master'), foodData);
      setMessage('✅ Food added successfully!');
      
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
      console.error('Error adding food:', error);
      setMessage('❌ Failed to add food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-6 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:scale-110 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Food Item</h1>
          <p className="text-gray-500 dark:text-gray-400">Add food to the master database</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Food Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Food Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="piece">piece (dosa, chapathi, idli, vada, naan)</option>
                <option value="bowl">bowl (rice, dal, curry, biryani)</option>
                <option value="cup">cup (tea, coffee, buttermilk)</option>
                <option value="ml">ml (liquids)</option>
                <option value="bar">bar (chocolates)</option>
                <option value="can">can (soft drinks)</option>
              </select>
            </div>

            {/* Grams per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grams per Unit *
              </label>
              <input
                type="number"
                value={formData.grams_per_unit}
                onChange={(e) => setFormData({ ...formData, grams_per_unit: e.target.value })}
                placeholder="e.g., 40 for chapathi, 200 for rice bowl"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Nutrition Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Calories (kcal) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.calories_per_portion}
                  onChange={(e) => setFormData({ ...formData, calories_per_portion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Protein (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.protein_g}
                  onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Carbs (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.carbs_g}
                  onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fat (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fat_g}
                  onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fiber (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fiber_g}
                  onChange={(e) => setFormData({ ...formData, fiber_g: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sugars (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.sugar_g}
                  onChange={(e) => setFormData({ ...formData, sugar_g: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`text-center py-2 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
            >
              {saving ? 'Adding Food...' : 'Add Food to Database'}
            </button>
          </form>
        </div>

        {/* Bulk Import Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">💡 Bulk Import Available</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Have a dataset? Share your food data in CSV/Excel format and I'll create a bulk import script for you.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Format needed: name, calories_per_portion, protein_g, carbs_g, fat_g, fiber_g, sugar_g, unit, grams_per_unit
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

interface MealTemplate {
  id: string;
  userId: string;
  name: string;
  mealType: string;
  foods: {
    foodId: string;
    foodName: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  createdAt: Date;
}

export default function MealTemplatesPage() {
  const [userId, setUserId] = useState('');
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.uid);
      await loadTemplates(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadTemplates = async (uid: string) => {
    try {
      const templatesQuery = query(
        collection(db, 'meal_templates'),
        where('userId', '==', uid)
      );
      const snapshot = await getDocs(templatesQuery);
      const templatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealTemplate[];
      setTemplates(templatesList);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteDoc(doc(db, 'meal_templates', templateId));
      setTemplates(templates.filter((t) => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const applyTemplate = (template: MealTemplate) => {
    toast.success(`Using template: ${template.name}`);
    // Navigate to add food with template data (you could implement this feature)
    router.push(`/meal-selection?type=${template.mealType}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loading text="Loading templates..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-6 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-all duration-300" 
          >
            <span className="mr-2">←</span> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Templates</h1>
          <p className="text-gray-500 dark:text-gray-400">Save and reuse your favorite meal combinations</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {templates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">No Templates Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create meal templates from your daily summary page to quickly log regular meals.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 hover:scale-105 shadow-sm transition-all duration-300"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md rounded-2xl p-6 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{template.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {template.mealType} • {template.foods.length} items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyTemplate(template)}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 shadow-sm hover:scale-105 transition-all duration-300"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 shadow-sm hover:scale-105 transition-all duration-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {template.foods.map((food, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{food.foodName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {food.quantity} {food.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {Math.round(food.calories)} kcal
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round(food.protein)}g protein
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Total:</span>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {Math.round(template.totalCalories)} kcal
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(template.totalProtein)}g protein
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

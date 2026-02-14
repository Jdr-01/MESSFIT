'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Food, MealLog } from '@/types';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';
import { getLocalDateString } from '@/lib/dateUtils';

function AddFoodContent() {
  const [food, setFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const foodId = searchParams.get('id');
  const mealType = searchParams.get('type') || 'breakfast';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (foodId) {
      loadFood();
    }
  }, [foodId]);

  const loadFood = async () => {
    try {
      const foodDoc = await getDoc(doc(db, 'food_master', foodId!));
      if (foodDoc.exists()) {
        setFood({ id: foodDoc.id, ...foodDoc.data() } as Food);
      } else {
        // Use sample data if not found
        const sampleFood = getSampleFood(foodId!);
        setFood(sampleFood);
      }
    } catch (error) {
      console.error('Error loading food:', error);
      const sampleFood = getSampleFood(foodId!);
      setFood(sampleFood);
    } finally {
      setLoading(false);
    }
  };

  const getSampleFood = (id: string): Food => {
    const samples: Record<string, Food> = {
      '1': { id: '1', name: 'Chapathi', calories_per_portion: 120, protein_g: 4, carbs_g: 20, fat_g: 3, fiber_g: 3, unit: 'piece', grams_per_unit: 40 },
      '2': { id: '2', name: 'White Rice', calories_per_portion: 180, protein_g: 4, carbs_g: 40, fat_g: 1, fiber_g: 1, unit: 'bowl', grams_per_unit: 200 },
      '3': { id: '3', name: 'Masala Dosa', calories_per_portion: 180, protein_g: 4, carbs_g: 30, fat_g: 5, fiber_g: 3, unit: 'piece', grams_per_unit: 120 },
      '4': { id: '4', name: 'Idli', calories_per_portion: 40, protein_g: 1.5, carbs_g: 8, fat_g: 0.2, fiber_g: 0.5, unit: 'piece', grams_per_unit: 60 },
      '5': { id: '5', name: 'Dal', calories_per_portion: 150, protein_g: 9, carbs_g: 20, fat_g: 3, fiber_g: 5, unit: 'bowl', grams_per_unit: 180 },
      '6': { id: '6', name: 'Poha', calories_per_portion: 180, protein_g: 4, carbs_g: 32, fat_g: 4, fiber_g: 3, unit: 'bowl', grams_per_unit: 180 },
      '7': { id: '7', name: 'Upma', calories_per_portion: 150, protein_g: 4, carbs_g: 26, fat_g: 4, fiber_g: 2, unit: 'bowl', grams_per_unit: 180 },
      '8': { id: '8', name: 'Sambar', calories_per_portion: 120, protein_g: 5, carbs_g: 18, fat_g: 3, fiber_g: 4, unit: 'bowl', grams_per_unit: 180 },
      '9': { id: '9', name: 'Samosa', calories_per_portion: 150, protein_g: 3, carbs_g: 18, fat_g: 8, fiber_g: 2, unit: 'piece', grams_per_unit: 50 },
      '10': { id: '10', name: 'Vada', calories_per_portion: 100, protein_g: 3, carbs_g: 12, fat_g: 5, fiber_g: 1, unit: 'piece', grams_per_unit: 50 },
      '11': { id: '11', name: 'Veg Biryani', calories_per_portion: 380, protein_g: 8, carbs_g: 68, fat_g: 10, fiber_g: 6, unit: 'bowl', grams_per_unit: 250 },
      '12': { id: '12', name: 'Banana', calories_per_portion: 105, protein_g: 1, carbs_g: 27, fat_g: 0, fiber_g: 3, unit: 'piece', grams_per_unit: 120 },
      '13': { id: '13', name: 'Paratha', calories_per_portion: 200, protein_g: 5, carbs_g: 28, fat_g: 8, fiber_g: 3, unit: 'piece', grams_per_unit: 80 },
      '14': { id: '14', name: 'Naan', calories_per_portion: 260, protein_g: 8, carbs_g: 45, fat_g: 5, fiber_g: 2, unit: 'piece', grams_per_unit: 90 },
      '15': { id: '15', name: 'Curd Rice', calories_per_portion: 200, protein_g: 6, carbs_g: 35, fat_g: 4, fiber_g: 1, unit: 'bowl', grams_per_unit: 200 },
      '16': { id: '16', name: 'Tea', calories_per_portion: 50, protein_g: 1, carbs_g: 8, fat_g: 1, fiber_g: 0, unit: 'cup', grams_per_unit: 250 },
    };
    return samples[id] || { id, name: 'Unknown Food', calories_per_portion: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, unit: 'piece', grams_per_unit: 100 };
  };

  const handleSave = async () => {
    if (!food || !userId) return;

    setSaving(true);
    try {
      const today = getLocalDateString();
      const mealLog: Omit<MealLog, 'id'> = {
        userId,
        foodId: food.id,
        foodName: food.name,
        quantity,
        unit: food.unit,
        calories: food.calories_per_portion * quantity,
        protein: food.protein_g * quantity,
        carbs: food.carbs_g * quantity,
        fats: food.fat_g * quantity,
        fiber: food.fiber_g * quantity,
        sugars: (food.sugar_g || 0) * quantity,
        mealType: mealType as any,
        date: today,
        timestamp: new Date(),
      };

      await addDoc(collection(db, 'meal_logs'), mealLog);
      toast.success(`${food.name} added successfully!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving meal log:', error);
      toast.error('Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loading text="Loading food details..." />
      </div>
    );
  }

  if (!food) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Food not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 hover:text-green-500 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Food</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none p-6">
          {/* Food Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Food Item</label>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{food.name}</div>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                className="w-12 h-12 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-xl text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{quantity}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{food.unit}(s)</div>
              </div>
              <button
                onClick={() => setQuantity(quantity + 0.5)}
                className="w-12 h-12 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-xl text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
              >
                +
              </button>
            </div>
          </div>

          {/* Nutrition Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">Nutrition Information</h3>
            
            {/* Weight Display */}
            <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Weight</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(food.grams_per_unit * quantity).toFixed(0)} g
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">({food.grams_per_unit}g per {food.unit})</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Calories</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {(food.calories_per_portion * quantity).toFixed(0)} kcal
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Protein</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {(food.protein_g * quantity).toFixed(1)} g
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Carbs</div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {(food.carbs_g * quantity).toFixed(1)} g
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Fats</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {(food.fat_g * quantity).toFixed(1)} g
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Fiber</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {(food.fiber_g * quantity).toFixed(1)} g
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Sugars</div>
                <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
                  {((food.sugar_g || 0) * quantity).toFixed(1)} g
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-semibold text-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save to Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
      <AddFoodContent />
    </Suspense>
  );
}

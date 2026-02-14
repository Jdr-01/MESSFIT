'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Food, User } from '@/types';
import { onAuthStateChanged } from 'firebase/auth';
import Loading from '@/components/Loading';
import { motion } from 'framer-motion';
import { SkeletonFoodList } from '@/components/Skeleton';

function MealSelectionContent() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealType = searchParams.get('type') || 'breakfast';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          setFavoriteFoods(userData.favoriteFoods || []);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealType]);

  useEffect(() => {
    let result = foods;
    
    if (searchTerm) {
      result = result.filter((food) =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (showFavoritesOnly) {
      result = result.filter((food) => favoriteFoods.includes(food.id));
    }
    
    setFilteredFoods(result);
  }, [searchTerm, foods, showFavoritesOnly, favoriteFoods]);

  const loadFoods = async () => {
    try {
      // Load ALL foods (no category filter - category is determined at logging time)
      const foodsQuery = query(
        collection(db, 'food_master')
      );
      const snapshot = await getDocs(foodsQuery);
      const foodList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Food[];
      
      if (foodList.length === 0) {
        const sampleFoods = getSampleFoods();
        setFoods(sampleFoods);
        setFilteredFoods(sampleFoods);
      } else {
        setFoods(foodList);
        setFilteredFoods(foodList);
      }
    } catch (error) {
      console.error('Error loading foods:', error);
      const sampleFoods = getSampleFoods();
      setFoods(sampleFoods);
      setFilteredFoods(sampleFoods);
    } finally {
      setLoading(false);
    }
  };

  const getSampleFoods = (): Food[] => {
    // Sample foods with standardized units and grams_per_unit
    return [
      { id: '1', name: 'Chapathi', calories_per_portion: 120, protein_g: 4, carbs_g: 20, fat_g: 3, fiber_g: 3, unit: 'piece', grams_per_unit: 40 },
      { id: '2', name: 'White Rice', calories_per_portion: 180, protein_g: 4, carbs_g: 40, fat_g: 1, fiber_g: 1, unit: 'bowl', grams_per_unit: 200 },
      { id: '3', name: 'Masala Dosa', calories_per_portion: 180, protein_g: 4, carbs_g: 30, fat_g: 5, fiber_g: 3, unit: 'piece', grams_per_unit: 120 },
      { id: '4', name: 'Idli', calories_per_portion: 40, protein_g: 1.5, carbs_g: 8, fat_g: 0.2, fiber_g: 0.5, unit: 'piece', grams_per_unit: 60 },
      { id: '5', name: 'Vada', calories_per_portion: 100, protein_g: 3, carbs_g: 12, fat_g: 5, fiber_g: 1, unit: 'piece', grams_per_unit: 50 },
      { id: '6', name: 'Poha', calories_per_portion: 180, protein_g: 4, carbs_g: 32, fat_g: 4, fiber_g: 3, unit: 'bowl', grams_per_unit: 180 },
      { id: '7', name: 'Upma', calories_per_portion: 150, protein_g: 4, carbs_g: 26, fat_g: 4, fiber_g: 2, unit: 'bowl', grams_per_unit: 180 },
      { id: '8', name: 'Dal', calories_per_portion: 150, protein_g: 9, carbs_g: 20, fat_g: 3, fiber_g: 5, unit: 'bowl', grams_per_unit: 180 },
      { id: '9', name: 'Sambar', calories_per_portion: 120, protein_g: 5, carbs_g: 18, fat_g: 3, fiber_g: 4, unit: 'bowl', grams_per_unit: 180 },
      { id: '10', name: 'Curd Rice', calories_per_portion: 200, protein_g: 6, carbs_g: 35, fat_g: 4, fiber_g: 1, unit: 'bowl', grams_per_unit: 200 },
      { id: '11', name: 'Veg Biryani', calories_per_portion: 380, protein_g: 8, carbs_g: 68, fat_g: 10, fiber_g: 6, unit: 'bowl', grams_per_unit: 250 },
      { id: '12', name: 'Poriyal', calories_per_portion: 80, protein_g: 2, carbs_g: 10, fat_g: 4, fiber_g: 3, unit: 'bowl', grams_per_unit: 100 },
      { id: '13', name: 'Rasam', calories_per_portion: 60, protein_g: 2, carbs_g: 10, fat_g: 1, fiber_g: 1, unit: 'bowl', grams_per_unit: 150 },
      { id: '14', name: 'Naan', calories_per_portion: 260, protein_g: 8, carbs_g: 45, fat_g: 5, fiber_g: 2, unit: 'piece', grams_per_unit: 90 },
      { id: '15', name: 'Kulcha', calories_per_portion: 300, protein_g: 7, carbs_g: 48, fat_g: 8, fiber_g: 2, unit: 'piece', grams_per_unit: 100 },
      { id: '16', name: 'Paratha', calories_per_portion: 200, protein_g: 5, carbs_g: 28, fat_g: 8, fiber_g: 3, unit: 'piece', grams_per_unit: 80 },
      { id: '17', name: 'Tea', calories_per_portion: 50, protein_g: 1, carbs_g: 8, fat_g: 1, fiber_g: 0, unit: 'cup', grams_per_unit: 250 },
      { id: '18', name: 'Coffee', calories_per_portion: 60, protein_g: 1, carbs_g: 8, fat_g: 2, fiber_g: 0, unit: 'cup', grams_per_unit: 250 },
      { id: '19', name: 'Buttermilk', calories_per_portion: 40, protein_g: 2, carbs_g: 5, fat_g: 1, fiber_g: 0, unit: 'cup', grams_per_unit: 250 },
      { id: '20', name: 'Milk', calories_per_portion: 150, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0, unit: 'cup', grams_per_unit: 250 },
      { id: '21', name: 'Coke Zero', calories_per_portion: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, unit: 'can', grams_per_unit: 330 },
      { id: '22', name: 'Samosa', calories_per_portion: 150, protein_g: 3, carbs_g: 18, fat_g: 8, fiber_g: 2, unit: 'piece', grams_per_unit: 50 },
      { id: '23', name: 'Banana', calories_per_portion: 105, protein_g: 1, carbs_g: 27, fat_g: 0, fiber_g: 3, unit: 'piece', grams_per_unit: 120 },
      { id: '24', name: 'Chocolate Bar', calories_per_portion: 230, protein_g: 3, carbs_g: 25, fat_g: 13, fiber_g: 2, unit: 'bar', grams_per_unit: 45 },
    ];
  };

  const toggleFavorite = async (foodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;
    
    try {
      const updatedFavorites = favoriteFoods.includes(foodId)
        ? favoriteFoods.filter(id => id !== foodId)
        : [...favoriteFoods, foodId];
      
      await updateDoc(doc(db, 'users', user.uid), {
        favoriteFoods: updatedFavorites,
      });
      
      setFavoriteFoods(updatedFavorites);
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const getMealIcon = () => {
    const icons: Record<string, string> = {
      breakfast: '🌅',
      lunch: '🍛',
      snacks: '🍪',
      dinner: '🌙',
    };
    return icons[mealType] || '🍽️';
  };

  if (loading) {
    return <SkeletonFoodList />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 font-semibold hover:text-green-500 dark:hover:text-green-300 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getMealIcon()}</span>
            <div>
              <h1 className="text-2xl font-bold capitalize text-gray-900 dark:text-white">{mealType}</h1>
              <p className="text-gray-500 dark:text-gray-400">Select food items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Search Bar & Filter */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="🔍 Search food items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-400 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none"
          />
          
          {/* Favorites Filter */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                showFavoritesOnly
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ⭐ {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites'} ({favoriteFoods.length})
            </motion.button>
            {showFavoritesOnly && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFavoritesOnly(false)}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
              >
                Clear
              </motion.button>
            )}
          </div>
        </div>

        {/* Food Cards Grid */}
        <div className="space-y-4">
          {filteredFoods.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none">
              <div className="text-6xl mb-4">{showFavoritesOnly ? '⭐' : '🔍'}</div>
              <p className="text-gray-500 dark:text-gray-400">
                {showFavoritesOnly ? 'No favorite foods yet. Star your favorites!' : 'No food items found. Try a different search term.'}
              </p>
            </div>
          ) : (
            filteredFoods.map((food, index) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => router.push(`/add-food?id=${food.id}&type=${mealType}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                <div className="p-5">
                  {/* Top Row - Name & Favorite */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                        {food.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        per {food.unit}
                      </p>
                    </div>
                    <motion.button
                      onClick={(e) => toggleFavorite(food.id, e)}
                      whileTap={{ scale: 0.9 }}
                      className="text-3xl focus:outline-none"
                    >
                      {favoriteFoods.includes(food.id) ? '⭐' : '☆'}
                    </motion.button>
                  </div>

                  {/* Calories Badge */}
                  <div className="inline-block px-4 py-2 rounded-full mb-4 bg-orange-100 dark:bg-orange-900/30">
                    <span className="font-bold text-orange-600 dark:text-orange-300">{food.calories_per_portion} kcal</span>
                  </div>

                  {/* Macro Breakdown */}
                  <div className="space-y-2">
                    {/* Protein */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Protein</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{food.protein_g || 0}g</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(Math.max(((food.protein_g || 0) / 50) * 100, (food.protein_g || 0) > 0 ? 4 : 0), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Fats */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Fats</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{food.fat_g || 0}g</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(Math.max(((food.fat_g || 0) / 30) * 100, (food.fat_g || 0) > 0 ? 4 : 0), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Carbs */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Carbs</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{food.carbs_g || 0}g</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(Math.max(((food.carbs_g || 0) / 80) * 100, (food.carbs_g || 0) > 0 ? 4 : 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Select Button */}
                  <div
                    className="flex items-center justify-end mt-4 text-green-600 dark:text-green-400 font-semibold"
                  >
                    Select <span className="ml-1">→</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MealSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Loading text="Loading food items..." /></div>}>
      <MealSelectionContent />
    </Suspense>
  );
}

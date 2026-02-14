'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { PendingFood } from '@/types';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

export default function ApproveFoodsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingFoods, setPendingFoods] = useState<PendingFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const isAdminUser = userDoc.data().isAdmin === true;
        setIsAdmin(isAdminUser);
        
        if (!isAdminUser) {
          toast.error('Access denied. Admin only.');
          router.push('/dashboard');
          return;
        }
        
        await loadPendingFoods();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadPendingFoods = async () => {
    try {
      const pendingQuery = query(
        collection(db, 'pending_foods'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(pendingQuery);
      const foods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PendingFood[];
      setPendingFoods(foods);
    } catch (error) {
      console.error('Error loading pending foods:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const approveFood = async (food: PendingFood) => {
    setProcessing(food.id);
    try {
      // Add to food_master collection with new structure
      await addDoc(collection(db, 'food_master'), {
        name: food.name,
        calories_per_portion: food.calories_per_portion,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: food.fiber_g,
        unit: food.unit,
        grams_per_unit: food.grams_per_unit,
        createdAt: new Date(),
        approvedFrom: food.id,
      });

      // Update pending food status
      await updateDoc(doc(db, 'pending_foods', food.id), {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: auth.currentUser?.uid,
      });

      toast.success(`${food.name} approved and added to food database!`);
      setPendingFoods(pendingFoods.filter((f) => f.id !== food.id));
    } catch (error) {
      console.error('Error approving food:', error);
      toast.error('Failed to approve food');
    } finally {
      setProcessing(null);
    }
  };

  const rejectFood = async (food: PendingFood) => {
    if (!confirm(`Reject "${food.name}"?`)) return;

    setProcessing(food.id);
    try {
      // Update status to rejected
      await updateDoc(doc(db, 'pending_foods', food.id), {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: auth.currentUser?.uid,
      });

      toast.success(`${food.name} rejected`);
      setPendingFoods(pendingFoods.filter((f) => f.id !== food.id));
    } catch (error) {
      console.error('Error rejecting food:', error);
      toast.error('Failed to reject food');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loading text="Loading submissions..." />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-6 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-all duration-300"
          >
            <span className="mr-2">←</span> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approve Food Submissions</h1>
          <p className="text-gray-500 dark:text-gray-400">{pendingFoods.length} pending approval</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {pendingFoods.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">All caught up!</h2>
            <p className="text-gray-500 dark:text-gray-400">No pending food submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFoods.map((food, index) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{food.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {food.unit} • {food.grams_per_unit}g
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Submitted by: {food.submittedByName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveFood(food)}
                      disabled={processing === food.id}
                      className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 hover:scale-105 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => rejectFood(food)}
                      disabled={processing === food.id}
                      className="px-6 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 hover:scale-105 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{food.calories_per_portion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Protein</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{food.protein_g}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Carbs</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{food.carbs_g}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fat</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{food.fat_g}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fiber</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{food.fiber_g}g</p>
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

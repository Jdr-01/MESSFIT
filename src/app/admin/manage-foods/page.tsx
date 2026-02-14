'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Food } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManageFoodsPage() {
  const [foods, setFoods] = useState<(Food & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [editingFood, setEditingFood] = useState<(Food & { id: string }) | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    calories_per_portion: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    unit: 'piece',
    grams_per_unit: 0,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = async () => {
    try {
      const q = query(collection(db, 'food_master'), orderBy('name'));
      const snapshot = await getDocs(q);
      const foodList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Food & { id: string }));
      setFoods(foodList);
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'food_master', id));
      setFoods(foods.filter(f => f.id !== id));
      setSelected(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      alert('✅ Deleted successfully!');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = () => {
    if (selected.size === filteredFoods.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredFoods.map(f => f.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) {
      alert('⚠️ Please select foods to delete!');
      return;
    }
    
    if (!confirm(`Delete ${selected.size} selected food(s)?`)) return;
    
    setDeletingMultiple(true);
    try {
      let successCount = 0;
      for (const id of selected) {
        await deleteDoc(doc(db, 'food_master', id));
        successCount++;
      }
      setFoods(foods.filter(f => !selected.has(f.id)));
      setSelected(new Set());
      alert(`✅ Deleted ${successCount} food(s) successfully!`);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ Failed to delete some foods');
    } finally {
      setDeletingMultiple(false);
    }
  };

  const handleDeleteAll = async () => {
    if (foods.length === 0) {
      alert('⚠️ No foods to delete!');
      return;
    }
    
    if (!confirm(`⚠️ DELETE ALL ${foods.length} FOODS?\n\nThis action cannot be undone!`)) return;
    
    setDeletingMultiple(true);
    try {
      let successCount = 0;
      for (const food of foods) {
        await deleteDoc(doc(db, 'food_master', food.id));
        successCount++;
      }
      setFoods([]);
      setSelected(new Set());
      alert(`✅ Deleted all ${successCount} foods!`);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ Failed to delete all foods');
    } finally {
      setDeletingMultiple(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!confirm('This will find foods with the same name and keep only one copy. Continue?')) return;
    
    setMerging(true);
    try {
      // Group foods by name (case-insensitive)
      const grouped = new Map<string, (Food & { id: string })[]>();
      foods.forEach(food => {
        const nameLower = food.name.toLowerCase().trim();
        if (!grouped.has(nameLower)) {
          grouped.set(nameLower, []);
        }
        grouped.get(nameLower)!.push(food);
      });

      let deletedCount = 0;
      
      // For each group with duplicates, keep first and delete rest
      for (const [name, group] of grouped) {
        if (group.length > 1) {
          console.log(`Found ${group.length} duplicates of "${name}"`);
          // Keep first, delete rest
          for (let i = 1; i < group.length; i++) {
            await deleteDoc(doc(db, 'food_master', group[i].id));
            deletedCount++;
          }
        }
      }

      // Reload foods
      await loadFoods();
      alert(`✅ Merged successfully!\n\n${deletedCount} duplicate foods removed.`);
    } catch (error) {
      console.error('Error merging:', error);
      alert('❌ Failed to merge duplicates');
    } finally {
      setMerging(false);
    }
  };

  const openEditModal = (food: Food & { id: string }) => {
    setEditingFood(food);
    setEditForm({
      name: food.name,
      calories_per_portion: food.calories_per_portion,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g,
      sugar_g: food.sugar_g || 0,
      unit: food.unit,
      grams_per_unit: food.grams_per_unit,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFood) return;
    
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'food_master', editingFood.id), {
        name: editForm.name,
        calories_per_portion: editForm.calories_per_portion,
        protein_g: editForm.protein_g,
        carbs_g: editForm.carbs_g,
        fat_g: editForm.fat_g,
        fiber_g: editForm.fiber_g,
        sugar_g: editForm.sugar_g,
        unit: editForm.unit,
        grams_per_unit: editForm.grams_per_unit,
      });

      setFoods(foods.map(f => 
        f.id === editingFood.id 
          ? { ...f, ...editForm } as Food & { id: string }
          : f
      ));
      
      setEditingFood(null);
      alert('✅ Food updated successfully!');
    } catch (error) {
      console.error('Error updating food:', error);
      alert('❌ Failed to update food');
    } finally {
      setSavingEdit(false);
    }
  };

  // Find duplicate food names
  const getDuplicateNames = () => {
    const nameCounts = new Map<string, number>();
    foods.forEach(food => {
      const nameLower = food.name.toLowerCase().trim();
      nameCounts.set(nameLower, (nameCounts.get(nameLower) || 0) + 1);
    });
    return new Set(
      Array.from(nameCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([name, _]) => name)
    );
  };

  const duplicateNames = getDuplicateNames();
  const hasDuplicates = duplicateNames.size > 0;

  // No category filter - showing all foods
  const filteredFoods = foods;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-900 dark:text-white">Loading foods...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🗂️ Manage Foods</h1>
            <div className="flex gap-2">
              {selected.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deletingMultiple}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-sm hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
                >
                  {deletingMultiple ? '⏳ Deleting...' : `🗑️ Delete Selected (${selected.size})`}
                </button>
              )}
              {foods.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingMultiple}
                  className="px-4 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 shadow-sm hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
                >
                  {deletingMultiple ? '⏳ Deleting...' : '🗑️ Delete All'}
                </button>
              )}              {hasDuplicates && (
                <button
                  onClick={handleMergeDuplicates}
                  disabled={merging}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 shadow-sm hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
                >
                  {merging ? '⏳ Merging...' : `🔄 Merge Duplicates (${duplicateNames.size})`}
                </button>
              )}
              <button
                onClick={() => router.push('/admin/bulk-import')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
              >
                ← Back to Import
              </button>
            </div>
          </div>

          {hasDuplicates && (
            <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <div className="font-semibold text-orange-700 dark:text-orange-300 mb-2">⚠️ Duplicates Detected</div>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Found {duplicateNames.size} foods with multiple entries. Duplicates are highlighted in yellow below. 
                Click Merge Duplicates to keep only one copy of each food.
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center gap-4">
            <span className="font-semibold text-gray-900 dark:text-white">Total Foods: {foods.length}</span>
            {selected.size > 0 && (
              <span className="ml-auto font-semibold text-green-600 dark:text-green-400">
                ✓ {selected.size} selected
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th className="text-center p-3 font-semibold w-12"></th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Calories</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Protein</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Carbs</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Fat</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Fiber</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Sugars</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Grams</th>
                  <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFoods.map((food) => {
                  const isDuplicate = duplicateNames.has(food.name.toLowerCase().trim());
                  return (
                    <tr 
                      key={food.id} 
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 ${
                        isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                      } ${selected.has(food.id) ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    >
                      <td className="text-center p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(food.id)}
                          onChange={() => handleSelectOne(food.id)}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">
                        {food.name}
                        {isDuplicate && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">DUPLICATE</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.calories_per_portion}</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.protein_g}g</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.carbs_g}g</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.fat_g}g</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.fiber_g}g</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.sugar_g || 0}g</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.unit}</td>
                      <td className="p-3 text-gray-900 dark:text-white">{food.grams_per_unit}g</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => openEditModal(food)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm hover:scale-105 transition-all duration-300 text-sm"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(food.id, food.name)}
                            disabled={deleting === food.id}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 text-sm"
                          >
                            {deleting === food.id ? '...' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredFoods.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No foods found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingFood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingFood(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">✏️ Edit Food</h2>
              
              <div className="space-y-3">
                {[
                  { label: 'Name', key: 'name', type: 'text' },
                  { label: 'Calories', key: 'calories_per_portion', type: 'number' },
                  { label: 'Protein (g)', key: 'protein_g', type: 'number' },
                  { label: 'Carbs (g)', key: 'carbs_g', type: 'number' },
                  { label: 'Fat (g)', key: 'fat_g', type: 'number' },
                  { label: 'Fiber (g)', key: 'fiber_g', type: 'number' },
                  { label: 'Sugars (g)', key: 'sugar_g', type: 'number' },
                  { label: 'Unit', key: 'unit', type: 'text' },
                  { label: 'Grams per unit', key: 'grams_per_unit', type: 'number' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                    <input
                      type={type}
                      value={(editForm as Record<string, string | number>)[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-semibold shadow-sm hover:scale-105 transition-all duration-300 disabled:opacity-50"
                >
                  {savingEdit ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={() => setEditingFood(null)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold border border-gray-200 dark:border-gray-600"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

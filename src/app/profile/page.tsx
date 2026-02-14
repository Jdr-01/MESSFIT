'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import { motion } from 'framer-motion';
import BottomNavigation from '@/components/BottomNavigation';
import ThemeToggle from '@/components/ThemeToggle';
import { SkeletonProfile } from '@/components/Skeleton';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editData, setEditData] = useState({ weight: 0, height: 0, age: 0, gender: 'male' as 'male' | 'female' | 'other' });
  const [accountData, setAccountData] = useState({ currentPassword: '', newPassword: '', newEmail: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const calculateBMI = () => {
    if (!user) return '0';
    const heightInMeters = user.height / 100;
    return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#f59e0b' };
    if (bmi < 25) return { label: 'Normal', color: '#10b981' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
  };

  const calculateNewRDA = (goal: 'lose' | 'maintain' | 'gain', weight: number, height: number, gender: string) => {
    // Using simplified BMR calculation (assumes average age of 25 for consistency)
    // For users who have age data, this provides a reasonable approximation
    let bmr: number;

    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * 25 + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * 25 - 161;
    }

    // Activity multiplier (assuming moderate activity)
    const maintenance = Math.round(bmr * 1.55);

    // Adjust based on goal
    if (goal === 'lose') return maintenance - 500;
    if (goal === 'gain') return maintenance + 500;
    return maintenance;
  };

  const handleGoalChange = async (newGoal: 'lose' | 'maintain' | 'gain') => {
    if (!user) return;

    setUpdatingGoal(true);
    try {
      const newRDA = calculateNewRDA(newGoal, user.weight, user.height, user.gender || 'male');

      await updateDoc(doc(db, 'users', user.uid), {
        goal: newGoal,
        rda: newRDA,
        dailyCalorieTarget: newRDA,
      });

      setUser({
        ...user,
        goal: newGoal,
        rda: newRDA,
        dailyCalorieTarget: newRDA,
      });

      setShowGoalModal(false);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setUpdatingGoal(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setUpdatingProfile(true);
    try {
      const newRDA = calculateNewRDA(user.goal, editData.weight, editData.height, editData.gender);

      await updateDoc(doc(db, 'users', user.uid), {
        weight: editData.weight,
        height: editData.height,
        age: editData.age,
        gender: editData.gender,
        rda: newRDA,
        dailyCalorieTarget: newRDA,
      });

      setUser({
        ...user,
        weight: editData.weight,
        height: editData.height,
        age: editData.age,
        gender: editData.gender,
        rda: newRDA,
        dailyCalorieTarget: newRDA,
      });

      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAccountUpdate = async () => {
    if (!auth.currentUser) return;

    setUpdatingAccount(true);
    try {
      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        accountData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password if provided
      if (accountData.newPassword) {
        await updatePassword(auth.currentUser, accountData.newPassword);
      }

      // Update email if provided
      if (accountData.newEmail && accountData.newEmail !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, accountData.newEmail);
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            email: accountData.newEmail,
          });
          setUser({ ...user, email: accountData.newEmail });
        }
      }

      setShowAccountModal(false);
      setAccountData({ currentPassword: '', newPassword: '', newEmail: '' });
      alert('Account updated successfully!');
    } catch (error: any) {
      console.error('Error updating account:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Current password is incorrect.');
      } else if (error.code === 'auth/weak-password') {
        alert('New password is too weak. Use at least 6 characters.');
      } else if (error.code === 'auth/email-already-in-use') {
        alert('Email is already in use by another account.');
      } else {
        alert('Failed to update account. Please try again.');
      }
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonProfile />
        <BottomNavigation />
      </>
    );
  }

  if (!user) return null;

  const bmiValue = calculateBMI();
  const bmi = parseFloat(bmiValue);
  const bmiCategory = getBMICategory(bmi);
  const calorieTarget = user.dailyCalorieTarget || user.rda || 2000;

  const goalLabels = {
    lose: 'Lose Weight',
    maintain: 'Maintain Weight',
    gain: 'Gain Weight',
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <ThemeToggle />
        </div>
      </div>

      <div className="px-6 py-6 space-y-4 max-w-2xl mx-auto">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-6 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-coral to-yellow flex items-center justify-center relative">
                <span className="text-3xl font-bold text-white">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
                <div className="absolute -bottom-1 -right-1 text-2xl bg-white dark:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                  {user.gender === 'male' && '♂️'}
                  {user.gender === 'female' && '♀️'}
                  {(!user.gender || user.gender === 'other') && '👤'}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditData({
                  weight: user.weight,
                  height: user.height,
                  age: user.age || 25,
                  gender: user.gender || 'male',
                });
                setShowEditModal(true);
              }}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold text-sm transition-all duration-300"
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weight</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{user.weight}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Height</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{user.height}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">cm</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Age</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{user.age || 25}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">yrs</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">BMI</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{bmi}</p>
              <p className="text-xs font-medium" style={{ color: bmiCategory.color }}>
                {bmiCategory.label}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</p>
              <p className="text-2xl">
                {user.gender === 'male' && '♂️'}
                {user.gender === 'female' && '♀️'}
                {(!user.gender || user.gender === 'other') && '👤'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user.gender || 'N/A'}</p>
            </div>
          </div>
        </motion.div>

        {/* Goal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Your Goal
            </h3>
            <button
              onClick={() => setShowGoalModal(true)}
              className="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-all duration-300"
            >
              Change
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {goalLabels[user.goal]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {calorieTarget} cal/day target
              </p>
            </div>
            <div className="text-4xl">
              {user.goal === 'lose' && '🔥'}
              {user.goal === 'maintain' && '⚖️'}
              {user.goal === 'gain' && '💪'}
            </div>
          </div>
        </motion.div>

        {/* Account Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Account Settings
          </h3>
          <button
            onClick={() => {
              setAccountData({ currentPassword: '', newPassword: '', newEmail: '' });
              setShowAccountModal(true);
            }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔐</div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Change Password & Email</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your login credentials</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>

        {/* About Your Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            About Your Goal
          </h3>
          <div className="space-y-3">
            {user.goal === 'lose' && (
              <>
                <p className="text-gray-900 dark:text-white font-medium">
                  🎯 Cut: You're in a caloric deficit to lose weight. Your RDA is set 500 kcal below maintenance.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  💡 Tip: Track consistently for 2-3 weeks, then adjust based on progress.
                </p>
              </>
            )}
            {user.goal === 'maintain' && (
              <>
                <p className="text-gray-900 dark:text-white font-medium">
                  ⚖️ Maintenance: You're eating at your maintenance calories to maintain your current weight.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  💡 Tip: Stay consistent and monitor your weight weekly.
                </p>
              </>
            )}
            {user.goal === 'gain' && (
              <>
                <p className="text-gray-900 dark:text-white font-medium">
                  💪 Bulk: You're in a caloric surplus to gain weight. Your RDA is set 500 kcal above maintenance.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  💡 Tip: Track consistently for 2-3 weeks, then adjust based on progress.
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Navigation Cards */}
        <div className="space-y-3">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            onClick={() => router.push('/daily-summary')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 flex items-center justify-between hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Daily Intake</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">View today's meals</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            onClick={() => router.push('/weekly-summary')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 flex items-center justify-between hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Nutrition Report</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Weekly insights</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            onClick={() => router.push('/meal-selection?type=breakfast')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 flex items-center justify-between hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Favorite Foods</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.favoriteFoods?.length || 0} saved items
                </p>
              </div>
            </div>
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            onClick={() => router.push('/export')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-700 p-5 flex items-center justify-between hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <span className="text-2xl">⬇️</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Export Data</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Download your nutrition history
                </p>
              </div>
            </div>
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Admin Section */}
        {user.isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="bg-white/65 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-purple-200 dark:border-purple-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-none p-5 hover:shadow-md transition-all duration-300"
          >
            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-300 mb-3 uppercase tracking-wide">
              Admin Access
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push('/admin/add-food')}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700 text-sm font-medium text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-all duration-300"
              >
                Add Food
              </button>
              <button
                onClick={() => router.push('/admin/approve-foods')}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700 text-sm font-medium text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-all duration-300"
              >
                Approve
              </button>
              <button
                onClick={() => router.push('/admin/manage-foods')}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700 text-sm font-medium text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-all duration-300"
              >
                Manage
              </button>
              <button
                onClick={() => router.push('/admin/bulk-import')}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700 text-sm font-medium text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-all duration-300"
              >
                Bulk Import
              </button>
            </div>
          </motion.div>
        )}

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-semibold shadow-sm hover:shadow-md transition-all duration-300"
        >
          Logout
        </motion.button>
      </div>

      <BottomNavigation />

      {/* Goal Selection Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Goal</h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Cut/Lose Weight */}
              <button
                onClick={() => handleGoalChange('lose')}
                disabled={updatingGoal}
                className={`w-full p-5 rounded-2xl transition-all duration-300 ${
                  user.goal === 'lose'
                    ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-500 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🔥</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Cut</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Lose weight with a caloric deficit (-500 kcal)
                    </p>
                  </div>
                  {user.goal === 'lose' && (
                    <div className="text-green-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {/* Maintain */}
              <button
                onClick={() => handleGoalChange('maintain')}
                disabled={updatingGoal}
                className={`w-full p-5 rounded-2xl transition-all duration-300 ${
                  user.goal === 'maintain'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">⚖️</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Maintain</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Maintain current weight at maintenance calories
                    </p>
                  </div>
                  {user.goal === 'maintain' && (
                    <div className="text-green-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {/* Bulk/Gain Weight */}
              <button
                onClick={() => handleGoalChange('gain')}
                disabled={updatingGoal}
                className={`w-full p-5 rounded-2xl transition-all duration-300 ${
                  user.goal === 'gain'
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-500 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">💪</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Bulk</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Gain weight with a caloric surplus (+500 kcal)
                    </p>
                  </div>
                  {user.goal === 'gain' && (
                    <div className="text-green-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {updatingGoal && (
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Updating your goal...
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setShowEditModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={editData.weight}
                  onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={editData.height}
                  onChange={(e) => setEditData({ ...editData, height: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age (years)
                </label>
                <input
                  type="number"
                  value={editData.age}
                  onChange={(e) => setEditData({ ...editData, age: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditData({ ...editData, gender: 'male' })}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      editData.gender === 'male'
                        ? 'bg-coral text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    ♂️ Male
                  </button>
                  <button
                    onClick={() => setEditData({ ...editData, gender: 'female' })}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      editData.gender === 'female'
                        ? 'bg-coral text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    ♀️ Female
                  </button>
                  <button
                    onClick={() => setEditData({ ...editData, gender: 'other' })}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      editData.gender === 'other'
                        ? 'bg-coral text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    👤 Other
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={updatingProfile}
                className="flex-1 py-3 rounded-xl font-semibold bg-coral text-white hover:bg-coral/90 disabled:opacity-50 transition-all"
              >
                {updatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setShowAccountModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password (required)
                </label>
                <input
                  type="password"
                  value={accountData.currentPassword}
                  onChange={(e) => setAccountData({ ...accountData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  value={accountData.newPassword}
                  onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder="Leave blank to keep current"
                />
              </div>

              {/* New Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Email (optional)
                </label>
                <input
                  type="email"
                  value={accountData.newEmail}
                  onChange={(e) => setAccountData({ ...accountData, newEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ You must enter your current password to make changes.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAccountModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAccountUpdate}
                disabled={updatingAccount || !accountData.currentPassword}
                className="flex-1 py-3 rounded-xl font-semibold bg-coral text-white hover:bg-coral/90 disabled:opacity-50 transition-all"
              >
                {updatingAccount ? 'Updating...' : 'Update Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

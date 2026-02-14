export interface User {
  uid: string;
  email: string;
  name: string;
  age?: number; // User age
  height: number; // in cm
  weight: number; // in kg
  gender?: 'male' | 'female' | 'other';
  goal: 'lose' | 'maintain' | 'gain'; // Updated goal options
  rda: number; // Recommended Daily Allowance in calories
  dailyCalorieTarget?: number; // Optional calorie target (can override RDA)
  createdAt: Date;
  isAdmin?: boolean;
  favoriteFoods?: string[]; // Array of food IDs
  onboardingCompleted?: boolean;
  // Water tracking settings
  waterSettings?: {
    autoCalculate: boolean;      // true = weight × 35ml, false = custom
    customTargetMl?: number;     // Custom water target in ml (when autoCalculate is false)
    glassSizeMl: number;         // Glass size in ml (default 250)
  };
}

// Standardized unit types for food portions
export type FoodUnit = 'piece' | 'bowl' | 'cup' | 'ml' | 'bar' | 'can';

export interface Food {
  id: string;
  name: string;
  calories_per_portion: number; // Calories for 1 unit
  protein_g: number;            // Protein per portion
  carbs_g: number;              // Carbs per portion
  fat_g: number;                // Fat per portion
  fiber_g: number;              // Fiber per portion
  sugar_g?: number;              // Sugar per portion
  unit: FoodUnit;               // Standardized unit type
  grams_per_unit: number;       // Weight in grams for the unit
  // NO category - meal type is stored in meal_log only
}

export interface MealLog {
  id: string;
  userId: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;            // Keep as string for backward compatibility
  calories: number;        // Total calories (calories_per_portion * quantity)
  protein: number;         // Total protein (backward compatible)
  carbs: number;           // Total carbs (backward compatible)
  fats: number;            // Total fat (backward compatible - keep 'fats')
  fiber: number;           // Total fiber (backward compatible)
  sugars: number;          // Total sugars
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  date: string;            // YYYY-MM-DD
  timestamp: Date;
}
export interface PendingFood {
  id: string;
  name: string;
  calories_per_portion: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  unit: FoodUnit;
  grams_per_unit: number;
  submittedBy: string;
  submittedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}
export interface DailySummary {
  userId: string;
  date: string;           // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;   // backward compatible
  totalCarbs: number;     // backward compatible
  totalFats: number;      // backward compatible (keep 'Fats')
  totalFiber: number;     // backward compatible
  rdaPercentage: number;
  meals: MealLog[];
}

export interface WeeklySummary {
  userId: string;
  weekStart: string; // YYYY-MM-DD
  dailyCalories: number[];
  avgProtein: number;
  avgRDA: number;
  goal: 'lose' | 'maintain' | 'gain';
}

export interface WaterLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amountMl: number; // Total ml consumed today
  glasses?: number; // Deprecated - kept for backward compatibility
  timestamp: Date;
}

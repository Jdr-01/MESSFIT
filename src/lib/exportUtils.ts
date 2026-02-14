import { MealLog, WaterLog, User } from '@/types';

export interface ExportOptions {
  includeWater?: boolean;
  includeSummary?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportSummary {
  totalMeals: number;
  totalCalories: number;
  avgCaloriesPerDay: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalFiber: number;
  totalSugars: number;
  daysTracked: number;
  mealTypeBreakdown: Record<string, number>;
}

// Calculate export summary statistics
export function calculateSummary(meals: MealLog[]): ExportSummary {
  const uniqueDays = new Set(meals.map(m => m.date));
  const mealTypeBreakdown: Record<string, number> = {};
  
  meals.forEach(meal => {
    mealTypeBreakdown[meal.mealType] = (mealTypeBreakdown[meal.mealType] || 0) + 1;
  });

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
      fiber: acc.fiber + meal.fiber,
      sugars: acc.sugars + (meal.sugars || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugars: 0 }
  );

  return {
    totalMeals: meals.length,
    totalCalories: Math.round(totals.calories),
    avgCaloriesPerDay: uniqueDays.size > 0 ? Math.round(totals.calories / uniqueDays.size) : 0,
    totalProtein: Math.round(totals.protein),
    totalCarbs: Math.round(totals.carbs),
    totalFats: Math.round(totals.fats),
    totalFiber: Math.round(totals.fiber),
    totalSugars: Math.round(totals.sugars),
    daysTracked: uniqueDays.size,
    mealTypeBreakdown,
  };
}

// Filter meals by date range
export function filterByDateRange(meals: MealLog[], start: string, end: string): MealLog[] {
  return meals.filter(meal => meal.date >= start && meal.date <= end);
}

export function exportToCSV(meals: MealLog[], filename: string = 'meals-export.csv', options?: ExportOptions, waterLogs?: WaterLog[]) {
  if (meals.length === 0) {
    alert('No data to export');
    return;
  }

  // Apply date range filter if provided
  let filteredMeals = meals;
  if (options?.dateRange) {
    filteredMeals = filterByDateRange(meals, options.dateRange.start, options.dateRange.end);
    if (filteredMeals.length === 0) {
      alert('No data in the selected date range');
      return;
    }
  }

  // Define CSV headers
  const headers = [
    'Date',
    'Meal Type',
    'Food Name',
    'Quantity',
    'Unit',
    'Calories',
    'Protein (g)',
    'Carbs (g)',
    'Fats (g)',
    'Fiber (g)',
    'Sugars (g)',
  ];

  // Convert meals to CSV rows
  const rows = filteredMeals.map((meal) => [
    meal.date,
    meal.mealType,
    meal.foodName,
    meal.quantity.toString(),
    meal.unit,
    meal.calories.toFixed(1),
    meal.protein.toFixed(1),
    meal.carbs.toFixed(1),
    meal.fats.toFixed(1),
    meal.fiber.toFixed(1),
    (meal.sugars || 0).toFixed(1),
  ]);

  // Build CSV content
  let csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Add summary section if requested
  if (options?.includeSummary) {
    const summary = calculateSummary(filteredMeals);
    csvContent += '\n\n--- SUMMARY ---\n';
    csvContent += `Total Meals,${summary.totalMeals}\n`;
    csvContent += `Days Tracked,${summary.daysTracked}\n`;
    csvContent += `Total Calories,${summary.totalCalories}\n`;
    csvContent += `Avg Calories/Day,${summary.avgCaloriesPerDay}\n`;
    csvContent += `Total Protein (g),${summary.totalProtein}\n`;
    csvContent += `Total Carbs (g),${summary.totalCarbs}\n`;
    csvContent += `Total Fats (g),${summary.totalFats}\n`;
    csvContent += `Total Fiber (g),${summary.totalFiber}\n`;
    csvContent += `Total Sugars (g),${summary.totalSugars}\n`;
    csvContent += '\nMeal Type Breakdown:\n';
    Object.entries(summary.mealTypeBreakdown).forEach(([type, count]) => {
      csvContent += `${type},${count}\n`;
    });
  }

  // Add water logs section
  if (waterLogs && waterLogs.length > 0) {
    csvContent += '\n\n--- WATER LOGS ---\n';
    csvContent += 'Date,Amount (ml)\n';
    waterLogs.forEach(log => {
      const amount = log.amountMl || (log.glasses || 0) * 250;
      csvContent += `"${log.date}","${amount}"\n`;
    });
  }

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(meals: MealLog[], filename: string = 'meals-export.json', options?: ExportOptions, waterLogs?: WaterLog[]) {
  if (meals.length === 0) {
    alert('No data to export');
    return;
  }

  // Apply date range filter if provided
  let filteredMeals = meals;
  if (options?.dateRange) {
    filteredMeals = filterByDateRange(meals, options.dateRange.start, options.dateRange.end);
    if (filteredMeals.length === 0) {
      alert('No data in the selected date range');
      return;
    }
  }

  const exportData: {
    meals: MealLog[];
    waterLogs?: WaterLog[];
    summary?: ExportSummary;
    exportedAt: string;
    dateRange?: { start: string; end: string };
  } = {
    meals: filteredMeals,
    exportedAt: new Date().toISOString(),
  };

  if (waterLogs && waterLogs.length > 0) {
    exportData.waterLogs = waterLogs;
  }

  if (options?.dateRange) {
    exportData.dateRange = options.dateRange;
  }

  if (options?.includeSummary) {
    exportData.summary = calculateSummary(filteredMeals);
  }

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate a text-based report for easy sharing
export function exportToText(meals: MealLog[], user?: User, filename: string = 'nutrition-report.txt') {
  if (meals.length === 0) {
    alert('No data to export');
    return;
  }

  const summary = calculateSummary(meals);
  const uniqueDates = [...new Set(meals.map(m => m.date))].sort();
  
  let report = '═══════════════════════════════════════\n';
  report += '         NUTRITION TRACKING REPORT       \n';
  report += '═══════════════════════════════════════\n\n';
  
  if (user) {
    report += `User: ${user.name}\n`;
    report += `Goal: ${user.dailyCalorieTarget || user.rda} calories/day\n\n`;
  }
  
  report += `Report Period: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  report += '───────────────────────────────────────\n';
  report += '               SUMMARY                  \n';
  report += '───────────────────────────────────────\n\n';
  
  report += `📊 Days Tracked: ${summary.daysTracked}\n`;
  report += `🍽️  Total Meals: ${summary.totalMeals}\n\n`;
  
  report += `🔥 Total Calories: ${summary.totalCalories.toLocaleString()}\n`;
  report += `📈 Average/Day: ${summary.avgCaloriesPerDay.toLocaleString()}\n\n`;
  
  report += '📊 Macronutrients:\n';
  report += `   🥩 Protein: ${summary.totalProtein}g\n`;
  report += `   🍞 Carbs: ${summary.totalCarbs}g\n`;
  report += `   🥑 Fats: ${summary.totalFats}g\n`;
  report += `   🌾 Fiber: ${summary.totalFiber}g\n`;
  report += `   🍬 Sugars: ${summary.totalSugars}g\n\n`;
  
  report += '🍽️  Meal Distribution:\n';
  Object.entries(summary.mealTypeBreakdown).forEach(([type, count]) => {
    const emoji = type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'dinner' ? '🌙' : '🍪';
    report += `   ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} meals\n`;
  });
  
  report += '\n───────────────────────────────────────\n';
  report += '            DAILY BREAKDOWN             \n';
  report += '───────────────────────────────────────\n\n';
  
  uniqueDates.forEach(date => {
    const dayMeals = meals.filter(m => m.date === date);
    const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
    
    report += `📅 ${date}\n`;
    report += `   Total: ${Math.round(dayCalories)} calories\n`;
    dayMeals.forEach(meal => {
      report += `   • ${meal.mealType}: ${meal.foodName} (${Math.round(meal.calories)} cal)\n`;
    });
    report += '\n';
  });
  
  report += '═══════════════════════════════════════\n';
  report += '        Generated by MessFit App        \n';
  report += '═══════════════════════════════════════\n';

  const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export water logs
export function exportWaterLogs(logs: WaterLog[], filename: string = 'water-export.csv') {
  if (logs.length === 0) {
    alert('No water data to export');
    return;
  }

  const headers = ['Date', 'Amount (ml)', 'Timestamp'];
  const rows = logs.map(log => [
    log.date,
    (log.amountMl || (log.glasses || 0) * 250).toString(),
    log.timestamp instanceof Date 
      ? log.timestamp.toISOString() 
      : (log.timestamp as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export via email - compose a mailto: link with summary data
export function exportToMail(meals: MealLog[], user?: User, waterLogs?: WaterLog[]) {
  if (meals.length === 0) {
    alert('No data to export');
    return;
  }

  const summary = calculateSummary(meals);
  const uniqueDates = [...new Set(meals.map(m => m.date))].sort();

  let body = `MessFit Nutrition Report\n`;
  body += `========================\n\n`;
  
  if (user) {
    body += `User: ${user.name}\n`;
    body += `Goal: ${user.dailyCalorieTarget || user.rda} calories/day\n\n`;
  }
  
  body += `Period: ${uniqueDates[0] || 'N/A'} to ${uniqueDates[uniqueDates.length - 1] || 'N/A'}\n\n`;
  
  body += `SUMMARY\n`;
  body += `-------\n`;
  body += `Days Tracked: ${summary.daysTracked}\n`;
  body += `Total Meals: ${summary.totalMeals}\n`;
  body += `Total Calories: ${summary.totalCalories}\n`;
  body += `Avg Calories/Day: ${summary.avgCaloriesPerDay}\n\n`;
  
  body += `MACRONUTRIENTS\n`;
  body += `--------------\n`;
  body += `Protein: ${summary.totalProtein}g\n`;
  body += `Carbs: ${summary.totalCarbs}g\n`;
  body += `Fats: ${summary.totalFats}g\n`;
  body += `Fiber: ${summary.totalFiber}g\n`;
  body += `Sugars: ${summary.totalSugars}g\n\n`;

  if (waterLogs && waterLogs.length > 0) {
    const totalWater = waterLogs.reduce((sum, log) => sum + (log.amountMl || (log.glasses || 0) * 250), 0);
    body += `WATER INTAKE\n`;
    body += `------------\n`;
    body += `Entries: ${waterLogs.length}\n`;
    body += `Total: ${totalWater}ml (${(totalWater / 1000).toFixed(1)}L)\n\n`;
  }

  body += `DAILY BREAKDOWN\n`;
  body += `---------------\n`;
  uniqueDates.forEach(date => {
    const dayMeals = meals.filter(m => m.date === date);
    const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
    body += `${date}: ${Math.round(dayCalories)} cal\n`;
    dayMeals.forEach(meal => {
      body += `  - ${meal.mealType}: ${meal.foodName} (${Math.round(meal.calories)} cal)\n`;
    });
  });

  const subject = encodeURIComponent(`MessFit Nutrition Report - ${new Date().toISOString().split('T')[0]}`);
  const mailBody = encodeURIComponent(body);
  
  window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
}
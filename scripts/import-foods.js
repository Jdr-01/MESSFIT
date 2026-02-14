import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDZyr0LI3iHW4y4JuCYAGxDLyK_45SloVY",
  authDomain: "tracker-6a01c.firebaseapp.com",
  projectId: "tracker-6a01c",
  storageBucket: "tracker-6a01c.firebasestorage.app",
  messagingSenderId: "974290156831",
  appId: "1:974290156831:web:cbb33ef26565c71fce442a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importFoodData() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('c:\\Users\\DHIREN\\Downloads\\Mess_Menu_v2.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in the Excel file`);
    console.log('Sample row:', data[0]);

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Map Excel columns to food_master structure
        // Expected columns: name, calories_per_portion, protein_g, carbs_g, fat_g, fiber_g, unit, grams_per_unit
        // NO category - meal type is stored in meal_log only
        const foodData = {
          name: row['Food Name'] || row['name'] || row['Name'] || '',
          calories_per_portion: parseFloat(row['Calories'] || row['calories'] || row['calories_per_portion'] || 0),
          protein_g: parseFloat(row['Protein'] || row['protein'] || row['protein_g'] || 0),
          carbs_g: parseFloat(row['Carbs'] || row['carbs'] || row['Carbohydrates'] || row['carbs_g'] || 0),
          fat_g: parseFloat(row['Fat'] || row['fat'] || row['Fats'] || row['fats'] || row['fat_g'] || 0),
          fiber_g: parseFloat(row['Fiber'] || row['fiber'] || row['Fibre'] || row['fiber_g'] || 0),
          unit: (row['Unit'] || row['unit'] || 'piece').toLowerCase(),
          grams_per_unit: parseFloat(row['Grams'] || row['grams'] || row['grams_per_unit'] || row['Grams per Unit'] || 100),
        };

        // Validate required fields
        if (!foodData.name) {
          console.log('Skipping invalid row (no name):', row);
          errorCount++;
          continue;
        }

        // Validate unit is one of the standardized types
        const validUnits = ['piece', 'bowl', 'cup', 'ml', 'bar', 'can'];
        if (!validUnits.includes(foodData.unit)) {
          console.log(`Warning: "${foodData.unit}" is not a standard unit for ${foodData.name}, defaulting to "piece"`);
          foodData.unit = 'piece';
        }

        // Add to Firestore
        await addDoc(collection(db, 'food_master'), foodData);
        successCount++;
        console.log(`✓ Added: ${foodData.name} (${foodData.calories_per_portion} kcal per ${foodData.unit})`);

      } catch (error) {
        console.error(`Error adding row:`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`Successfully imported: ${successCount} foods`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

importFoodData();

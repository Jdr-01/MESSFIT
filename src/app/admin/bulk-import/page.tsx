'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function BulkImportPage() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState({ success: 0, errors: 0 });
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage('📖 Reading file...');
    setResults({ success: 0, errors: 0 });

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        alert('❌ File is empty!');
        setMessage('❌ File is empty');
        setImporting(false);
        return;
      }

      // Parse CSV - handle both comma and tab separators
      const separator = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      console.log('📋 Headers found:', headers);
      setMessage(`📦 Found ${lines.length - 1} foods. Starting import...`);

      let successCount = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          const foodData = {
            name: row['name'] || row['food name'] || row['food_name'] || row['item'] || row['food'],
            calories_per_portion: parseFloat(row['calories_per_portion'] || row['calories'] || row['cal'] || row['energy'] || '0'),
            protein_g: parseFloat(row['protein_g'] || row['protein'] || row['prot'] || '0'),
            carbs_g: parseFloat(row['carbs_g'] || row['carbs'] || row['carbohydrates'] || row['carb'] || '0'),
            fat_g: parseFloat(row['fat_g'] || row['fats'] || row['fat'] || '0'),
            fiber_g: parseFloat(row['fiber_g'] || row['fiber'] || row['fibre'] || '0'),
            unit: (row['unit'] || row['serving'] || 'piece').toLowerCase(),
            grams_per_unit: parseFloat(row['grams_per_unit'] || row['grams'] || row['weight'] || '100'),
            // NO category - meal type is set when logging, not in food_master
          };

          // Log first row for debugging
          if (i === 1) {
            console.log('📝 Sample row data:', foodData);
          }

          // Validate unit is one of the standardized types
          const validUnits = ['piece', 'bowl', 'cup', 'ml', 'bar', 'can'];
          if (!validUnits.includes(foodData.unit)) {
            foodData.unit = 'piece';
          }

          // Relaxed validation - only check if name exists and is not empty string
          if (!foodData.name || foodData.name.trim() === '') {
            errorCount++;
            errorDetails.push(`Row ${i}: Missing name`);
            continue;
          }

          // Allow 0 calories - some items like water or tea might have minimal calories
          if (isNaN(foodData.calories_per_portion)) {
            errorCount++;
            errorDetails.push(`Row ${i}: Invalid calories for ${foodData.name}`);
            continue;
          }

          await addDoc(collection(db, 'food_master'), foodData);
          successCount++;
          setResults({ success: successCount, errors: errorCount });
          setMessage(`⏳ Importing... ${successCount}/${lines.length - 1}`);
        } catch (error) {
          errorCount++;
          console.error('Error importing row:', error);
        }
      }

      setResults({ success: successCount, errors: errorCount });
      setMessage(`✅ Import complete! ${successCount} foods added successfully`);
      
      // Log errors for debugging
      if (errorDetails.length > 0) {
        console.log('❌ Import errors:', errorDetails.slice(0, 10)); // Show first 10 errors
      }
      
      // Show success popup
      alert(`🎉 Success!\n\n${successCount} foods imported successfully!\n${errorCount > 0 ? `${errorCount} rows skipped due to errors.` : ''}`);
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = '❌ Failed to import file. Please check the format.';
      setMessage(errorMsg);
      alert(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  const handlePasteData = async () => {
    const textarea = document.getElementById('pasteArea') as HTMLTextAreaElement;
    const text = textarea?.value;
    if (!text || text.trim() === '') {
      alert('❌ Please paste your data first!');
      setMessage('❌ Please paste your data first');
      return;
    }

    setImporting(true);
    setMessage('📖 Processing data...');
    setResults({ success: 0, errors: 0 });

    try {
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('❌ Please paste at least a header row and one data row!');
        setMessage('❌ Insufficient data');
        setImporting(false);
        return;
      }

      // Auto-detect separator (tab or comma)
      const separator = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      console.log('📋 Headers found:', headers);

      let successCount = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          const foodData = {
            name: row['name'] || row['food name'] || row['food_name'] || row['item'] || row['food'],
            calories_per_portion: parseFloat(row['calories_per_portion'] || row['calories'] || row['cal'] || row['energy'] || '0'),
            protein_g: parseFloat(row['protein_g'] || row['protein'] || row['prot'] || '0'),
            carbs_g: parseFloat(row['carbs_g'] || row['carbs'] || row['carbohydrates'] || row['carb'] || '0'),
            fat_g: parseFloat(row['fat_g'] || row['fats'] || row['fat'] || '0'),
            fiber_g: parseFloat(row['fiber_g'] || row['fiber'] || row['fibre'] || '0'),
            unit: (row['unit'] || row['serving'] || 'piece').toLowerCase(),
            grams_per_unit: parseFloat(row['grams_per_unit'] || row['grams'] || row['weight'] || '100')
            // NO category - meal type is stored in meal_log only
          };

          // Log first row for debugging
          if (i === 1) {
            console.log('📝 Sample row data (pasted):', foodData);
          }

          // Relaxed validation - only check if name exists and is not empty string
          if (!foodData.name || foodData.name.trim() === '') {
            errorCount++;
            errorDetails.push(`Row ${i}: Missing name`);
            continue;
          }

          // Allow 0 calories - some items like water or tea might have minimal calories
          if (isNaN(foodData.calories_per_portion)) {
            errorCount++;
            errorDetails.push(`Row ${i}: Invalid calories for ${foodData.name}`);
            continue;
          }

          await addDoc(collection(db, 'food_master'), foodData);
          successCount++;
          setResults({ success: successCount, errors: errorCount });
          setMessage(`⏳ Importing... ${successCount}/${lines.length - 1}`);
        } catch (error) {
          errorCount++;
          console.error('Error importing row:', error);
        }
      }

      setResults({ success: successCount, errors: errorCount });
      setMessage(`✅ Import complete! ${successCount} foods added successfully`);
      
      // Log errors for debugging
      if (errorDetails.length > 0) {
        console.log('❌ Import errors:', errorDetails.slice(0, 10)); // Show first 10 errors
      }
      
      // Show success popup
      alert(`🎉 Success!\n\n${successCount} foods imported successfully!\n${errorCount > 0 ? `${errorCount} rows skipped due to errors.` : ''}`);
      
      // Clear textarea
      textarea.value = '';
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = '❌ Failed to process data. Please check the format.';
      setMessage(errorMsg);
      alert(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:scale-110 transition-all duration-300"
            >
              <span className="mr-2">←</span> Back
            </button>
            <button
              onClick={() => router.push('/admin/manage-foods')}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 hover:scale-105 shadow-sm transition-all duration-300 font-semibold"
            >
              🗂️ Manage Foods
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Import Foods</h1>
          <p className="text-gray-500 dark:text-gray-400">Import multiple foods from CSV/Excel</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Method 1: Upload CSV */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Method 1: Upload CSV File</h2>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-700/50 transition-all duration-300">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                className={`cursor-pointer ${importing ? 'opacity-50' : ''}`}
              >
                <div className="text-4xl mb-2">📁</div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {importing ? 'Uploading...' : 'Click to upload CSV file'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  CSV format: name,calories,protein,carbs,fats,fiber,sugar,unit,grams_per_unit
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Supported: .csv files
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Method 2: Paste from Excel */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Method 2: Paste from Excel</h2>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              1. Open your Excel file<br/>
              2. Select all data (including headers)<br/>
              3. Copy (Ctrl+C)<br/>
              4. Paste below and click Import
            </div>
            <textarea
              id="pasteArea"
              rows={10}
              placeholder="Paste your Excel data here (including headers)&#10;Example:&#10;name,calories,protein,carbs,fats,fiber,sugar,unit,grams_per_unit&#10;Chapathi,120,4,20,3,3,1,piece,40&#10;White Rice,180,4,40,1,1,0,bowl,200&#10;Masala Dosa,180,4,30,5,3,2,piece,120"
              disabled={importing}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono text-sm"
            />
            <button
              onClick={handlePasteData}
              disabled={importing}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 hover:scale-105 shadow-sm transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {importing ? 'Importing...' : 'Import Pasted Data'}
            </button>
          </div>
        </div>

        {/* Status */}
        {message && (
          <div className={`p-4 rounded-xl backdrop-blur-3xl border ${
            message.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' 
              : message.includes('❌') 
              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
              : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
          }`}>
            <div className="font-semibold">{message}</div>
            {results.success > 0 && (
              <div className="text-sm mt-2">
                Success: {results.success} | Errors: {results.errors}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">📋 CSV Format Required:</h3>
          <pre className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 p-4 rounded-xl text-sm overflow-x-auto">
name,calories,protein,carbs,fats,fiber,sugar,unit,grams_per_unit
Chapathi,120,4,20,3,3,1,piece,40
White Rice,180,4,40,1,1,0,bowl,200
Masala Dosa,180,4,30,5,3,2,piece,120
Idli,40,1.5,8,0.2,0.5,0,piece,60
Dal,150,9,20,3,5,1,bowl,180
Coke Zero,0,0,0,0,0,0,can,330
          </pre>
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Units:</strong> piece, bowl, cup, ml, bar, can</p>
            <p><strong>grams_per_unit:</strong> Weight in grams for one unit (e.g., 40g for chapathi)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

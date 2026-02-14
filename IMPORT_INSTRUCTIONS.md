# Bulk Import Foods to MessFit

## Option 1: Use the Web Interface (EASIEST)

1. **Open your Excel file** `Mess_Menu_v2.xlsx`
2. **Select all data** (Ctrl+A) including the header row
3. **Copy** (Ctrl+C)
4. **Go to:** http://localhost:3000/admin/bulk-import
5. **Paste** into the text area
6. **Click** "Import Pasted Data"

Done! All foods will be imported to Firestore.

---

## Option 2: Convert to CSV & Upload

1. **Open** `Mess_Menu_v2.xlsx` in Excel
2. **File → Save As → CSV (Comma delimited)**
3. **Save** as `foods.csv`
4. **Go to:** http://localhost:3000/admin/bulk-import
5. **Upload** the CSV file

---

## Required Excel/CSV Format:

Your columns should be named (case-insensitive):
- `name` or `Food Name` or `item`
- `calories` or `Calories` or `cal`
- `protein` or `Protein`
- `carbs` or `Carbs` or `Carbohydrates`
- `fats` or `Fats` or `Fat`
- `fiber` or `Fiber` or `Fibre`
- `unit` (piece, bowl, cup, ml, bar, can)
- `grams_per_unit` (weight in grams for one unit)

**Note:** No category column needed - meal type is selected when logging food.

### Example:
```
name,calories,protein,carbs,fats,fiber,unit,grams_per_unit
Dal Rice,350,12,65,5,8,bowl,250
Poha,180,4,32,4,3,bowl,150
Samosa,150,3,18,8,2,piece,80
Roti with Sabzi,300,8,50,8,6,piece,120
```

---

## Option 3: Node.js Script (Advanced)

If you prefer running a script:

```bash
cd E:\apps\scripts
npm install
node import-foods.js
```

**Note:** You may need to adjust column names in the script based on your Excel headers.

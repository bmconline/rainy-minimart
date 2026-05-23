const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2026 Rainy minimart.xlsx');
const workbook = xlsx.readFile(filePath);

// Check all sheets
for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  console.log(`\n=== "${sheetName}" ===`);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample:', JSON.stringify(data[0], null, 2));
  }
}

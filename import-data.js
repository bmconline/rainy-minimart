const xlsx = require('xlsx');
const path = require('path');

// Read Excel file
const filePath = path.join(__dirname, '2026 Rainy minimart.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('📊 Excel Sheets found:');
console.log(workbook.SheetNames);

// Read first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log(`\n📋 Sheet: "${sheetName}"`);
console.log(`📊 Total rows: ${data.length}`);
console.log('\n🔍 First 3 rows:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

if (data.length > 0) {
  console.log('\n📌 Column names:');
  console.log(Object.keys(data[0]));
}

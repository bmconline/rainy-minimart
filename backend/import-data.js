const XLSX = require('xlsx');
const path = require('path');
const db = require('./db');

const EXCEL_PATH = path.join(__dirname, '../2026 Rainy minimart.xlsx');

console.log('🔄 Reading Excel file:', EXCEL_PATH);

try {
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log('📄 Sheets found:', workbook.SheetNames);

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n📊 Importing ${data.length} rows...`);

  // Mock users for mapping
  const USERS = [
    { id: 'u1', name: 'สมศักดิ์ ใจดี' },
    { id: 'u2', name: 'พิมพ์ชนก สายฝน' },
    { id: 'u3', name: 'ธนพล สดใส' }
  ];

  db.serialize(() => {
    // Insert users first
    USERS.forEach((user, idx) => {
      const initials = user.name.replace(/\s+/g, '').slice(0, 2);
      db.run(
        'INSERT OR IGNORE INTO users (id, name, username, role, initials) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.name, user.name.toLowerCase().replace(/\s+/g, ''), 'staff', initials]
      );
    });

    // Parse and insert transactions
    let imported = 0;
    data.forEach((row, idx) => {
      const date = row['วันที่'] ? new Date(row['วันที่']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const type = row['ประเภท'] === 'รายรับ' ? 'income' : 'expense';
      const doc = row['เลขที่เอกสาร'] || `${type === 'income' ? 'RV' : 'PV'}-${idx}`;
      const item = row['รายการ'] || row['ชื่อรายการ'] || 'บันทึก';
      const category = row['หมวดหมู่'] || (type === 'income' ? 'sale-front' : 'goods');
      const amount = parseFloat(row['จำนวนเงิน'] || row['จำนวน'] || 0);
      const payment = row['การชำระ'] || 'cash';
      const note = row['หมายเหตุ'] || '';

      // Skip empty rows
      if (!amount || amount === 0) return;

      const id = `tx-${Date.now()}-${idx}`;
      db.run(
        `INSERT INTO transactions
         (id, type, date, doc, item, category, amount, payment, user_id, user_name, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, date, doc, item, category, amount, payment, USERS[idx % USERS.length].id, USERS[idx % USERS.length].name, note],
        (err) => {
          if (!err) imported++;
          if (err) console.warn(`⚠️  Row ${idx}:`, err.message);
        }
      );
    });

    setTimeout(() => {
      db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
        console.log(`\n✅ ทำการ import เสร็จแล้ว!`);
        console.log(`📦 จำนวนทรานแซคชันในฐานข้อมูล: ${row.count}`);
        process.exit(0);
      });
    }, 1000);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

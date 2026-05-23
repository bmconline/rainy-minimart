const bcrypt = require('bcrypt');
const db = require('./db');

const USERS = [
  { id: 'u1', name: 'สมศักดิ์ ใจดี', username: 'admin', password: '1234', role: 'admin' },
  { id: 'u2', name: 'พิมพ์ชนก สายฝน', username: 'staff1', password: '1234', role: 'staff' },
  { id: 'u3', name: 'ธนพล สดใส', username: 'staff2', password: '1234', role: 'staff' },
];

async function seedUsers() {
  for (const user of USERS) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const initials = user.name.replace(/\s+/g, '').slice(0, 2);

      db.run(
        'INSERT OR REPLACE INTO users (id, name, username, password, role, initials) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.username, hashedPassword, user.role, initials],
        (err) => {
          if (err) {
            console.error(`❌ Error creating user ${user.username}:`, err.message);
          } else {
            console.log(`✅ User created: ${user.username} (${user.role})`);
          }
        }
      );
    } catch (error) {
      console.error(`❌ Error hashing password for ${user.username}:`, error);
    }
  }

  setTimeout(() => {
    console.log('\n✅ Seed completed!');
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (!err && row) {
        console.log(`📊 Total users in database: ${row.count}`);
      }
      db.close();
      process.exit(0);
    });
  }, 1000);
}

db.serialize(() => {
  setTimeout(seedUsers, 500);
});

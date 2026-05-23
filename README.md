# 🌧️ Rainy Minimart - Accounting System

ระบบบันทึกรายรับรายจ่ายสำหรับร้านมินิมาร์ท ด้วย React + Node.js + SQLite

## ✨ Features

- 💰 บันทึกรายรับ/รายจ่าย แบบ Real-time
- 👥 ระบบสิทธิ์ผู้ใช้ (Admin/Staff)
- 🔐 Password hashing ด้วย bcrypt
- 📊 Dashboard วิเคราะห์รายไตรมาส
- 📱 Responsive UI สำหรับมือถือ
- 🇹🇭 Thai language support

## 🚀 Tech Stack

- **Frontend**: React 18, Babel Standalone
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Auth**: JWT (ready), bcrypt
- **Deployment**: Railway

## 📋 Installation

```bash
# Install backend dependencies
cd backend
npm install

# Seed users with hashed passwords
npm run seed

# Start backend (serves frontend too)
npm start
```

Opens on `http://localhost:3001`

## 🔐 Demo Credentials

```
Admin:   admin / 1234
Staff 1: staff1 / 1234
Staff 2: staff2 / 1234
```

## 📁 Project Structure

```
rainy-minimart/
├── backend/
│   ├── server.js         # Express API server
│   ├── db.js             # SQLite database
│   ├── seed-users.js     # Seed test users
│   └── package.json
├── index.html            # React SPA
├── styles.css            # Styling
├── api-config.js         # API client
└── DEPLOYMENT.md         # Deployment guide
```

## 🚀 Deployment

ดู [DEPLOYMENT.md](./DEPLOYMENT.md) สำหรับขั้นตอน deploy ไป Railway

## 📝 License

MIT

## 👨‍💼 Author

Rainy Minimart © 2026

# 🚀 Deployment Guide - Rainy Minimart

ปัจจุบันแอพพลิเคชันพร้อมสำหรับ Deploy ไป Production แล้ว

## Option 1: Deploy ทั้งหมดไป Railway (แนะนำ)

### ขั้นตอนที่ 1: สร้างบัญชี Railway
1. ไปที่ https://railway.app
2. สมัคร ด้วย GitHub account
3. New Project → Deploy from GitHub

### ขั้นตอนที่ 2: Push code ไป GitHub
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/rainy-minimart.git
git push -u origin main
```

### ขั้นตอนที่ 3: Deploy ไป Railway
1. ไปที่ Railway dashboard
2. Click "New Project"
3. "Deploy from GitHub repo"
4. เลือก repository `rainy-minimart`
5. Railway จะ auto-detect Node.js project

### ขั้นตอนที่ 4: ตั้ง Environment Variables
ใน Railway dashboard → Variables → เพิ่ม:
```
PORT=3001
NODE_ENV=production
DATABASE_PATH=/tmp/rainy.db
CORS_ORIGIN=https://your-app.railway.app
```

### ขั้นตอนที่ 5: ตรวจสอบ Deployment
1. Railway จะแสดง URL เช่น `https://rainy-minimart-production.up.railway.app`
2. เปิด URL นั้นใน browser
3. ลอง login ด้วย demo credentials

---

## Option 2: Split Deployment (Frontend + Backend)

### Frontend ไป Vercel
```bash
# ตั้งค่า Vercel project
npm install -g vercel
vercel
```

ใน `vercel.json`:
```json
{
  "buildCommand": "echo 'Frontend ready'",
  "outputDirectory": ".",
  "public": false
}
```

อัพเดต `api-config.js` เพื่อชี้ไป production API:
```javascript
window.API_BASE_URL = 'https://your-backend.railway.app/api';
```

### Backend ไป Railway
ตามขั้นตอน Option 1

---

## สำหรับ Production ถัดไป

### 🔄 Upgrade to PostgreSQL
ต้องเปลี่ยนจาก SQLite ไป PostgreSQL เพื่อ:
- ความปลอดภัยมากขึ้น
- รองรับผู้ใช้หลายคนพร้อมกัน
- Backup อัตโนมัติ

Railway มี PostgreSQL free tier พร้อม auto-backup

### 🔑 Add JWT Tokens
ปัจจุบันใช้ session-based auth
ควรเปลี่ยนเป็น JWT untuk scalability

### 📊 Add Monitoring
- Sentry (error tracking)
- LogRocket (user session replay)
- DataDog (performance monitoring)

### 🔐 Security Hardening
- Rate limiting
- Input validation
- SQL injection prevention (ทำแล้ว ✅)
- HTTPS enforcement

---

## Test Production

```bash
# Test login API
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}'

# ควรได้ user data กลับมา
```

## Troubleshooting

### ❌ API returns 404
- ตรวจสอบว่า backend กำลังรัน
- ตรวจสอบ CORS_ORIGIN ถูกต้อง
- ดู logs: `railway logs`

### ❌ Database not found
- ตรวจสอบ DATABASE_PATH correct
- Railway /tmp ลบอัตโนมัติ → ใช้ persistent storage
- ใช้ PostgreSQL แทน SQLite

### ❌ CORS error
- อัพเดต CORS_ORIGIN ใน environment variables
- เพิ่ม credentials: 'include' ใน fetch (ทำแล้ว ✅)

---

## Next Steps
1. ✅ Setup GitHub repo
2. ✅ Deploy ไป Railway
3. ✅ Test login ด้วย demo credentials
4. 📋 เพิ่มผู้ใช้จริง
5. 🔐 ตั้ง strong passwords
6. 📊 Upgrade to PostgreSQL

// ============ Mock data + helpers ============

const INCOME_CATEGORIES = [
  { id: "sale-front",   name: "ขายหน้าร้าน",     icon: "🛒" },
  { id: "sale-online",  name: "ขายออนไลน์",      icon: "📱" },
  { id: "sale-whole",   name: "ขายส่ง",          icon: "📦" },
  { id: "service",      name: "บริการเสริม",      icon: "💼" },
  { id: "other-in",     name: "รายรับอื่นๆ",      icon: "✨" },
];

const EXPENSE_CATEGORIES = [
  { id: "goods",   name: "ค่าสินค้า",       icon: "📦" },
  { id: "elec",    name: "ค่าไฟ",          icon: "💡" },
  { id: "water",   name: "ค่าน้ำ",         icon: "💧" },
  { id: "wage",    name: "ค่าแรง",         icon: "🧑‍🔧" },
  { id: "rent",    name: "ค่าเช่า",        icon: "🏠" },
  { id: "logi",    name: "ค่าขนส่ง",       icon: "🚚" },
  { id: "market",  name: "ค่าการตลาด",     icon: "📣" },
  { id: "other",   name: "ค่าใช้จ่ายอื่นๆ", icon: "📝" },
];

const PAYMENT_METHODS = [
  { id: "cash",   name: "เงินสด",  icon: "Cash"   },
  { id: "bank",   name: "โอน",     icon: "Bank"   },
  { id: "credit", name: "เครดิต",   icon: "Credit" },
];

const USERS = [
  { id: "u1", name: "สมศักดิ์ ใจดี",    role: "admin",  username: "admin", initials: "สศ" },
  { id: "u2", name: "พิมพ์ชนก สายฝน",   role: "staff",  username: "staff", initials: "พช" },
  { id: "u3", name: "ธนพล สดใส",       role: "staff",  username: "thanapol", initials: "ธพ" },
];

// Deterministic seeded RNG
function rng(seed){ let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function generateTransactions(){
  const r = rng(42);
  const out = [];
  const today = new Date(2026, 4, 23); // May 23, 2026
  const start = new Date(2026, 0, 1);
  let docIn = 1, docOut = 1;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    // Income: 3-8 entries per day
    const inCount = 3 + Math.floor(r() * 6);
    for (let i = 0; i < inCount; i++) {
      const cat = INCOME_CATEGORIES[Math.floor(r() * INCOME_CATEGORIES.length)];
      const base = cat.id === "sale-front" ? 1200 + r() * 4800
                 : cat.id === "sale-online" ? 800 + r() * 3200
                 : cat.id === "sale-whole"  ? 3500 + r() * 8500
                 : cat.id === "service"     ? 200 + r() * 600
                 : 100 + r() * 400;
      out.push({
        id: `tx-${out.length+1}`,
        type: "income",
        date: new Date(d),
        doc: `RV-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,"0")}-${String(docIn++).padStart(4,"0")}`,
        item: incomeItemName(cat.id, r),
        category: cat.id,
        amount: Math.round(base / 5) * 5,
        payment: ["cash","bank","credit"][Math.floor(r() * 3)],
        user: USERS[Math.floor(r()*USERS.length)].id,
        note: r() > 0.85 ? "ลูกค้าประจำ" : ""
      });
    }
    // Expenses: 1-3 entries per day
    const outCount = 1 + Math.floor(r() * 3);
    for (let i = 0; i < outCount; i++) {
      const cat = EXPENSE_CATEGORIES[Math.floor(r() * EXPENSE_CATEGORIES.length)];
      const base = cat.id === "goods"  ? 2500 + r() * 12000
                 : cat.id === "elec"   ? 1800 + r() * 1200
                 : cat.id === "water"  ? 250 + r() * 200
                 : cat.id === "wage"   ? 12000 + r() * 4000
                 : cat.id === "rent"   ? 8000 + r() * 2000
                 : cat.id === "logi"   ? 350 + r() * 800
                 : cat.id === "market" ? 500 + r() * 1500
                 : 200 + r() * 800;
      // Some categories only happen monthly
      if ((cat.id === "rent" || cat.id === "wage") && d.getDate() !== 5) continue;
      if (cat.id === "elec" && d.getDate() !== 15) continue;
      if (cat.id === "water" && d.getDate() !== 12) continue;
      out.push({
        id: `tx-${out.length+1}`,
        type: "expense",
        date: new Date(d),
        doc: `PV-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,"0")}-${String(docOut++).padStart(4,"0")}`,
        item: expenseItemName(cat.id, r),
        category: cat.id,
        amount: Math.round(base / 5) * 5,
        payment: ["cash","bank","credit"][Math.floor(r() * 3)],
        user: USERS[Math.floor(r()*USERS.length)].id,
        note: r() > 0.9 ? "รอใบเสร็จ" : ""
      });
    }
  }
  return out.sort((a,b) => b.date - a.date);
}

function incomeItemName(id, r) {
  const map = {
    "sale-front": ["ยอดขายหน้าร้าน รอบเช้า", "ยอดขายหน้าร้าน รอบบ่าย", "ยอดขายหน้าร้าน รอบเย็น", "ขายเครื่องดื่ม+ขนม", "ขายของชำ"],
    "sale-online": ["ออเดอร์ Shopee", "ออเดอร์ Lazada", "ออเดอร์ LINE OA", "Grab Mart", "ออเดอร์ TikTok Shop"],
    "sale-whole": ["ขายส่งร้านอาหาร", "ขายส่งโรงเรียน", "ขายส่งหอพัก", "ลูกค้าประจำ — โรงงาน"],
    "service": ["ค่าเติมเงินมือถือ", "ค่าจ่ายบิล", "บริการพัสดุ", "ค่าถ่ายเอกสาร"],
    "other-in": ["ของฝากจากซัพพลายเออร์", "เงินทอน Cashback", "รายได้เบ็ดเตล็ด"],
  };
  const arr = map[id] || ["รายการ"];
  return arr[Math.floor(r() * arr.length)];
}
function expenseItemName(id, r) {
  const map = {
    "goods": ["สั่งสินค้า สหพัฒน์", "สั่งสินค้า ไทยเบฟ", "สั่งของ Makro", "เติม Stock น้ำดื่ม", "เติม Stock บะหมี่+ขนม", "ของสด — เนื้อสัตว์", "ของแห้ง — ข้าวสาร"],
    "elec":  ["ค่าไฟฟ้าประจำเดือน"],
    "water": ["ค่าน้ำประปาประจำเดือน"],
    "wage":  ["เงินเดือนพนักงาน — รอบ 5"],
    "rent":  ["ค่าเช่าตึก — ประจำเดือน"],
    "logi":  ["ค่าขนส่ง Kerry", "ค่าขนส่ง Flash", "ค่าน้ำมัน รถส่งของ", "ค่าขนส่งสินค้า"],
    "market":["ค่าโฆษณา Facebook", "ค่าโฆษณา TikTok", "พิมพ์ใบปลิว", "ค่า Influencer"],
    "other": ["ค่าซ่อมแอร์", "ค่าทำความสะอาด", "เครื่องเขียน", "ของใช้สำนักงาน"],
  };
  const arr = map[id] || ["รายการ"];
  return arr[Math.floor(r() * arr.length)];
}

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
function catLabel(id) {
  const c = ALL_CATEGORIES.find(x => x.id === id);
  return c ? c.name : id;
}
function catIcon(id) {
  const c = ALL_CATEGORIES.find(x => x.id === id);
  return c ? c.icon : "•";
}
function userName(id) {
  const u = USERS.find(x => x.id === id);
  return u ? u.name : id;
}
function payLabel(id) {
  const p = PAYMENT_METHODS.find(x => x.id === id);
  return p ? p.name : id;
}

function fmtMoney(n, dp = 2) {
  return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtDate(d) {
  if (!d) return "";
  const dd = new Date(d);
  return `${String(dd.getDate()).padStart(2,"0")}/${String(dd.getMonth()+1).padStart(2,"0")}/${dd.getFullYear()+543}`;
}
function fmtDateInput(d) {
  if (!d) return "";
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
}
const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function thaiMonth(m) { return THAI_MONTHS[m]; }

Object.assign(window, {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, USERS, ALL_CATEGORIES,
  generateTransactions, catLabel, catIcon, userName, payLabel,
  fmtMoney, fmtDate, fmtDateInput, thaiMonth, THAI_MONTHS
});

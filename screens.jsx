// ============ Screens ============

// ---- Login Screen ----
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("1234");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e) => {
    e && e.preventDefault();
    setErr("");
    if (!username || !password) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setLoading(true);
    setTimeout(() => {
      const u = USERS.find(u => u.username === username && u.role === role) || USERS.find(u => u.role === role) || USERS[0];
      onLogin(u);
    }, 700);
  };

  return (
    <div className="login-shell">
      <RainCanvas density={140} />
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark"><Icon.Logo /></div>
          <div>
            <div className="brand-name">Rainy Minimart</div>
            <div className="brand-sub">Point of Sale · v2.6</div>
          </div>
        </div>
        <h1>เข้าสู่ระบบ</h1>
        <p className="lead">ระบบบันทึกรายรับรายจ่ายร้านมินิมาร์ท</p>

        <div className="role-pick">
          <button type="button" className={role === "admin" ? "active" : ""} onClick={() => { setRole("admin"); setUsername("admin"); }}>
            <Icon.Settings /> ผู้ดูแล (Admin)
          </button>
          <button type="button" className={role === "staff" ? "active" : ""} onClick={() => { setRole("staff"); setUsername("staff"); }}>
            <Icon.User /> พนักงาน (Staff)
          </button>
        </div>

        <div className="field">
          <label>ชื่อผู้ใช้งาน</label>
          <div className="input-wrap">
            <span className="icon"><Icon.User /></span>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <div className="input-wrap">
            <span className="icon"><Icon.Lock /></span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
        </div>

        {err && <div style={{color:"var(--loss)", fontSize:12, marginBottom:8}}>{err}</div>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ…" : <>เข้าสู่ระบบ <span style={{opacity:0.6}}>→</span></>}
        </button>

        <div className="demo-hint">
          ทดลองใช้ — ผู้ใช้ <code>admin</code> หรือ <code>staff</code> · รหัส <code>1234</code>
        </div>

        <div className="login-foot">
          <span>v2.6.0</span>
          <span>© 2026 Rainy Co., Ltd.</span>
        </div>
      </form>
    </div>
  );
}

// ---- Dashboard ----
function Dashboard({ txs, onNav, period, setPeriod }) {
  const today = new Date(2026, 4, 23);

  // Filter window
  const startOf = (() => {
    if (period === "day")   return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (period === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
    return new Date(today.getFullYear(), 0, 1);
  })();
  const prevStart = (() => {
    if (period === "day")   return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (period === "month") return new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return new Date(today.getFullYear() - 1, 0, 1);
  })();
  const prevEnd = startOf;

  const inPeriod = (d, s, e) => d >= s && (!e || d < e);

  const cur = txs.filter(t => inPeriod(t.date, startOf, null));
  const prev = txs.filter(t => inPeriod(t.date, prevStart, prevEnd));

  const sumBy = (arr, k) => arr.filter(t => t.type === k).reduce((s,t) => s + t.amount, 0);
  const curIn = sumBy(cur, "income");
  const curOut = sumBy(cur, "expense");
  const prevIn = sumBy(prev, "income");
  const prevOut = sumBy(prev, "expense");

  const profit = curIn - curOut;
  const prevProfit = prevIn - prevOut;
  const pct = (a, b) => !b ? 0 : ((a - b) / b * 100);

  // Bars data
  const barsData = useMemo(() => {
    if (period === "day") {
      // last 14 days
      const rows = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const dayTx = txs.filter(t => sameDay(t.date, d));
        rows.push({
          label: `${d.getDate()}/${d.getMonth()+1}`,
          income: sumBy(dayTx, "income"),
          expense: sumBy(dayTx, "expense"),
        });
      }
      return rows;
    }
    if (period === "month") {
      // days of this month
      const rows = [];
      const d0 = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = today.getDate();
      for (let i = 1; i <= end; i++) {
        const d = new Date(d0.getFullYear(), d0.getMonth(), i);
        const dayTx = txs.filter(t => sameDay(t.date, d));
        rows.push({
          label: `${i}`,
          income: sumBy(dayTx, "income"),
          expense: sumBy(dayTx, "expense"),
        });
      }
      return rows;
    }
    // year — months
    const rows = [];
    for (let m = 0; m <= today.getMonth(); m++) {
      const mTx = txs.filter(t => t.date.getFullYear() === today.getFullYear() && t.date.getMonth() === m);
      rows.push({
        label: thaiMonth(m),
        income: sumBy(mTx, "income"),
        expense: sumBy(mTx, "expense"),
      });
    }
    return rows;
  }, [txs, period]);

  // Donut by category (expense)
  const expByCat = useMemo(() => {
    const colors = ["#0B1B2B", "#4FA8E0", "#C28840", "#2F8F5E", "#C04A3E", "#8C5BAF", "#5E7A99", "#3D9D7C"];
    const groups = {};
    cur.filter(t => t.type === "expense").forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });
    return Object.entries(groups)
      .map(([k,v], i) => ({ label: catLabel(k), value: v, color: colors[i % colors.length] }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 6);
  }, [cur]);

  const recent = txs.slice(0, 6);

  return (
    <div className="page-enter">
      <Topbar
        crumbs={"แดชบอร์ด · " + (period === "day" ? "วันนี้" : period === "month" ? "เดือนนี้" : "ปีนี้")}
        title="ภาพรวมร้าน"
      >
        <div className="tab-row">
          <button className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>วัน</button>
          <button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>เดือน</button>
          <button className={period === "year" ? "active" : ""} onClick={() => setPeriod("year")}>ปี</button>
        </div>
        <button className="btn" onClick={() => onNav("income")}><Icon.Plus /> รายรับ</button>
        <button className="btn solid" onClick={() => onNav("expense")}><Icon.Plus /> รายจ่าย</button>
      </Topbar>

      <div className="kpi-grid">
        <KPI
          title="รายรับ"
          value={fmtMoney(curIn, 2)}
          delta={`${pct(curIn,prevIn).toFixed(1)}%`}
          deltaType={curIn >= prevIn ? "up" : "down"}
          icon={Icon.TrendUp}
        />
        <KPI
          title="รายจ่าย"
          value={fmtMoney(curOut, 2)}
          delta={`${pct(curOut,prevOut).toFixed(1)}%`}
          deltaType={curOut <= prevOut ? "up" : "down"}
          icon={Icon.TrendDown}
        />
        <KPI
          dark
          title="กำไรเบื้องต้น"
          value={fmtMoney(profit, 2)}
          delta={`${pct(profit,prevProfit).toFixed(1)}%`}
          deltaType={profit >= prevProfit ? "up" : "down"}
          icon={Icon.Wallet}
        />
        <KPI
          title="จำนวนรายการ"
          value={cur.length}
          prefix=""
          delta={`+${cur.length - prev.length}`}
          deltaType={cur.length >= prev.length ? "up" : "down"}
          icon={Icon.List}
        />
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="chart-head">
            <div>
              <h3>รายรับ vs รายจ่าย</h3>
              <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>
                {period === "day" ? "14 วันที่ผ่านมา" : period === "month" ? `เดือน${thaiMonth(today.getMonth())} ${today.getFullYear()+543}` : `ปี ${today.getFullYear()+543}`}
              </div>
            </div>
            <div className="legend">
              <span><span className="dot" style={{background:"#4FA8E0"}}></span>รายรับ</span>
              <span><span className="dot" style={{background:"#C04A3E"}}></span>รายจ่าย</span>
            </div>
          </div>
          <BarsChart data={barsData} />
        </div>

        <div className="card">
          <div className="chart-head">
            <div>
              <h3>หมวดหมู่รายจ่าย</h3>
              <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>Top 6 หมวด</div>
            </div>
          </div>
          {expByCat.length === 0 ? (
            <div className="empty"><div className="ico"><Icon.Inbox /></div>ยังไม่มีรายจ่าย</div>
          ) : (
            <div className="donut-wrap">
              <Donut data={expByCat} />
              <div className="donut-list">
                {expByCat.map((d, i) => (
                  <div className="row" key={i}>
                    <span className="label"><span className="dot" style={{background:d.color, width:10, height:10, borderRadius:3, display:"inline-block"}}></span>{d.label}</span>
                    <span className="val">฿{fmtMoney(d.value, 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="chart-head">
          <div>
            <h3>รายการล่าสุด</h3>
            <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>6 รายการล่าสุด</div>
          </div>
          <button className="btn ghost" onClick={() => onNav("list")}>ดูทั้งหมด →</button>
        </div>
        <div className="recent">
          {recent.map(t => (
            <div className="row" key={t.id}>
              <div className={`icon-bub ${t.type === "income" ? "in" : "out"}`}>
                {t.type === "income" ? <Icon.ArrowDown width="16" height="16"/> : <Icon.ArrowUp width="16" height="16"/>}
              </div>
              <div className="meta">
                <div className="t1">{t.item}</div>
                <div className="t2">{t.doc} · {catLabel(t.category)} · {fmtDate(t.date)}</div>
              </div>
              <div className={`amt ${t.type === "income" ? "in" : "out"}`}>
                {t.type === "income" ? "+" : "−"}฿{fmtMoney(t.amount, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ---- Entry Form (Income / Expense) ----
function EntryScreen({ kind, setKind, currentUser, onSave, txs }) {
  const isIncome = kind === "income";
  const today = new Date(2026, 4, 23);
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // auto doc number
  const nextDoc = useMemo(() => {
    const prefix = isIncome ? "RV" : "PV";
    const n = txs.filter(t => t.type === kind).length + 1;
    return `${prefix}-${String(today.getFullYear()).slice(2)}${String(today.getMonth()+1).padStart(2,"0")}-${String(n).padStart(4,"0")}`;
  }, [txs, kind]);

  const [form, setForm] = useState({
    date: fmtDateInput(today),
    doc: nextDoc,
    item: "",
    category: cats[0].id,
    amount: "",
    payment: "cash",
    user: currentUser.id,
    note: "",
  });
  useEffect(() => {
    setForm(f => ({
      ...f,
      doc: nextDoc,
      category: cats[0].id,
      payment: "cash",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, nextDoc]);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = (e) => {
    e.preventDefault();
    if (!form.item.trim()) return alert("กรุณากรอกรายการ");
    if (!form.amount || Number(form.amount) <= 0) return alert("กรุณากรอกจำนวนเงิน");
    const tx = {
      id: `tx-${Date.now()}`,
      type: kind,
      date: new Date(form.date),
      doc: form.doc,
      item: form.item.trim(),
      category: form.category,
      amount: Number(form.amount),
      payment: form.payment,
      user: form.user,
      note: form.note.trim(),
    };
    onSave(tx);
    setForm(f => ({...f, item: "", amount: "", note: ""}));
  };

  return (
    <div className="page-enter">
      <Topbar crumbs={`บันทึก · ${isIncome ? "รายรับ" : "รายจ่าย"}`} title={isIncome ? "บันทึกรายรับ" : "บันทึกรายจ่าย"}>
        <button className="btn ghost" type="button">ยกเลิก</button>
      </Topbar>

      <div className="form-tabs">
        <button className={isIncome ? "active in" : ""} onClick={() => setKind("income")}>
          <Icon.ArrowDown /> รายรับ
        </button>
        <button className={!isIncome ? "active out" : ""} onClick={() => setKind("expense")}>
          <Icon.ArrowUp /> รายจ่าย
        </button>
      </div>

      <form onSubmit={submit} style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:20}}>
        <div className="card">
          <h3 style={{margin:"0 0 20px", fontSize:16}}>รายละเอียดเอกสาร</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>วันที่ <span className="req">*</span></label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="form-field">
              <label>เลขที่เอกสาร <span className="req">*</span></label>
              <input value={form.doc} onChange={e => set("doc", e.target.value)} style={{fontFamily:"var(--font-mono)"}} />
            </div>

            <div className="form-field full">
              <label>รายการ <span className="req">*</span></label>
              <input placeholder={isIncome ? "เช่น ยอดขายหน้าร้าน รอบเช้า" : "เช่น สั่งสินค้า สหพัฒน์"} value={form.item} onChange={e => set("item", e.target.value)} />
            </div>

            <div className="form-field full">
              <label>หมวดหมู่ <span className="req">*</span></label>
              <div className="chips">
                {cats.map(c => (
                  <button type="button"
                    key={c.id}
                    className={`chip ${kind} ${form.category === c.id ? "active" : ""}`}
                    onClick={() => set("category", c.id)}>
                    <span>{c.icon}</span>{c.name}
                  </button>
                ))}
              </div>
            </div>

            {!isIncome && (
              <div className="form-field full">
                <label>วิธีชำระเงิน <span className="req">*</span></label>
                <div className="pay-row">
                  {PAYMENT_METHODS.map(p => {
                    const PI = Icon[p.icon];
                    return (
                      <button type="button" key={p.id}
                        className={`pay-opt ${form.payment === p.id ? "active" : ""}`}
                        onClick={() => set("payment", p.id)}>
                        <PI /> {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isIncome && (
              <div className="form-field full">
                <label>วิธีรับเงิน</label>
                <div className="pay-row">
                  {PAYMENT_METHODS.map(p => {
                    const PI = Icon[p.icon];
                    return (
                      <button type="button" key={p.id}
                        className={`pay-opt ${form.payment === p.id ? "active" : ""}`}
                        onClick={() => set("payment", p.id)}>
                        <PI /> {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-field full">
              <label>หมายเหตุ</label>
              <textarea placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" value={form.note} onChange={e => set("note", e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          <div className="card">
            <h3 style={{margin:"0 0 20px", fontSize:16}}>จำนวนเงิน</h3>
            <div className="form-field amount">
              <label>{isIncome ? "รับเงินจำนวน (บาท)" : "จ่ายเงินจำนวน (บาท)"} <span className="req">*</span></label>
              <input type="number" placeholder="0.00" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} />
            </div>
            <div style={{marginTop:14, padding:14, background:"var(--paper-2)", borderRadius:10, fontSize:13, color:"var(--muted)", display:"flex", justifyContent:"space-between"}}>
              <span>ตัวเลข</span>
              <span style={{fontFamily:"var(--font-mono)", color: isIncome ? "var(--gain)" : "var(--loss)", fontWeight:500}}>
                {isIncome ? "+" : "−"}฿{fmtMoney(Number(form.amount || 0), 2)}
              </span>
            </div>
          </div>

          <div className="card">
            <h3 style={{margin:"0 0 16px", fontSize:16}}>ผู้บันทึก</h3>
            <div className="form-field">
              <label>พนักงาน</label>
              <select value={form.user} onChange={e => set("user", e.target.value)}>
                {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </select>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:10, marginTop:14, padding:"10px 0"}}>
              <div className="avatar" style={{background:"var(--ink)", color:"var(--paper)"}}>{userName(form.user).slice(0,1)}</div>
              <div style={{lineHeight:1.3}}>
                <div style={{fontSize:13, fontWeight:500}}>{userName(form.user)}</div>
                <div style={{fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)"}}>บันทึก: {new Date().toLocaleTimeString("th-TH", {hour:"2-digit", minute:"2-digit"})}</div>
              </div>
            </div>
          </div>

          <button className="btn-primary" type="submit" style={{background: isIncome ? "var(--gain)" : "var(--loss)"}}>
            <Icon.Check /> {isIncome ? "บันทึกรายรับ" : "บันทึกรายจ่าย"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Transaction List ----
function ListScreen({ txs, onDelete, currentUser }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [cat, setCat] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = useMemo(() => {
    return txs.filter(t => {
      if (type !== "all" && t.type !== type) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (from && t.date < new Date(from)) return false;
      if (to) { const e = new Date(to); e.setHours(23,59,59,999); if (t.date > e) return false; }
      if (q) {
        const term = q.toLowerCase();
        if (!t.doc.toLowerCase().includes(term)
          && !t.item.toLowerCase().includes(term)
          && !catLabel(t.category).toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [txs, type, cat, q, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const view = filtered.slice((page-1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [q, type, cat, from, to]);

  const totalIn = filtered.filter(t => t.type === "income").reduce((s,t) => s+t.amount, 0);
  const totalOut = filtered.filter(t => t.type === "expense").reduce((s,t) => s+t.amount, 0);

  return (
    <div className="page-enter">
      <Topbar crumbs="รายการ · ทั้งหมด" title="รายการทั้งหมด">
        <button className="btn" onClick={() => exportCSV(filtered)}><Icon.Excel /> Export CSV</button>
        <button className="btn solid" onClick={() => window.print()}><Icon.Print /> พิมพ์</button>
      </Topbar>

      <div className="kpi-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <div className="card">
          <div className="card-title">รายการที่พบ</div>
          <div className="card-value">{filtered.length}</div>
        </div>
        <div className="card">
          <div className="card-title">รวมรายรับ</div>
          <div className="card-value" style={{color:"var(--gain)"}}>฿{fmtMoney(totalIn, 2)}</div>
        </div>
        <div className="card">
          <div className="card-title">รวมรายจ่าย</div>
          <div className="card-value" style={{color:"var(--loss)"}}>฿{fmtMoney(totalOut, 2)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon.Search />
          <input placeholder="ค้นหา เลขที่เอกสาร / รายการ / หมวดหมู่…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="icon-btn" onClick={() => setQ("")} style={{color:"var(--muted)"}}><Icon.X /></button>}
        </div>
        <select className="btn" value={type} onChange={e => setType(e.target.value)} style={{padding:"10px 12px"}}>
          <option value="all">ทุกประเภท</option>
          <option value="income">รายรับ</option>
          <option value="expense">รายจ่าย</option>
        </select>
        <select className="btn" value={cat} onChange={e => setCat(e.target.value)} style={{padding:"10px 12px"}}>
          <option value="all">ทุกหมวดหมู่</option>
          <optgroup label="รายรับ">
            {INCOME_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
          <optgroup label="รายจ่าย">
            {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        </select>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="btn" style={{padding:"8px 10px"}} />
          <span style={{color:"var(--muted)", fontSize:12}}>ถึง</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="btn" style={{padding:"8px 10px"}} />
          {(from || to || q !== "" || type !== "all" || cat !== "all") && (
            <button className="btn ghost" onClick={() => { setQ(""); setType("all"); setCat("all"); setFrom(""); setTo(""); }}>
              <Icon.Refresh /> ล้าง
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty"><div className="ico"><Icon.Inbox /></div>ไม่พบรายการที่ตรงกับเงื่อนไข</div></div>
      ) : (
        <>
          <div className="table-wrap"><table className="tx">
            <thead>
              <tr>
                <th style={{width:110}}>วันที่</th>
                <th style={{width:140}}>เลขที่เอกสาร</th>
                <th>รายการ</th>
                <th style={{width:120}}>หมวดหมู่</th>
                <th style={{width:90}}>การชำระ</th>
                <th style={{width:120}}>ผู้บันทึก</th>
                <th style={{width:130, textAlign:"right"}}>จำนวนเงิน</th>
                {currentUser.role === "admin" && <th style={{width:40}}></th>}
              </tr>
            </thead>
            <tbody>
              {view.map(t => (
                <tr key={t.id}>
                  <td>{fmtDate(t.date)}</td>
                  <td><span className="doc-no">{t.doc}</span></td>
                  <td>
                    <div>{t.item}</div>
                    {t.note && <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>{t.note}</div>}
                  </td>
                  <td><span className="tag">{catIcon(t.category)} {catLabel(t.category)}</span></td>
                  <td><span className={`tag pay-${t.payment}`}>{payLabel(t.payment)}</span></td>
                  <td style={{fontSize:13}}>{userName(t.user)}</td>
                  <td className={`amt-cell ${t.type === "income" ? "in" : "out"}`}>
                    {t.type === "income" ? "+" : "−"}฿{fmtMoney(t.amount, 2)}
                  </td>
                  {currentUser.role === "admin" && (
                    <td>
                      <button className="icon-btn" style={{color:"var(--muted)"}} onClick={() => onDelete(t.id)}>
                        <Icon.X />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="pager">
            <div>แสดง {view.length} จาก {filtered.length} รายการ</div>
            <div className="pages">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
              {Array.from({length: Math.min(pages, 7)}, (_, i) => {
                let p;
                if (pages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= pages - 3) p = pages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>›</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function exportCSV(rows) {
  const header = ["วันที่","เลขที่เอกสาร","ประเภท","รายการ","หมวดหมู่","การชำระ","ผู้บันทึก","หมายเหตุ","จำนวนเงิน"];
  const body = rows.map(t => [
    fmtDate(t.date), t.doc, t.type === "income" ? "รายรับ" : "รายจ่าย",
    t.item, catLabel(t.category), payLabel(t.payment), userName(t.user),
    t.note || "", (t.type === "income" ? "" : "-") + t.amount.toFixed(2)
  ]);
  const csv = [header, ...body].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `rainy-minimart-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ---- Report Screen ----
function ReportScreen({ txs }) {
  const today = new Date(2026, 4, 23);
  const [period, setPeriod] = useState("month");
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const range = useMemo(() => {
    if (period === "day") return { s: new Date(today.getFullYear(), today.getMonth(), today.getDate()), e: new Date(today.getFullYear(), today.getMonth(), today.getDate()+1) };
    if (period === "month") return { s: new Date(year, month, 1), e: new Date(year, month+1, 1) };
    return { s: new Date(year, 0, 1), e: new Date(year+1, 0, 1) };
  }, [period, month, year]);

  const filtered = txs.filter(t => t.date >= range.s && t.date < range.e).sort((a,b) => a.date - b.date);

  // Aggregate by category
  const inByCat = {}; const outByCat = {};
  filtered.forEach(t => {
    if (t.type === "income") inByCat[t.category] = (inByCat[t.category]||0) + t.amount;
    else outByCat[t.category] = (outByCat[t.category]||0) + t.amount;
  });
  const totalIn = Object.values(inByCat).reduce((s,v) => s+v, 0);
  const totalOut = Object.values(outByCat).reduce((s,v) => s+v, 0);
  const profit = totalIn - totalOut;

  const periodLabel = period === "day" ? fmtDate(today)
    : period === "month" ? `${thaiMonth(month)} ${year+543}`
    : `${year+543}`;

  return (
    <div className="page-enter">
      <Topbar crumbs="รายงาน · สรุปการเงิน" title="รายงานสรุป">
        <button className="btn" onClick={() => exportCSV(filtered)}><Icon.Excel /> Excel</button>
        <button className="btn" onClick={() => window.print()}><Icon.Download /> PDF</button>
        <button className="btn solid" onClick={() => window.print()}><Icon.Print /> พิมพ์</button>
      </Topbar>

      <div className="toolbar">
        <div className="tab-row">
          <button className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>รายวัน</button>
          <button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>รายเดือน</button>
          <button className={period === "year" ? "active" : ""} onClick={() => setPeriod("year")}>รายปี</button>
        </div>
        {period === "month" && (
          <select className="btn" value={month} onChange={e => setMonth(+e.target.value)} style={{padding:"10px 12px"}}>
            {THAI_MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
        )}
        {period !== "day" && (
          <select className="btn" value={year} onChange={e => setYear(+e.target.value)} style={{padding:"10px 12px"}}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y + 543}</option>)}
          </select>
        )}
      </div>

      <div className="report-paper">
        <div className="report-head">
          <div>
            <h2>ร้าน Rainy Minimart</h2>
            <div className="meta">รายงานสรุปรายรับ-รายจ่าย · {periodLabel}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)"}}>เลขที่</div>
            <div style={{fontFamily:"var(--font-mono)", fontSize:14}}>RP-{Date.now().toString().slice(-8)}</div>
            <div style={{fontSize:11, color:"var(--muted)", marginTop:4}}>ออก ณ {fmtDate(today)}</div>
          </div>
        </div>

        <h3 style={{fontSize:14, margin:"24px 0 8px", position:"relative"}}>รายรับตามหมวดหมู่</h3>
        {Object.keys(inByCat).length === 0 ? (
          <div style={{padding:16, color:"var(--muted)", fontSize:13}}>— ไม่มีรายการ —</div>
        ) : (
          <table>
            <thead><tr><th style={{width:60}}>#</th><th>หมวดหมู่</th><th style={{textAlign:"right", width:160}}>จำนวน (บาท)</th></tr></thead>
            <tbody>
              {Object.entries(inByCat).sort((a,b) => b[1]-a[1]).map(([k,v],i) => (
                <tr key={k}>
                  <td style={{fontFamily:"var(--font-mono)"}}>{i+1}</td>
                  <td>{catIcon(k)} {catLabel(k)}</td>
                  <td style={{textAlign:"right", fontFamily:"var(--font-mono)", color:"var(--gain)"}}>{fmtMoney(v, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{fontSize:14, margin:"24px 0 8px", position:"relative"}}>รายจ่ายตามหมวดหมู่</h3>
        {Object.keys(outByCat).length === 0 ? (
          <div style={{padding:16, color:"var(--muted)", fontSize:13}}>— ไม่มีรายการ —</div>
        ) : (
          <table>
            <thead><tr><th style={{width:60}}>#</th><th>หมวดหมู่</th><th style={{textAlign:"right", width:160}}>จำนวน (บาท)</th></tr></thead>
            <tbody>
              {Object.entries(outByCat).sort((a,b) => b[1]-a[1]).map(([k,v],i) => (
                <tr key={k}>
                  <td style={{fontFamily:"var(--font-mono)"}}>{i+1}</td>
                  <td>{catIcon(k)} {catLabel(k)}</td>
                  <td style={{textAlign:"right", fontFamily:"var(--font-mono)", color:"var(--loss)"}}>{fmtMoney(v, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="report-totals">
          <div className="box">
            <div className="row"><span>รวมรายรับ</span><span style={{fontFamily:"var(--font-mono)", color:"var(--gain)"}}>+฿{fmtMoney(totalIn, 2)}</span></div>
            <div className="row"><span>รวมรายจ่าย</span><span style={{fontFamily:"var(--font-mono)", color:"var(--loss)"}}>−฿{fmtMoney(totalOut, 2)}</span></div>
            <div className="row tot">
              <span>{profit >= 0 ? "กำไรเบื้องต้น" : "ขาดทุนเบื้องต้น"}</span>
              <span style={{fontFamily:"var(--font-mono)", color: profit >= 0 ? "var(--gain)" : "var(--loss)"}}>
                {profit >= 0 ? "+" : "−"}฿{fmtMoney(Math.abs(profit), 2)}
              </span>
            </div>
          </div>
        </div>

        <div style={{marginTop:60, display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, position:"relative"}}>
          <div style={{textAlign:"center"}}>
            <div style={{borderTop:"1px solid var(--ink)", paddingTop:8, fontSize:12, color:"var(--muted)"}}>ผู้บันทึก</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{borderTop:"1px solid var(--ink)", paddingTop:8, fontSize:12, color:"var(--muted)"}}>ผู้อนุมัติ</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Users Screen ----
function UsersScreen({ users }) {
  return (
    <div className="page-enter">
      <Topbar crumbs="ผู้ใช้งาน · ทั้งหมด" title="จัดการผู้ใช้งาน">
        <button className="btn solid"><Icon.Plus /> เพิ่มผู้ใช้</button>
      </Topbar>
      <div className="card" style={{padding:0, overflow:"hidden"}}>
        <table className="tx" style={{border:0, boxShadow:"none", minWidth: 0}}>
          <thead>
            <tr><th style={{width:60}}>#</th><th>ชื่อ-นามสกุล</th><th>ชื่อผู้ใช้</th><th>สิทธิ์</th><th>สถานะ</th><th style={{textAlign:"right"}}>ดำเนินการ</th></tr>
          </thead>
          <tbody>
            {users.map((u,i) => (
              <tr key={u.id}>
                <td style={{fontFamily:"var(--font-mono)"}}>{i+1}</td>
                <td>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <div className="avatar">{u.initials}</div>
                    <div>{u.name}</div>
                  </div>
                </td>
                <td><span className="doc-no">@{u.username}</span></td>
                <td><span className={`tag ${u.role === "admin" ? "in" : ""}`}>{u.role === "admin" ? "Admin" : "Staff"}</span></td>
                <td><span style={{color:"var(--gain)", fontSize:13}}>● ใช้งานอยู่</span></td>
                <td style={{textAlign:"right"}}>
                  <button className="btn ghost">แก้ไข</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsScreen() {
  return (
    <div className="page-enter">
      <Topbar crumbs="ตั้งค่า · ระบบ" title="ตั้งค่าระบบ" />
      <div className="card">
        <h3 style={{margin:"0 0 20px"}}>ข้อมูลร้าน</h3>
        <div className="form-grid">
          <div className="form-field"><label>ชื่อร้าน</label><input defaultValue="Rainy Minimart" /></div>
          <div className="form-field"><label>เลขประจำตัวผู้เสียภาษี</label><input defaultValue="0-1234-56789-01-2" /></div>
          <div className="form-field full"><label>ที่อยู่</label><input defaultValue="123/45 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400" /></div>
          <div className="form-field"><label>เบอร์โทร</label><input defaultValue="02-123-4567" /></div>
          <div className="form-field"><label>อีเมล</label><input defaultValue="contact@rainymart.co.th" /></div>
        </div>
        <div className="form-actions">
          <button className="btn">ยกเลิก</button>
          <button className="btn solid">บันทึก</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, Dashboard, EntryScreen, ListScreen, ReportScreen, UsersScreen, SettingsScreen });

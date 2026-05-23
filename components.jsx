// ============ Shared components ============
const { useState, useEffect, useRef, useMemo } = React;

// --- Rain canvas background for login ---
function RainCanvas({ density = 120 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const drops = [];
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < density; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: 8 + Math.random() * 18,
        v: 4 + Math.random() * 8,
        a: 0.15 + Math.random() * 0.45,
      });
    }
    const tick = () => {
      ctx.clearRect(0,0,canvas.width, canvas.height);
      ctx.lineWidth = 1.2 * devicePixelRatio;
      for (const d of drops) {
        ctx.strokeStyle = `rgba(180,220,255,${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
        d.y += d.v * devicePixelRatio;
        d.x -= 0.6 * devicePixelRatio;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        if (d.x < 0) d.x = canvas.width;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [density]);
  return <canvas ref={ref} className="rain-bg" />;
}

// --- Sidebar ---
function Sidebar({ current, onNav, user, onLogout, role }) {
  const items = [
    { id: "dashboard", icon: Icon.Dashboard, label: "แดชบอร์ด" },
    { id: "income",    icon: Icon.ArrowDown, label: "บันทึกรายรับ" },
    { id: "expense",   icon: Icon.ArrowUp,   label: "บันทึกรายจ่าย" },
    { id: "list",      icon: Icon.List,      label: "รายการทั้งหมด" },
    { id: "report",    icon: Icon.Report,    label: "รายงาน" },
  ];
  const adminItems = [
    { id: "users",    icon: Icon.Users,    label: "ผู้ใช้งาน" },
    { id: "settings", icon: Icon.Settings, label: "ตั้งค่า" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon.Logo />
        </div>
        <div>
          <div className="brand-name">Rainy</div>
          <div className="brand-sub">Minimart · POS</div>
        </div>
      </div>

      <div className="nav-section">เมนูหลัก</div>
      {items.map(it => (
        <div key={it.id} className={`nav-item ${current === it.id ? "active" : ""}`} onClick={() => onNav(it.id)}>
          <it.icon />
          <span>{it.label}</span>
        </div>
      ))}

      {role === "admin" && (<>
        <div className="nav-section">จัดการระบบ</div>
        {adminItems.map(it => (
          <div key={it.id} className={`nav-item ${current === it.id ? "active" : ""}`} onClick={() => onNav(it.id)}>
            <it.icon />
            <span>{it.label}</span>
          </div>
        ))}
      </>)}

      <div className="sidebar-foot">
        <div className="avatar">{user.initials}</div>
        <div className="user-meta">
          <div className="name" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{user.name}</div>
          <div className="role">{user.role}</div>
        </div>
        <button className="icon-btn" title="ออกจากระบบ" onClick={onLogout}>
          <Icon.Logout />
        </button>
      </div>
    </aside>
  );
}

// --- Topbar ---
function Topbar({ crumbs, title, children }) {
  return (
    <div className="topbar">
      <div>
        <div className="crumbs">{crumbs}</div>
        <h1>{title}</h1>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

// --- KPI card ---
function KPI({ title, value, delta, deltaType = "up", icon: I, dark, prefix = "฿" }) {
  return (
    <div className={`card ${dark ? "dark" : ""}`}>
      <div className="card-head">
        <div className="card-title">{title}</div>
      </div>
      <div className="card-value">{prefix}{value}</div>
      {delta != null && (
        <div className={`card-delta ${deltaType}`}>
          {deltaType === "up" ? "▲" : "▼"} {delta}
        </div>
      )}
      {I && <div className="kpi-icon"><I width="100%" height="100%" /></div>}
    </div>
  );
}

// --- Bars chart ---
function BarsChart({ data, maxLabels = 14 }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  // Sample/skip labels if too many
  const step = Math.max(1, Math.ceil(data.length / maxLabels));
  return (
    <div className="bars" style={{minHeight: 260}}>
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bars-inner">
            <div
              className="bar income"
              style={{height: `${(d.income / max) * 100}%`}}
              data-tip={`รายรับ ฿${fmtMoney(d.income, 0)}`}
            />
            <div
              className="bar expense"
              style={{height: `${(d.expense / max) * 100}%`}}
              data-tip={`รายจ่าย ฿${fmtMoney(d.expense, 0)}`}
            />
          </div>
          <div className="bar-label">{i % step === 0 ? d.label : ""}</div>
        </div>
      ))}
    </div>
  );
}

// --- Donut chart ---
function Donut({ data, size = 160 }) {
  const total = data.reduce((s,d) => s + d.value, 0) || 1;
  const r = size / 2 - 16;
  const cx = size / 2, cy = size / 2;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eee" strokeWidth="20" />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * circ;
        const offset = -acc * circ;
        const node = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{transition: "stroke-dasharray 0.6s ease-out"}}
          />
        );
        acc += frac;
        return node;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#0B1B2B" opacity="0.6" fontFamily="IBM Plex Mono">รวม</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="20" fill="#0B1B2B" fontWeight="600" fontFamily="IBM Plex Mono">฿{fmtMoney(total/1000, 1)}k</text>
    </svg>
  );
}

// --- Toast manager ---
function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind || ""}`}>
          {t.kind === "success" && <Icon.Check />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// --- Confirm modal (simple) ---
function Confirm({ open, title, body, onCancel, onConfirm, confirmLabel = "ยืนยัน" }) {
  if (!open) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(11,27,43,0.55)",
      display:"grid", placeItems:"center", zIndex: 90, backdropFilter:"blur(4px)"
    }} onClick={onCancel}>
      <div className="card" style={{width: 380, padding: 28}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin: "0 0 8px"}}>{title}</h3>
        <p style={{margin: "0 0 20px", color: "var(--muted)", fontSize: 14}}>{body}</p>
        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button className="btn" onClick={onCancel}>ยกเลิก</button>
          <button className="btn solid" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RainCanvas, Sidebar, Topbar, KPI, BarsChart, Donut, ToastStack, Confirm });

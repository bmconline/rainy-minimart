// ============ App Shell ============
const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

function App() {
  const [user, setUser] = uS(null);
  const [page, setPage] = uS("dashboard");
  const [period, setPeriod] = uS("month");
  const [entryKind, setEntryKind] = uS("income");
  const [txs, setTxs] = uS(() => generateTransactions());
  const [toasts, setToasts] = uS([]);
  const [confirm, setConfirm] = uS({ open: false });

  // Auto-login on mount
  uE(() => {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '1234' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setUser(data);
        }
      })
      .catch(err => console.error('Auto-login failed:', err));
  }, []);

  const pushToast = (msg, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };

  const handleLogin = (u) => {
    setUser(u);
    pushToast(`ยินดีต้อนรับ คุณ${u.name}`, "success");
  };
  const handleLogout = () => {
    setConfirm({
      open: true,
      title: "ออกจากระบบ",
      body: "คุณต้องการออกจากระบบหรือไม่?",
      confirmLabel: "ออกจากระบบ",
      onConfirm: () => {
        setUser(null);
        setPage("dashboard");
        setConfirm({ open: false });
      },
    });
  };
  const handleSave = (tx) => {
    setTxs(prev => [tx, ...prev].sort((a,b) => b.date - a.date));
    pushToast(`บันทึก${tx.type === "income" ? "รายรับ" : "รายจ่าย"} ${tx.doc} สำเร็จ`, "success");
  };
  const handleDelete = (id) => {
    setConfirm({
      open: true,
      title: "ลบรายการ",
      body: "ต้องการลบรายการนี้ใช่หรือไม่? การลบไม่สามารถกู้คืนได้",
      confirmLabel: "ลบ",
      onConfirm: () => {
        setTxs(prev => prev.filter(t => t.id !== id));
        pushToast("ลบรายการสำเร็จ", "success");
        setConfirm({ open: false });
      },
    });
  };

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  let content;
  if (page === "dashboard") content = <Dashboard txs={txs} onNav={setPage} period={period} setPeriod={setPeriod} />;
  else if (page === "income") content = <EntryScreen kind="income" setKind={(k) => { setEntryKind(k); setPage(k); }} currentUser={user} onSave={handleSave} txs={txs} />;
  else if (page === "expense") content = <EntryScreen kind="expense" setKind={(k) => { setEntryKind(k); setPage(k); }} currentUser={user} onSave={handleSave} txs={txs} />;
  else if (page === "list") content = <ListScreen txs={txs} onDelete={handleDelete} currentUser={user} />;
  else if (page === "report") content = <ReportScreen txs={txs} />;
  else if (page === "users") content = <UsersScreen users={USERS} />;
  else if (page === "settings") content = <SettingsScreen />;

  return (
    <>
      <div className="app">
        <Sidebar current={page} onNav={setPage} user={user} onLogout={handleLogout} role={user.role} />
        <main className="main" key={page}>
          {content}
        </main>
      </div>
      <ToastStack toasts={toasts} />
      <Confirm {...confirm} onCancel={() => setConfirm({ open: false })} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

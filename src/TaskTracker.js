import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ------- CONFIG -------
const CATEGORIES = [
  { key: "feeding", label: "Feeding", points: 8 },
  { key: "nap",     label: "Nap",     points: 6 },
  { key: "tummy",   label: "Tummy Time", points: 8 },
  { key: "bath",    label: "Bath",    points: 6 },
  { key: "play",    label: "Play",    points: 4 },
  { key: "class",   label: "Class",   points: 12 },
  { key: "doctor",  label: "Doctor",  points: 20 },
  { key: "other",   label: "Other",   points: 3 },
];

const REWARDS = [
  { key: "massage", label: "Massage", cost: 400 },
  { key: "date",    label: "Date Night", cost: 300 },
  { key: "coffee",  label: "Starbucks $10", cost: 150 },
  { key: "clothes", label: "Clothing Gift Card $25", cost: 500 },
];

// ------- HELPERS -------
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => new Date().toISOString().slice(0,10);
const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ------- CONFETTI -------
const COLORS = ["#f87171","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6","#f59e0b"];
const makeConfetti = (count=18) =>
  new Array(count).fill(0).map((_,i)=>({
    id: `${Date.now()}-${i}`,
    x: (Math.random()*2-1)*140,    // spread
    y: -Math.random()*40,          // slight up offset
    r: 6 + Math.random()*8,        // size
    rot: (Math.random()*2-1)*180,
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
    dur: 0.9 + Math.random()*0.5,
    drift: (Math.random()*2-1)*80
  }));

// ------- APP -------
export default function TaskTracker() {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState(() => load("tasks", []));
  const [points, setPoints] = useState(() => load("points", 0));
  const [redemptions, setRedemptions] = useState(() => load("redemptions", []));
  const [input, setInput] = useState("");
  const [cat, setCat] = useState("feeding");

  const [toast, setToast] = useState(null);
  const [celebrate, setCelebrate] = useState(null); // { id, points, when }
  const [confetti, setConfetti] = useState([]);     // array of particles

  useEffect(() => save("tasks", tasks), [tasks]);
  useEffect(() => save("points", points), [points]);
  useEffect(() => save("redemptions", redemptions), [redemptions]);

  const addTask = (title, category) => {
    const c = category || cat;
    if (!title?.trim()) return;
    setTasks(prev => [...prev, { id: uid(), title: title.trim(), category: c, done: false, createdAt: new Date().toISOString(), completedAt: null }]);
    setInput("");
  };

  const quickAdd = (key) => {
    const cfg = CATEGORIES.find(c => c.key === key);
    addTask(cfg?.label || "Task", key);
  };

  const completeTask = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const cfg = CATEGORIES.find(c => c.key === t.category) || { points: 1, label: "Task" };
      const earned = cfg.points ?? 1;
      const updated = { ...t, done: true, completedAt: new Date().toISOString() };

      setPoints(p => p + earned);

      // floating +points over the task
      setCelebrate({ id: t.id, points: earned, when: Date.now() });
      setTimeout(() => setCelebrate(null), 1200);

      // global confetti burst
      setConfetti(makeConfetti());
      setTimeout(() => setConfetti([]), 1200);

      // small toast
      setToast({ msg: `+${earned} pts for ${cfg.label}!`, when: Date.now() });
      setTimeout(() => setToast(null), 1500);

      return updated;
    }));
  };

  const redeem = (r) => {
    if (points < r.cost) return;
    setPoints(p => p - r.cost);
    setRedemptions(prev => [...prev, { id: uid(), reward: r.key, label: r.label, cost: r.cost, date: new Date().toISOString() }]);
    // confetti for redeem, too
    setConfetti(makeConfetti(24));
    setTimeout(() => setConfetti([]), 1400);

    setToast({ msg: `Redeemed: ${r.label} (−${r.cost} pts)`, when: Date.now() });
    setTimeout(() => setToast(null), 1800);
  };

  const resetToday = () => {
    const t = todayKey();
    setTasks(prev => prev.filter(x => (x.completedAt ?? x.createdAt).slice(0,10) !== t));
  };

  const clearAll = () => {
    if (!window.confirm("Clear ALL tasks & points?")) return;
    setTasks([]); setPoints(0); setRedemptions([]);
  };

  const todayTasks = useMemo(() => {
    const t = todayKey();
    return tasks.filter(x => (x.createdAt || "").slice(0,10) === t);
  }, [tasks]);

  return (
    <div className="app-bg">
      <header className="app-header">
        <h1 className="app-title">Serena's Schedule</h1>
        <p className="app-sub">Points & Rewards • Total Points: <strong>{points}</strong></p>
        <div className="tabs">
          {["tasks","rewards","history"].map(t => (
            <button key={t} className={`tab ${tab===t ? "tab--active" : ""}`} onClick={()=>setTab(t)}>
              {t === "tasks" ? "Tasks" : t === "rewards" ? "Rewards" : "History"}
            </button>
          ))}
        </div>
      </header>

      <main className="space">
        {tab === "tasks" && (
          <>
            <section className="card" style={{marginBottom:12}}>
              <div className="pills">
                {CATEGORIES.map(c => (
                  <button key={c.key} className="pill" onClick={()=>quickAdd(c.key)}>
                    + {c.label} <small>({c.points} pts)</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="card" style={{marginBottom:12}}>
              <div className="add-row">
                <select className="select" value={cat} onChange={e=>setCat(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input className="input" placeholder="Add a custom task (e.g., 6oz bottle)" value={input} onChange={e=>setInput(e.target.value)} />
                <button className="btn" onClick={()=>addTask(input, cat)}>Add</button>
              </div>
            </section>

            <section className="card">
              <h3 style={{margin:"0 0 8px 0"}}>Today</h3>
              {todayTasks.length === 0 && <div style={{opacity:.85}}>No tasks yet. Add one above!</div>}
              <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:10}}>
                {tasks.map(t => {
                  const isCelebrating = celebrate && celebrate.id === t.id;
                  return (
                    <li key={t.id} className={`task ${t.done ? "task--done" : ""}`} style={{ position: "relative", overflow: "hidden" }}>
                      {/* Floating +points popup */}
                      <AnimatePresence>
                        {isCelebrating && (
                          <motion.div
                            key={celebrate.when}
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: -24, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 0.95 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            style={{
                              position: "absolute",
                              right: 12,
                              top: 8,
                              fontWeight: 800
                            }}
                          >
                            +{celebrate.points} pts
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Animated check when done */}
                        <div style={{ width: 32, height: 32, position: "relative" }}>
                          <AnimatePresence>
                            {t.done && (
                              <motion.div
                                initial={{ scale: 0, rotate: -20, opacity: 0 }}
                                animate={{ scale: [0, 1.2, 1], rotate: 0, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ duration: 0.45, times: [0, 0.6, 1] }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 999,
                                  background: "linear-gradient(135deg,#10b981,#34d399)",
                                  display: "grid",
                                  placeItems: "center",
                                  boxShadow: "0 8px 18px rgba(16,185,129,.45)"
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div>
                          <div style={{fontWeight:700}}>{t.title}</div>
                          <div className="task-meta">
                            {(CATEGORIES.find(c => c.key === t.category)?.label) || t.category} · {fmtTime(t.createdAt)}
                            {t.done && <> · Done {fmtTime(t.completedAt)}</>}
                          </div>
                        </div>
                      </div>

                      {!t.done ? (
                        <button className="btn" onClick={()=>completeTask(t.id)}>Mark Done</button>
                      ) : (
                        <span style={{color:"#86efac", fontWeight:700}}>Completed</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div style={{display:"flex", gap:8, marginTop:12}}>
                <button className="tab" onClick={resetToday}>Clear Today’s Tasks</button>
                <button className="tab" onClick={clearAll}>Clear ALL</button>
              </div>
            </section>
          </>
        )}

        {tab === "rewards" && (
          <section className="card" style={{display:"grid", gap:10}}>
            {REWARDS.map(r => (
              <div key={r.key} className="task">
                <div>
                  <div style={{fontWeight:700}}>{r.label}</div>
                  <div className="task-meta">{r.cost} pts</div>
                </div>
                <button className="btn" disabled={points < r.cost} onClick={()=>redeem(r)}
                  style={{opacity: points < r.cost ? .5 : 1}}>
                  Redeem
                </button>
              </div>
            ))}
            <div className="task-meta">Tip: Change points or costs in code anytime.</div>
          </section>
        )}

        {tab === "history" && (
          <section className="card" style={{display:"grid", gap:12}}>
            <div>
              <h3 style={{margin:"0 0 8px 0"}}>Redemptions</h3>
              {redemptions.length === 0 ? (
                <div className="task-meta">No redemptions yet.</div>
              ) : (
                <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
                  {redemptions.slice().reverse().map(r => (
                    <li key={r.id} className="reward">
                      <span>{r.label}</span>
                      <span className="task-meta">-{r.cost} pts · {new Date(r.date).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 style={{margin:"0 0 8px 0"}}>Completed Tasks</h3>
              {tasks.filter(t=>t.done).length === 0 ? (
                <div className="task-meta">No completed tasks yet.</div>
              ) : (
                <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
                  {tasks.filter(t=>t.done).slice().reverse().map(t => {
                    const cfg = CATEGORIES.find(c => c.key === t.category);
                    return (
                      <li key={t.id} className="reward">
                        <span>{t.title}</span>
                        <span className="task-meta">+{cfg?.points ?? 0} pts · {new Date(t.completedAt).toLocaleString()}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Global confetti overlay */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              pointerEvents: "none",
              position: "fixed",
              left: "50%",
              top: "20%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              zIndex: 60
            }}
          >
            {confetti.map(p => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: p.x + p.drift, y: 160 + Math.random()*60, rotate: p.rot }}
                transition={{ duration: p.dur, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  display: "inline-block",
                  width: p.r,
                  height: p.r,
                  borderRadius: 2,
                  background: p.color,
                  boxShadow: "0 4px 12px rgba(0,0,0,.25)"
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.when}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="toast"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="spacer" />
    </div>
  );
}
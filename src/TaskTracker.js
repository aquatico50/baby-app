import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ------ CONFIG ------
const CATEGORIES = [
  { key: "feeding", label: "Feeding", color: "bg-pink-100 text-pink-800", points: 8 },
  { key: "nap",     label: "Nap",     color: "bg-indigo-100 text-indigo-800", points: 6 },
  { key: "tummy",   label: "Tummy Time", color: "bg-emerald-100 text-emerald-800", points: 8 },
  { key: "bath",    label: "Bath",    color: "bg-sky-100 text-sky-800", points: 6 },
  { key: "play",    label: "Play",    color: "bg-amber-100 text-amber-900", points: 4 },
  { key: "class",   label: "Class",   color: "bg-purple-100 text-purple-800", points: 12 },
  { key: "doctor",  label: "Doctor",  color: "bg-red-100 text-red-800", points: 20 },
  { key: "other",   label: "Other",   color: "bg-stone-100 text-stone-800", points: 3 },
];

const REWARDS = [
  { key: "massage", label: "Massage", cost: 400 },
  { key: "date",    label: "Date Night", cost: 300 },
  { key: "coffee",  label: "Starbucks $10", cost: 150 },
  { key: "clothes", label: "Clothing Gift Card $25", cost: 500 },
];

// ------ HELPERS ------
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => new Date().toISOString().slice(0,10);
const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ------ APP ------
export default function TaskTracker() {
  const [tab, setTab] = useState("tasks"); // "tasks" | "rewards" | "history"
  const [tasks, setTasks] = useState(() => load("tasks", []));
  const [points, setPoints] = useState(() => load("points", 0));
  const [redemptions, setRedemptions] = useState(() => load("redemptions", []));
  const [input, setInput] = useState("");
  const [cat, setCat] = useState("feeding");
  const [toast, setToast] = useState(null);

  useEffect(() => save("tasks", tasks), [tasks]);
  useEffect(() => save("points", points), [points]);
  useEffect(() => save("redemptions", redemptions), [redemptions]);

  const addTask = (title, category) => {
    const c = category || cat;
    if (!title?.trim()) return;
    setTasks(prev => [...prev, { id: uid(), title: title.trim(), category: c, done: false, createdAt: new Date().toISOString(), completedAt: null }]);
    setInput("");
  };

  const completeTask = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const catCfg = CATEGORIES.find(c => c.key === t.category) || CATEGORIES.find(c => c.key === "other");
      const earned = catCfg?.points ?? 1;
      const updated = { ...t, done: true, completedAt: new Date().toISOString() };
      // award points
      setPoints(p => p + earned);
      // toast
      setToast({ msg: `+${earned} pts for ${catCfg.label}!`, when: Date.now() });
      setTimeout(() => setToast(null), 2000);
      return updated;
    }));
  };

  const quickAdd = (key) => {
    const cfg = CATEGORIES.find(c => c.key === key);
    addTask(cfg?.label || "Task", key);
  };

  const canRedeem = (cost) => points >= cost;

  const redeem = (reward) => {
    if (!canRedeem(reward.cost)) return;
    setPoints(p => p - reward.cost);
    setRedemptions(prev => [
      ...prev,
      { id: uid(), reward: reward.key, label: reward.label, cost: reward.cost, date: new Date().toISOString() }
    ]);
    setToast({ msg: `Redeemed: ${reward.label} (-${reward.cost} pts)`, when: Date.now() });
    setTimeout(() => setToast(null), 2500);
  };

  const resetToday = () => {
    const today = todayKey();
    setTasks(prev => prev.filter(t => (t.completedAt ?? t.createdAt).slice(0,10) !== today));
  };

  const clearAll = () => {
    if (!confirm("Clear ALL tasks & points?")) return;
    setTasks([]);
    setPoints(0);
    setRedemptions([]);
  };

  const todayTasks = useMemo(() => {
    const t = todayKey();
    return tasks.filter(x => (x.createdAt || "").slice(0,10) === t);
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-100 text-stone-900">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">Serena's Schedule</div>
          <h1 className="text-2xl font-bold">Points & Rewards</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">Total Points</div>
          <div className="text-2xl font-extrabold text-purple-700">{points}</div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mx-4 mt-4 grid grid-cols-3 gap-2">
        {["tasks","rewards","history"].map(t => (
          <button key={t}
            className={`py-2 rounded-full text-sm font-medium ${tab===t ? "bg-purple-600 text-white" : "bg-white text-stone-700 border"}`}
            onClick={() => setTab(t)}
          >
            {t === "tasks" ? "Tasks" : t === "rewards" ? "Rewards" : "History"}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-4 space-y-5">
        {/* TASKS TAB */}
        {tab === "tasks" && (
          <>
            {/* Quick Add */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`p-2 rounded-lg shadow ${c.color}`}
                  onClick={() => quickAdd(c.key)}
                >
                  + {c.label}
                  <span className="ml-2 text-xs opacity-70">({c.points} pts)</span>
                </button>
              ))}
            </div>

            {/* Manual add */}
            <div className="bg-white rounded-xl shadow p-3 flex gap-2 items-center">
              <select
                className="border rounded px-2 py-2"
                value={cat}
                onChange={(e)=>setCat(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Add a custom task (e.g., '6oz bottle')"
                value={input}
                onChange={(e)=>setInput(e.target.value)}
              />
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg" onClick={()=>addTask(input, cat)}>Add</button>
            </div>

            {/* Today list */}
            <section>
              <h2 className="text-sm font-semibold text-stone-600 mb-2">Today</h2>
              <ul className="space-y-2">
                {todayTasks.length === 0 && (
                  <li className="text-stone-500 text-sm">No tasks yet. Add one above!</li>
                )}
                {tasks.map((t) => (
                  <li key={t.id} className={`p-3 bg-white rounded-xl shadow flex justify-between items-center ${t.done ? "opacity-60" : ""}`}>
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-stone-500">
                        {CATEGORIES.find(c => c.key === t.category)?.label || t.category} · {fmtTime(t.createdAt)}
                        {t.done && <> · Done {fmtTime(t.completedAt)}</>}
                      </div>
                    </div>
                    {!t.done ? (
                      <button className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg" onClick={()=>completeTask(t.id)}>
                        Mark Done
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Completed</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 mt-3">
                <button className="text-sm px-3 py-2 rounded border" onClick={resetToday}>Clear Today’s Tasks</button>
                <button className="text-sm px-3 py-2 rounded border" onClick={clearAll}>Clear ALL</button>
              </div>
            </section>
          </>
        )}

        {/* REWARDS TAB */}
        {tab === "rewards" && (
          <section className="space-y-3">
            <p className="text-sm text-stone-600">Turn points into real-life treats. Tap to redeem when you have enough points.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REWARDS.map(r => (
                <div key={r.key} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.label}</div>
                    <div className="text-xs text-stone-500">{r.cost} pts</div>
                  </div>
                  <button
                    disabled={!canRedeem(r.cost)}
                    onClick={()=>redeem(r)}
                    className={`px-4 py-2 rounded-lg text-white ${canRedeem(r.cost) ? "bg-purple-600" : "bg-stone-300"}`}
                  >
                    Redeem
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-500">Tip: You can change points per task or reward costs in the code later.</p>
          </section>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <section className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">Redemptions</h3>
              {redemptions.length === 0 ? (
                <div className="text-sm text-stone-500">No redemptions yet.</div>
              ) : (
                <ul className="space-y-2">
                  {redemptions.slice().reverse().map(r => (
                    <li key={r.id} className="flex justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="text-stone-500">-{r.cost} pts · {new Date(r.date).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">Completed Tasks</h3>
              {tasks.filter(t=>t.done).length === 0 ? (
                <div className="text-sm text-stone-500">No completed tasks yet.</div>
              ) : (
                <ul className="space-y-2">
                  {tasks.filter(t=>t.done).slice().reverse().map(t => {
                    const catCfg = CATEGORIES.find(c => c.key === t.category);
                    return (
                      <li key={t.id} className="flex justify-between text-sm">
                        <span>{t.title}</span>
                        <span className="text-stone-500">+{catCfg?.points ?? 0} pts · {new Date(t.completedAt).toLocaleString()}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.when}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full shadow-lg"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="pb-16 pt-4 text-center text-xs text-stone-500">
        Built with love • Auto-saves on this device
      </footer>
    </div>
  );
}
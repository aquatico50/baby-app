import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* -------- CONFIG -------- */
const CATEGORIES = [
  { key: "feeding", label: "Feeding", points: 8 },
  { key: "nap", label: "Nap", points: 6 },
  { key: "tummy", label: "Tummy Time", points: 8 },
  { key: "bath", label: "Bath", points: 6 },
  { key: "play", label: "Play", points: 4 },
  { key: "class", label: "Class", points: 12 },
  { key: "doctor", label: "Doctor", points: 20 },
  { key: "other", label: "Other", points: 3 },
];

/* New rewards list (with icons + tiers) */
const REWARDS = [
  // Small (10–50)
  { key: "foot",     label: "Foot massage",                         cost: 10,  tier: "Small",   icon: "🦶" },
  { key: "back",     label: "Back rub",                              cost: 15,  tier: "Small",   icon: "💆‍♀️" },
  { key: "diapers3", label: "I change the next 3 diapers",           cost: 20,  tier: "Small",   icon: "🍼" },
  { key: "shower",   label: "Uninterrupted shower time",             cost: 25,  tier: "Small",   icon: "🫧" },
  { key: "bedtime",  label: "I do the bedtime routine",              cost: 30,  tier: "Small",   icon: "🌙" },
  { key: "snack",    label: "Favorite snack/dessert run",            cost: 50,  tier: "Small",   icon: "🍰" },

  // Medium (75–150)
  { key: "morning",  label: "I handle all baby duties (morning)",    cost: 75,  tier: "Medium",  icon: "☀️" },
  { key: "spa",      label: "Full at-home spa setup",                cost: 100, tier: "Medium",  icon: "🕯️" },
  { key: "breakfast",label: "Breakfast in bed",                      cost: 100, tier: "Medium",  icon: "🥞" },
  { key: "housework",label: "I handle ALL housework for a day",      cost: 150, tier: "Medium",  icon: "🧹" },

  // Large (200–400)
  { key: "date",     label: "Planned at-home date night",            cost: 200, tier: "Large",   icon: "💖" },
  { key: "movie",    label: "Her choice: movie & snacks night",      cost: 200, tier: "Large",   icon: "🎬" },
  { key: "daytrip",  label: "Day trip to a favorite place",          cost: 300, tier: "Large",   icon: "🧺" },
  { key: "nochores", label: "No chores, no baby duty day",           cost: 400, tier: "Large",   icon: "🏖️" },

  // Special (500+)
  { key: "weekend",  label: "Weekend getaway",                       cost: 500, tier: "Special", icon: "✈️" },
  { key: "dreamday", label: "Her dream day (you plan everything)",   cost: 600, tier: "Special", icon: "🌟" },
];

/* -------- HELPERS -------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
};
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function composeISO(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}
const dateKeyFromISO = (iso) => (iso || "").slice(0, 10);

/* tiny confetti */
const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f59e0b"];
const makeConfetti = (n = 18) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `${Date.now()}-${i}`,
    x: (Math.random() * 2 - 1) * 140,
    y: -Math.random() * 40,
    r: 6 + Math.random() * 8,
    rot: (Math.random() * 2 - 1) * 180,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    dur: 0.9 + Math.random() * 0.5,
    drift: (Math.random() * 2 - 1) * 80,
  }));

/* Map tier → CSS class (bronze/silver/gold/platinum) */
const tierClass = (tier) => {
  switch ((tier || "").toLowerCase()) {
    case "small":   return "coupon coupon--small";
    case "medium":  return "coupon coupon--medium";
    case "large":   return "coupon coupon--large";
    case "special": return "coupon coupon--special";
    default:        return "coupon";
  }
};

export default function TaskTracker() {
  /* nav + menu */
  const [tab, setTab] = useState(() => load("tab", "schedule"));
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => save("tab", tab), [tab]);

  /* points + rewards */
  const [points, setPoints] = useState(() => load("points", 0));
  const [redemptions, setRedemptions] = useState(() => load("redemptions", []));
  const [coupons, setCoupons] = useState(() => load("coupons", [])); // earned, un-used
  const [showCoupons, setShowCoupons] = useState(false);
  useEffect(() => save("points", points), [points]);
  useEffect(() => save("redemptions", redemptions), [redemptions]);
  useEffect(() => save("coupons", coupons), [coupons]);

  /* schedule events */
  const [events, setEvents] = useState(() => load("events", []));
  useEffect(() => save("events", events), [events]);
  const [dayDate, setDayDate] = useState(() => load("dayDate", todayISO()));
  useEffect(() => save("dayDate", dayDate), [dayDate]);

  const hours = [...Array(24)].map((_, h) => h);
  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => dateKeyFromISO(e.whenISO) === dayDate)
        .sort((a, b) => a.whenISO.localeCompare(b.whenISO)),
    [events, dayDate]
  );

  /* month / year helpers */
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() };
  });
  const monthGrid = (y, m) => {
    const first = new Date(y, m, 1);
    const start = first.getDay();
    return Array.from({ length: 42 }).map((_, i) => new Date(y, m, 1 - start + i));
  };
  const isoFromDate = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const monthGridDates = useMemo(() => monthGrid(monthCursor.y, monthCursor.m), [monthCursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const k = dateKeyFromISO(e.whenISO);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    });
    return map;
  }, [events]);
  const [yearCursor, setYearCursor] = useState(() => new Date().getFullYear());

  /* checklists */
  const [lists, setLists] = useState(() =>
    load("checklists", [
      { id: uid(), name: "Hospital Bag", items: [] },
      { id: uid(), name: "Diaper Bag", items: [] },
    ])
  );
  const [activeListId, setActiveListId] = useState(() => load("activeListId", null));
  useEffect(() => { if (!activeListId && lists[0]) setActiveListId(lists[0].id); }, [activeListId, lists]);
  useEffect(() => save("checklists", lists), [lists]);
  useEffect(() => save("activeListId", activeListId), [activeListId]);
  const activeList = lists.find((l) => l.id === activeListId) || null;
  const unchecked = activeList ? activeList.items.filter((i) => !i.done) : [];
  const checked = activeList ? activeList.items.filter((i) => i.done) : [];

  /* UI misc */
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [showActionsFor, setShowActionsFor] = useState(null);
  const pressTimer = useRef(null);

  // collapsed "Add Item" panel state
  const [showAdd, setShowAdd] = useState(false);
  const [addCat, setAddCat] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addTitle, setAddTitle] = useState("");

  const pressStart = (id) => {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setShowActionsFor(id), 450);
  };
  const pressEnd = () => clearTimeout(pressTimer.current);

  /* CRUD for events */
  function addEvent({ title, timeHHMM, category = "other" }) {
    if (!title?.trim() || !timeHHMM) return;
    const whenISO = composeISO(dayDate, timeHHMM);
    setEvents((p) => [...p, { id: uid(), title: title.trim(), whenISO, category, done: false }]);
  }
  function toggleEventDone(id) {
    setEvents((p) => p.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));
    const ev = events.find((e) => e.id === id);
    if (ev && !ev.done) {
      const cfg = CATEGORIES.find((c) => c.key === (ev.category || "other")) || { points: 1 };
      const earned = cfg.points ?? 1;
      setPoints((pt) => pt + earned);
      setToast({ msg: `+${earned} pts`, when: Date.now() });
      setTimeout(() => setToast(null), 1200);
      setConfetti(makeConfetti());
      setTimeout(() => setConfetti([]), 1100);
    }
  }
  const deleteEvent = (id) => setEvents((p) => p.filter((e) => e.id !== id));
  const updateEventTitle = (id, t) =>
    setEvents((p) => p.map((e) => (e.id === id ? { ...e, title: t } : e)));
  const updateEventTime = (id, newHHMM) =>
    setEvents((p) =>
      p.map((e) => {
        if (e.id !== id) return e;
        const d = dateKeyFromISO(e.whenISO);
        return { ...e, whenISO: composeISO(d, newHHMM) };
      })
    );

  /* checklists CRUD */
  const [newListName, setNewListName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const addList = () => {
    const n = newListName.trim(); if (!n) return;
    const nl = { id: uid(), name: n, items: [] };
    setLists((p) => [...p, nl]); setActiveListId(nl.id); setNewListName("");
  };
  const deleteList = (id) => {
    setLists((p) => p.filter((l) => l.id !== id)); if (activeListId === id) setActiveListId(null);
  };
  const addItem = () => {
    const t = newItemText.trim(); if (!t || !activeList) return;
    const it = { id: uid(), text: t, done: false };
    setLists((p) => p.map((l) => (l.id === activeList.id ? { ...l, items: [...l.items, it] } : l)));
    setNewItemText("");
  };
  const toggleItem = (id) =>
    activeList &&
    setLists((p) =>
      p.map((l) =>
        l.id !== activeList.id
          ? l
          : { ...l, items: l.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)) }
      )
    );
  const deleteItem = (id) =>
    activeList &&
    setLists((p) => p.map((l) => (l.id !== activeList.id ? l : { ...l, items: l.items.filter((it) => it.id !== id) })));

  /* rewards */
  function redeem(r) {
    if (points < r.cost) return;
    setPoints((p) => p - r.cost);

    const coupon = {
      id: uid(),
      reward: r.key,
      label: r.label,
      cost: r.cost,
      icon: r.icon || "🎟️",
      tier: r.tier || "Small",
      date: new Date().toISOString(),
    };

    setCoupons((prev) => [...prev, coupon]);          // add to Coupon Box
    setRedemptions((prev) => [...prev, { ...coupon }]); // keep history

    setConfetti(makeConfetti(24));
    setTimeout(() => setConfetti([]), 1400);
    setToast({ msg: `Coupon added: ${r.label} (−${r.cost} pts)`, when: Date.now() });
    setTimeout(() => setToast(null), 1700);
  }

  function useCoupon(id) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    setToast({ msg: "Coupon used 🎉", when: Date.now() });
    setTimeout(() => setToast(null), 1200);
  }

  const TABS = [
    { key: "schedule", label: "Schedule" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Yearly" },
    { key: "rewards", label: "Rewards" },
    { key: "checklists", label: "Checklists" },
  ];

  return (
    <div className="app-bg">
      {/* HEADER with Menu + Points */}
      <header className="app-header">
        <div>
          <h1 className="app-title">Serena's Schedule</h1>
          <p className="app-sub">Points: <strong>{points}</strong></p>
        </div>
        <div style={{ position: "relative" }}>
          <button className="menu-btn" onClick={() => setMenuOpen((v) => !v)}>☰ Menu</button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="menu">
                {TABS.map((t) => (
                  <button key={t.key} className={`menu-item ${tab === t.key ? "active" : ""}`} onClick={() => { setTab(t.key); setMenuOpen(false); }}>
                    {t.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* -------- SCHEDULE (DEFAULT) -------- */}
      {tab === "schedule" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          {/* Date bar with arrows */}
          <div className="card" style={{display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap"}}>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <button className="menu-item" onClick={()=>{
                const d = new Date(dayDate); d.setDate(d.getDate() - 1); setDayDate(d.toISOString().slice(0,10));
              }} aria-label="Previous day">◀</button>

              <input type="date" className="input" value={dayDate} onChange={(e)=>setDayDate(e.target.value)} style={{width:150}} />

              <button className="menu-item" onClick={()=>{
                const d = new Date(dayDate); d.setDate(d.getDate() + 1); setDayDate(d.toISOString().slice(0,10));
              }} aria-label="Next day">▶</button>
            </div>

            <button className="menu-btn" onClick={()=>setShowAdd(v=>!v)}>{showAdd ? "Close" : "Add Item"}</button>
          </div>

          {/* Collapsed Add Item panel */}
          {showAdd && (
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label className="task-meta">Items</label>
                <select className="select" value={addCat} onChange={(e) => setAddCat(e.target.value)}>
                  <option value="" disabled>Items</option>
                  {CATEGORIES.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label className="task-meta">Time</label>
                <input type="time" className="input" value={addTime} onChange={(e) => setAddTime(e.target.value)} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label className="task-meta">Title</label>
                <input className="input" placeholder="Add item (e.g., 6oz bottle, bath…)" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="menu-btn" onClick={() => { setShowAdd(false); setAddCat(""); setAddTime(""); setAddTitle(""); }}>Cancel</button>
                <button className="btn" onClick={() => {
                  const cat = addCat || "other"; const time = addTime || "08:00"; const title = addTitle || "";
                  addEvent({ title, timeHHMM: time, category: cat });
                  setShowAdd(false); setAddCat(""); setAddTime(""); setAddTitle("");
                }}>Save</button>
              </div>
            </div>
          )}

          {/* 24-hour grid */}
          <div className="day-grid">
            {hours.map((h) => {
              const hh = String(h).padStart(2, "0");
              const inHour = dayEvents.filter((e) => new Date(e.whenISO).getHours() === h);
              return (
                <div key={h} className="day-hour">
                  <div className="day-hour-label">{hh}:00</div>
                  <div className="day-hour-items">
                    {inHour.length === 0 ? (
                      <div className="task-meta" style={{ opacity: 0.7 }}>—</div>
                    ) : (
                      inHour.map((ev) => (
                        <div
                          key={ev.id}
                          className={`task ${ev.done ? "task--done" : ""}`}
                          onMouseDown={() => pressStart(ev.id)}
                          onMouseUp={pressEnd}
                          onTouchStart={() => pressStart(ev.id)}
                          onTouchEnd={pressEnd}
                          onClick={() => { if (!showActionsFor) toggleEventDone(ev.id); }}
                          style={{ position: "relative" }}
                        >
                          <div style={{ display: "grid" }}>
                            <span style={{ fontWeight: 800, textDecoration: ev.done ? "line-through" : "none" }}>
                              {ev.title || "(untitled)"}
                            </span>
                            <span className="task-meta">{fmtTime(ev.whenISO)}</span>
                          </div>

                          {/* hidden actions (long-press) */}
                          <AnimatePresence>
                            {showActionsFor === ev.id && (
                              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="action-bubble">
                                <button className="menu-item" onClick={(e) => {
                                  e.stopPropagation();
                                  const t = prompt("Time (HH:MM)", new Date(ev.whenISO).toTimeString().slice(0, 5));
                                  if (t && /^\d{2}:\d{2}$/.test(t)) updateEventTime(ev.id, t);
                                  setShowActionsFor(null);
                                }}>Edit Time</button>
                                <button className="menu-item" onClick={(e) => {
                                  e.stopPropagation();
                                  const t = prompt("Edit title", ev.title);
                                  if (t !== null) updateEventTitle(ev.id, t);
                                  setShowActionsFor(null);
                                }}>Edit</button>
                                <button className="menu-item" onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvent(ev.id);
                                  setShowActionsFor(null);
                                }}>Delete</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* -------- MONTH -------- */}
      {tab === "month" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="menu-item" onClick={() =>
              setMonthCursor((c) => ({ y: c.m - 1 < 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))
            }>◀</button>
            <div style={{ fontWeight: 900 }}>
              {new Date(monthCursor.y, monthCursor.m, 1).toLocaleString([], { month: "long", year: "numeric" })}
            </div>
            <button className="menu-item" onClick={() =>
              setMonthCursor((c) => ({ y: c.m + 1 > 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))
            }>▶</button>
            <button className="menu-item" onClick={() => {
              const d = new Date(); setMonthCursor({ y: d.getFullYear(), m: d.getMonth() });
            }}>This Month</button>
          </div>

          <div className="month-grid">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (<div key={d} className="month-head">{d}</div>))}
            {monthGridDates.map((d, i) => {
              const k = isoFromDate(d); const inMonth = d.getMonth() === monthCursor.m;
              const dayItems = eventsByDay.get(k) || [];
              return (
                <div key={i} className={`month-cell ${inMonth ? "" : "month-fade"}`}>
                  <div className="month-date-row">
                    <button className="month-date" onClick={() => { setDayDate(k); setTab("schedule"); }}>
                      {d.getDate()}
                    </button>
                    <button className="month-add" onClick={() => {
                      const title = prompt("Item title for " + k);
                      const time = prompt("Time (HH:MM)", "08:00");
                      if (title && time && /^\d{2}:\d{2}$/.test(time)) {
                        const whenISO = composeISO(k, time);
                        setEvents((p) => [...p, { id: uid(), title: title.trim(), whenISO, category: "other", done: false }]);
                      }
                    }}>＋</button>
                  </div>
                  <div className="month-items">
                    {dayItems.slice(0, 3).map((e) => (
                      <div key={e.id} className={`month-chip ${e.done ? "month-chip-done" : ""}`}>
                        {new Date(e.whenISO).toTimeString().slice(0, 5)} · {e.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && <div className="task-meta">+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* -------- YEAR -------- */}
      {tab === "year" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="menu-item" onClick={() => setYearCursor((y) => y - 1)}>◀</button>
            <div style={{ fontWeight: 900 }}>{yearCursor}</div>
            <button className="menu-item" onClick={() => setYearCursor((y) => y + 1)}>▶</button>
            <button className="menu-item" onClick={() => setYearCursor(new Date().getFullYear())}>This Year</button>
          </div>
          <div className="year-grid">
            {Array.from({ length: 12 }).map((_, m) => {
              const monthStart = new Date(yearCursor, m, 1);
              const label = monthStart.toLocaleString([], { month: "short" });
              const monthEvents = events.filter((e) => {
                const d = new Date(e.whenISO);
                return d.getFullYear() === yearCursor && d.getMonth() === m;
              });
              return (
                <div key={m} className="year-cell">
                  <div className="year-head">
                    <button className="menu-item" onClick={() => { setMonthCursor({ y: yearCursor, m }); setTab("month"); }}>
                      {label}
                    </button>
                    <span className="task-meta">{monthEvents.length} items</span>
                  </div>
                  <button className="btn" onClick={() => {
                    const dateStr = prompt("Date (YYYY-MM-DD)", `${yearCursor}-${String(m + 1).padStart(2, "0")}-01`);
                    const title = prompt("Item title");
                    const time = prompt("Time (HH:MM)", "09:00");
                    if (dateStr && title && time && /^\d{2}:\d{2}$/.test(time)) {
                      const whenISO = composeISO(dateStr, time);
                      setEvents((p) => [...p, { id: uid(), title: title.trim(), whenISO, category: "other", done: false }]);
                    }
                  }}>Add to this month</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* -------- REWARDS (with Coupon Box) -------- */}
      {tab === "rewards" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8}}>
            <div className="task-meta">Your points: <strong>{points}</strong></div>
            <button className="menu-btn" onClick={()=>setShowCoupons(v=>!v)}>
              {showCoupons ? "← Back to Rewards" : "🎟 Open Coupon Box"}
            </button>
          </div>

          {/* Coupon Box */}
          {showCoupons ? (
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div style={{fontWeight:900, marginBottom:4}}>Your Coupons</div>
              {coupons.length === 0 ? (
                <div className="task-meta">No coupons yet. Redeem a reward to add one here.</div>
              ) : (
                <ul style={{ listStyle:"none", padding:0, margin:0, display: "grid", gap: 8 }}>
                  {coupons.slice().reverse().map(c => (
                    <li key={c.id} className={tierClass(c.tier) + " coupon--held"}>
                      <span className="cut" aria-hidden="true"></span>
                      <div>
                        <div className="title-row">
                          <span className="emoji" aria-hidden="true">{c.icon || "🎟️"}</span>
                          <span className="title">{c.label}</span>
                        </div>
                        <div className="task-meta">Earned {new Date(c.date).toLocaleString()}</div>
                      </div>
                      <div style={{display:"grid", gap:8, justifyItems:"end"}}>
                        <div className="badge">{c.cost} pts</div>
                        <button className="btn" onClick={()=>useCoupon(c.id)}>Use</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* Rewards List (grouped) */
            <div className="card" style={{ display: "grid", gap: 14 }}>
              {["Small","Medium","Large","Special"].map(tier => {
                const list = REWARDS.filter(r => r.tier === tier);
                return (
                  <div key={tier} className="card" style={{ display:"grid", gap:10 }}>
                    <div style={{fontWeight:900}}>{tier} Rewards</div>
                    {list.map(r => (
                      <div key={r.key} className={tierClass(r.tier)}>
                        <span className="cut" aria-hidden="true"></span>
                        <div>
                          <div className="title-row">
                            <span className="emoji" aria-hidden="true">{r.icon || "🎟️"}</span>
                            <span className="title">{r.label}</span>
                          </div>
                          <div className="tier">{r.tier} · Earned with points</div>
                        </div>
                        <div style={{display:"grid", gap:8, justifyItems:"end"}}>
                          <div className="badge">{r.cost} pts</div>
                          <button
                            className="btn"
                            disabled={points < r.cost}
                            onClick={()=>redeem(r)}
                            style={{opacity: points < r.cost ? .5 : 1}}
                            aria-label={`Redeem ${r.label}`}
                          >
                            Redeem
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* -------- CHECKLISTS -------- */}
      {tab === "checklists" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
            {lists.map((l) => (
              <button
                key={l.id}
                className={`menu-item ${activeListId === l.id ? "active" : ""}`}
                onClick={() => setActiveListId(l.id)}
                style={{ whiteSpace: "nowrap" }}
              >
                {l.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="New checklist name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
            <button className="btn" onClick={addList}>Add List</button>
            {activeList && (<button className="menu-item" onClick={() => deleteList(activeList.id)}>Delete Current</button>)}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Add an item" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} />
            <button className="btn" onClick={addItem}>Add</button>
          </div>

          {!activeList ? (
            <div className="task-meta">Create a checklist to get started.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>To Get</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {unchecked.map((it) => (
                    <li key={it.id} className="task">
                      <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <input type="checkbox" checked={false} onChange={() => toggleItem(it.id)} />
                        <span>{it.text}</span>
                      </label>
                      <button className="menu-item" onClick={() => deleteItem(it.id)}>Delete</button>
                    </li>
                  ))}
                  {unchecked.length === 0 && <li className="task-meta">Nothing here. Add an item!</li>}
                </ul>
              </div>
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>Have / Done</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {checked.map((it) => (
                    <li key={it.id} className="task task--done">
                      <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <input type="checkbox" checked={true} onChange={() => toggleItem(it.id)} />
                        <span style={{ textDecoration: "line-through", opacity: 0.85 }}>{it.text}</span>
                      </label>
                      <button className="menu-item" onClick={() => deleteItem(it.id)}>Delete</button>
                    </li>
                  ))}
                  {checked.length === 0 && <li className="task-meta">No checked items yet.</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* confetti + toast */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ pointerEvents: "none", position: "fixed", left: "50%", top: "20%", transform: "translateX(-50%)", width: 0, height: 0, zIndex: 60 }}>
            {confetti.map((p) => (
              <motion.span key={p.id} initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: p.x + p.drift, y: 160 + Math.random() * 60, rotate: p.rot }}
                transition={{ duration: p.dur, ease: "easeOut" }}
                style={{ position: "absolute", display: "inline-block", width: p.r, height: p.r, borderRadius: 2, background: p.color, boxShadow: "0 4px 12px rgba(0,0,0,.25)" }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.when} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="toast">
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="spacer" />
    </div>
  );
}
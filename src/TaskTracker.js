import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ================= CONFIG ================= */
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

const REWARDS = [
  { key: "massage", label: "Massage", cost: 400 },
  { key: "date", label: "Date Night", cost: 300 },
  { key: "coffee", label: "Starbucks $10", cost: 150 },
  { key: "clothes", label: "Clothing Gift Card $25", cost: 500 },
];

/* ================= HELPERS ================= */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const load = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
function composeISO(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}
function dateKeyFromISO(iso) {
  return (iso || "").slice(0, 10);
}

/* ========= tiny confetti (kept) ========= */
const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f59e0b"];
const makeConfetti = (count = 18) =>
  new Array(count).fill(0).map((_, i) => ({
    id: `${Date.now()}-${i}`,
    x: (Math.random() * 2 - 1) * 140,
    y: -Math.random() * 40,
    r: 6 + Math.random() * 8,
    rot: (Math.random() * 2 - 1) * 180,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    dur: 0.9 + Math.random() * 0.5,
    drift: (Math.random() * 2 - 1) * 80,
  }));

/* ================= APP ================= */
export default function TaskTracker() {
  /* NAV */
  const [tab, setTab] = useState(() => load("tab", "schedule")); // default = Schedule
  useEffect(() => save("tab", tab), [tab]);

  /* REWARDS / POINTS (hidden from main header, but used on Rewards tab) */
  const [points, setPoints] = useState(() => load("points", 0));
  const [redemptions, setRedemptions] = useState(() => load("redemptions", []));
  useEffect(() => save("points", points), [points]);
  useEffect(() => save("redemptions", redemptions), [redemptions]);

  /* EVENTS (these ARE your tasks, used by Day/Month/Year) */
  // event: { id, title, whenISO, category, done }
  const [events, setEvents] = useState(() => load("events", []));
  useEffect(() => save("events", events), [events]);

  /* DAY VIEW STATE */
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

  /* CHECKLISTS (kept) */
  const [lists, setLists] = useState(() =>
    load("checklists", [
      { id: uid(), name: "Hospital Bag", items: [] },
      { id: uid(), name: "Diaper Bag", items: [] },
    ])
  );
  const [activeListId, setActiveListId] = useState(() => load("activeListId", null));
  useEffect(() => {
    if (!activeListId && lists[0]) setActiveListId(lists[0].id);
  }, [activeListId, lists]);
  useEffect(() => save("checklists", lists), [lists]);
  useEffect(() => save("activeListId", activeListId), [activeListId]);

  const activeList = lists.find((l) => l.id === activeListId) || null;
  const unchecked = activeList ? activeList.items.filter((i) => !i.done) : [];
  const checked = activeList ? activeList.items.filter((i) => i.done) : [];

  /* UI STATE */
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState([]);

  /* ========== EVENT CRUD ========== */
  function addEvent({ title, timeHHMM, category = "other" }) {
    if (!title?.trim() || !timeHHMM) return;
    const whenISO = composeISO(dayDate, timeHHMM);
    setEvents((prev) => [
      ...prev,
      { id: uid(), title: title.trim(), whenISO, category, done: false },
    ]);
  }
  function toggleEventDone(id) {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e))
    );
    const ev = events.find((e) => e.id === id);
    if (ev && !ev.done) {
      const cfg = CATEGORIES.find((c) => c.key === (ev.category || "other")) || { points: 1 };
      const earned = cfg.points ?? 1;
      setPoints((p) => p + earned);
      setToast({ msg: `+${earned} pts`, when: Date.now() });
      setTimeout(() => setToast(null), 1300);
      setConfetti(makeConfetti());
      setTimeout(() => setConfetti([]), 1100);
    }
  }
  function deleteEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }
  function updateEventTitle(id, newTitle) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e)));
  }
  function updateEventTime(id, newTimeHHMM) {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const d = dateKeyFromISO(e.whenISO);
        return { ...e, whenISO: composeISO(d, newTimeHHMM) };
      })
    );
  }

  /* Long-press to reveal actions (Edit/Delete) */
  const [showActionsFor, setShowActionsFor] = useState(null);
  const pressTimer = useRef(null);
  function onPressStart(id) {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setShowActionsFor(id), 450);
  }
  function onPressEnd() {
    clearTimeout(pressTimer.current);
  }

  /* ========== MONTH / YEAR HELPERS ========== */
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() }; // 0-11
  });
  function monthGrid(y, m) {
    const first = new Date(y, m, 1);
    const startDay = first.getDay();
    const total = 42;
    const arr = [];
    for (let i = 0; i < total; i++) {
      arr.push(new Date(y, m, 1 - startDay + i));
    }
    return arr;
  }
  function isoFromDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      .toISOString()
      .slice(0, 10);
  }
  const monthGridDates = useMemo(
    () => monthGrid(monthCursor.y, monthCursor.m),
    [monthCursor]
  );

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

  /* ========== CHECKLISTS CRUD ========== */
  const [newListName, setNewListName] = useState("");
  const [newItemText, setNewItemText] = useState("");

  function addList() {
    const name = newListName.trim();
    if (!name) return;
    const nl = { id: uid(), name, items: [] };
    setLists((prev) => [...prev, nl]);
    setActiveListId(nl.id);
    setNewListName("");
  }
  function deleteList(id) {
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  }
  function addItem() {
    const text = newItemText.trim();
    if (!text || !activeList) return;
    const item = { id: uid(), text, done: false, createdAt: Date.now() };
    setLists((prev) =>
      prev.map((l) => (l.id === activeList.id ? { ...l, items: [...l.items, item] } : l))
    );
    setNewItemText("");
  }
  function toggleItem(itemId) {
    if (!activeList) return;
    setLists((prev) =>
      prev.map((l) =>
        l.id !== activeList.id
          ? l
          : {
              ...l,
              items: l.items.map((it) =>
                it.id === itemId ? { ...it, done: !it.done } : it
              ),
            }
      )
    );
  }
  function deleteItem(itemId) {
    if (!activeList) return;
    setLists((prev) =>
      prev.map((l) =>
        l.id !== activeList.id ? l : { ...l, items: l.items.filter((it) => it.id !== itemId) }
      )
    );
  }

  /* ========== REWARDS ========== */
  const canRedeem = (cost) => points >= cost;
  function redeem(r) {
    if (!canRedeem(r.cost)) return;
    setPoints((p) => p - r.cost);
    setRedemptions((prev) => [
      ...prev,
      { id: uid(), reward: r.key, label: r.label, cost: r.cost, date: new Date().toISOString() },
    ]);
    setConfetti(makeConfetti(24));
    setTimeout(() => setConfetti([]), 1400);
    setToast({ msg: `Redeemed: ${r.label} (−${r.cost} pts)`, when: Date.now() });
    setTimeout(() => setToast(null), 1700);
  }

  /* ========== UI ========== */
  const TABS = [
    { key: "schedule", label: "Schedule" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Yearly" },
    { key: "rewards", label: "Rewards" }, // kept
    { key: "checklists", label: "Checklists" },
  ];

  return (
    <div className="app-bg">
      <div className="layout">
        {/* Left sidebar with main tabs */}
        <aside className="sidebar">
          <div className="sidebar-title">Serena's Schedule</div>
          <nav className="sidebar-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`sidebar-tab ${tab === t.key ? "sidebar-tab--active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* (Optional) show points only inside sidebar small */}
          <div className="sidebar-points">
            <div className="task-meta">Points</div>
            <div className="points">{points}</div>
          </div>
        </aside>

        <main className="content">
          {/* ======== SCHEDULE (default) ======== */}
          {tab === "schedule" && (
            <section className="card" style={{ display: "grid", gap: 12 }}>
              {/* Add row */}
              <div className="add-row" style={{ alignItems: "center" }}>
                <input
                  type="date"
                  className="input"
                  value={dayDate}
                  onChange={(e) => setDayDate(e.target.value)}
                  style={{ width: 150 }}
                />
                <select id="evCat" className="select" defaultValue="feeding">
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input id="evTime" type="time" className="input" defaultValue="08:00" style={{ width: 110 }} />
                <input id="evTitle" className="input" placeholder="Add item (e.g., 6oz bottle, bath…)" />
                <button
                  className="btn"
                  onClick={() => {
                    const title = document.getElementById("evTitle").value || "";
                    const time = document.getElementById("evTime").value || "08:00";
                    const category = document.getElementById("evCat").value || "other";
                    addEvent({ title, timeHHMM: time, category });
                    document.getElementById("evTitle").value = "";
                  }}
                >
                  Add
                </button>
              </div>

              {/* 24-hour grid */}
              <div className="day-grid bordered">
                {hours.map((h) => {
                  const hh = String(h).padStart(2, "0");
                  const inHour = dayEvents.filter((e) => new Date(e.whenISO).getHours() === h);
                  return (
                    <div key={h} className="day-hour">
                      <div className="day-hour-label sticky-time">{hh}:00</div>
                      <div className="day-hour-items">
                        {inHour.length === 0 ? (
                          <div className="task-meta" style={{ opacity: 0.6 }}>—</div>
                        ) : (
                          inHour.map((ev) => (
                            <div
                              key={ev.id}
                              className={`task ${ev.done ? "task--done" : ""}`}
                              onMouseDown={() => onPressStart(ev.id)}
                              onMouseUp={onPressEnd}
                              onTouchStart={() => onPressStart(ev.id)}
                              onTouchEnd={onPressEnd}
                              onClick={() => {
                                // tap toggles done (no undo button)
                                if (!showActionsFor) toggleEventDone(ev.id);
                              }}
                              style={{ position: "relative" }}
                            >
                              <div style={{ display: "grid" }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    textDecoration: ev.done ? "line-through" : "none",
                                  }}
                                >
                                  {ev.title || "(untitled)"}
                                </span>
                                <span className="task-meta">{fmtTime(ev.whenISO)}</span>
                              </div>

                              {/* actions hidden unless long-press */}
                              <AnimatePresence>
                                {showActionsFor === ev.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="action-bubble"
                                  >
                                    <button
                                      className="tab"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nt = prompt(
                                          "Time (HH:MM)",
                                          new Date(ev.whenISO).toTimeString().slice(0, 5)
                                        );
                                        if (nt && /^\d{2}:\d{2}$/.test(nt)) updateEventTime(ev.id, nt);
                                        setShowActionsFor(null);
                                      }}
                                    >
                                      Edit Time
                                    </button>
                                    <button
                                      className="tab"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nt = prompt("Edit title", ev.title);
                                        if (nt !== null) updateEventTitle(ev.id, nt);
                                        setShowActionsFor(null);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="tab"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteEvent(ev.id);
                                        setShowActionsFor(null);
                                      }}
                                    >
                                      Delete
                                    </button>
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

          {/* ======== MONTH ======== */}
          {tab === "month" && (
            <section className="card" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="tab"
                  onClick={() =>
                    setMonthCursor((c) => ({ y: c.m - 1 < 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))
                  }
                >
                  ◀
                </button>
                <div style={{ fontWeight: 800 }}>
                  {new Date(monthCursor.y, monthCursor.m, 1).toLocaleString([], {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  className="tab"
                  onClick={() =>
                    setMonthCursor((c) => ({ y: c.m + 1 > 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))
                  }
                >
                  ▶
                </button>
                <button
                  className="tab"
                  onClick={() => {
                    const d = new Date();
                    setMonthCursor({ y: d.getFullYear(), m: d.getMonth() });
                  }}
                >
                  This Month
                </button>
              </div>

              <div className="month-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="month-head">
                    {d}
                  </div>
                ))}
                {monthGridDates.map((d, i) => {
                  const k = isoFromDate(d);
                  const inMonth = d.getMonth() === monthCursor.m;
                  const dayItems = eventsByDay.get(k) || [];
                  return (
                    <div key={i} className={`month-cell ${inMonth ? "" : "month-fade"}`}>
                      <div className="month-date-row">
                        <button
                          className="month-date"
                          onClick={() => {
                            setDayDate(k);
                            setTab("schedule");
                          }}
                        >
                          {d.getDate()}
                        </button>
                        <button
                          className="month-add"
                          title="Add item to this date"
                          onClick={() => {
                            const title = prompt("Item title for " + k);
                            const time = prompt("Time (HH:MM)", "08:00");
                            const category = "other";
                            if (title && time && /^\d{2}:\d{2}$/.test(time)) {
                              const whenISO = composeISO(k, time);
                              setEvents((prev) => [
                                ...prev,
                                { id: uid(), title: title.trim(), whenISO, category, done: false },
                              ]);
                            }
                          }}
                        >
                          ＋
                        </button>
                      </div>
                      <div className="month-items">
                        {dayItems.slice(0, 3).map((e) => (
                          <div key={e.id} className={`month-chip ${e.done ? "month-chip-done" : ""}`}>
                            {new Date(e.whenISO).toTimeString().slice(0, 5)} · {e.title}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="task-meta">+{dayItems.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ======== YEAR ======== */}
          {tab === "year" && (
            <section className="card" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="tab" onClick={() => setYearCursor((y) => y - 1)}>
                  ◀
                </button>
                <div style={{ fontWeight: 800 }}>{yearCursor}</div>
                <button className="tab" onClick={() => setYearCursor((y) => y + 1)}>
                  ▶
                </button>
                <button className="tab" onClick={() => setYearCursor(new Date().getFullYear())}>
                  This Year
                </button>
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
                        <button
                          className="tab"
                          onClick={() => {
                            setMonthCursor({ y: yearCursor, m });
                            setTab("month");
                          }}
                        >
                          {label}
                        </button>
                        <span className="task-meta">{monthEvents.length} items</span>
                      </div>
                      <button
                        className="btn"
                        onClick={() => {
                          const dateStr = prompt(
                            "Date (YYYY-MM-DD)",
                            `${yearCursor}-${String(m + 1).padStart(2, "0")}-01`
                          );
                          const title = prompt("Item title");
                          const time = prompt("Time (HH:MM)", "09:00");
                          if (dateStr && title && time && /^\d{2}:\d{2}$/.test(time)) {
                            const whenISO = composeISO(dateStr, time);
                            setEvents((prev) => [
                              ...prev,
                              { id: uid(), title: title.trim(), whenISO, category: "other", done: false },
                            ]);
                          }
                        }}
                      >
                        Add to this month
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ======== REWARDS (kept) ======== */}
          {tab === "rewards" && (
            <section className="card" style={{ display: "grid", gap: 10 }}>
              <div className="task-meta">Your current points: <strong>{points}</strong></div>
              {REWARDS.map((r) => (
                <div key={r.key} className="task">
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.label}</div>
                    <div className="task-meta">{r.cost} pts</div>
                  </div>
                  <button
                    className="btn"
                    disabled={points < r.cost}
                    onClick={() => redeem(r)}
                    style={{ opacity: points < r.cost ? 0.5 : 1 }}
                  >
                    Redeem
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* ======== CHECKLISTS (kept, left/right) ======== */}
          {tab === "checklists" && (
            <section className="card" style={{ display: "grid", gap: 12 }}>
              {/* Sub-tabs for lists */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    className={`tab ${activeListId === l.id ? "tab--active" : ""}`}
                    onClick={() => setActiveListId(l.id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>

              <div className="add-row" style={{ marginTop: 4 }}>
                <input
                  className="input"
                  placeholder="New checklist name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <button className="btn" onClick={addList}>
                  Add List
                </button>
                {activeList && (
                  <button className="tab" onClick={() => deleteList(activeList.id)}>
                    Delete Current
                  </button>
                )}
              </div>

              <div className="add-row" style={{ marginTop: 6 }}>
                <input
                  className="input"
                  placeholder="Add an item"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                />
                <button className="btn" onClick={addItem}>
                  Add
                </button>
              </div>

              {!activeList ? (
                <div className="task-meta">Create a checklist to get started.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Unchecked */}
                  <div>
                    <h3 style={{ margin: "0 0 8px 0" }}>To Get</h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                      <AnimatePresence>
                        {unchecked.map((it) => (
                          <motion.li
                            key={it.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="task"
                          >
                            <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                              <input type="checkbox" checked={false} onChange={() => toggleItem(it.id)} />
                              <span>{it.text}</span>
                            </label>
                            <button className="tab" onClick={() => deleteItem(it.id)}>
                              Delete
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                      {unchecked.length === 0 && <li className="task-meta">Nothing here. Add an item!</li>}
                    </ul>
                  </div>

                  {/* Checked */}
                  <div>
                    <h3 style={{ margin: "0 0 8px 0" }}>Have / Done</h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                      <AnimatePresence>
                        {checked.map((it) => (
                          <motion.li
                            key={it.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="task task--done"
                          >
                            <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                              <input type="checkbox" checked={true} onChange={() => toggleItem(it.id)} />
                              <span style={{ textDecoration: "line-through", opacity: 0.85 }}>{it.text}</span>
                            </label>
                            <button className="tab" onClick={() => deleteItem(it.id)}>
                              Delete
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                      {checked.length === 0 && <li className="task-meta">No checked items yet.</li>}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Confetti + toast */}
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
              zIndex: 60,
            }}
          >
            {confetti.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: p.x + p.drift, y: 160 + Math.random() * 60, rotate: p.rot }}
                transition={{ duration: p.dur, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  display: "inline-block",
                  width: p.r,
                  height: p.r,
                  borderRadius: 2,
                  background: p.color,
                  boxShadow: "0 4px 12px rgba(0,0,0,.25)",
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
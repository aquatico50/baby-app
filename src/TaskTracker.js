import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BTS_MEMBERS = [
  { name: "RM", emoji: "\uD83D\uDC28", message: "잘했어!" },
  { name: "Jin", emoji: "\uD83D\uDC39", message: "멋져요!" },
  { name: "Suga", emoji: "\uD83D\uDC31", message: "화이팅!" },
  { name: "J-Hope", emoji: "\uD83E\uDDC3", message: "대박이야!" },
  { name: "Jimin", emoji: "\uD83D\uDC25", message: "좋았어!" },
  { name: "V", emoji: "\uD83D\uDC2F", message: "사랑해요!" },
  { name: "Jungkook", emoji: "\uD83D\uDC30", message: "최고야!" },
];

const TaskTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [completed, setCompleted] = useState(null);

  const addTask = () => {
    if (!input.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: input, done: false }]);
    setInput("");
  };

  const completeTask = (id) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: true } : t
    );
    setTasks(updated);
    const member = BTS_MEMBERS[Math.floor(Math.random() * BTS_MEMBERS.length)];
    setCompleted(member);
    setTimeout(() => setCompleted(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 to-indigo-100 text-gray-900 p-4">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">BTS Baby Tracker</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Add a task (e.g. Feeding, Nap, Tummy Time...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="bg-purple-500 text-white px-4 py-2 rounded" onClick={addTask}>
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`p-3 rounded shadow flex justify-between items-center ${
              task.done ? "bg-green-100 line-through" : "bg-white"
            }`}
          >
            {task.text}
            {!task.done && (
              <button
                className="bg-green-500 text-white px-3 py-1 rounded"
                onClick={() => completeTask(task.id)}
              >
                Done
              </button>
            )}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {completed && (
          <motion.div
            key={completed.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-xl shadow-xl border flex items-center gap-3"
          >
            <span className="text-3xl">{completed.emoji}</span>
            <div>
              <div className="font-bold text-purple-700">{completed.name}</div>
              <div className="text-xl">{completed.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-10 text-center text-xs text-purple-600">
        Made with 💜 for BTS-loving parents
      </footer>
    </div>
  );
};

export default TaskTracker;

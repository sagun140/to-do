/* To-Do — simple PWA task list with alarms. All data stays on this device. */

const STORE_KEY = "todo.tasks.v1";

let tasks = load();
let editingId = null;

const $ = (id) => document.getElementById(id);
const activeList = $("active-list");
const doneList = $("done-list");
const doneWrap = $("done-wrap");

// ---------- storage ----------

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

// ---------- rendering ----------

function fmtAlarm(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow " + time;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
}

function renderItem(task) {
  const li = document.createElement("li");
  li.className = task.done ? "done" : "";
  if (!task.done && task.alarm && new Date(task.alarm) <= new Date()) {
    li.classList.add("overdue");
  }

  const check = document.createElement("button");
  check.className = "check";
  check.textContent = "✓";
  check.setAttribute("aria-label", task.done ? "Mark as not done" : "Mark as done");
  check.onclick = () => toggleTask(task.id);

  const body = document.createElement("div");
  body.className = "body";
  body.onclick = () => openEdit(task.id);

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = task.title;
  body.appendChild(title);

  if (task.alarm) {
    const chip = document.createElement("div");
    chip.className = "alarm-chip";
    chip.textContent = "⏰ " + fmtAlarm(task.alarm);
    body.appendChild(chip);
  }

  const del = document.createElement("button");
  del.className = "delete";
  del.textContent = "✕";
  del.setAttribute("aria-label", "Delete task");
  del.onclick = () => deleteTask(task.id);

  li.append(check, body, del);
  return li;
}

function render() {
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  activeList.replaceChildren(...active.map(renderItem));
  doneList.replaceChildren(...done.map(renderItem));

  $("count").textContent = active.length ? active.length + " open" : "";
  $("done-count").textContent = "(" + done.length + ")";
  doneWrap.hidden = done.length === 0;
  $("empty").hidden = tasks.length > 0;
}

// ---------- task actions ----------

function addTask(title, alarm) {
  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    alarm: alarm || null,
    done: false,
    notified: false,
    createdAt: new Date().toISOString(),
  });
  if (alarm) requestNotifyPermission();
  save();
  render();
}

function toggleTask(id) {
  const t = tasks.find((t) => t.id === id);
  if (!t) return;
  t.done = !t.done;
  if (!t.done && t.alarm && new Date(t.alarm) > new Date()) t.notified = false;
  save();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save();
  render();
}

// ---------- add form ----------

const alarmRow = $("alarm-row");
const alarmInput = $("alarm-input");
const alarmToggle = $("alarm-toggle");

function defaultAlarm() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  // datetime-local wants local time without timezone
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
  );
}

alarmToggle.onclick = () => {
  const show = alarmRow.hidden;
  alarmRow.hidden = !show;
  alarmToggle.classList.toggle("active", show);
  if (show && !alarmInput.value) alarmInput.value = defaultAlarm();
};

$("alarm-clear").onclick = () => {
  alarmInput.value = "";
  alarmRow.hidden = true;
  alarmToggle.classList.remove("active");
};

$("add-form").onsubmit = (e) => {
  e.preventDefault();
  const input = $("task-input");
  const title = input.value.trim();
  if (!title) return;
  const alarm = !alarmRow.hidden && alarmInput.value
    ? new Date(alarmInput.value).toISOString()
    : null;
  addTask(title, alarm);
  input.value = "";
  alarmInput.value = "";
  alarmRow.hidden = true;
  alarmToggle.classList.remove("active");
  input.focus();
};

// ---------- edit sheet ----------

const backdrop = $("sheet-backdrop");

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
  );
}

function openEdit(id) {
  const t = tasks.find((t) => t.id === id);
  if (!t) return;
  editingId = id;
  $("edit-title").value = t.title;
  $("edit-alarm").value = toLocalInput(t.alarm);
  backdrop.hidden = false;
}

function closeEdit() {
  editingId = null;
  backdrop.hidden = true;
}

backdrop.onclick = (e) => {
  if (e.target === backdrop) closeEdit();
};

$("edit-cancel").onclick = closeEdit;

$("edit-delete").onclick = () => {
  deleteTask(editingId);
  closeEdit();
};

$("edit-save").onclick = () => {
  const t = tasks.find((t) => t.id === editingId);
  if (t) {
    const title = $("edit-title").value.trim();
    if (title) t.title = title;
    const alarmVal = $("edit-alarm").value;
    const newAlarm = alarmVal ? new Date(alarmVal).toISOString() : null;
    if (newAlarm !== t.alarm) {
      t.alarm = newAlarm;
      t.notified = false;
      if (newAlarm) requestNotifyPermission();
    }
    save();
    render();
  }
  closeEdit();
};

// ---------- alarms ----------

function requestNotifyPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notify(task) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: "⏰ " + fmtAlarm(task.alarm), tag: task.id };
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then((reg) => reg.showNotification(task.title, opts));
  } else {
    new Notification(task.title, opts);
  }
}

let audioCtx = null;

function unlockAudio() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  audioCtx?.resume();
}

// iOS requires a user gesture before audio can play
document.addEventListener("touchstart", unlockAudio, { once: true });
document.addEventListener("click", unlockAudio, { once: true });

function beep() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, now + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.3 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.3);
    osc.stop(now + i * 0.3 + 0.26);
  }
}

function checkAlarms() {
  const now = new Date();
  let fired = false;
  for (const t of tasks) {
    if (!t.done && t.alarm && !t.notified && new Date(t.alarm) <= now) {
      t.notified = true;
      notify(t);
      fired = true;
    }
  }
  if (fired) {
    beep();
    navigator.vibrate?.([200, 100, 200]);
    save();
    render();
  }
}

setInterval(checkAlarms, 15 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkAlarms();
    render(); // refresh relative labels / overdue state
  }
});

// re-render each minute so overdue highlighting stays current
setInterval(render, 60 * 1000);

// ---------- boot ----------

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render();
checkAlarms();

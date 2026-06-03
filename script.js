

// ——— STATE ———
let tasks = [];
let currentFilter = 'all';
let currentView = 'tasks';
let searchQuery = '';
let sortBy = 'newest';
let editingId = null;
let calYear, calMonth, calSelectedDate;
let confirmCallback = null;

const today = () => new Date().toISOString().split('T')[0];

// ——— INIT ———
function init() {
  loadData();
  setCurrentDate();
  bindEvents();
  renderAll();
  const savedTheme = localStorage.getItem('zenith-theme') || 'dark';
  setTheme(savedTheme);
}

function loadData() {
  try { tasks = JSON.parse(localStorage.getItem('zenith-tasks')) || []; } catch { tasks = []; }
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

function saveData() {
  localStorage.setItem('zenith-tasks', JSON.stringify(tasks));
}

// ——— THEME ———
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeIcon').textContent = t === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('zenith-theme', t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  setTheme(cur === 'dark' ? 'light' : 'dark');
  toast('info', cur === 'dark' ? '☀️ Light mode' : '🌙 Dark mode', 'Theme changed');
}

// ——— DATE ———
function setCurrentDate() {
  const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString(undefined, opts);
}

// ——— EVENTS ———
function bindEvents() {
  document.getElementById('themeToggle').onclick = toggleTheme;
  document.getElementById('addTaskBtn').onclick = openAddModal;
  document.getElementById('addTaskHeaderBtn').onclick = openAddModal;
  document.getElementById('fab').onclick = openAddModal;
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalSave').onclick = saveTask;
  document.getElementById('searchInput').oninput = e => { searchQuery = e.target.value; renderTasks(); };
  document.getElementById('sortSelect').onchange = e => { sortBy = e.target.value; renderTasks(); };
  document.getElementById('clearAllBtn').onclick = clearAll;
  document.getElementById('exportBtn').onclick = exportTasks;
  document.getElementById('importInput').onchange = importTasks;
  document.getElementById('confirmCancel').onclick = closeConfirm;
  document.getElementById('confirmOk').onclick = () => { if (confirmCallback) confirmCallback(); closeConfirm(); };
  document.getElementById('taskModal').onclick = e => { if (e.target === e.currentTarget) closeModal(); };
  document.getElementById('confirmModal').onclick = e => { if (e.target === e.currentTarget) closeConfirm(); };
  document.getElementById('taskTitle').onkeydown = e => { if (e.key === 'Enter') saveTask(); };

  // Filter chips
  document.getElementById('filterChips').onclick = e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    setFilter(chip.dataset.filter);
  };

  // Nav items (sidebar + mobile)
  document.querySelectorAll('[data-view]').forEach(el => {
    el.onclick = () => switchView(el.dataset.view);
  });
  document.querySelectorAll('.sidebar [data-filter]').forEach(el => {
    el.onclick = () => { switchView('tasks'); setFilter(el.dataset.filter); };
  });
  document.querySelectorAll('.mobile-nav [data-filter]').forEach(el => {
    el.onclick = () => { switchView('tasks'); setFilter(el.dataset.filter); };
  });

  // Calendar
  document.getElementById('calPrev').onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); };
  document.getElementById('calNext').onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); };
  document.getElementById('calToday').onclick = () => { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); renderCalendar(); };
}

// ——— VIEW SWITCHING ———
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'calendar') renderCalendar();
}

// ——— FILTER ———
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el.dataset.filter === f));
  const labels = { all: 'All Tasks', pending: 'Pending', completed: 'Completed', high: 'High Priority', today: 'Due Today', archived: 'Archived' };
  const subs = { all: 'All your tasks in one place', pending: 'Tasks waiting to be done', completed: 'Great work!', high: 'Urgent & High priority tasks', today: "Tasks due today", archived: 'Your archived tasks' };
  document.getElementById('viewTitle').textContent = labels[f] || 'Tasks';
  document.getElementById('viewSub').textContent = subs[f] || '';
  renderTasks();
}

// ——— TASK CRUD ———
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'New Task';
  document.getElementById('modalSave').textContent = 'Save Task';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskDate').value = today();
  document.getElementById('taskTime').value = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskModal').classList.add('open');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function openEditModal(id) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Task';
  document.getElementById('modalSave').textContent = 'Update Task';
  document.getElementById('taskTitle').value = t.title;
  document.getElementById('taskDesc').value = t.desc || '';
  document.getElementById('taskDate').value = t.date || '';
  document.getElementById('taskTime').value = t.time || '';
  document.getElementById('taskPriority').value = t.priority;
  document.getElementById('taskModal').classList.add('open');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal() { document.getElementById('taskModal').classList.remove('open'); }

function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { document.getElementById('taskTitle').style.borderColor = 'var(--danger)'; setTimeout(() => document.getElementById('taskTitle').style.borderColor = '', 1500); return; }
  const taskData = {
    title,
    desc: document.getElementById('taskDesc').value.trim(),
    date: document.getElementById('taskDate').value,
    time: document.getElementById('taskTime').value,
    priority: document.getElementById('taskPriority').value,
  };
  if (editingId) {
    const i = tasks.findIndex(t => t.id === editingId);
    if (i !== -1) { tasks[i] = { ...tasks[i], ...taskData }; }
    toast('info', '✏️', 'Task updated');
  } else {
    tasks.unshift({ id: Date.now().toString(), ...taskData, completed: false, archived: false, createdAt: Date.now() });
    toast('success', '✅', 'Task added');
  }
  saveData(); closeModal(); renderAll();
}

function toggleComplete(id) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  t.completed = !t.completed;
  saveData(); renderAll();
  toast(t.completed ? 'success' : 'info', t.completed ? '🎉' : '↩️', t.completed ? 'Task completed!' : 'Marked as pending');
}

function deleteTask(id) {
  showConfirm('🗑️', 'Delete Task?', 'This task will be permanently removed.', 'Delete', () => {
    tasks = tasks.filter(t => t.id !== id);
    saveData(); renderAll();
    toast('error', '🗑️', 'Task deleted');
  });
}

function archiveTask(id) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  t.archived = !t.archived;
  saveData(); renderAll();
  toast('info', '🗂️', t.archived ? 'Task archived' : 'Task restored');
}

function duplicateTask(id) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  const copy = { ...t, id: Date.now().toString(), title: t.title + ' (copy)', completed: false, createdAt: Date.now() };
  const i = tasks.indexOf(t);
  tasks.splice(i + 1, 0, copy);
  saveData(); renderAll();
  toast('info', '📋', 'Task duplicated');
}

function clearAll() {
  const count = tasks.filter(t => !t.archived).length;
  showConfirm('⚠️', 'Clear All Tasks?', `This will permanently delete ${count} task(s).`, 'Clear All', () => {
    tasks = tasks.filter(t => t.archived);
    saveData(); renderAll();
    toast('error', '🗑️', 'All tasks cleared');
  });
}

// ——— FILTER/SORT LOGIC ———
function getFilteredTasks() {
  let list = [...tasks];
  const q = searchQuery.toLowerCase();
  if (q) list = list.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.desc || '').toLowerCase().includes(q) ||
    t.priority.toLowerCase().includes(q) ||
    (t.date || '').includes(q)
  );
  const td = today();
  switch (currentFilter) {
    case 'pending': list = list.filter(t => !t.completed && !t.archived); break;
    case 'completed': list = list.filter(t => t.completed && !t.archived); break;
    case 'high': list = list.filter(t => (t.priority === 'high' || t.priority === 'urgent') && !t.archived); break;
    case 'today': list = list.filter(t => t.date === td && !t.archived); break;
    case 'archived': list = list.filter(t => t.archived); break;
    default: list = list.filter(t => !t.archived);
  }
  const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  switch (sortBy) {
    case 'newest': list.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'oldest': list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'priority': list.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]); break;
    case 'duedate': list.sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1); break;
  }
  return list;
}

// ——— RENDER ———
function renderAll() {
  updateStats();
  renderTasks();
  updateBadges();
}

function updateStats() {
  const td = today();
  const active = tasks.filter(t => !t.archived);
  const total = active.length;
  const completed = active.filter(t => t.completed).length;
  const pending = active.filter(t => !t.completed).length;
  const high = active.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
  const todayCount = active.filter(t => t.date === td).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById('s-total').textContent = total;
  document.getElementById('s-completed').textContent = completed;
  document.getElementById('s-pending').textContent = pending;
  document.getElementById('s-high').textContent = high;
  document.getElementById('s-today').textContent = todayCount;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressBar').style.width = pct + '%';
}

function updateBadges() {
  const td = today();
  const active = tasks.filter(t => !t.archived);
  document.getElementById('nb-tasks').textContent = active.length;
  document.getElementById('nb-all').textContent = active.length;
  document.getElementById('nb-pending').textContent = active.filter(t => !t.completed).length;
  document.getElementById('nb-completed').textContent = active.filter(t => t.completed).length;
  document.getElementById('nb-high').textContent = active.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
  document.getElementById('nb-today').textContent = active.filter(t => t.date === td).length;
  document.getElementById('nb-archived').textContent = tasks.filter(t => t.archived).length;
}

function renderTasks() {
  const list = getFilteredTasks();
  const container = document.getElementById('tasksList');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">No tasks here</div>
      <div class="empty-sub">${searchQuery ? 'Try a different search term.' : 'Click + to add your first task.'}</div>
    </div>`;
    return;
  }
  container.innerHTML = list.map(t => taskCardHTML(t)).join('');
}

function taskCardHTML(t) {
  const pColors = { low: 'var(--low)', medium: 'var(--medium)', high: 'var(--high)', urgent: 'var(--urgent)' };
  const td = today();
  const overdue = t.date && t.date < td && !t.completed;
  const dateStr = t.date ? formatDate(t.date) + (t.time ? ` · ${t.time}` : '') : '';
  return `<div class="task-card ${t.completed ? 'completed' : ''}" style="--priority-color:${pColors[t.priority]}">
    <div class="task-check" onclick="toggleComplete('${t.id}')">${t.completed ? '✓' : ''}</div>
    <div class="task-body">
      <div class="task-title">${escHtml(t.title)}</div>
      ${t.desc ? `<div class="task-desc">${escHtml(t.desc)}</div>` : ''}
      <div class="task-meta">
        ${dateStr ? `<span class="task-date ${overdue ? 'overdue' : ''}">📅 ${dateStr}</span>` : ''}
        <span class="priority-badge p-${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
        ${t.archived ? '<span class="priority-badge" style="background:var(--surface3);color:var(--text3)">Archived</span>' : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn" onclick="openEditModal('${t.id}')" title="Edit">✏️</button>
      <button class="action-btn" onclick="duplicateTask('${t.id}')" title="Duplicate">📋</button>
      <button class="action-btn" onclick="archiveTask('${t.id}')" title="${t.archived ? 'Restore' : 'Archive'}">${t.archived ? '📤' : '🗂️'}</button>
      <button class="action-btn del" onclick="deleteTask('${t.id}')" title="Delete">🗑️</button>
    </div>
  </div>`;
}



function formatDate(d) {
  if (!d) return '';
  const parts = d.split('-');
  const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  const td = today();
  if (d === td) return 'Today';
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  if (d === tom.toISOString().split('T')[0]) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ——— CALENDAR ———
function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonth').textContent = months[calMonth] + ' ' + calYear;
  const grid = document.getElementById('calGrid');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = days.map(d => `<div class="cal-dow">${d}</div>`).join('');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();
  const td = today();

  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + 1 + i;
    html += `<div class="cal-day other-month">${d}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasTasks = tasks.some(t => t.date === dateStr && !t.archived);
    const isToday = dateStr === td;
    const isSel = dateStr === calSelectedDate;
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}" onclick="selectCalDate('${dateStr}')">${d}</div>`;
  }
  const remaining = 42 - firstDay - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }
  grid.innerHTML = html;
  if (calSelectedDate) renderCalTasks(calSelectedDate);
}

function selectCalDate(dateStr) {
  calSelectedDate = dateStr;
  renderCalendar();
  renderCalTasks(dateStr);
}

function renderCalTasks(dateStr) {
  const section = document.getElementById('calSelectedTasks');
  const label = document.getElementById('calSelectedLabel');
  const list = document.getElementById('calTasksList');
  const dayTasks = tasks.filter(t => t.date === dateStr && !t.archived);
  label.textContent = formatDate(dateStr) + (dayTasks.length ? ` — ${dayTasks.length} task(s)` : ' — No tasks');
  section.style.display = '';
  list.innerHTML = dayTasks.length
    ? dayTasks.map(t => taskCardHTML(t)).join('')
    : `<div class="empty-state" style="padding:20px">
        <div class="empty-icon" style="font-size:32px">📅</div>
        <div class="empty-title">No tasks for this day</div>
      </div>`;
}

// ——— TOAST ———
function toast(type, icon, message) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3000);
}

// ——— CONFIRM ———
function showConfirm(icon, title, sub, btnText, cb) {
  document.getElementById('confirmIcon').textContent = icon;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmSub').textContent = sub;
  document.getElementById('confirmOk').textContent = btnText;
  confirmCallback = cb;
  document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmModal').classList.remove('open'); confirmCallback = null; }

// ——— EXPORT/IMPORT ———
function exportTasks() {
  const data = JSON.stringify({ tasks, exportedAt: new Date().toISOString() }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = `zenith-tasks-${today()}.json`;
  a.click();
  toast('success', '⬇️', 'Tasks exported');
}

function importTasks(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const imported = data.tasks || data;
      if (!Array.isArray(imported)) throw new Error();
      tasks = [...imported, ...tasks];
      saveData(); renderAll();
      toast('success', '⬆️', `Imported ${imported.length} task(s)`);
    } catch { toast('error', '❌', 'Invalid file format'); }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ——— START ———
init();

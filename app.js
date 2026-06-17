/* ─── Supabase 연결 확인 ────────────────────────────── */
if (typeof db === 'undefined') {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:2rem;color:#c62828">' +
    'config.js 가 없습니다. config.example.js 를 참고해 생성해 주세요.</p>';
  throw new Error('Supabase client(db) not initialized');
}

/* ─── 상수 ─────────────────────────────────────────── */
const PRIORITY_LABEL = { high: '높음', medium: '보통', low: '낮음' };
const CATEGORY_LABEL = { work: '업무', personal: '개인', study: '공부', other: '기타' };

/* ─── 상태 ─────────────────────────────────────────── */
let currentFilter   = 'all';
let currentCategory = 'all';
let searchQuery     = '';
let dragSrcId       = null;

/* ─── 에러 토스트 ────────────────────────────────────── */
function showError(msg) {
  let toast = document.getElementById('error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'error-toast';
    toast.style.cssText =
      'position:fixed;top:68px;left:50%;transform:translateX(-50%);' +
      'background:#c62828;color:#fff;padding:12px 20px;border-radius:8px;' +
      'font-size:.9rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3);' +
      'max-width:90vw;word-break:break-all;display:none';
    document.body.appendChild(toast);
  }
  toast.textContent = `⚠ ${msg}`;
  toast.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = 'none'; }, 6000);
}

/* ─── DB helpers ────────────────────────────────────── */
// DB 행(snake_case) → JS 객체(camelCase)
function fromRow(row) {
  return {
    id:       row.id,
    text:     row.text,
    done:     row.done,
    priority: row.priority,
    category: row.category,
    dueDate:  row.due_date ?? null,
  };
}

async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('loadTodos:', error);
    showError(`불러오기 실패: ${error.message}`);
    return [];
  }
  return (data || []).map(fromRow);
}

/* ─── 로딩 UI ───────────────────────────────────────── */
function setLoading(on) {
  document.getElementById('add-btn').disabled = on;
  document.getElementById('todo-list').style.opacity = on ? '0.5' : '1';
}

/* ─── D-day ─────────────────────────────────────────── */
function getDday(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(dueDate) - today) / 86400000);
  if (diff === 0) return { label: 'D-day', type: 'dday-today' };
  if (diff >  0) return { label: `D-${diff}`, type: '' };
  return { label: `D+${Math.abs(diff)}`, type: 'overdue' };
}
function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

/* ─── 필터 ──────────────────────────────────────────── */
function getFiltered(todos) {
  return todos.filter(t => {
    if (currentFilter === 'active' && t.done) return false;
    if (currentFilter === 'done'   && !t.done) return false;
    if (currentCategory !== 'all' && t.category !== currentCategory) return false;
    if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}

/* ─── Ripple ─────────────────────────────────────────── */
function addRipple(e, dark = false) {
  const el = e.currentTarget;
  const wave = document.createElement('span');
  wave.className = 'ripple-wave' + (dark ? ' dark' : '');
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  wave.style.cssText =
    `width:${size}px;height:${size}px;` +
    `left:${e.clientX - rect.left - size / 2}px;` +
    `top:${e.clientY  - rect.top  - size / 2}px;`;
  el.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove());
}

/* ─── 렌더링 ─────────────────────────────────────────── */
async function renderTodos() {
  setLoading(true);
  const todos = await loadTodos();
  setLoading(false);

  const list = document.getElementById('todo-list');
  list.innerHTML = '';

  getFiltered(todos).forEach(({ id, text, done, priority, category, dueDate }) => {
    const dday    = getDday(dueDate);
    const overdue = isOverdue(dueDate) && !done;

    const li = document.createElement('li');
    li.className = `todo-item ripple priority-${priority}`;
    if (done)    li.classList.add('done');
    if (overdue) li.classList.add('overdue');
    li.dataset.id = id;
    li.draggable  = true;

    /* 체크박스 */
    const checkLabel = document.createElement('label');
    checkLabel.className = 'md-checkbox';
    checkLabel.dataset.action = 'toggle';
    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = done;
    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';
    checkLabel.append(checkbox, checkmark);

    /* 본문 */
    const body = document.createElement('div');
    body.className = 'item-body';

    const span = document.createElement('span');
    span.className   = 'todo-text';
    span.textContent = text;
    span.addEventListener('dblclick', () => startEdit(span, id));

    const chips = document.createElement('div');
    chips.className = 'item-chips';

    const pChip = document.createElement('span');
    pChip.className   = `chip badge-${priority}`;
    pChip.textContent = PRIORITY_LABEL[priority];

    const cChip = document.createElement('span');
    cChip.className   = `chip cat-${category}`;
    cChip.textContent = CATEGORY_LABEL[category] || category;

    chips.append(pChip, cChip);

    if (dday) {
      const dChip = document.createElement('span');
      dChip.className   = `chip dday-badge ${dday.type}`;
      dChip.textContent = dday.label;
      chips.appendChild(dChip);
    }

    body.append(span, chips);

    /* 삭제 버튼 */
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete-btn ripple';
    deleteBtn.innerHTML = '<span class="material-icons">close</span>';
    deleteBtn.addEventListener('click', async e => {
      e.stopPropagation();
      addRipple(e);
      await deleteTodo(id);
    });

    li.append(checkLabel, body, deleteBtn);
    list.appendChild(li);

    li.addEventListener('click', e => addRipple(e, true));

    /* 드래그 앤 드롭 */
    li.addEventListener('dragstart', e => {
      dragSrcId = id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => li.classList.add('dragging'), 0);
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
    });
    li.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
      li.classList.add('drag-over');
    });
    li.addEventListener('drop', async e => {
      e.preventDefault();
      if (dragSrcId === id) return;

      const all = await loadTodos();
      const si = all.findIndex(t => t.id === dragSrcId);
      const ti = all.findIndex(t => t.id === id);
      if (si === -1 || ti === -1) return;

      const reordered = [...all];
      const [moved] = reordered.splice(si, 1);
      reordered.splice(ti, 0, moved);

      // sort_order 일괄 업데이트
      await Promise.all(
        reordered.map((t, i) =>
          db.from('todos').update({ sort_order: i }).eq('id', t.id)
        )
      );
      await renderTodos();
    });
  });

  const count = todos.filter(t => !t.done).length;
  document.getElementById('remaining').textContent = `남은 할 일: ${count}개`;
}

/* ─── 인라인 편집 ────────────────────────────────────── */
function startEdit(span, id) {
  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'edit-input';
  input.value     = span.textContent;
  span.replaceWith(input);
  input.focus();

  const save = async () => {
    const newText = input.value.trim();
    if (newText) {
      const { error } = await db.from('todos').update({ text: newText }).eq('id', id);
      if (error) console.error('startEdit:', error.message);
    }
    await renderTodos();
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') renderTodos();
  });
}

/* ─── CRUD ───────────────────────────────────────────── */
async function addTodo(text, priority, category, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const { data: maxRow } = await db
    .from('todos')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = (maxRow?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from('todos').insert({
    text:       trimmed,
    done:       false,
    priority:   priority || 'medium',
    category:   category || 'personal',
    due_date:   dueDate  || null,
    sort_order: nextOrder,
  });
  if (error) {
    console.error('addTodo:', error);
    showError(`추가 실패: ${error.message}`);
    return;
  }
  await renderTodos();
}

async function toggleTodo(id, newDone) {
  const { error } = await db.from('todos').update({ done: newDone }).eq('id', id);
  if (error) { console.error('toggleTodo:', error); showError(`수정 실패: ${error.message}`); return; }
  await renderTodos();
}

async function deleteTodo(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) { console.error('deleteTodo:', error); showError(`삭제 실패: ${error.message}`); return; }
  await renderTodos();
}

async function clearCompleted() {
  const { error } = await db.from('todos').delete().eq('done', true);
  if (error) { console.error('clearCompleted:', error); showError(`삭제 실패: ${error.message}`); return; }
  await renderTodos();
}

/* ─── 입력 헬퍼 ──────────────────────────────────────── */
function getInputs() {
  return {
    text:     document.getElementById('todo-input').value,
    priority: document.getElementById('priority-select').value,
    category: document.getElementById('category-select').value,
    dueDate:  document.getElementById('due-date-input').value,
  };
}
function clearInputs() {
  document.getElementById('todo-input').value     = '';
  document.getElementById('due-date-input').value = '';
  document.getElementById('todo-input').focus();
}

/* ─── 이벤트 리스너 ──────────────────────────────────── */

document.getElementById('add-btn').addEventListener('click', async e => {
  addRipple(e);
  const { text, priority, category, dueDate } = getInputs();
  await addTodo(text, priority, category, dueDate);
  clearInputs();
});

document.getElementById('todo-input').addEventListener('keydown', async e => {
  if (e.key !== 'Enter') return;
  const { text, priority, category, dueDate } = getInputs();
  await addTodo(text, priority, category, dueDate);
  clearInputs();
});

document.getElementById('todo-list').addEventListener('click', async e => {
  const li = e.target.closest('li');
  if (!li) return;
  const id      = Number(li.dataset.id);
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  if (actionEl.dataset.action === 'toggle') {
    const checkbox = li.querySelector('input[type="checkbox"]');
    await toggleTodo(id, checkbox.checked);
  }
});

document.getElementById('clear-btn').addEventListener('click', async () => {
  await clearCompleted();
});

document.getElementById('status-tabs').addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip?.dataset.filter) return;
  currentFilter = chip.dataset.filter;
  document.querySelectorAll('#status-tabs .filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderTodos();
});

document.getElementById('category-tabs').addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip?.dataset.category) return;
  currentCategory = chip.dataset.category;
  document.querySelectorAll('#category-tabs .filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderTodos();
});

document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderTodos();
});

document.getElementById('fab-btn').addEventListener('click', e => {
  addRipple(e);
  document.getElementById('todo-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('todo-input').focus();
});

/* ─── 초기 렌더링 ────────────────────────────────────── */
renderTodos();

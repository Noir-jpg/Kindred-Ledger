const root = document.querySelector('#app');
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const expenseCategories = ['Food', 'Rent', 'Bills', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Misc'];
const incomeCategories = ['Salary', 'Freelance', 'Bank interest', 'Rent received', 'Other'];

let state = {
  user: JSON.parse(sessionStorage.getItem('kindredGuest') || localStorage.getItem('kindredUser') || 'null'),
  isGuest: Boolean(sessionStorage.getItem('kindredGuest')),
  transactions: JSON.parse(sessionStorage.getItem('kindredTransactions') || localStorage.getItem('kindredTransactions') || '[]'),
  view: 'dashboard',
  menuOpen: false,
  modal: null,
  entryOpen: false,
  editingId: null,
  formType: 'expense',
  theme: localStorage.getItem('kindredTheme') || 'light'
};

const seedTransactions = [
  { id: 1, type: 'income', category: 'Salary', amount: 31000, date: '2026-09-01', description: 'Monthly salary' },
  { id: 2, type: 'expense', category: 'Food', amount: 350, date: '2026-09-19', description: 'Lunch' },
  { id: 3, type: 'expense', category: 'Transport', amount: 180, date: '2026-09-19', description: 'Uber' },
  { id: 4, type: 'expense', category: 'Entertainment', amount: 450, date: '2026-09-16', description: 'Movie' },
  { id: 5, type: 'expense', category: 'Rent', amount: 12000, date: '2026-09-03', description: 'September rent' }
];
if (!state.transactions.length && state.user) state.transactions = seedTransactions;

function save() {
  const key = state.isGuest ? 'kindredTransactions' : 'kindredTransactions';
  const store = state.isGuest ? sessionStorage : localStorage;
  store.setItem(key, JSON.stringify(state.transactions));
  if (state.user && !state.isGuest) localStorage.setItem('kindredUser', JSON.stringify(state.user));
}
function money(value) { return currency.format(Math.round(value || 0)); }
function currentMonthTransactions() { return state.transactions.filter(item => item.date.startsWith('2026-09')); }
function totals() {
  return state.transactions.reduce((result, item) => { result[item.type] += Number(item.amount); return result; }, { income: 0, expense: 0 });
}
function monthTotals() {
  return monthNames.map((_, index) => state.transactions.reduce((result, item) => {
    if (new Date(`${item.date}T00:00:00`).getMonth() === index) result[item.type] += Number(item.amount);
    return result;
  }, { income: 0, expense: 0 }));
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char])); }
function icon(name, size = 18) { return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`; }
function dateLabel(date) { return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }

function render() {
  document.documentElement.dataset.theme = state.theme;
  root.innerHTML = state.user ? dashboardTemplate() : authTemplate();
  lucide.createIcons();
  enhanceProfileForm();
}

function authTemplate() {
  return `<main class="auth-page"><section class="auth-card">
    <a class="brand" href="#">${brandMark()}<span class="brand-name">Kindred Ledger</span></a>
    <p class="eyebrow">A calmer way to keep track</p>
    <h1>${state.authMode === 'signup' ? 'Build your money rhythm.' : 'Welcome back.'}</h1>
    <p class="lede">A gentle, private space for understanding where your money goes and what you keep.</p>
    <form class="auth-form" onsubmit="handleAuth(event)">
      ${state.authMode === 'signup' ? `<div class="field"><label for="name">Your name</label><input id="name" required placeholder="e.g. John Doe" /></div>` : ''}
      <div class="field"><label for="email">Gmail address</label><input id="email" type="email" required placeholder="you@gmail.com" /></div>
      <div class="field"><label for="password">Password</label><input id="password" type="password" required minlength="4" placeholder="At least 4 characters" /></div>
      <button class="primary-button" type="submit">${state.authMode === 'signup' ? 'Create my ledger' : 'Log in'} ${icon('arrow-right', 17)}</button>
    </form>
    <button class="secondary-button" style="margin-top:12px" onclick="enterGuest()">Continue as a guest ${icon('sparkles', 16)}</button>
    <div class="guest-note">Guest mode keeps this session temporary. Create an account when you want your ledger to stay with you.</div>
    <p class="auth-switch">${state.authMode === 'signup' ? 'Already have an account?' : 'New here?'} <button class="text-button" onclick="toggleAuth()">${state.authMode === 'signup' ? 'Log in' : 'Sign up'}</button></p>
  </section></main>`;
}

function brandMark() { return `<span class="brand-mark">${icon('leaf', 20)}</span>`; }
function profileAvatarStyle() { const background = state.user.profileBackground?.value || 'var(--teal-soft)'; return `background:${background};`; }
function dashboardTemplate() {
  const { income, expense } = totals();
  const month = currentMonthTransactions().reduce((result, item) => { result[item.type] += Number(item.amount); return result; }, { income: 0, expense: 0 });
  const displayName = escapeHtml(state.user.name || 'Friend');
  return `<main class="app-shell ${state.menuOpen ? 'navigation-open' : ''}">
    <header class="topbar"><a class="brand" href="#">${brandMark()}<span class="brand-name">Kindred Ledger</span></a><div class="topbar-actions"><button class="icon-button" onclick="toggleTheme()" title="Toggle theme">${state.theme === 'light' ? icon('moon') : icon('sun')}</button><button class="avatar-button" style="${profileAvatarStyle()}" onclick="toggleMenu()">${state.user.avatar ? `<img src="${state.user.avatar}" alt="Profile" />` : displayName.charAt(0).toUpperCase()}</button></div></header>
    ${state.menuOpen ? `<button class="menu-dismiss" onclick="toggleMenu()" aria-label="Close navigation menu"></button><div class="menu-popover"><button onclick="openModal('profile')">Profile</button><button onclick="openModal('settings')">Settings</button><button onclick="logout()">Log out</button></div>` : ''}
    <div class="layout"><section class="content">
      <div class="hero"><div class="hero-copy"><p class="eyebrow">Tuesday, September 2026</p><h1>Make space for what matters, ${displayName}.</h1><p class="lede">Your money story, in one clear place. Notice your patterns, celebrate your progress, and make the next choice a little easier.</p></div><div class="hero-art"><span></span></div></div>
      <div class="stat-grid"><article class="stat-card positive"><div class="stat-label">${icon('wallet', 15)} Balance</div><div class="stat-value">${money(income - expense)}</div><div class="small-note">All time overview</div></article><article class="stat-card accent"><div class="stat-label">${icon('arrow-down-to-line', 15)} Spent this month</div><div class="stat-value">${money(month.expense)}</div><div class="small-note">${month.expense > 0 ? 'You are keeping track' : 'No expenses yet'}</div></article><article class="stat-card"><div class="stat-label">${icon('target', 15)} Monthly budget</div><div class="stat-value">${money(25000)}</div><div class="small-note">${money(Math.max(0, 25000 - month.expense))} left this month</div></article></div>
      <section class="panel"><div class="panel-heading"><h2>Spending over the year</h2><span class="muted" style="font-size:12px">2026</span></div>${chartTemplate()}</section>
      <section class="panel"><div class="panel-heading"><h2>Top spending categories</h2><button class="link-button" onclick="document.querySelector('#history').scrollIntoView()">View history</button></div>${categoriesTemplate()}</section>
      <section class="panel" id="history"><div class="panel-heading"><h2>Recent transactions</h2><span class="muted" style="font-size:12px">${state.transactions.length} total</span></div>${historyTemplate()}</section>
    </section><aside class="sidebar ${state.entryOpen ? 'mobile-entry-open' : ''}"><section class="panel form-panel"><div class="panel-heading"><h2>${state.editingId ? 'Edit entry' : 'Add an entry'}</h2><button class="mobile-entry-close" onclick="closeEntry()" title="Close entry form">${icon('x', 17)}</button>${state.isGuest ? `<span title="Guest mode">${icon('lock-keyhole', 15)}</span>` : ''}</div>${transactionForm()}</section></aside></div>
    ${state.entryOpen ? `<button class="mobile-entry-backdrop" onclick="closeEntry()" aria-label="Close entry form"></button>` : ''}
    <button class="mobile-entry-fab" onclick="openEntry()" aria-label="Add an entry">${icon('plus', 23)}</button>
    ${state.modal ? modalTemplate() : ''}<div class="toast" id="toast"></div>
  </main>`;
}
function chartTemplate() {
  const data = monthTotals(); const max = Math.max(...data.flatMap(item => [item.income, item.expense]), 1);
  return `<div class="chart-wrap"><div class="chart-grid"><div></div><div></div><div></div><div></div></div><div class="chart-bars">${data.map((item, index) => `<div class="bar-column"><div class="bar-pair"><div class="bar expense" style="height:${Math.max(3, item.expense / max * 100)}%" title="${money(item.expense)}"></div><div class="bar income" style="height:${Math.max(3, item.income / max * 100)}%" title="${money(item.income)}"></div></div><span class="bar-label">${monthNames[index]}</span></div>`).join('')}</div></div><div class="chart-legend"><span><i class="legend-dot" style="background:var(--accent)"></i>Spending</span><span><i class="legend-dot" style="background:var(--teal)"></i>Income</span></div>`;
}
function categoriesTemplate() {
  const expenses = state.transactions.filter(item => item.type === 'expense').reduce((result, item) => { result[item.category] = (result[item.category] || 0) + Number(item.amount); return result; }, {});
  const items = Object.entries(expenses).sort((a,b) => b[1] - a[1]).slice(0, 5); const max = items[0]?.[1] || 1;
  return items.length ? `<div class="category-list">${items.map(([name, amount]) => `<div class="category-row"><div><div class="category-meta"><span>${escapeHtml(name)}</span><span>${money(amount)}</span></div><div class="progress"><span style="width:${amount / max * 100}%"></span></div></div></div>`).join('')}</div>` : `<div class="empty">Your spending patterns will appear here.</div>`;
}
function historyTemplate() {
  const items = [...state.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (!items.length) return `<div class="empty">Nothing here yet. Add your first entry beside this list.</div>`;
  return `<div class="history-list">${items.map(item => `<div class="history-item"><div class="transaction-icon ${item.type}">${icon(item.type === 'income' ? 'arrow-up-right' : 'arrow-down-left', 17)}</div><div class="transaction-main"><strong>${escapeHtml(item.category)}</strong><span>${escapeHtml(item.description || 'No description')} · ${dateLabel(item.date)}</span></div><div class="transaction-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</div><div class="item-actions"><button onclick="editTransaction(${item.id})" title="Edit">${icon('pencil', 15)}</button><button onclick="deleteTransaction(${item.id})" title="Delete">${icon('trash-2', 15)}</button></div></div>`).join('')}</div>`;
}
function transactionForm() {
  const editing = state.transactions.find(item => item.id === state.editingId) || {};
  const categories = state.formType === 'income' ? incomeCategories : expenseCategories;
  return `<div class="type-switch"><button class="${state.formType === 'expense' ? 'active' : ''}" onclick="setFormType('expense')">Expense</button><button class="${state.formType === 'income' ? 'active' : ''}" onclick="setFormType('income')">Income</button></div><form onsubmit="saveTransaction(event)"><div class="field"><label for="amount">Amount</label><input id="amount" type="number" min="1" step="1" value="${editing.amount || ''}" placeholder="350" required /></div><div class="field"><label for="category">Category</label><select id="category">${categories.map(item => `<option ${editing.category === item ? 'selected' : ''}>${item}</option>`).join('')}<option value="__custom">Add your own category...</option></select></div><div class="field" id="custom-field" style="display:none"><label for="customCategory">Custom category</label><input id="customCategory" placeholder="e.g. Pet care" /></div><div class="form-row"><div class="field"><label for="date">Date</label><input id="date" type="date" value="${editing.date || '2026-09-19'}" required /></div><div class="field"><label for="description">Description</label><input id="description" value="${escapeHtml(editing.description || '')}" placeholder="Lunch" /></div></div><button class="primary-button" type="submit">${state.editingId ? 'Update entry' : 'Add entry'} ${icon(state.editingId ? 'check' : 'plus', 16)}</button>${state.editingId ? `<button type="button" class="link-button" style="width:100%;margin-top:10px" onclick="cancelEdit()">Cancel editing</button>` : ''}</form>`;
}

function modalTemplate() {
  if (state.modal === 'settings') return `<div class="modal-backdrop" onclick="closeOnBackdrop(event)"><section class="modal"><div class="modal-header"><div><p class="eyebrow">Preferences</p><h2>Settings</h2></div><button class="close-button" onclick="closeModal()">${icon('x')}</button></div><div class="settings-list"><div class="settings-row"><div><strong>Appearance</strong><span>Light and dark mode</span></div><button class="switch ${state.theme === 'dark' ? 'on' : ''}" onclick="toggleTheme()"><span></span></button></div><div class="settings-row"><div><strong>Accessibility</strong><span>Comfortable motion and contrast</span></div>${icon('chevron-right', 17)}</div><div class="settings-row"><div><strong>Privacy</strong><span>Your data stays in this browser</span></div>${icon('chevron-right', 17)}</div><div class="settings-row"><div><strong>Policy</strong><span>How Kindred Ledger works</span></div>${icon('chevron-right', 17)}</div></div></section></div>`;
  const profileBackground = state.user.profileBackground || { type: 'solid', value: '#777777' };
  const previewStyle = profileBackground.type === 'gradient' ? `background:${profileBackground.value}` : `background:${profileBackground.value}`;
  return `<div class="modal-backdrop" onclick="closeOnBackdrop(event)"><section class="modal"><div class="modal-header"><div><p class="eyebrow">Your space</p><h2>Profile</h2></div><button class="close-button" onclick="closeModal()">${icon('x')}</button></div><form onsubmit="saveProfile(event)"><div class="profile-preview" style="${previewStyle}">${state.user.avatar ? `<img src="${state.user.avatar}" alt="Profile preview" />` : icon('user-round', 30)}</div><div class="field"><label for="profilePicture">Profile picture</label><input id="profilePicture" type="file" accept="image/*" /></div><div class="field"><label for="profileName">Name</label><input id="profileName" value="${escapeHtml(state.user.name || '')}" required /></div><div class="form-row"><div class="field"><label for="birthDate">Date of birth</label><input id="birthDate" type="date" value="${state.user.birthDate || ''}" /></div><div class="field"><label for="gender">Gender</label><select id="gender"><option value="">Prefer not to say</option><option ${state.user.gender === 'Woman' ? 'selected' : ''}>Woman</option><option ${state.user.gender === 'Man' ? 'selected' : ''}>Man</option><option ${state.user.gender === 'Non-binary' ? 'selected' : ''}>Non-binary</option></select></div></div><div class="field"><label for="backgroundType">Profile background</label><select id="backgroundType"><option value="solid" ${profileBackground.type === 'solid' ? 'selected' : ''}>Solid colour</option><option value="gradient" ${profileBackground.type === 'gradient' ? 'selected' : ''}>Gradient</option></select></div><div class="field" id="solidBackgroundField" style="${profileBackground.type === 'solid' ? '' : 'display:none'}"><label for="solidBackground">Solid colour</label><input id="solidBackground" type="color" value="${profileBackground.type === 'solid' ? profileBackground.value : '#777777'}" /></div><div class="field" id="gradientBackgroundField" style="${profileBackground.type === 'gradient' ? '' : 'display:none'}"><label for="gradientBackground">Gradient style</label><select id="gradientBackground"><option value="linear-gradient(135deg, #333333, #999999)" ${profileBackground.value === 'linear-gradient(135deg, #333333, #999999)' ? 'selected' : ''}>Graphite fade</option><option value="linear-gradient(135deg, #111111, #eeeeee)" ${profileBackground.value === 'linear-gradient(135deg, #111111, #eeeeee)' ? 'selected' : ''}>Soft contrast</option><option value="linear-gradient(135deg, #555555, #d94e4e)" ${profileBackground.value === 'linear-gradient(135deg, #555555, #d94e4e)' ? 'selected' : ''}>Charcoal red</option></select></div><div class="form-row"><div class="field"><label for="optionalEmail">Optional email</label><input id="optionalEmail" type="email" value="${state.user.optionalEmail || ''}" placeholder="hello@example.com" /></div><div class="field"><label for="phone">Phone number <span class="muted">(optional)</span></label><input id="phone" type="tel" value="${state.user.phone || ''}" placeholder="+91" /></div></div><button class="primary-button" type="submit">Save profile ${icon('check', 16)}</button></form></section></div>`;
}

function handleAuth(event) { event.preventDefault(); const email = document.querySelector('#email').value; const name = document.querySelector('#name')?.value || localStorage.getItem('kindredUser') && JSON.parse(localStorage.getItem('kindredUser')).name || email.split('@')[0]; state.user = { name, email }; state.isGuest = false; localStorage.setItem('kindredUser', JSON.stringify(state.user)); if (!state.transactions.length) state.transactions = seedTransactions; save(); render(); }
function toggleAuth() { state.authMode = state.authMode === 'signup' ? 'login' : 'signup'; render(); }
function enterGuest() { state.user = { name: 'Guest', email: '' }; state.isGuest = true; state.transactions = seedTransactions.map(item => ({ ...item })); sessionStorage.setItem('kindredGuest', JSON.stringify(state.user)); sessionStorage.setItem('kindredTransactions', JSON.stringify(state.transactions)); render(); }
function logout() { sessionStorage.clear(); state.user = null; state.transactions = []; state.menuOpen = false; render(); }
function toggleMenu() { state.menuOpen = !state.menuOpen; render(); }
function toggleTheme() { state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('kindredTheme', state.theme); render(); }
function setFormType(type) { state.formType = type; state.editingId = null; render(); }
function saveTransaction(event) { event.preventDefault(); const categorySelect = document.querySelector('#category'); const category = categorySelect.value === '__custom' ? document.querySelector('#customCategory').value.trim() : categorySelect.value; if (!category) return showToast('Give this entry a category first'); const wasEditing = Boolean(state.editingId); const item = { id: state.editingId || Date.now(), type: state.formType, category, amount: Number(document.querySelector('#amount').value), date: document.querySelector('#date').value, description: document.querySelector('#description').value.trim() }; if (wasEditing) state.transactions = state.transactions.map(existing => existing.id === state.editingId ? item : existing); else state.transactions.push(item); save(); state.editingId = null; state.entryOpen = false; render(); showToast(wasEditing ? 'Entry updated' : 'Entry added'); }
function editTransaction(id) { const item = state.transactions.find(entry => entry.id === id); state.editingId = id; state.formType = item.type; state.entryOpen = true; window.scrollTo({ top: 0, behavior: 'smooth' }); render(); }
function cancelEdit() { state.editingId = null; state.entryOpen = false; render(); }
function openEntry() { state.entryOpen = true; render(); }
function closeEntry() { state.entryOpen = false; state.editingId = null; render(); }
function deleteTransaction(id) { state.transactions = state.transactions.filter(item => item.id !== id); save(); render(); showToast('Entry deleted'); }
function openModal(name) { state.modal = name; state.menuOpen = false; render(); }
function closeModal() { state.modal = null; render(); }
function closeOnBackdrop(event) { if (event.target === event.currentTarget) closeModal(); }
async function saveProfile(event) { event.preventDefault(); const file = document.querySelector('#profilePicture').files[0]; const avatar = file ? await fileToDataUrl(file) : state.user.avatar; state.user = { ...state.user, avatar, name: document.querySelector('#profileName').value, birthDate: document.querySelector('#birthDate').value, gender: document.querySelector('#gender').value, optionalEmail: document.querySelector('#optionalEmail').value, countryCode: document.querySelector('#countryCode').value, phone: document.querySelector('#phone').value }; save(); state.modal = null; render(); showToast('Profile saved'); }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function enhanceProfileForm() { const picture = document.querySelector('#profilePicture'); const preview = document.querySelector('.profile-preview'); const backgroundType = document.querySelector('#backgroundType'); const solidField = document.querySelector('#solidBackgroundField'); const gradientField = document.querySelector('#gradientBackgroundField'); if (!picture || !preview) return; [backgroundType, solidField, gradientField].forEach(element => element?.closest('.field')?.remove()); const phoneField = document.querySelector('#phone')?.closest('.field'); if (phoneField && !document.querySelector('#countryCode')) { phoneField.innerHTML = `<label for="countryCode">Phone number <span class="muted">(optional)</span></label><div class="phone-input"><select id="countryCode"><option value="+91" ${state.user.countryCode === '+91' || !state.user.countryCode ? 'selected' : ''}>IN +91</option><option value="+1" ${state.user.countryCode === '+1' ? 'selected' : ''}>US +1</option><option value="+44" ${state.user.countryCode === '+44' ? 'selected' : ''}>UK +44</option><option value="+61" ${state.user.countryCode === '+61' ? 'selected' : ''}>AU +61</option><option value="+81" ${state.user.countryCode === '+81' ? 'selected' : ''}>JP +81</option><option value="+86" ${state.user.countryCode === '+86' ? 'selected' : ''}>CN +86</option><option value="+971" ${state.user.countryCode === '+971' ? 'selected' : ''}>AE +971</option></select><span></span><input id="phone" type="tel" value="${state.user.phone || ''}" placeholder="Phone number" /></div>`; } picture.addEventListener('change', async () => { const file = picture.files[0]; if (!file) return; const source = await fileToDataUrl(file); preview.innerHTML = `<img src="${source}" alt="Profile preview" />`; }); }
function showToast(message) { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
document.addEventListener('change', event => { if (event.target.id === 'category') document.querySelector('#custom-field').style.display = event.target.value === '__custom' ? 'block' : 'none'; });
state.authMode = 'signup';
render();

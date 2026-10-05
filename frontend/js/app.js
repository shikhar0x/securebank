/**
 * SecureBank Frontend Application Controller
 *
 * Renders into the hooks that already exist in index.html:
 *   #main-view-container, #sidebar-wrapper, #sidebar-menu-list,
 *   #navbar-user-section, #navbar-auth-section, #nav-user-name, #nav-user-role,
 *   #persona-dropdown-menu, #toast-container, #transferModal
 *
 * Screens follow docs/phases.md Phase 7 (login, dashboard, customer, account,
 * transaction, loan, beneficiary, compliance and reporting screens) and the
 * per-role responsibilities in docs/prd.md section 4. Each screen only calls
 * endpoints the signed-in role is authorised for; the sidebar shows a role only
 * the screens that role is meant to use.
 *
 * Rules this module follows:
 *   - Balances are never calculated here. Every balance shown is re-read from
 *     the backend after a transaction commits.
 *   - The backend's own error message is always surfaced (toast + inline).
 *   - Only one mutating request can be in flight at a time.
 *   - Notifications use the existing Bootstrap toast container, not alert().
 *   - If the Bootstrap bundle is unavailable or throws, a built-in fallback keeps
 *     the modal, its dismiss buttons and the toasts working - nothing fails silently.
 */

'use strict';

const App = {
    user: null,
    accounts: [],
    transactions: [],
    customers: [],
    loans: [],
    beneficiaries: [],
    suspicious: [],
    auditLogs: [],
    reportRows: [],
    reportKind: null,
    beneficiaryCustomerId: null,
    activeAccountId: null,
    currentView: 'dashboard',
    busy: false
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function $(id) {
    return document.getElementById(id);
}

/** Escape values before they are interpolated into HTML. */
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * The API returns some rows with database column names and some with mock
 * aliases (c_name vs c_full_name, be_* vs b_*). Read whichever is present.
 */
function firstOf(row, keys, fallback = '') {
    if (!row) return fallback;
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
}

/** Display-only currency formatting. No arithmetic on balances. */
function formatINR(value) {
    if (value === null || value === undefined || value === '') return '\u2014';
    const num = Number(value);
    if (!Number.isFinite(num)) return '\u2014';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatWhen(value) {
    if (!value) return '\u2014';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString();
}

function accountLabel(acc) {
    if (!acc) return '';
    return `#${esc(acc.a_id)} \u00b7 ${esc(acc.a_number || '')}`;
}

function customerName(row) {
    return firstOf(row, ['c_name', 'c_full_name'], '\u2014');
}

function role() {
    return (App.user && App.user.role) || '';
}

function hasRole(...roles) {
    return roles.indexOf(role()) !== -1;
}

/** Status pill using the project's .badge-status classes. */
function statusBadge(status) {
    const value = status || 'UNKNOWN';
    return `<span class="badge-status status-${esc(value)}">${esc(value)}</span>`;
}

function emptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="text-muted">${esc(message)}</td></tr>`;
}

function table(headers, body) {
    return `
        <div class="table-custom">
            <table class="table mb-0">
                <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
                <tbody>${body}</tbody>
            </table>
        </div>`;
}

/* ------------------------------------------------------------------ *
 * Notifications (existing #toast-container + Bootstrap Toast)
 * ------------------------------------------------------------------ */

function showToast(message, variant = 'success', title = '') {
    const container = $('toast-container');
    if (!container) return;

    const titles = { success: 'Success', danger: 'Failed', warning: 'Warning' };
    const icons = {
        success: 'fa-circle-check',
        danger: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation'
    };

    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${variant} border-0`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fa-solid ${icons[variant] || icons.success} me-2"></i>
                <strong>${esc(title || titles[variant] || 'Notice')}</strong>
                <div class="small mt-1">${esc(message)}</div>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>`;
    container.appendChild(el);

    if (bootstrapToastAvailable()) {
        try {
            const toast = new window.bootstrap.Toast(el, { delay: 6000 });
            toast.show();
            el.addEventListener('hidden.bs.toast', () => el.remove());
            return;
        } catch (err) {
            console.warn('Bootstrap Toast failed; using the built-in fallback.', err);
        }
    }

    // Fallback so a notification is never invisible when the CDN JS is unavailable.
    el.classList.add('show');
    el.style.display = 'block';
    const dismiss = el.querySelector ? el.querySelector('[data-bs-dismiss="toast"]') : null;
    if (dismiss && dismiss.addEventListener) {
        dismiss.addEventListener('click', () => el.remove());
    }
    window.setTimeout(() => el.remove(), 6000);
}

/* ------------------------------------------------------------------ *
 * Inline error slot (uses the project's .rollback-banner styling)
 * ------------------------------------------------------------------ */

function renderError(slotId, message, heading = 'Transaction rolled back') {
    const slot = $(slotId);
    if (!slot) return;
    slot.innerHTML = `
        <div class="rollback-banner" role="alert">
            <h6><i class="fa-solid fa-circle-exclamation me-1"></i> ${esc(heading)}</h6>
            <p>${esc(message)}</p>
        </div>`;
}

/** Banner heading depends on whether a database transaction was involved. */
function errorHeading(label) {
    return (label === 'Transfer' || label === 'Deposit' || label === 'Withdrawal')
        ? 'Transaction rolled back'
        : 'Request failed';
}

function clearError(slotId) {
    const slot = $(slotId);
    if (slot) slot.innerHTML = '';
}

/* ------------------------------------------------------------------ *
 * Busy state + duplicate-submission guard
 * ------------------------------------------------------------------ */

function setBusy(buttonEl, busy, busyLabel) {
    if (!buttonEl) return;
    if (busy) {
        if (buttonEl.dataset.originalHtml === undefined) {
            buttonEl.dataset.originalHtml = buttonEl.innerHTML;
        }
        buttonEl.disabled = true;
        buttonEl.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${esc(busyLabel || 'Processing\u2026')}`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalHtml !== undefined) {
            buttonEl.innerHTML = buttonEl.dataset.originalHtml;
        }
    }
}

/** Turn a thrown error into the message the user sees. */
function describeError(label, err) {
    const backendMessage = err && err.message ? err.message : 'Unexpected error.';
    const code = err && err.code ? ` (${err.code})` : '';
    return `${label} failed: ${backendMessage}${code}`;
}

/**
 * One shared pattern for every mutating request:
 * guard duplicates -> disable control -> run -> success hook OR visible error
 * -> always restore the control.
 */
async function runGuarded(label, buttonEl, errorSlotId, action, onSuccess, busyLabel) {
    if (App.busy) {
        showToast('Another request is still running. Please wait.', 'warning');
        return null;
    }

    App.busy = true;
    setBusy(buttonEl, true, busyLabel);
    clearError(errorSlotId);

    try {
        const result = await action();
        if (typeof onSuccess === 'function') {
            await onSuccess(result);
        }
        return result;
    } catch (err) {
        const message = describeError(label, err);
        renderError(errorSlotId, message, errorHeading(label));
        showToast(message, 'danger');
        return null;
    } finally {
        setBusy(buttonEl, false);
        App.busy = false;
    }
}

/* ------------------------------------------------------------------ *
 * Data loading (always from the backend, never cached arithmetic)
 * ------------------------------------------------------------------ */

async function loadAccounts() {
    const u = App.user;
    let list;
    if (u && u.role === 'CUSTOMER' && u.customer_id) {
        list = await api.getCustomerAccounts(u.customer_id);
    } else {
        list = await api.getAccounts(50, 0);
    }
    App.accounts = Array.isArray(list) ? list : [];

    if (!App.accounts.some(a => a.a_id === App.activeAccountId)) {
        App.activeAccountId = App.accounts.length ? App.accounts[0].a_id : null;
    }
    return App.accounts;
}

async function loadLedger() {
    if (!App.activeAccountId) {
        App.transactions = [];
        return App.transactions;
    }
    const list = await api.getAccountTransactions(App.activeAccountId, 25, 0);
    App.transactions = Array.isArray(list) ? list : [];
    return App.transactions;
}

async function loadCustomers() {
    const list = await api.getCustomers(100, 0);
    App.customers = Array.isArray(list) ? list : [];
    return App.customers;
}

async function loadLoans() {
    let list;
    if (role() === 'CUSTOMER' && App.user && App.user.customer_id) {
        list = await api.getCustomerLoans(App.user.customer_id);
    } else {
        list = await api.getLoans(100, 0);
    }
    App.loans = Array.isArray(list) ? list : [];
    return App.loans;
}

async function loadBeneficiaries(customerId) {
    const target = customerId || App.beneficiaryCustomerId ||
        (role() === 'CUSTOMER' ? (App.user && App.user.customer_id) : null);
    if (!target) {
        App.beneficiaries = [];
        return App.beneficiaries;
    }
    App.beneficiaryCustomerId = Number(target);
    const list = await api.getBeneficiaries(App.beneficiaryCustomerId);
    App.beneficiaries = Array.isArray(list) ? list : [];
    return App.beneficiaries;
}

async function loadSuspicious() {
    const list = await api.getSuspiciousTransactions(100, 0);
    App.suspicious = Array.isArray(list) ? list : [];
    return App.suspicious;
}

async function loadAuditLogs() {
    const list = await api.getAuditLogs({ limit: 100, offset: 0 });
    App.auditLogs = Array.isArray(list) ? list : [];
    return App.auditLogs;
}

/** Report tabs, restricted to the roles each report endpoint authorises. */
const REPORT_TABS = [
    { kind: 'customer-accounts', label: 'Customer Accounts', icon: 'fa-building-columns', roles: ['ADMIN', 'MANAGER', 'TELLER', 'AUDITOR'] },
    { kind: 'transactions', label: 'Transactions', icon: 'fa-right-left', roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'COMPLIANCE'] },
    { kind: 'loans', label: 'Loans', icon: 'fa-file-invoice-dollar', roles: ['ADMIN', 'MANAGER', 'LOAN_OFFICER', 'AUDITOR'] },
    { kind: 'audit', label: 'Audit', icon: 'fa-clipboard-list', roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'COMPLIANCE'] }
];

function allowedReportTabs() {
    return REPORT_TABS.filter(tab => tab.roles.indexOf(role()) !== -1);
}

async function loadReport(kind) {
    const tabs = allowedReportTabs();
    const chosen = tabs.some(t => t.kind === kind) ? kind : (tabs[0] && tabs[0].kind);
    if (!chosen) {
        App.reportRows = [];
        App.reportKind = null;
        return App.reportRows;
    }
    App.reportKind = chosen;
    const fetchers = {
        'customer-accounts': () => api.getReportCustomerAccounts(100, 0),
        'transactions': () => api.getReportTransactions(100, 0),
        'loans': () => api.getReportLoans(100, 0),
        'audit': () => api.getReportAudit(100, 0)
    };
    const list = await fetchers[chosen]();
    App.reportRows = Array.isArray(list) ? list : [];
    return App.reportRows;
}

/**
 * After a committed transaction: re-read balances and history from the
 * backend so no stale figure stays on screen.
 */
async function refreshAccountData(affectedAccountIds) {
    try {
        await loadAccounts();

        if (Array.isArray(affectedAccountIds) && affectedAccountIds.length) {
            const stillVisible = App.accounts.some(a => a.a_id === App.activeAccountId);
            if (!stillVisible) {
                const first = affectedAccountIds.find(id =>
                    App.accounts.some(a => a.a_id === Number(id)));
                if (first !== undefined) App.activeAccountId = Number(first);
            }
        }

        await loadLedger();
        renderCurrentView();
    } catch (err) {
        showToast(
            `The transaction was processed, but the refresh failed: ${err.message}. Reload the page to see current balances.`,
            'warning'
        );
    }
}

/* ------------------------------------------------------------------ *
 * Session / authentication (unchanged endpoints and payload shape)
 * ------------------------------------------------------------------ */

async function initApp() {
    try {
        const me = await api.getCurrentUser();
        await applySession(me);
    } catch (err) {
        if (err.status === 401) {
            await showLoggedOut();
        } else {
            await showLoggedOut();
            showToast(`Could not reach the SecureBank API: ${err.message}`, 'danger');
        }
    }
}

async function applySession(user) {
    App.user = user;

    const userSection = $('navbar-user-section');
    const guestSection = $('navbar-auth-section');
    const sidebar = $('sidebar-wrapper');
    const content = $('page-content-wrapper');

    if (userSection) userSection.classList.remove('d-none');
    if (guestSection) guestSection.classList.add('d-none');
    if (sidebar) sidebar.classList.remove('d-none');
    if (content) {
        content.style.marginLeft = '';
        content.style.width = '';
    }

    const nameEl = $('nav-user-name');
    const roleEl = $('nav-user-role');
    if (nameEl) nameEl.textContent = user.username || 'User';
    if (roleEl) {
        roleEl.textContent = user.role || 'ROLE';
        roleEl.className = `role-badge role-${user.role || ''}`;
    }

    // Land each role on a screen it can actually use.
    const menu = menuForRole(user.role);
    App.currentView = menu.length ? menu[0] : 'dashboard';

    buildSidebar();
    populatePersonas();

    await refreshAccountData([]);
}

async function showLoggedOut() {
    App.user = null;
    App.accounts = [];
    App.transactions = [];
    App.customers = [];
    App.loans = [];
    App.beneficiaries = [];
    App.suspicious = [];
    App.auditLogs = [];
    App.reportRows = [];
    App.reportKind = null;
    App.beneficiaryCustomerId = null;
    App.activeAccountId = null;
    App.currentView = 'login';

    const userSection = $('navbar-user-section');
    const guestSection = $('navbar-auth-section');
    const sidebar = $('sidebar-wrapper');
    const content = $('page-content-wrapper');

    if (userSection) userSection.classList.add('d-none');
    if (guestSection) guestSection.classList.remove('d-none');
    if (sidebar) sidebar.classList.add('d-none');
    if (content) {
        content.style.marginLeft = '0';
        content.style.width = '100%';
    }

    const menu = $('sidebar-menu-list');
    if (menu) menu.innerHTML = '';

    renderLoginView();
}

function renderLoginView() {
    const container = $('main-view-container');
    if (!container) return;
    container.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-5">
                <div class="stat-card">
                    <h4 class="fw-bold mb-1"><i class="fa-solid fa-shield-halved text-primary me-2"></i>SecureBank Portal</h4>
                    <p class="text-muted small mb-4">Sign in with your SecureBank credentials.</p>
                    <form onsubmit="event.preventDefault(); handleLogin();">
                        <div class="mb-3">
                            <label class="form-label small fw-bold" for="login-username">Username</label>
                            <input type="text" id="login-username" class="form-control" autocomplete="username" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold" for="login-password">Password</label>
                            <input type="password" id="login-password" class="form-control" autocomplete="current-password" required>
                        </div>
                        <div id="login-error"></div>
                        <button type="submit" id="login-submit" class="btn btn-primary w-100 fw-bold py-2">
                            <i class="fa-solid fa-right-to-bracket me-1"></i> Sign In
                        </button>
                    </form>

                    <div class="mt-4 pt-4 border-top">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="text-muted small fw-bold text-uppercase">Quick persona sign-in</span>
                            <span class="text-muted small">demo accounts</span>
                        </div>
                        <div class="d-flex flex-wrap gap-2">
                            ${personaButtonsHtml()}
                        </div>
                        <p class="text-muted small mb-0 mt-3">
                            One click signs in through the normal login API. Demo password:
                            <code>${esc(DEMO_PASSWORD)}</code>
                        </p>
                    </div>
                </div>
            </div>
        </div>`;
}

async function handleLogin(buttonEl) {
    const usernameEl = $('login-username');
    const passwordEl = $('login-password');
    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    if (!username || !password) {
        renderError('login-error', 'Login failed: username and password are required.', 'Sign-in failed');
        return null;
    }

    const user = await runGuarded(
        'Login',
        buttonEl || $('login-submit'),
        'login-error',
        () => api.login(username, password),
        async (u) => {
            await applySession(u);
            if (Number(u.user_id) >= 100) {
                showToast(`Signed in as ${u.username} (${u.role}) via the mock fallback \u2014 no users row exists, so database writes will not persist.`, 'warning');
            } else {
                showToast(`Signed in as ${u.username} (${u.role}).`, 'success');
            }
        },
        'Signing in\u2026'
    );

    if (user) {
        const passwordField = $('login-password');
        if (passwordField) passwordField.value = '';
    }
    return user;
}

async function handleLogout() {
    const button = document.querySelector('#navbar-user-section button[onclick="handleLogout()"]');
    await runGuarded('Logout', button, null, async () => {
        await api.logout();
        await showLoggedOut();
        showToast('You have been signed out.', 'success');
    }, 'Signing out\u2026');
}

/* Persona switcher — login page buttons + #persona-dropdown-menu in the navbar */
const DEMO_PERSONAS = [
    { username: 'customer1', role: 'CUSTOMER' },
    { username: 'teller1', role: 'TELLER' },
    { username: 'loanofficer1', role: 'LOAN_OFFICER' },
    { username: 'manager1', role: 'MANAGER' },
    { username: 'auditor1', role: 'AUDITOR' },
    { username: 'compliance1', role: 'COMPLIANCE' },
    { username: 'admin1', role: 'ADMIN' }
];

const DEMO_PASSWORD = 'Password123!';

function personaButtonsHtml() {
    return DEMO_PERSONAS.map(p => `
        <button type="button" class="persona-btn d-inline-flex align-items-center gap-2"
                data-persona="${esc(p.username)}" title="Sign in as ${esc(p.username)}"
                onclick="signInAsPersona('${esc(p.username)}', this)">
            <span class="role-badge role-${esc(p.role)}">${esc(p.role)}</span>
            <span class="fw-semibold small">${esc(p.username)}</span>
        </button>`).join('');
}

function populatePersonas() {
    const menu = $('persona-dropdown-menu');
    if (!menu) return;
    menu.innerHTML = DEMO_PERSONAS.map(p => `
        <li>
            <button class="dropdown-item d-flex justify-content-between align-items-center" type="button"
                    onclick="switchPersona('${esc(p.username)}')">
                <span class="fw-semibold small">${esc(p.username)}</span>
                <span class="role-badge role-${esc(p.role)}">${esc(p.role)}</span>
            </button>
        </li>`).join('');
}

/** Fill the login form for a demo persona and sign in through the normal login API. */
async function signInAsPersona(username, buttonEl) {
    const usernameEl = $('login-username');
    const passwordEl = $('login-password');
    if (!usernameEl || !passwordEl) {
        showToast('Sign-in form is not available. Please reload the page.', 'danger');
        return;
    }

    usernameEl.value = username;
    passwordEl.value = DEMO_PASSWORD;
    return handleLogin(buttonEl);
}

/** Navbar switcher: drop the current session, then sign in as the chosen persona. */
async function switchPersona(username) {
    try {
        await api.logout();
    } catch (err) {
        // Session may already be gone; continue to the login screen.
    }
    await showLoggedOut();
    await signInAsPersona(username, null);
}

/* ------------------------------------------------------------------ *
 * Sidebar / navigation — one menu per role (docs/prd.md section 4)
 * ------------------------------------------------------------------ */

const VIEW_META = {
    dashboard: { icon: 'fa-gauge-high', label: 'Dashboard' },
    customers: { icon: 'fa-users', label: 'Customers' },
    accounts: { icon: 'fa-wallet', label: 'Accounts' },
    transactions: { icon: 'fa-right-left', label: 'Transactions' },
    loans: { icon: 'fa-file-invoice-dollar', label: 'Loans' },
    beneficiaries: { icon: 'fa-address-book', label: 'Beneficiaries' },
    compliance: { icon: 'fa-shield-halved', label: 'Compliance' },
    audit: { icon: 'fa-clipboard-list', label: 'Audit Logs' },
    reports: { icon: 'fa-chart-column', label: 'Reports' }
};

/**
 * Screens per persona. Each entry is backed by endpoints that role is allowed
 * to call (verified against the route decorators), so nobody is offered a
 * screen that would only return 403.
 */
const MENU_BY_ROLE = {
    CUSTOMER: ['dashboard', 'accounts', 'transactions', 'beneficiaries', 'loans'],
    TELLER: ['dashboard', 'customers', 'accounts', 'transactions', 'beneficiaries', 'reports'],
    LOAN_OFFICER: ['dashboard', 'loans', 'reports'],
    MANAGER: ['dashboard', 'customers', 'accounts', 'transactions', 'loans', 'beneficiaries', 'compliance', 'audit', 'reports'],
    AUDITOR: ['dashboard', 'customers', 'accounts', 'loans', 'compliance', 'audit', 'reports'],
    COMPLIANCE: ['dashboard', 'customers', 'compliance', 'audit', 'reports'],
    ADMIN: ['dashboard', 'customers', 'accounts', 'transactions', 'loans', 'beneficiaries', 'compliance', 'audit', 'reports']
};

function menuForRole(roleName) {
    const items = MENU_BY_ROLE[roleName];
    return Array.isArray(items) ? items.slice() : ['dashboard'];
}

function menuLabel(view) {
    if (role() === 'CUSTOMER' && view === 'accounts') return 'My Accounts';
    if (role() === 'CUSTOMER' && view === 'loans') return 'My Loans';
    return VIEW_META[view].label;
}

function buildSidebar() {
    const menu = $('sidebar-menu-list');
    if (!menu) return;
    menu.innerHTML = menuForRole(role()).map(view => {
        const meta = VIEW_META[view];
        return `
        <a href="#" class="list-group-item list-group-item-sidebar${App.currentView === view ? ' active' : ''}"
           data-view="${esc(view)}" onclick="event.preventDefault(); navigate('${esc(view)}');">
            <i class="fa-solid ${esc(meta.icon)}"></i> ${esc(menuLabel(view))}
        </a>`;
    }).join('');
}

async function navigate(view) {
    if (menuForRole(role()).indexOf(view) === -1) {
        showToast('That screen is not part of your role.', 'warning');
        view = menuForRole(role())[0] || 'dashboard';
    }
    App.currentView = view;
    buildSidebar();
    try {
        await loadViewData(view);
        renderCurrentView();
    } catch (err) {
        showToast(`Could not load this view: ${err.message}`, 'danger');
    }
}

/** Fetch exactly what the requested screen needs. */
async function loadViewData(view) {
    if (view === 'transactions') { await loadLedger(); return; }
    if (view === 'customers') { await loadCustomers(); return; }
    if (view === 'loans') { await loadLoans(); return; }
    if (view === 'beneficiaries') {
        if (role() !== 'CUSTOMER' && !App.customers.length) {
            try { await loadCustomers(); } catch (err) { /* role may not list customers */ }
        }
        await loadBeneficiaries(App.beneficiaryCustomerId);
        return;
    }
    if (view === 'compliance') { await loadSuspicious(); return; }
    if (view === 'audit') { await loadAuditLogs(); return; }
    if (view === 'reports') { await loadReport(App.reportKind); return; }
}

function renderCurrentView() {
    const container = $('main-view-container');
    if (!container) return;

    if (!App.user) {
        renderLoginView();
        return;
    }

    switch (App.currentView) {
        case 'transactions': renderTransactionsView(); break;
        case 'accounts': renderAccountsView(); break;
        case 'customers': renderCustomersView(); break;
        case 'loans': renderLoansView(); break;
        case 'beneficiaries': renderBeneficiariesView(); break;
        case 'compliance': renderComplianceView(); break;
        case 'audit': renderAuditView(); break;
        case 'reports': renderReportsView(); break;
        default: renderDashboard();
    }
}

/* ------------------------------------------------------------------ *
 * Views — shared header
 * ------------------------------------------------------------------ */

/**
 * Identity strip shown at the top of every signed-in view.
 *
 * Why it exists: several roles legitimately read the same data (all staff
 * roles may list every account), so the dashboard body can look identical
 * after a persona switch. This strip states, in writing, who the session
 * belongs to - and whether that session is backed by a real users row or by
 * the backend's MOCK_USERS fallback (user_id >= 100).
 */
function identityStrip() {
    const u = App.user || {};
    const isMockSession = Number(u.user_id) >= 100;
    const scope = (u.role === 'CUSTOMER')
        ? 'Your own accounts only'
        : 'All accounts (staff read access)';

    return `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 p-3 rounded-3 border ${isMockSession ? 'border-warning bg-warning-subtle' : 'bg-light'}">
            <div class="d-flex align-items-center flex-wrap gap-2">
                <i class="fa-solid fa-id-badge text-primary"></i>
                <span class="fw-semibold">Signed in as ${esc(u.username || '')}</span>
                <span class="role-badge role-${esc(u.role || '')}">${esc(u.role || '')}</span>
                <span class="text-muted small">
                    user #${esc(u.user_id)}${u.customer_id ? ` \u00b7 customer #${esc(u.customer_id)}` : ''} \u00b7 ${esc(scope)}
                </span>
            </div>
            ${isMockSession
                ? '<span class="badge text-bg-warning"><i class="fa-solid fa-triangle-exclamation me-1"></i>MOCK SESSION \u2014 no users row, writes will not persist</span>'
                : '<span class="badge text-bg-light border text-muted">database-backed session</span>'}
        </div>`;
}

function pageTitle(title, subtitle) {
    return `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h4 class="fw-bold mb-0">${esc(title)}</h4>
                ${subtitle ? `<span class="text-muted small">${esc(subtitle)}</span>` : ''}
            </div>
        </div>`;
}

/* ------------------------------------------------------------------ *
 * View — dashboard
 * ------------------------------------------------------------------ */

function renderDashboard() {
    const container = $('main-view-container');
    const u = App.user;

    const cards = App.accounts.map(acc => `
        <div class="col-md-4">
            <div class="stat-card d-flex align-items-center gap-3">
                <div class="stat-icon" style="background-color:#e0f2fe;color:#0369a1;">
                    <i class="fa-solid fa-building-columns"></i>
                </div>
                <div>
                    <div class="text-muted small text-uppercase fw-semibold">${esc(acc.a_type || '')} \u00b7 ${esc(acc.a_number || '')}</div>
                    <div class="fs-4 fw-bold" data-balance-for="${esc(acc.a_id)}">${formatINR(acc.a_balance)}</div>
                    ${statusBadge(acc.a_status)}
                </div>
            </div>
        </div>`).join('');

    const canTransfer = hasRole('CUSTOMER', 'TELLER', 'MANAGER', 'ADMIN');

    container.innerHTML = `
        ${identityStrip()}
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h4 class="fw-bold mb-0">Welcome, ${esc(u.username)}</h4>
                <span class="text-muted small">Role: ${esc(u.role)}</span>
            </div>
            ${canTransfer ? `
            <button class="btn btn-primary fw-semibold" onclick="openTransferModal(${App.activeAccountId || 'null'})">
                <i class="fa-solid fa-paper-plane me-1"></i> Quick Transfer
            </button>` : ''}
        </div>

        <h6 class="fw-bold mb-2">
            ${u.role === 'CUSTOMER' ? `Your accounts (${App.accounts.length})` : `All accounts (${App.accounts.length})`}
        </h6>
        <div class="row g-3 mb-4">
            ${cards || '<div class="col-12"><div class="alert alert-secondary mb-0">No accounts are linked to this user.</div></div>'}
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-bold mb-0">Recent Account Activity</h6>
            ${role() === 'CUSTOMER' || hasRole('TELLER', 'MANAGER', 'ADMIN') ? '<a href="#" class="small text-decoration-none" onclick="event.preventDefault(); navigate(\'transactions\');">View full ledger</a>' : ''}
        </div>
        <div id="recent-activity">${renderLedgerTable(App.transactions.slice(0, 5), 'No recent activity for this account.')}</div>`;
}

/* ------------------------------------------------------------------ *
 * View — transactions (deposit / withdrawal / transfer)
 * ------------------------------------------------------------------ */

function renderTransactionsView() {
    const container = $('main-view-container');
    const canDeposit = hasRole('TELLER', 'MANAGER', 'ADMIN');
    const canWithdraw = hasRole('CUSTOMER', 'TELLER', 'MANAGER', 'ADMIN');
    const canTransfer = hasRole('CUSTOMER', 'TELLER', 'MANAGER', 'ADMIN');

    const accountOptions = App.accounts.map(acc =>
        `<option value="${esc(acc.a_id)}"${acc.a_id === App.activeAccountId ? ' selected' : ''}>${accountLabel(acc)} \u2014 ${formatINR(acc.a_balance)}</option>`
    ).join('');

    const allAccountOptions = App.accounts.map(acc =>
        `<option value="${esc(acc.a_id)}">${accountLabel(acc)} \u2014 ${formatINR(acc.a_balance)}</option>`
    ).join('');

    container.innerHTML = `
        ${identityStrip()}
        <h4 class="fw-bold mb-3">Transactions</h4>

        <div class="row g-3 mb-4">
            <div class="col-lg-4">
                <div class="stat-card h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-money-bill-wave text-success me-2"></i>Deposit</h6>
                    ${canDeposit ? `
                    <form onsubmit="event.preventDefault(); submitDeposit();">
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="deposit-account-id">Account</label>
                            <select id="deposit-account-id" class="form-select">${accountOptions}</select>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="deposit-amount">Amount (\u20b9)</label>
                            <input type="number" step="0.01" min="0.01" id="deposit-amount" class="form-control" placeholder="0.00" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="deposit-desc">Description</label>
                            <input type="text" id="deposit-desc" class="form-control" value="Cash deposit">
                        </div>
                        <div id="deposit-error"></div>
                        <button type="submit" id="deposit-submit" class="btn btn-success w-100 fw-bold">Deposit</button>
                    </form>` : `<p class="text-muted small mb-0">Deposits are performed by branch staff (TELLER, MANAGER or ADMIN).</p>`}
                </div>
            </div>

            <div class="col-lg-4">
                <div class="stat-card h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-hand-holding-dollar text-warning me-2"></i>Withdrawal</h6>
                    ${canWithdraw ? `
                    <form onsubmit="event.preventDefault(); submitWithdraw();">
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="withdraw-account-id">Account</label>
                            <select id="withdraw-account-id" class="form-select">${accountOptions}</select>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="withdraw-amount">Amount (\u20b9)</label>
                            <input type="number" step="0.01" min="0.01" id="withdraw-amount" class="form-control" placeholder="0.00" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold" for="withdraw-desc">Description</label>
                            <input type="text" id="withdraw-desc" class="form-control" value="Cash withdrawal">
                        </div>
                        <div id="withdraw-error"></div>
                        <button type="submit" id="withdraw-submit" class="btn btn-warning w-100 fw-bold">Withdraw</button>
                    </form>` : `<p class="text-muted small mb-0">Withdrawals require transaction permissions.</p>`}
                </div>
            </div>

            <div class="col-lg-4">
                <div class="stat-card h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-paper-plane text-primary me-2"></i>Transfer</h6>
                    ${canTransfer ? `
                    <p class="text-muted small">Atomic two-legged transfer. On any failure the whole transaction rolls back.</p>
                    <div class="mb-2">
                        <label class="form-label small fw-bold" for="quick-from">Source account</label>
                        <select id="quick-from" class="form-select">${allAccountOptions}</select>
                    </div>
                    <button class="btn btn-primary w-100 fw-bold" onclick="openTransferModalFromSelect()">
                        Open transfer form
                    </button>` : `<p class="text-muted small mb-0">Transfers require transaction permissions.</p>`}
                </div>
            </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-bold mb-0">Transaction Ledger</h6>
            <select id="ledger-account" class="form-select form-select-sm w-auto" onchange="selectLedgerAccount(this.value)">
                ${accountOptions}
            </select>
        </div>
        <div id="ledger-container">${renderLedgerTable(App.transactions, 'No transactions recorded for this account yet.')}</div>`;
}

/* ------------------------------------------------------------------ *
 * View — accounts (staff: list + open account + status; customer: own)
 * ------------------------------------------------------------------ */

function renderAccountsView() {
    const container = $('main-view-container');
    const isCustomer = role() === 'CUSTOMER';
    const canOpen = hasRole('TELLER', 'MANAGER', 'ADMIN');
    const canChangeStatus = hasRole('MANAGER', 'ADMIN');

    const rows = App.accounts.map(acc => `
        <tr>
            <td>${esc(acc.a_id)}</td>
            <td>${esc(acc.a_number || '')}</td>
            <td>${esc(acc.c_name || '\u2014')}</td>
            <td>${esc(acc.b_name || '\u2014')}</td>
            <td>${esc(acc.a_type || '')}</td>
            <td class="fw-semibold">${formatINR(acc.a_balance)}</td>
            <td>${statusBadge(acc.a_status)}</td>
            ${canChangeStatus ? `<td>
                <select class="form-select form-select-sm" onchange="submitAccountStatus(${esc(acc.a_id)}, this.value, this)">
                    <option value="">Change status\u2026</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="FROZEN">FROZEN</option>
                    <option value="CLOSED">CLOSED</option>
                </select>
            </td>` : ''}
        </tr>`).join('');

    const openForm = (canOpen && !isCustomer) ? `
        <div class="stat-card mb-4">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-plus text-primary me-2"></i>Open a new account</h6>
            <form onsubmit="event.preventDefault(); submitOpenAccount();">
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="acct-customer-id">Customer ID</label>
                        <input type="number" min="1" id="acct-customer-id" class="form-control" placeholder="1" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="acct-branch-id">Branch ID</label>
                        <input type="number" min="1" id="acct-branch-id" class="form-control" value="1" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="acct-type">Type</label>
                        <select id="acct-type" class="form-select">
                            <option value="SAVINGS">SAVINGS</option>
                            <option value="CURRENT">CURRENT</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="acct-deposit">Initial deposit (\u20b9)</label>
                        <input type="number" step="0.01" min="0" id="acct-deposit" class="form-control" value="0.00">
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button type="submit" id="acct-open-submit" class="btn btn-primary w-100 fw-bold">Open</button>
                    </div>
                </div>
                <div id="acct-open-error"></div>
            </form>
        </div>` : '';

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle(isCustomer ? 'My Accounts' : 'Accounts',
                    isCustomer ? 'Accounts linked to your customer record' : 'Branch-wide account register')}
        ${openForm}
        ${table(
            ['ID', 'Account No.', 'Customer', 'Branch', 'Type', 'Balance', 'Status'].concat(canChangeStatus ? ['Change status'] : []),
            rows || emptyRow(canChangeStatus ? 8 : 7, 'No accounts found.')
        )}`;
}

/* ------------------------------------------------------------------ *
 * View — customers (register / search / update KYC)
 * ------------------------------------------------------------------ */

function renderCustomersView() {
    const container = $('main-view-container');
    const canRegister = hasRole('TELLER', 'MANAGER', 'ADMIN');
    const canUpdate = hasRole('TELLER', 'MANAGER', 'ADMIN');

    const rows = App.customers.map(c => `
        <tr>
            <td>${esc(firstOf(c, ['c_id'], ''))}</td>
            <td>${esc(customerName(c))}</td>
            <td>${esc(firstOf(c, ['c_email'], ''))}</td>
            <td>${esc(firstOf(c, ['c_phone'], ''))}</td>
            <td>${statusBadge(firstOf(c, ['c_kyc', 'c_kyc_status'], 'PENDING'))}</td>
            <td>${esc(firstOf(c, ['c_dob', 'c_created'], '\u2014'))}</td>
            ${canUpdate ? `<td>
                <select class="form-select form-select-sm" onchange="submitCustomerKyc(${esc(firstOf(c, ['c_id'], 0))}, this.value, this)">
                    <option value="">Set KYC\u2026</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                </select>
            </td>` : ''}
        </tr>`).join('');

    const registerForm = canRegister ? `
        <div class="stat-card mb-4">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-user-plus text-primary me-2"></i>Register a customer</h6>
            <form onsubmit="event.preventDefault(); submitNewCustomer();">
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="cust-name">Full name</label>
                        <input type="text" id="cust-name" class="form-control" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="cust-email">Email</label>
                        <input type="email" id="cust-email" class="form-control" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="cust-phone">Phone</label>
                        <input type="text" id="cust-phone" class="form-control" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="cust-dob">Date of birth</label>
                        <input type="date" id="cust-dob" class="form-control">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="cust-kyc">KYC</label>
                        <select id="cust-kyc" class="form-select">
                            <option value="PENDING">PENDING</option>
                            <option value="VERIFIED">VERIFIED</option>
                            <option value="REJECTED">REJECTED</option>
                        </select>
                    </div>
                </div>
                <div class="row g-2 mt-1">
                    <div class="col-md-8">
                        <label class="form-label small fw-bold" for="cust-address">Address</label>
                        <input type="text" id="cust-address" class="form-control" placeholder="Mumbai">
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <button type="submit" id="cust-submit" class="btn btn-primary w-100 fw-bold">Register</button>
                    </div>
                </div>
                <div id="cust-error"></div>
            </form>
        </div>` : '';

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle('Customers', canRegister ? 'Register customers and manage KYC status' : 'Customer register (read only)')}
        ${registerForm}
        ${table(
            ['ID', 'Name', 'Email', 'Phone', 'KYC', 'Date of birth'].concat(canUpdate ? ['Set KYC'] : []),
            rows || emptyRow(canUpdate ? 7 : 6, 'No customers found.')
        )}`;
}

/* ------------------------------------------------------------------ *
 * View — loans (apply, then approve / reject)
 * ------------------------------------------------------------------ */

function renderLoansView() {
    const container = $('main-view-container');
    const isCustomer = role() === 'CUSTOMER';
    const canApply = true; // POST /api/loans allows any logged-in user
    const canDecide = hasRole('LOAN_OFFICER', 'MANAGER', 'ADMIN');

    const rows = App.loans.map(l => `
        <tr>
            <td>${esc(firstOf(l, ['l_id'], ''))}</td>
            <td>${esc(firstOf(l, ['c_name'], isCustomer ? 'You' : '\u2014'))}</td>
            <td>${esc(firstOf(l, ['l_type'], ''))}</td>
            <td class="fw-semibold">${formatINR(firstOf(l, ['l_amount'], 0))}</td>
            <td>${esc(firstOf(l, ['l_rate'], ''))}%</td>
            <td>${esc(firstOf(l, ['l_months', 'l_tenure_months'], ''))}</td>
            <td>${firstOf(l, ['l_emi'], null) === null ? '\u2014' : formatINR(firstOf(l, ['l_emi'], 0))}</td>
            <td>${statusBadge(firstOf(l, ['l_status'], 'PENDING'))}</td>
            ${canDecide ? `<td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-success" onclick="submitLoanStatus(${esc(firstOf(l, ['l_id'], 0))}, 'APPROVED', this)">Approve</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="submitLoanStatus(${esc(firstOf(l, ['l_id'], 0))}, 'REJECTED', this)">Reject</button>
                </div>
            </td>` : ''}
        </tr>`).join('');

    const applyForm = canApply ? `
        <div class="stat-card mb-4">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-file-invoice-dollar text-primary me-2"></i>Apply for a loan</h6>
            <form onsubmit="event.preventDefault(); submitLoanApplication();">
                <div class="row g-2">
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="loan-customer-id">Customer ID</label>
                        <input type="number" min="1" id="loan-customer-id" class="form-control"
                               value="${esc(isCustomer ? (App.user && App.user.customer_id) || '' : '')}"
                               ${isCustomer ? 'readonly' : ''} required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="loan-type">Loan type</label>
                        <input type="text" id="loan-type" class="form-control" list="loan-type-options" value="Home Loan" required>
                        <datalist id="loan-type-options">
                            <option value="Home Loan"></option>
                            <option value="Auto Loan"></option>
                            <option value="Personal Loan"></option>
                        </datalist>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="loan-principal">Principal (\u20b9)</label>
                        <input type="number" step="0.01" min="0.01" id="loan-principal" class="form-control" placeholder="500000" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="loan-rate">Interest rate (%)</label>
                        <input type="number" step="0.01" min="0" id="loan-rate" class="form-control" value="8.50" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="loan-tenure">Tenure (months)</label>
                        <input type="number" min="1" id="loan-tenure" class="form-control" value="60" required>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button type="submit" id="loan-submit" class="btn btn-primary w-100 fw-bold">Apply</button>
                    </div>
                </div>
                <div id="loan-error"></div>
            </form>
        </div>` : '';

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle(isCustomer ? 'My Loans' : 'Loans',
                    canDecide ? 'Loan applications awaiting a decision' : 'Loan records')}
        ${applyForm}
        ${table(
            ['ID', 'Customer', 'Type', 'Principal', 'Rate', 'Tenure (mo)', 'EMI', 'Status'].concat(canDecide ? ['Decision'] : []),
            rows || emptyRow(canDecide ? 9 : 8, 'No loans found.')
        )}`;
}

/* ------------------------------------------------------------------ *
 * View — beneficiaries (add payees, verify / block)
 * ------------------------------------------------------------------ */

function renderBeneficiariesView() {
    const container = $('main-view-container');
    const isCustomer = role() === 'CUSTOMER';
    const canApprove = hasRole('TELLER', 'MANAGER', 'ADMIN');
    const customerId = App.beneficiaryCustomerId ||
        (isCustomer ? (App.user && App.user.customer_id) : null);

    const picker = (!isCustomer) ? `
        <div class="stat-card mb-4">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-magnifying-glass text-primary me-2"></i>Choose a customer</h6>
            <div class="row g-2 align-items-end">
                <div class="col-md-3">
                    <label class="form-label small fw-bold" for="ben-customer-id">Customer</label>
                    <select id="ben-customer-id" class="form-select" onchange="selectBeneficiaryCustomer(this.value)">
                        <option value="">Select a customer\u2026</option>
                        ${App.customers.map(c => `<option value="${esc(firstOf(c, ['c_id'], ''))}"${Number(firstOf(c, ['c_id'], 0)) === Number(customerId) ? ' selected' : ''}>#${esc(firstOf(c, ['c_id'], ''))} \u2014 ${esc(customerName(c))}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold" for="ben-customer-manual">\u2026or type a customer ID</label>
                    <div class="input-group">
                        <input type="number" min="1" id="ben-customer-manual" class="form-control" placeholder="1">
                        <button class="btn btn-outline-primary" type="button" onclick="selectBeneficiaryCustomer($('ben-customer-manual').value)">Load</button>
                    </div>
                </div>
            </div>
        </div>` : '';

    const rows = App.beneficiaries.map(b => `
        <tr>
            <td>${esc(firstOf(b, ['be_id', 'b_id'], ''))}</td>
            <td>${esc(firstOf(b, ['be_name', 'b_name'], ''))}</td>
            <td>${esc(firstOf(b, ['be_bank', 'b_bank_name'], ''))}</td>
            <td>${esc(firstOf(b, ['be_acc_no', 'b_account_num'], ''))}</td>
            <td>${esc(firstOf(b, ['be_ifsc', 'b_ifsc'], ''))}</td>
            <td>${statusBadge(firstOf(b, ['be_status', 'b_status'], 'PENDING'))}</td>
            ${canApprove ? `<td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-success" onclick="submitBeneficiaryStatus(${esc(firstOf(b, ['be_id', 'b_id'], 0))}, 'ACTIVE', this)">Verify</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="submitBeneficiaryStatus(${esc(firstOf(b, ['be_id', 'b_id'], 0))}, 'BLOCKED', this)">Block</button>
                </div>
            </td>` : ''}
        </tr>`).join('');

    const addForm = (customerId || isCustomer) ? `
        <div class="stat-card mb-4">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-user-plus text-primary me-2"></i>Add a beneficiary</h6>
            <form onsubmit="event.preventDefault(); submitNewBeneficiary();">
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="ben-name">Beneficiary name</label>
                        <input type="text" id="ben-name" class="form-control" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="ben-bank">Bank name</label>
                        <input type="text" id="ben-bank" class="form-control" placeholder="HDFC Bank" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold" for="ben-account">Account number</label>
                        <input type="text" id="ben-account" class="form-control" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold" for="ben-ifsc">IFSC</label>
                        <input type="text" id="ben-ifsc" class="form-control" placeholder="HDFC0001234" required>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button type="submit" id="ben-submit" class="btn btn-primary w-100 fw-bold">Add</button>
                    </div>
                </div>
                <p class="text-muted small mb-0 mt-2">IFSC must look like ABCD0123456 (4 letters, 0, then 6 alphanumerics).</p>
                <div id="ben-error"></div>
            </form>
        </div>` : '';

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle('Beneficiaries',
                    customerId ? `Payees for customer #${esc(customerId)}` : 'Select a customer to view their payees')}
        ${picker}
        ${addForm}
        ${table(
            ['ID', 'Name', 'Bank', 'Account no.', 'IFSC', 'Status'].concat(canApprove ? ['Decision'] : []),
            App.beneficiaries.length ? rows : emptyRow(canApprove ? 7 : 6, customerId ? 'No beneficiaries recorded for this customer.' : 'No customer selected.')
        )}`;
}

/* ------------------------------------------------------------------ *
 * View — compliance (suspicious transaction review)
 * ------------------------------------------------------------------ */

function renderComplianceView() {
    const container = $('main-view-container');
    const canReview = hasRole('COMPLIANCE', 'ADMIN');

    const rows = App.suspicious.map(s => `
        <tr>
            <td>${esc(firstOf(s, ['s_id', 'st_id'], ''))}</td>
            <td>${esc(firstOf(s, ['s_txn_id', 'st_txn_id'], '\u2014'))}</td>
            <td>${esc(firstOf(s, ['s_reason', 'st_reason'], ''))}</td>
            <td>${statusBadge(firstOf(s, ['s_status', 'st_status'], 'PENDING'))}</td>
            <td>${formatWhen(firstOf(s, ['s_created', 'st_created'], ''))}</td>
            ${canReview ? `<td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-secondary" onclick="submitSuspiciousReview(${esc(firstOf(s, ['s_id', 'st_id'], 0))}, 'REVIEWED', this)">Reviewed</button>
                    <button class="btn btn-sm btn-success" onclick="submitSuspiciousReview(${esc(firstOf(s, ['s_id', 'st_id'], 0))}, 'CLEARED', this)">Clear</button>
                    <button class="btn btn-sm btn-danger" onclick="submitSuspiciousReview(${esc(firstOf(s, ['s_id', 'st_id'], 0))}, 'CONFIRMED', this)">Confirm</button>
                </div>
            </td>` : ''}
        </tr>`).join('');

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle('Compliance', canReview ? 'Flagged transactions awaiting review' : 'Flagged transactions (read only)')}
        ${table(
            ['ID', 'Transaction', 'Reason', 'Status', 'Flagged at'].concat(canReview ? ['Review'] : []),
            rows || emptyRow(canReview ? 6 : 5, 'No suspicious transactions flagged.')
        )}`;
}

/* ------------------------------------------------------------------ *
 * View — audit logs
 * ------------------------------------------------------------------ */

function renderAuditView() {
    const container = $('main-view-container');

    const rows = App.auditLogs.map(log => `
        <tr>
            <td>${esc(firstOf(log, ['log_id'], ''))}</td>
            <td>${esc(firstOf(log, ['username'], '')) || '#' + esc(firstOf(log, ['log_user_id'], ''))}</td>
            <td>${esc(firstOf(log, ['log_action'], ''))}</td>
            <td>${esc(firstOf(log, ['log_details'], ''))}</td>
            <td>${esc(firstOf(log, ['log_txn_id'], '\u2014'))}</td>
            <td>${formatWhen(firstOf(log, ['log_time'], ''))}</td>
        </tr>`).join('');

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle('Audit Logs', 'Append-only trail written by trg_audit_txn and application actions')}
        <div class="d-flex justify-content-end mb-2">
            <button class="btn btn-outline-primary btn-sm" onclick="navigate('audit')">
                <i class="fa-solid fa-rotate me-1"></i> Refresh
            </button>
        </div>
        ${table(['ID', 'User', 'Action', 'Details', 'Transaction', 'When'],
                rows || emptyRow(6, 'No audit records yet.'))}`;
}

/* ------------------------------------------------------------------ *
 * View — reports (role-filtered; one tab per authorised view)
 * ------------------------------------------------------------------ */

function renderReportsView() {
    const container = $('main-view-container');
    const tabs = allowedReportTabs();

    if (!tabs.length) {
        container.innerHTML = `
            ${identityStrip()}
            ${pageTitle('Reports', '')}
            <div class="alert alert-secondary mb-0">No reports are available for your role.</div>`;
        return;
    }

    const tabBar = tabs.map(tab => `
        <button type="button" class="persona-btn me-2 mb-2${App.reportKind === tab.kind ? ' active' : ''}"
                onclick="selectReport('${esc(tab.kind)}')">
            <i class="fa-solid ${esc(tab.icon)} me-1"></i> ${esc(tab.label)}
        </button>`).join('');

    // Columns come from whichever keys the report actually returns.
    const rowsData = App.reportRows;
    const columns = rowsData.length ? Object.keys(rowsData[0]).slice(0, 8) : [];
    const body = rowsData.length
        ? rowsData.map(row => `<tr>${columns.map(col => {
            const value = row[col];
            if (col === 'a_balance' || col === 't_amount' || col === 'l_amount' || col === 'l_emi') {
                return `<td class="fw-semibold">${formatINR(value)}</td>`;
            }
            if (String(col).indexOf('status') !== -1) return `<td>${statusBadge(value)}</td>`;
            return `<td>${esc(value === null || value === undefined ? '\u2014' : value)}</td>`;
        }).join('')}</tr>`).join('')
        : emptyRow(columns.length || 1, 'No rows returned by this report.');

    container.innerHTML = `
        ${identityStrip()}
        ${pageTitle('Reports', 'Read-only views; only the reports your role authorises are listed')}
        <div class="mb-3">${tabBar}</div>
        ${table(columns.map(c => String(c).replace(/_/g, ' ').toUpperCase()), body)}`;
}

/* ------------------------------------------------------------------ *
 * Ledger table (shared by dashboard and transactions)
 * ------------------------------------------------------------------ */

function renderLedgerTable(rows, emptyMessage) {
    if (!rows || !rows.length) {
        return `<div class="alert alert-secondary mb-0">${esc(emptyMessage)}</div>`;
    }
    const body = rows.map(t => {
        const description = t.t_desc || t.t_description || '';
        return `
            <tr data-txn-id="${esc(t.t_id)}">
                <td>${esc(t.t_id)}</td>
                <td><span class="badge-status status-${esc(t.t_type === 'DEPOSIT' ? 'ACTIVE' : (t.t_type === 'WITHDRAWAL' ? 'FROZEN' : 'PENDING'))}">${esc(t.t_type)}</span></td>
                <td>${esc(t.t_acc_id)}${t.t_related_acc_id ? ` \u2192 ${esc(t.t_related_acc_id)}` : ''}</td>
                <td class="fw-semibold">${formatINR(t.t_amount)}</td>
                <td>${esc(description)}</td>
                <td>${formatWhen(t.t_time)}</td>
            </tr>`;
    }).join('');

    return table(['Txn', 'Type', 'Account', 'Amount', 'Description', 'When'], body);
}

async function selectLedgerAccount(accountId) {
    App.activeAccountId = Number(accountId);
    try {
        await loadLedger();
        const holder = $('ledger-container');
        if (holder) {
            holder.innerHTML = renderLedgerTable(App.transactions, 'No transactions recorded for this account yet.');
        }
        const recent = $('recent-activity');
        if (recent) {
            recent.innerHTML = renderLedgerTable(App.transactions.slice(0, 5), 'No recent activity for this account.');
        }
    } catch (err) {
        showToast(`Could not load the ledger: ${err.message}`, 'danger');
    }
}

/* ------------------------------------------------------------------ *
 * Bootstrap availability + a built-in fallback
 * ------------------------------------------------------------------ */

function bootstrapModalAvailable() {
    return !!(window.bootstrap && window.bootstrap.Modal);
}

function bootstrapToastAvailable() {
    return !!(window.bootstrap && window.bootstrap.Toast);
}

/** Drive the existing modal markup directly when Bootstrap JS is unavailable. */
function openModalMarkup(el) {
    el.style.display = 'block';
    el.classList.add('show');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('role', 'dialog');
    el.removeAttribute('aria-hidden');
    if (document.body) document.body.classList.add('modal-open');

    let backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.addEventListener('click', () => closeModalMarkup(el));
        if (document.body) document.body.appendChild(backdrop);
    }
}

function closeModalMarkup(el) {
    el.classList.remove('show');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    if (document.body) document.body.classList.remove('modal-open');
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();
}

let modalDismissWired = false;

/** Wire the modal's own close button and Escape, which Bootstrap normally handles. */
function wireModalDismiss(el) {
    if (modalDismissWired) return;
    modalDismissWired = true;
    el.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.closest && target.closest('[data-bs-dismiss="modal"]')) {
            closeModalMarkup(el);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModalMarkup(el);
    });
}

/* ------------------------------------------------------------------ *
 * Transfer modal (existing #transferModal markup)
 * ------------------------------------------------------------------ */

function transferModalInstance() {
    const el = $('transferModal');
    if (!el || !bootstrapModalAvailable()) return null;
    return window.bootstrap.Modal.getOrCreateInstance(el);
}

/**
 * Create the inline error slot once, without editing index.html.
 *
 * The submit button sits inside the modal's <form>, so the slot must be inserted
 * into that same parent. insertBefore() throws NotFoundError if the reference
 * node is not a direct child of the element it is called on - which is exactly
 * what stopped this modal from ever opening.
 */
function ensureTransferErrorSlot() {
    if ($('transfer-error')) return;
    const modalBody = document.querySelector('#transferModal .modal-body');
    if (!modalBody) return;

    const submit = modalBody.querySelector('button[type="submit"]');
    const parent = (submit && submit.parentNode) ? submit.parentNode : modalBody;
    const slot = document.createElement('div');
    slot.id = 'transfer-error';

    try {
        parent.insertBefore(slot, submit || null);
    } catch (err) {
        modalBody.appendChild(slot);
    }
}

function transferSubmitButton() {
    return document.querySelector('#transferModal button[type="submit"]');
}

function showTransferModal() {
    const el = $('transferModal');
    if (!el) return;
    const modal = transferModalInstance();
    if (modal) {
        try {
            modal.show();
            return;
        } catch (err) {
            console.warn('Bootstrap Modal failed; using the built-in fallback.', err);
        }
    }
    wireModalDismiss(el);
    openModalMarkup(el);
}

function hideTransferModal() {
    const el = $('transferModal');
    if (!el) return;
    const modal = transferModalInstance();
    if (modal) {
        try {
            modal.hide();
            return;
        } catch (err) {
            console.warn('Bootstrap Modal failed; using the built-in fallback.', err);
        }
    }
    closeModalMarkup(el);
}

function openTransferModal(sourceAccountId) {
    try {
        ensureTransferErrorSlot();
        clearError('transfer-error');
        const fromEl = $('transfer-from-id');
        const amountEl = $('transfer-amount');
        if (fromEl && sourceAccountId) fromEl.value = sourceAccountId;
        if (amountEl) amountEl.value = '';
        showTransferModal();
    } catch (err) {
        // A silent dead button is worse than a loud error.
        console.error('Could not open the transfer form:', err);
        showToast(`Could not open the transfer form: ${err.message}`, 'danger');
    }
}

function openTransferModalFromSelect() {
    const select = $('quick-from');
    openTransferModal(select ? Number(select.value) : null);
}

async function submitTransfer() {
    const fromEl = $('transfer-from-id');
    const toEl = $('transfer-to-id');
    const amountEl = $('transfer-amount');
    const descEl = $('transfer-desc');
    if (!fromEl || !toEl || !amountEl) return null;

    const fromId = Number(fromEl.value);
    const toId = Number(toEl.value);
    const amount = Number(amountEl.value);

    // Input validation only. Balance checking belongs to the backend.
    if (!fromId || !toId) {
        renderError('transfer-error', 'Transfer failed: source and destination account IDs are required.', 'Please correct the form');
        return null;
    }
    if (fromId === toId) {
        renderError('transfer-error', 'Transfer failed: source and destination accounts must differ.', 'Please correct the form');
        return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        renderError('transfer-error', 'Transfer failed: enter an amount greater than zero.', 'Please correct the form');
        return null;
    }

    const description = (descEl && descEl.value) ? descEl.value : 'Account Transfer';

    return await runGuarded(
        'Transfer',
        transferSubmitButton(),
        'transfer-error',
        () => api.transfer(fromId, toId, amount, description),
        async (txn) => {
            hideTransferModal();
            if (amountEl) amountEl.value = '';
            showToast(
                `Transfer successful. ${formatINR(amount)} moved from account ${fromId} to account ${toId}.` +
                (txn && txn.t_id ? ` Transaction #${txn.t_id}.` : ''),
                'success'
            );
            await refreshAccountData([fromId, toId]);
        },
        'Transferring\u2026'
    );
}

/* ------------------------------------------------------------------ *
 * Deposit / withdrawal (same pattern as transfer)
 * ------------------------------------------------------------------ */

async function submitDeposit() {
    const accountEl = $('deposit-account-id');
    const amountEl = $('deposit-amount');
    const descEl = $('deposit-desc');
    if (!accountEl || !amountEl) return null;

    const accountId = Number(accountEl.value);
    const amount = Number(amountEl.value);

    if (!accountId) {
        renderError('deposit-error', 'Deposit failed: select an account.', 'Please correct the form');
        return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        renderError('deposit-error', 'Deposit failed: enter an amount greater than zero.', 'Please correct the form');
        return null;
    }

    const description = (descEl && descEl.value) ? descEl.value : 'Cash deposit';

    return await runGuarded(
        'Deposit',
        $('deposit-submit'),
        'deposit-error',
        () => api.deposit(accountId, amount, description),
        async (txn) => {
            if (amountEl) amountEl.value = '';
            showToast(
                `Deposit successful. ${formatINR(amount)} credited to account ${accountId}.` +
                (txn && txn.t_id ? ` Transaction #${txn.t_id}.` : ''),
                'success'
            );
            await refreshAccountData([accountId]);
        },
        'Depositing\u2026'
    );
}

async function submitWithdraw() {
    const accountEl = $('withdraw-account-id');
    const amountEl = $('withdraw-amount');
    const descEl = $('withdraw-desc');
    if (!accountEl || !amountEl) return null;

    const accountId = Number(accountEl.value);
    const amount = Number(amountEl.value);

    if (!accountId) {
        renderError('withdraw-error', 'Withdrawal failed: select an account.', 'Please correct the form');
        return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        renderError('withdraw-error', 'Withdrawal failed: enter an amount greater than zero.', 'Please correct the form');
        return null;
    }

    const description = (descEl && descEl.value) ? descEl.value : 'Cash withdrawal';

    return await runGuarded(
        'Withdrawal',
        $('withdraw-submit'),
        'withdraw-error',
        () => api.withdraw(accountId, amount, description),
        async (txn) => {
            if (amountEl) amountEl.value = '';
            showToast(
                `Withdrawal successful. ${formatINR(amount)} debited from account ${accountId}.` +
                (txn && txn.t_id ? ` Transaction #${txn.t_id}.` : ''),
                'success'
            );
            await refreshAccountData([accountId]);
        },
        'Withdrawing\u2026'
    );
}

/* ------------------------------------------------------------------ *
 * Customer / account / loan / beneficiary / compliance actions
 * ------------------------------------------------------------------ */

async function submitNewCustomer() {
    const nameEl = $('cust-name');
    const emailEl = $('cust-email');
    const phoneEl = $('cust-phone');
    const addressEl = $('cust-address');
    const dobEl = $('cust-dob');
    const kycEl = $('cust-kyc');
    if (!nameEl || !emailEl || !phoneEl) return null;

    const payload = {
        full_name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        address: addressEl ? addressEl.value.trim() : '',
        date_of_birth: dobEl && dobEl.value ? dobEl.value : null,
        kyc_status: kycEl ? kycEl.value : 'PENDING'
    };

    if (!payload.full_name || !payload.email || !payload.phone) {
        renderError('cust-error', 'Customer registration failed: name, email and phone are required.', 'Please correct the form');
        return null;
    }

    return await runGuarded(
        'Customer registration',
        $('cust-submit'),
        'cust-error',
        () => api.createCustomer(payload),
        async (customer) => {
            if (nameEl) nameEl.value = '';
            if (emailEl) emailEl.value = '';
            if (phoneEl) phoneEl.value = '';
            if (addressEl) addressEl.value = '';
            if (dobEl) dobEl.value = '';
            showToast(`Customer registered${customer && customer.c_id ? ` (#${customer.c_id})` : ''}.`, 'success');
            await loadCustomers();
            renderCurrentView();
        },
        'Registering\u2026'
    );
}

async function submitCustomerKyc(customerId, status, selectEl) {
    if (!status) return null;
    return await runGuarded(
        'KYC update',
        selectEl,
        'cust-error',
        () => api.updateCustomer(customerId, { kyc_status: status }),
        async () => {
            showToast(`Customer #${customerId} KYC set to ${status}.`, 'success');
            await loadCustomers();
            renderCurrentView();
        },
        'Saving\u2026'
    );
}

async function submitOpenAccount() {
    const customerEl = $('acct-customer-id');
    const branchEl = $('acct-branch-id');
    const typeEl = $('acct-type');
    const depositEl = $('acct-deposit');
    if (!customerEl || !branchEl || !typeEl) return null;

    const customerId = Number(customerEl.value);
    const branchId = Number(branchEl.value);
    const accountType = typeEl.value;
    const initialDeposit = depositEl ? Number(depositEl.value || 0) : 0;

    if (!customerId || !branchId) {
        renderError('acct-open-error', 'Account creation failed: customer ID and branch ID are required.', 'Please correct the form');
        return null;
    }
    if (!Number.isFinite(initialDeposit) || initialDeposit < 0) {
        renderError('acct-open-error', 'Account creation failed: initial deposit cannot be negative.', 'Please correct the form');
        return null;
    }

    return await runGuarded(
        'Account creation',
        $('acct-open-submit'),
        'acct-open-error',
        () => api.openAccount({
            customer_id: customerId,
            branch_id: branchId,
            account_type: accountType,
            initial_deposit: initialDeposit
        }),
        async (account) => {
            if (depositEl) depositEl.value = '0.00';
            showToast(
                `Account opened${account && account.a_number ? ` (${account.a_number})` : ''} for customer #${customerId}.`,
                'success'
            );
            await refreshAccountData([]);
        },
        'Opening\u2026'
    );
}

async function submitAccountStatus(accountId, status, selectEl) {
    if (!status) return null;
    return await runGuarded(
        'Account status change',
        selectEl,
        null,
        () => api.updateAccountStatus(accountId, status),
        async () => {
            showToast(`Account #${accountId} is now ${status}.`, 'success');
            await refreshAccountData([]);
        },
        'Saving\u2026'
    );
}

async function submitLoanApplication() {
    const customerEl = $('loan-customer-id');
    const typeEl = $('loan-type');
    const principalEl = $('loan-principal');
    const rateEl = $('loan-rate');
    const tenureEl = $('loan-tenure');
    if (!customerEl || !typeEl || !principalEl || !rateEl || !tenureEl) return null;

    const customerId = Number(customerEl.value);
    const loanType = typeEl.value.trim();
    const principal = Number(principalEl.value);
    const rate = Number(rateEl.value);
    const tenure = Number(tenureEl.value);

    if (!customerId || !loanType) {
        renderError('loan-error', 'Loan application failed: customer and loan type are required.', 'Please correct the form');
        return null;
    }
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(tenure) || tenure <= 0) {
        renderError('loan-error', 'Loan application failed: principal and tenure must be greater than zero.', 'Please correct the form');
        return null;
    }

    return await runGuarded(
        'Loan application',
        $('loan-submit'),
        'loan-error',
        () => api.applyLoan({
            customer_id: customerId,
            loan_type: loanType,
            principal_amount: principal,
            interest_rate: rate,
            tenure_months: tenure
        }),
        async (loan) => {
            if (principalEl) principalEl.value = '';
            showToast(
                `Loan application submitted${loan && loan.l_id ? ` (#${loan.l_id})` : ''} \u2014 status PENDING.`,
                'success'
            );
            await loadLoans();
            renderCurrentView();
        },
        'Submitting\u2026'
    );
}

async function submitLoanStatus(loanId, status, buttonEl) {
    return await runGuarded(
        'Loan decision',
        buttonEl,
        null,
        () => api.updateLoanStatus(loanId, status),
        async () => {
            showToast(`Loan #${loanId} marked ${status}.`, 'success');
            await loadLoans();
            renderCurrentView();
        },
        'Saving\u2026'
    );
}

async function selectBeneficiaryCustomer(customerId) {
    const id = Number(customerId);
    if (!id) {
        showToast('Choose a customer first.', 'warning');
        return;
    }
    App.beneficiaryCustomerId = id;
    try {
        await loadBeneficiaries(id);
        renderCurrentView();
    } catch (err) {
        showToast(`Could not load beneficiaries: ${err.message}`, 'danger');
    }
}

async function submitNewBeneficiary() {
    const nameEl = $('ben-name');
    const bankEl = $('ben-bank');
    const accountEl = $('ben-account');
    const ifscEl = $('ben-ifsc');
    if (!nameEl || !bankEl || !accountEl || !ifscEl) return null;

    const customerId = App.beneficiaryCustomerId ||
        (role() === 'CUSTOMER' ? (App.user && App.user.customer_id) : null);
    if (!customerId) {
        renderError('ben-error', 'Beneficiary creation failed: select a customer first.', 'Please correct the form');
        return null;
    }

    const payload = {
        beneficiary_name: nameEl.value.trim(),
        bank_name: bankEl.value.trim(),
        account_number: accountEl.value.trim(),
        ifsc_code: ifscEl.value.trim().toUpperCase()
    };

    if (!payload.beneficiary_name || !payload.bank_name || !payload.account_number || !payload.ifsc_code) {
        renderError('ben-error', 'Beneficiary creation failed: all fields are required.', 'Please correct the form');
        return null;
    }

    return await runGuarded(
        'Beneficiary creation',
        $('ben-submit'),
        'ben-error',
        () => api.createBeneficiary(customerId, payload),
        async () => {
            nameEl.value = '';
            accountEl.value = '';
            ifscEl.value = '';
            showToast(`Beneficiary added for customer #${customerId} (cooling period: PENDING).`, 'success');
            await loadBeneficiaries(customerId);
            renderCurrentView();
        },
        'Adding\u2026'
    );
}

async function submitBeneficiaryStatus(beneficiaryId, status, buttonEl) {
    return await runGuarded(
        'Beneficiary status change',
        buttonEl,
        null,
        () => api.updateBeneficiaryStatus(beneficiaryId, status),
        async () => {
            showToast(`Beneficiary #${beneficiaryId} marked ${status}.`, 'success');
            await loadBeneficiaries(App.beneficiaryCustomerId);
            renderCurrentView();
        },
        'Saving\u2026'
    );
}

async function submitSuspiciousReview(suspiciousId, status, buttonEl) {
    return await runGuarded(
        'Compliance review',
        buttonEl,
        null,
        () => api.reviewSuspiciousTransaction(suspiciousId, status),
        async () => {
            showToast(`Flag #${suspiciousId} marked ${status}.`, 'success');
            await loadSuspicious();
            renderCurrentView();
        },
        'Saving\u2026'
    );
}

async function selectReport(kind) {
    try {
        await loadReport(kind);
        renderCurrentView();
    } catch (err) {
        showToast(`Could not load that report: ${err.message}`, 'danger');
    }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

/** If the Bootstrap bundle did not load, say so instead of failing invisibly. */
function warnIfFrontendDegraded() {
    if (bootstrapModalAvailable() && bootstrapToastAvailable()) return;
    console.warn('Bootstrap JS is unavailable; modals and toasts are using the built-in fallback.');
    showToast(
        'Bootstrap JS did not load from its CDN. Modals and notifications are running on the built-in fallback.',
        'warning',
        'Frontend degraded'
    );
}

function bootApp() {
    warnIfFrontendDegraded();
    initApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
} else {
    bootApp();
}

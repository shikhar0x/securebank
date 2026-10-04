/**
 * SecureBank Main Frontend Application Script
 */

const AppState = {
    user: null,
    currentView: 'dashboard',
    reportsTab: 'customer-accounts',
    pagination: { limit: 10, offset: 0 }
};

// Demo Users for Persona Switcher
const DEMO_PERSONAS = [
    { username: 'customer1', role: 'CUSTOMER', name: 'John Customer' },
    { username: 'teller1', role: 'TELLER', name: 'Alice Teller' },
    { username: 'loanofficer1', role: 'LOAN_OFFICER', name: 'Robert Loan' },
    { username: 'manager1', role: 'MANAGER', name: 'David Manager' },
    { username: 'auditor1', role: 'AUDITOR', name: 'Emma Auditor' },
    { username: 'compliance1', role: 'COMPLIANCE', name: 'Carol Compliance' },
    { username: 'admin1', role: 'ADMIN', name: 'Security Admin' }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupPersonaSwitcher();
    setupEventListeners();
    await checkAuth();
}

// Format Currency helper in INR (₹)
function formatINR(amount) {
    const val = parseFloat(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// -------------------------------------------------------------
// Authentication & Session
// -------------------------------------------------------------
async function checkAuth() {
    try {
        const user = await api.getCurrentUser();
        AppState.user = user;
        renderAppHeader();
        renderSidebar();
        navigateTo(AppState.currentView);
    } catch (err) {
        AppState.user = null;
        renderLoginView();
    }
}

async function handleLogin(username, password) {
    showLoading(true);
    try {
        const user = await api.login(username, password);
        AppState.user = user;
        showToast('Success', `Welcome back, ${user.username}!`, 'success');
        renderAppHeader();
        renderSidebar();
        navigateTo('dashboard');
    } catch (err) {
        showToast('Login Failed', err.message || 'Invalid credentials.', 'danger');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        await api.logout();
        AppState.user = null;
        showToast('Logged Out', 'Session terminated successfully.', 'info');
        renderLoginView();
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function setupPersonaSwitcher() {
    const dropdown = document.getElementById('persona-dropdown-menu');
    if (!dropdown) return;

    dropdown.innerHTML = DEMO_PERSONAS.map(p => `
        <li>
            <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#" onclick="switchPersona('${p.username}')">
                <span><i class="fa-solid fa-user-circle me-2 text-primary"></i><strong>${p.name}</strong> (${p.username})</span>
                <span class="role-badge role-${p.role}">${p.role}</span>
            </a>
        </li>
    `).join('');
}

async function switchPersona(username) {
    const password = 'Password123!';
    await handleLogin(username, password);
}

// -------------------------------------------------------------
// UI Navigation & Layout
// -------------------------------------------------------------
function renderAppHeader() {
    const loginSection = document.getElementById('navbar-auth-section');
    const userSection = document.getElementById('navbar-user-section');
    
    if (!AppState.user) {
        loginSection.classList.remove('d-none');
        userSection.classList.add('d-none');
        return;
    }

    loginSection.classList.add('d-none');
    userSection.classList.remove('d-none');

    document.getElementById('nav-user-name').innerText = AppState.user.username;
    
    const roleBadge = document.getElementById('nav-user-role');
    roleBadge.innerText = AppState.user.role;
    roleBadge.className = `role-badge role-${AppState.user.role}`;
}

function renderSidebar() {
    const sidebarList = document.getElementById('sidebar-menu-list');
    if (!sidebarList || !AppState.user) return;

    const role = AppState.user.role;
    
    // Strict Role Navigation filtering - hide endpoints forbidden to current role
    const menuItems = [
        { id: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard', roles: ['ALL'] },
        { id: 'accounts', icon: 'fa-building-columns', label: 'Bank Accounts', roles: ['TELLER', 'MANAGER', 'ADMIN', 'AUDITOR', 'COMPLIANCE'] },
        { id: 'customers', icon: 'fa-users', label: 'Customer Directory', roles: ['TELLER', 'MANAGER', 'ADMIN', 'AUDITOR', 'COMPLIANCE'] },
        { id: 'transactions', icon: 'fa-money-bill-transfer', label: 'Transactions', roles: ['CUSTOMER', 'TELLER', 'MANAGER', 'ADMIN', 'AUDITOR', 'COMPLIANCE'] },
        { id: 'beneficiaries', icon: 'fa-address-book', label: 'Beneficiaries', roles: ['CUSTOMER'] },
        { id: 'loans', icon: 'fa-hand-holding-dollar', label: 'Loan Management', roles: ['CUSTOMER', 'LOAN_OFFICER', 'MANAGER', 'ADMIN', 'AUDITOR'] },
        { id: 'compliance', icon: 'fa-shield-halved', label: 'Suspicious Activity', roles: ['COMPLIANCE', 'MANAGER', 'ADMIN', 'AUDITOR'] },
        { id: 'audit', icon: 'fa-file-shield', label: 'Audit Trail Logs', roles: ['AUDITOR', 'COMPLIANCE', 'MANAGER', 'ADMIN'] },
        { id: 'reports', icon: 'fa-chart-column', label: 'DBMS Reports (Views)', roles: ['TELLER', 'LOAN_OFFICER', 'MANAGER', 'AUDITOR', 'COMPLIANCE', 'ADMIN'] }
    ];

    const allowed = menuItems.filter(item => item.roles.includes('ALL') || item.roles.includes(role));

    // Ensure active view is authorized, else fallback to dashboard
    if (!allowed.some(item => item.id === AppState.currentView)) {
        AppState.currentView = 'dashboard';
    }

    sidebarList.innerHTML = allowed.map(item => `
        <a href="#" class="list-group-item-sidebar ${AppState.currentView === item.id ? 'active' : ''}" onclick="navigateTo('${item.id}')">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');
}

function navigateTo(viewId) {
    AppState.currentView = viewId;
    renderSidebar();
    
    const container = document.getElementById('main-view-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';

    switch (viewId) {
        case 'dashboard':
            renderDashboardView(container);
            break;
        case 'accounts':
            renderAccountsView(container);
            break;
        case 'customers':
            renderCustomersView(container);
            break;
        case 'transactions':
            renderTransactionsView(container);
            break;
        case 'beneficiaries':
            renderBeneficiariesView(container);
            break;
        case 'loans':
            renderLoansView(container);
            break;
        case 'compliance':
            renderComplianceView(container);
            break;
        case 'audit':
            renderAuditView(container);
            break;
        case 'reports':
            renderReportsView(container);
            break;
        default:
            renderDashboardView(container);
    }
}

// -------------------------------------------------------------
// View Renderers
// -------------------------------------------------------------

function renderLoginView() {
    const sidebar = document.getElementById('sidebar-wrapper');
    if (sidebar) sidebar.classList.add('d-none');
    
    const content = document.getElementById('page-content-wrapper');
    if (content) content.style.marginLeft = '0';
    if (content) content.style.width = '100%';

    const container = document.getElementById('main-view-container');
    container.innerHTML = `
        <div class="row justify-content-center align-items-center" style="min-height: 80vh;">
            <div class="col-md-5 col-lg-4">
                <div class="card shadow-lg border-0 rounded-4 p-4">
                    <div class="text-center mb-4">
                        <div class="stat-icon bg-primary text-white mx-auto mb-3" style="width: 60px; height: 60px; font-size: 1.75rem;">
                            <i class="fa-solid fa-vault"></i>
                        </div>
                        <h3 class="fw-bold text-dark">SecureBank</h3>
                        <p class="text-muted small">Banking System Portal</p>
                    </div>

                    <form id="login-form" onsubmit="event.preventDefault(); handleLoginSubmit();">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Username</label>
                            <input type="text" id="login-username" class="form-control form-control-lg" placeholder="e.g. customer1 or teller1" required>
                        </div>
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Password</label>
                            <input type="password" id="login-password" class="form-control form-control-lg" value="Password123!" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">
                            <i class="fa-solid fa-right-to-bracket me-2"></i>Sign In
                        </button>
                    </form>

                    <div class="mt-4 pt-3 border-top text-center">
                        <span class="badge bg-secondary mb-2">Persona Switcher</span>
                        <div class="d-flex flex-wrap gap-1 justify-content-center">
                            ${DEMO_PERSONAS.map(p => `
                                <button class="btn btn-sm btn-outline-dark" onclick="switchPersona('${p.username}')">
                                    ${p.role}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function handleLoginSubmit() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    handleLogin(user, pass);
}

// DASHBOARD
async function renderDashboardView(container) {
    const sidebar = document.getElementById('sidebar-wrapper');
    if (sidebar) sidebar.classList.remove('d-none');
    
    const content = document.getElementById('page-content-wrapper');
    if (content) content.style.marginLeft = 'var(--sidebar-width)';
    if (content) content.style.width = 'calc(100% - var(--sidebar-width))';

    const role = AppState.user.role;

    container.innerHTML = `
        <div class="mb-4 d-flex justify-content-between align-items-center">
            <div>
                <h2 class="fw-bold m-0">Dashboard Overview</h2>
                <p class="text-muted small m-0">Active Session Role: <span class="role-badge role-${role}">${role}</span></p>
            </div>
            <button class="btn btn-outline-primary btn-sm" onclick="navigateTo('dashboard')">
                <i class="fa-solid fa-rotate me-1"></i>Refresh
            </button>
        </div>

        <!-- Clean Spacing Quick Metrics Grid -->
        <div class="row g-3 mb-4" id="dashboard-metrics">
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-semibold">User Role</span>
                            <h5 class="fw-bold mt-1 text-dark mb-0 text-truncate" style="max-width: 140px;">${role}</h5>
                        </div>
                        <div class="stat-icon bg-primary text-white ms-2"><i class="fa-solid fa-user-shield"></i></div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-semibold d-block mb-1">Session Status</span>
                            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-6 fw-bold">
                                <i class="fa-solid fa-circle-check me-1"></i> Authenticated
                            </span>
                        </div>
                        <div class="stat-icon bg-success text-white ms-2"><i class="fa-solid fa-shield-halved"></i></div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-semibold">User ID</span>
                            <h5 class="fw-bold mt-1 text-dark mb-0">#${AppState.user.user_id}</h5>
                        </div>
                        <div class="stat-icon bg-info text-white ms-2"><i class="fa-solid fa-id-card"></i></div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-semibold">Customer Ref</span>
                            <h5 class="fw-bold mt-1 text-dark mb-0">${AppState.user.customer_id ? '#' + AppState.user.customer_id : 'N/A'}</h5>
                        </div>
                        <div class="stat-icon bg-secondary text-white ms-2"><i class="fa-solid fa-building-columns"></i></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="role-specific-dashboard"></div>
    `;

    const subContainer = document.getElementById('role-specific-dashboard');
    
    if (role === 'CUSTOMER') {
        renderCustomerDashboard(subContainer);
    } else if (role === 'TELLER') {
        renderTellerDashboard(subContainer);
    } else if (role === 'LOAN_OFFICER') {
        renderLoanOfficerDashboard(subContainer);
    } else if (role === 'COMPLIANCE') {
        renderComplianceDashboard(subContainer);
    } else if (role === 'AUDITOR') {
        renderAuditorDashboard(subContainer);
    } else {
        renderManagerDashboard(subContainer);
    }
}

// Customer Specific Dashboard
async function renderCustomerDashboard(container) {
    try {
        const custId = AppState.user.customer_id;
        const accounts = await api.getCustomerAccounts(custId);
        
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-wallet text-primary me-2"></i>My Accounts</h5>
                    <button class="btn btn-primary btn-sm" onclick="openTransferModal()">
                        <i class="fa-solid fa-paper-plane me-1"></i>Quick Transfer
                    </button>
                </div>

                <div class="row g-3">
                    ${accounts.map(acc => `
                        <div class="col-md-6 col-lg-4">
                            <div class="border rounded-3 p-3 bg-light">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="badge bg-dark">${acc.a_type}</span>
                                    <span class="badge-status status-${acc.a_status}">${acc.a_status}</span>
                                </div>
                                <div class="small text-muted mb-1">Account #${acc.a_id}</div>
                                <h3 class="fw-bold text-primary mb-2">${formatINR(acc.a_balance)}</h3>
                                <button class="btn btn-outline-secondary btn-sm w-100" onclick="viewAccountTransactions(${acc.a_id})">
                                    <i class="fa-solid fa-list me-1"></i>View Ledger History
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Transaction History Card -->
            <div class="card border-0 shadow-sm rounded-3 p-4">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-clock-rotate-left text-primary me-2"></i>Recent Account Activity</h5>
                <div id="customer-recent-transactions" class="table-responsive">
                    <p class="text-muted">Select an account above to view transaction history.</p>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load customer accounts: ${err.message}</div>`;
    }
}

// Teller Specific Dashboard
async function renderTellerDashboard(container) {
    container.innerHTML = `
        <div class="row g-4">
            <!-- Cashier Form -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-3 p-4">
                    <h5 class="fw-bold mb-3"><i class="fa-solid fa-cash-register text-success me-2"></i>Teller Cashier Desk</h5>
                    
                    <ul class="nav nav-pills mb-3" id="teller-action-tab" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active" id="pills-deposit-tab" data-bs-toggle="pill" data-bs-target="#pills-deposit">Deposit</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" id="pills-withdraw-tab" data-bs-toggle="pill" data-bs-target="#pills-withdraw">Withdraw</button>
                        </li>
                    </ul>

                    <div class="tab-content" id="pills-tabContent">
                        <!-- Deposit Form -->
                        <div class="tab-pane fade show active" id="pills-deposit">
                            <form onsubmit="event.preventDefault(); submitDeposit();">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Target Account ID</label>
                                    <input type="number" id="teller-deposit-account-id" class="form-control" placeholder="Account ID" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Amount (₹)</label>
                                    <input type="number" step="0.01" id="teller-deposit-amount" class="form-control" placeholder="0.00" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Description</label>
                                    <input type="text" id="teller-deposit-desc" class="form-control" value="Over-the-counter deposit">
                                </div>
                                <button type="submit" class="btn btn-success w-100 fw-bold">Process Deposit</button>
                            </form>
                        </div>

                        <!-- Withdraw Form -->
                        <div class="tab-pane fade" id="pills-withdraw">
                            <form onsubmit="event.preventDefault(); submitWithdrawal();">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Account ID</label>
                                    <input type="number" id="teller-withdraw-account-id" class="form-control" placeholder="Account ID" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Amount (₹)</label>
                                    <input type="number" step="0.01" id="teller-withdraw-amount" class="form-control" placeholder="0.00" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">Description</label>
                                    <input type="text" id="teller-withdraw-desc" class="form-control" value="Over-the-counter withdrawal">
                                </div>
                                <button type="submit" class="btn btn-warning text-dark w-100 fw-bold">Process Withdrawal</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                    <h5 class="fw-bold mb-3"><i class="fa-solid fa-user-plus text-primary me-2"></i>Account Management</h5>
                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary py-2 fw-semibold" onclick="openNewCustomerModal()">
                            <i class="fa-solid fa-user-plus me-2"></i>Register New Customer
                        </button>
                        <button class="btn btn-outline-success py-2 fw-semibold" onclick="openNewAccountModal()">
                            <i class="fa-solid fa-building-columns me-2"></i>Open Savings / Current Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Loan Officer Dashboard
async function renderLoanOfficerDashboard(container) {
    try {
        const loans = await api.getLoans(50, 0);

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-file-signature text-purple me-2"></i>Pending Loan Applications</h5>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Cust ID</th>
                                <th>Type</th>
                                <th>Principal</th>
                                <th>Rate</th>
                                <th>Tenure</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loans.map(l => `
                                <tr>
                                    <td>#${l.l_id}</td>
                                    <td>#${l.l_cust_id}</td>
                                    <td><span class="badge bg-light text-dark border">${l.l_type}</span></td>
                                    <td class="fw-bold text-success">${formatINR(l.l_amount)}</td>
                                    <td>${l.l_rate}%</td>
                                    <td>${l.l_tenure_months} Mo</td>
                                    <td><span class="badge-status status-${l.l_status}">${l.l_status}</span></td>
                                    <td>
                                        ${l.l_status === 'PENDING' ? `
                                            <button class="btn btn-sm btn-success me-1" onclick="updateLoanStatus(${l.l_id}, 'APPROVED')">Approve</button>
                                            <button class="btn btn-sm btn-danger" onclick="updateLoanStatus(${l.l_id}, 'REJECTED')">Reject</button>
                                        ` : '<span class="text-muted small">Reviewed</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load loan applications: ${err.message}</div>`;
    }
}

// Compliance Dashboard
async function renderComplianceDashboard(container) {
    try {
        const records = await api.getSuspiciousTransactions(50, 0);

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0 text-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>Flagged Suspicious Activity Queue</h5>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Txn ID</th>
                                <th>Account</th>
                                <th>Amount</th>
                                <th>Reason</th>
                                <th>Risk Score</th>
                                <th>Status</th>
                                <th>Review Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">No suspicious records flagged.</td></tr>' : ''}
                            ${records.map(r => `
                                <tr>
                                    <td>#${r.st_id}</td>
                                    <td>#${r.st_txn_id}</td>
                                    <td>#${r.st_acc_id}</td>
                                    <td class="fw-bold text-danger">${formatINR(r.st_amount)}</td>
                                    <td class="small text-wrap" style="max-width: 250px;">${r.st_reason}</td>
                                    <td><span class="badge bg-danger">${r.st_risk_score}</span></td>
                                    <td><span class="badge-status status-${r.st_status}">${r.st_status}</span></td>
                                    <td>
                                        ${r.st_status === 'PENDING' ? `
                                            ${['ADMIN', 'COMPLIANCE'].includes(AppState.user.role) ? `<button class="btn btn-sm btn-outline-success me-1" onclick="reviewSuspicious(${r.st_id}, 'CLEARED')">Clear</button><button class="btn btn-sm btn-outline-danger" onclick="reviewSuspicious(${r.st_id}, 'CONFIRMED')">Confirm Risk</button>` : '<span class="text-muted small">Review restricted</span>'}
                                        ` : '<span class="text-muted small">Reviewed</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load suspicious records: ${err.message}</div>`;
    }
}

// Auditor Dashboard
async function renderAuditorDashboard(container) {
    try {
        const logs = await api.getAuditLogs({ limit: 25, offset: 0 });

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-file-shield text-dark me-2"></i>System Audit Trail Logs</h5>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Time</th>
                                <th>User ID</th>
                                <th>Action</th>
                                <th>Table</th>
                                <th>Txn ID</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>#${log.log_id}</td>
                                    <td class="small">${new Date(log.log_time).toLocaleString()}</td>
                                    <td>#${log.log_user_id || 'SYS'}</td>
                                    <td><span class="badge bg-secondary">${log.log_action}</span></td>
                                    <td><code>${log.log_table_name || 'audit_logs'}</code></td>
                                    <td>${log.log_txn_id ? '#' + log.log_txn_id : '-'}</td>
                                    <td class="small text-truncate" style="max-width: 200px;">${log.log_details || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load audit logs: ${err.message}</div>`;
    }
}

// Manager Dashboard
async function renderManagerDashboard(container) {
    container.innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-3 p-4">
                    <h5 class="fw-bold mb-3"><i class="fa-solid fa-chart-pie text-primary me-2"></i>Branch Management Controls</h5>
                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary" onclick="navigateTo('accounts')">Manage Account Statuses</button>
                        <button class="btn btn-outline-danger" onclick="navigateTo('compliance')">Review Flagged Compliance Alerts</button>
                        <button class="btn btn-outline-dark" onclick="navigateTo('reports')">Run DBMS Views & Reports</button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-3 p-4">
                    <h5 class="fw-bold mb-3"><i class="fa-solid fa-shield-virus text-warning me-2"></i>DBMS Security & RBAC Status</h5>
                    <p class="small text-muted">All database procedures, views, and RBAC policies are operational.</p>
                    <span class="badge bg-success p-2">ACID Transaction Controls Active</span>
                </div>
            </div>
        </div>
    `;
}

// ACCOUNTS VIEW
async function renderAccountsView(container) {
    const role = AppState.user.role;
    if (['CUSTOMER'].includes(role)) {
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 text-center">
                <i class="fa-solid fa-user-shield text-primary fs-1 mb-3"></i>
                <h5 class="fw-bold">Customer Account Portal</h5>
                <p class="text-muted">You can view and manage your personal accounts on your <a href="#" onclick="navigateTo('dashboard')">Dashboard</a>.</p>
            </div>
        `;
        return;
    }

    try {
        const accounts = await api.getAccounts(50, 0);
        const canManage = ['ADMIN', 'MANAGER'].includes(role);

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-building-columns text-primary me-2"></i>Bank Accounts</h5>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>Account ID</th>
                                <th>Customer ID</th>
                                <th>Branch ID</th>
                                <th>Type</th>
                                <th>Balance</th>
                                <th>Status</th>
                                ${canManage ? '<th>Manage Status</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${accounts.map(acc => `
                                <tr>
                                    <td><strong>#${acc.a_id}</strong></td>
                                    <td>#${acc.a_cust_id}</td>
                                    <td>Branch #${acc.a_branch_id}</td>
                                    <td><span class="badge bg-light text-dark border">${acc.a_type}</span></td>
                                    <td class="fw-bold text-success">${formatINR(acc.a_balance)}</td>
                                    <td><span class="badge-status status-${acc.a_status}">${acc.a_status}</span></td>
                                    ${canManage ? `
                                        <td>
                                            <select class="form-select form-select-sm" onchange="changeAccountStatus(${acc.a_id}, this.value)">
                                                <option value="ACTIVE" ${acc.a_status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                                                <option value="FROZEN" ${acc.a_status === 'FROZEN' ? 'selected' : ''}>FROZEN</option>
                                                <option value="CLOSED" ${acc.a_status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                                            </select>
                                        </td>
                                    ` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load accounts: ${err.message}</div>`;
    }
}

// CUSTOMERS VIEW
async function renderCustomersView(container) {
    try {
        const customers = await api.getCustomers(50, 0);

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-users text-primary me-2"></i>Customer Directory</h5>
                    ${['ADMIN', 'MANAGER', 'TELLER'].includes(AppState.user.role) ? `
                        <button class="btn btn-primary btn-sm" onclick="openNewCustomerModal()">
                            <i class="fa-solid fa-plus me-1"></i>New Customer
                        </button>
                    ` : ''}
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>KYC Status</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map(c => `
                                <tr>
                                    <td>#${c.c_id}</td>
                                    <td class="fw-semibold">${c.c_full_name}</td>
                                    <td>${c.c_email}</td>
                                    <td>${c.c_phone}</td>
                                    <td><span class="badge-status status-${c.c_kyc_status}">${c.c_kyc_status}</span></td>
                                    <td class="small text-muted">${new Date(c.c_created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load customers: ${err.message}</div>`;
    }
}

// TRANSACTIONS VIEW
async function renderTransactionsView(container) {
    container.innerHTML = `
        <div class="card border-0 shadow-sm rounded-3 p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold m-0"><i class="fa-solid fa-money-bill-transfer text-primary me-2"></i>Transaction Ledger</h5>
                <div class="d-flex gap-2">
                    ${AppState.user.role === 'CUSTOMER' ? '<select id="txn-lookup-account-id" class="form-select form-select-sm"></select>' : '<input type="number" id="txn-lookup-account-id" class="form-control form-control-sm" placeholder="Enter Account ID">'}
                    <button class="btn btn-primary btn-sm" onclick="fetchAccountTransactions()">Fetch Ledger</button>
                </div>
            </div>
            <div id="transactions-table-container">
                <p class="text-muted">Enter an Account ID above to inspect transactions.</p>
            </div>
        </div>
    `;
    if (AppState.user.role === 'CUSTOMER') {
        try {
            const accounts = await api.getCustomerAccounts(AppState.user.customer_id);
            const select = document.getElementById('txn-lookup-account-id');
            select.innerHTML = accounts.map(a => `<option value="${a.a_id}">${a.a_type} · #${a.a_id}</option>`).join('');
            if (accounts.length) fetchAccountTransactions();
            else document.getElementById('transactions-table-container').innerHTML = '<p class="text-muted">No accounts are linked to this customer.</p>';
        } catch (err) {
            document.getElementById('transactions-table-container').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
    }
}

async function fetchAccountTransactions() {
    const accId = document.getElementById('txn-lookup-account-id').value;
    if (!accId) return;

    try {
        const history = await api.getAccountTransactions(accId);
        const container = document.getElementById('transactions-table-container');

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-custom mb-0">
                    <thead>
                        <tr>
                            <th>Txn ID</th>
                            <th>Time</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(t => `
                            <tr>
                                <td>#${t.t_id}</td>
                                <td class="small">${new Date(t.t_time).toLocaleString()}</td>
                                <td><span class="badge bg-secondary">${t.t_type}</span></td>
                                <td class="fw-bold ${t.t_type === 'DEPOSIT' ? 'text-success' : 'text-danger'}">${formatINR(t.t_amount)}</td>
                                <td class="small">${t.t_description || t.t_desc || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        showToast('Fetch Error', err.message, 'danger');
    }
}

// BENEFICIARIES VIEW (Single Bank Company - SecureBank)
async function renderBeneficiariesView(container) {
    const custId = AppState.user.customer_id;
    if (!custId) {
        container.innerHTML = '<div class="alert alert-warning">Beneficiaries are only available for a customer session.</div>';
        return;
    }
    try {
        const list = await api.getBeneficiaries(custId);

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-address-book text-primary me-2"></i>Beneficiaries</h5>
                    <button class="btn btn-primary btn-sm" onclick="openAddBeneficiaryModal()">
                        <i class="fa-solid fa-user-plus me-1"></i>Add Beneficiary
                    </button>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Beneficiary Name</th>
                                <th>SecureBank Branch</th>
                                <th>Account Number</th>
                                <th>IFSC Code</th>
                                <th>Cooling Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${list.map(b => `
                                <tr>
                                    <td>#${b.b_id}</td>
                                    <td class="fw-semibold">${b.b_name || b.be_name}</td>
                                    <td>${b.b_bank_name || b.be_bank || 'SecureBank Main Branch'}</td>
                                    <td><code>${b.b_account_num || b.be_acc_no}</code></td>
                                    <td>${b.b_ifsc || b.be_ifsc}</td>
                                    <td><span class="badge-status status-${b.b_status || b.be_status}">${b.b_status || b.be_status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load beneficiaries: ${err.message}</div>`;
    }
}

// LOANS VIEW
async function renderLoansView(container) {
    const role = AppState.user.role;
    const custId = AppState.user.customer_id;

    try {
        let loans = [];
        if (role === 'CUSTOMER' && custId) {
            loans = await api.getCustomerLoans(custId);
        } else {
            loans = await api.getLoans(50, 0);
        }

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold m-0"><i class="fa-solid fa-hand-holding-dollar text-primary me-2"></i>Loan Applications</h5>
                    ${role === 'CUSTOMER' || ['ADMIN', 'MANAGER', 'LOAN_OFFICER'].includes(role) ? '<button class="btn btn-primary btn-sm" onclick="openApplyLoanModal()"><i class="fa-solid fa-plus me-1"></i>Apply For Loan</button>' : ''}
                </div>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Cust ID</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Interest Rate</th>
                                <th>Tenure</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loans.map(l => `
                                <tr>
                                    <td>#${l.l_id}</td>
                                    <td>#${l.l_cust_id}</td>
                                    <td>${l.l_type}</td>
                                    <td class="fw-bold">${formatINR(l.l_amount)}</td>
                                    <td>${l.l_rate}%</td>
                                    <td>${l.l_tenure_months || l.l_months} Months</td>
                                    <td><span class="badge-status status-${l.l_status}">${l.l_status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load loans: ${err.message}</div>`;
    }
}

// COMPLIANCE VIEW
async function renderComplianceView(container) {
    await renderComplianceDashboard(container);
}

// AUDIT VIEW
async function renderAuditorDashboard(container) {
    try {
        const logs = await api.getAuditLogs({ limit: 25, offset: 0 });

        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-4 mb-4">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-file-shield text-dark me-2"></i>System Audit Trail Logs</h5>

                <div class="table-responsive">
                    <table class="table table-custom mb-0">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Time</th>
                                <th>User ID</th>
                                <th>Action</th>
                                <th>Table</th>
                                <th>Txn ID</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>#${log.log_id}</td>
                                    <td class="small">${new Date(log.log_time).toLocaleString()}</td>
                                    <td>#${log.log_user_id || 'SYS'}</td>
                                    <td><span class="badge bg-secondary">${log.log_action}</span></td>
                                    <td><code>${log.log_table_name || 'audit_logs'}</code></td>
                                    <td>${log.log_txn_id ? '#' + log.log_txn_id : '-'}</td>
                                    <td class="small text-truncate" style="max-width: 200px;">${log.log_details || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load audit logs: ${err.message}</div>`;
    }
}

async function renderAuditView(container) {
    await renderAuditorDashboard(container);
}

// REPORTS VIEW (MYSQL VIEWS) - Role Authorized Tabs Only
async function renderReportsView(container) {
    const role = AppState.user.role;
    
    // Determine authorized report tabs per role
    const allTabs = [
        { id: 'customer-accounts', label: 'v_customer_accounts', roles: ['ADMIN', 'MANAGER', 'TELLER', 'AUDITOR'] },
        { id: 'transactions', label: 'v_transaction_history', roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'COMPLIANCE'] },
        { id: 'loans', label: 'v_loan_report', roles: ['ADMIN', 'MANAGER', 'LOAN_OFFICER', 'AUDITOR'] },
        { id: 'audit', label: 'v_audit_report', roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'COMPLIANCE'] }
    ];

    const allowedTabs = allTabs.filter(t => t.roles.includes(role));
    if (allowedTabs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No database reporting views are assigned to your role.</div>';
        return;
    }

    const defaultTab = allowedTabs[0].id;

    container.innerHTML = `
        <div class="card border-0 shadow-sm rounded-3 p-4">
            <h5 class="fw-bold mb-3"><i class="fa-solid fa-chart-column text-primary me-2"></i>MySQL Database Views & Reporting Engine</h5>

            <ul class="nav nav-tabs mb-3" id="reports-tab">
                ${allowedTabs.map(t => `
                    <li class="nav-item">
                        <button class="nav-link ${t.id === defaultTab ? 'active' : ''}" id="tab-btn-${t.id}" onclick="switchReportTab('${t.id}')">${t.label}</button>
                    </li>
                `).join('')}
            </ul>

            <div id="report-view-content" class="table-responsive"></div>
        </div>
    `;

    loadReport(defaultTab);
}

function switchReportTab(tabId) {
    document.querySelectorAll('#reports-tab .nav-link').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tabId}`);
    if (btn) btn.classList.add('active');
    loadReport(tabId);
}

async function loadReport(viewType) {
    const container = document.getElementById('report-view-content');
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

    try {
        let rows = [];
        if (viewType === 'customer-accounts') rows = await api.getReportCustomerAccounts();
        else if (viewType === 'transactions') rows = await api.getReportTransactions();
        else if (viewType === 'loans') rows = await api.getReportLoans();
        else if (viewType === 'audit') rows = await api.getReportAudit();

        if (!rows || rows.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted">No data returned by view.</div>';
            return;
        }

        const keys = Object.keys(rows[0]);

        container.innerHTML = `
            <table class="table table-custom mb-0">
                <thead>
                    <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>${keys.map(k => `<td>${typeof r[k] === 'number' && (k.includes('balance') || k.includes('amount') || k.includes('emi')) ? formatINR(r[k]) : r[k]}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load report view: ${err.message}</div>`;
    }
}

// -------------------------------------------------------------
// Modals & Handlers
// -------------------------------------------------------------

function openDataForm(title, fields, submitLabel, onSubmit) {
    let modalEl = document.getElementById('dataEntryModal');
    if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', '<div class="modal fade" id="dataEntryModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow"><form id="data-entry-form"><div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary"></button></div></form></div></div></div>');
        modalEl = document.getElementById('dataEntryModal');
    }
    modalEl.querySelector('.modal-title').textContent = title;
    modalEl.querySelector('.modal-footer .btn-primary').textContent = submitLabel;
    modalEl.querySelector('.modal-body').innerHTML = fields.map(field => `
        <div class="mb-3">
            <label class="form-label" for="entry-${field.name}">${field.label}</label>
            ${field.options ? `<select class="form-select" id="entry-${field.name}" name="${field.name}" ${field.required === false ? '' : 'required'}>${field.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>` : `<input class="form-control" id="entry-${field.name}" name="${field.name}" type="${field.type || 'text'}" ${field.step ? `step="${field.step}"` : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.required === false ? '' : 'required'} ${field.value !== undefined ? `value="${field.value}"` : ''}>`}
        </div>`).join('');
    const form = modalEl.querySelector('form');
    form.onsubmit = async event => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
            const values = Object.fromEntries(new FormData(form).entries());
            await onSubmit(values);
            bootstrap.Modal.getInstance(modalEl).hide();
        } catch (err) {
            showToast('Request Failed', err.message, 'danger');
        } finally {
            submit.disabled = false;
        }
    };
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openNewCustomerModal() {
    openDataForm('Register Customer', [
        { name: 'full_name', label: 'Full name' }, { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' }, { name: 'address', label: 'Address', required: false },
        { name: 'date_of_birth', label: 'Date of birth', type: 'date', required: false }
    ], 'Create Customer', async data => {
        await api.createCustomer(data);
        showToast('Customer Created', 'Customer record was saved.', 'success');
        navigateTo('customers');
    });
}

function openNewAccountModal() {
    openDataForm('Open Account', [
        { name: 'customer_id', label: 'Customer ID', type: 'number', min: 1 },
        { name: 'branch_id', label: 'Branch ID', type: 'number', min: 1, value: 1 },
        { name: 'account_type', label: 'Account type', options: [{ value: 'SAVINGS', label: 'Savings' }, { value: 'CURRENT', label: 'Current' }] },
        { name: 'initial_deposit', label: 'Initial deposit (₹)', type: 'number', min: 0, step: '0.01', value: 0 }
    ], 'Open Account', async data => {
        await api.openAccount(data);
        showToast('Account Opened', 'Account record was saved.', 'success');
        navigateTo('accounts');
    });
}

function openApplyLoanModal() {
    const fields = AppState.user.role === 'CUSTOMER' ? [] : [{ name: 'customer_id', label: 'Customer ID', type: 'number', min: 1 }];
    fields.push(
        { name: 'loan_type', label: 'Loan type', options: [{ value: 'PERSONAL', label: 'Personal' }, { value: 'HOME', label: 'Home' }, { value: 'AUTO', label: 'Auto' }, { value: 'EDUCATION', label: 'Education' }] },
        { name: 'principal_amount', label: 'Principal (₹)', type: 'number', min: '0.01', step: '0.01' },
        { name: 'interest_rate', label: 'Annual interest rate (%)', type: 'number', min: 0, step: '0.01' },
        { name: 'tenure_months', label: 'Tenure (months)', type: 'number', min: 1 }
    );
    openDataForm('Apply for Loan', fields, 'Submit Application', async data => {
        if (AppState.user.role === 'CUSTOMER') data.customer_id = AppState.user.customer_id;
        await api.applyLoan(data);
        showToast('Application Submitted', 'Loan application was saved.', 'success');
        navigateTo('loans');
    });
}

function openAddBeneficiaryModal() {
    openDataForm('Add Beneficiary', [
        { name: 'beneficiary_name', label: 'Name' }, { name: 'bank_name', label: 'Bank name' },
        { name: 'account_number', label: 'Account number' }, { name: 'ifsc_code', label: 'IFSC code' }
    ], 'Add Beneficiary', async data => {
        await api.createBeneficiary(AppState.user.customer_id, data);
        showToast('Beneficiary Added', 'Beneficiary is pending verification.', 'success');
        navigateTo('beneficiaries');
    });
}

async function viewAccountTransactions(accountId) {
    const container = document.getElementById('customer-recent-transactions');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>';
    try {
        const rows = await api.getAccountTransactions(accountId, 10, 0);
        container.innerHTML = rows.length ? `<table class="table table-sm"><thead><tr><th>ID</th><th>Time</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows.map(t => `<tr><td>#${t.t_id}</td><td>${new Date(t.t_time).toLocaleString()}</td><td>${t.t_type}</td><td>${formatINR(t.t_amount)}</td></tr>`).join('')}</tbody></table>` : '<p class="text-muted">No transactions for this account.</p>';
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

function openTransferModal() {
    const modalEl = document.getElementById('transferModal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

async function submitTransfer() {
    const fromId = document.getElementById('transfer-from-id').value;
    const toId = document.getElementById('transfer-to-id').value;
    const amount = document.getElementById('transfer-amount').value;
    const desc = document.getElementById('transfer-desc').value;

    try {
        const result = await api.transfer(fromId, toId, amount, desc);
        showToast('Transfer Completed', `Atomic transfer of ${formatINR(amount)} debited and credited successfully.`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
        navigateTo('dashboard');
    } catch (err) {
        showRollbackAlert(`ACID Transfer Rollback: ${err.message}`);
    }
}

async function submitDeposit() {
    const accId = document.getElementById('teller-deposit-account-id').value;
    const amount = document.getElementById('teller-deposit-amount').value;
    const desc = document.getElementById('teller-deposit-desc').value;

    try {
        await api.deposit(accId, amount, desc);
        showToast('Deposit Processed', `Successfully deposited ${formatINR(amount)} to account #${accId}`, 'success');
        navigateTo('dashboard');
    } catch (err) {
        showToast('Deposit Failed', err.message, 'danger');
    }
}

async function submitWithdrawal() {
    const accId = document.getElementById('teller-withdraw-account-id').value;
    const amount = document.getElementById('teller-withdraw-amount').value;
    const desc = document.getElementById('teller-withdraw-desc').value;

    try {
        await api.withdraw(accId, amount, desc);
        showToast('Withdrawal Processed', `Successfully withdrew ${formatINR(amount)} from account #${accId}`, 'success');
        navigateTo('dashboard');
    } catch (err) {
        showToast('Withdrawal Failed', err.message, 'danger');
    }
}

async function changeAccountStatus(accountId, newStatus) {
    try {
        await api.updateAccountStatus(accountId, newStatus);
        showToast('Account Updated', `Account #${accountId} status changed to ${newStatus}`, 'success');
        navigateTo('accounts');
    } catch (err) {
        showToast('Update Failed', err.message, 'danger');
    }
}

async function updateLoanStatus(loanId, status) {
    try {
        await api.updateLoanStatus(loanId, status);
        showToast('Loan Status Updated', `Loan #${loanId} set to ${status}`, 'success');
        navigateTo('loans');
    } catch (err) {
        showToast('Status Update Error', err.message, 'danger');
    }
}

async function reviewSuspicious(id, status) {
    try {
        await api.reviewSuspiciousTransaction(id, status);
        showToast('Review Submitted', `Suspicious transaction #${id} marked as ${status}`, 'success');
        navigateTo('compliance');
    } catch (err) {
        showToast('Review Failed', err.message, 'danger');
    }
}

// Utility Toast & Alerts
function showToast(title, text, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white' : type === 'danger' ? 'bg-danger text-white' : 'bg-dark text-white';

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 show" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}:</strong> ${text}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    setTimeout(() => {
        const el = document.getElementById(toastId);
        if (el) el.remove();
    }, 4000);
}

function showRollbackAlert(message) {
    const alertHtml = `
        <div class="rollback-banner shadow-sm alert-dismissible fade show" role="alert">
            <h6><i class="fa-solid fa-triangle-exclamation me-2"></i>ACID Transaction Rollback Executed</h6>
            <p>${message}</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    const container = document.getElementById('main-view-container');
    container.insertAdjacentHTML('afterbegin', alertHtml);
}

function showLoading(show) {
    let indicator = document.getElementById('api-loading-indicator');
    if (show && !indicator) {
        document.body.insertAdjacentHTML('beforeend', '<div id="api-loading-indicator" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="z-index:2000;background:rgba(255,255,255,.65)"><div class="spinner-border text-primary" role="status" aria-label="Loading"></div></div>');
        indicator = document.getElementById('api-loading-indicator');
    }
    if (indicator) indicator.classList.toggle('d-none', !show);
}
function setupEventListeners() {
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href="#"]');
        if (link) event.preventDefault();
    });
}

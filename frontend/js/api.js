/**
 * SecureBank REST API Client
 * Wraps native fetch with session cookie management and error normalization.
 *
 * Backend response contract (backend/app/security/utils.py):
 *   success -> HTTP 2xx      {"success": true,  "data": ...}
 *   failure -> HTTP 4xx/5xx  {"success": false, "error": "...", "code": "..."}
 *
 * A 2xx body that carries "success": false is also treated as a failure, so a
 * caller can never mistake a rejected operation for a committed one.
 */

const API_BASE = '/api';

class ApiClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;

        // Caller headers are merged INTO the default headers instead of
        // replacing them, so Content-Type is never lost.
        const { headers: extraHeaders, ...requestOptions } = options;
        const config = {
            credentials: 'include', // Ensures Flask session cookies are sent/saved
            ...requestOptions,
            headers: {
                'Content-Type': 'application/json',
                ...extraHeaders
            }
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            // Non-2xx OR an explicit failure flag in the body: surface the
            // backend's own message instead of swallowing it.
            if (!response.ok || data.success === false) {
                const error = new Error(data.error || data.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.code = data.code || 'UNKNOWN_ERROR';
                error.details = data;
                throw error;
            }

            return data.data !== undefined ? data.data : data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    }

    // Auth API
    login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    }

    logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    getCurrentUser() {
        return this.request('/auth/me', { method: 'GET' });
    }

    // Customer API
    getCustomers(limit = 50, offset = 0, kyc_status = '') {
        let q = `?limit=${limit}&offset=${offset}`;
        if (kyc_status) q += `&kyc_status=${encodeURIComponent(kyc_status)}`;
        return this.request(`/customers${q}`);
    }

    getCustomer(id) {
        return this.request(`/customers/${id}`);
    }

    createCustomer(customerData) {
        return this.request('/customers', {
            method: 'POST',
            body: customerData
        });
    }

    updateCustomer(id, customerData) {
        return this.request(`/customers/${id}`, {
            method: 'PUT',
            body: customerData
        });
    }

    // Accounts API
    getAccounts(limit = 50, offset = 0, customer_id = null, status = '') {
        let q = `?limit=${limit}&offset=${offset}`;
        if (customer_id) q += `&customer_id=${customer_id}`;
        if (status) q += `&status=${encodeURIComponent(status)}`;
        return this.request(`/accounts${q}`);
    }

    getAccount(id) {
        return this.request(`/accounts/${id}`);
    }

    getCustomerAccounts(customerId) {
        return this.request(`/customers/${customerId}/accounts`);
    }

    openAccount(accountData) {
        return this.request('/accounts', {
            method: 'POST',
            body: accountData
        });
    }

    updateAccountStatus(accountId, status) {
        return this.request(`/accounts/${accountId}/status`, {
            method: 'PUT',
            body: { status }
        });
    }

    // Transactions API
    deposit(accountId, amount, description) {
        return this.request('/transactions/deposit', {
            method: 'POST',
            body: { account_id: accountId, amount, description }
        });
    }

    withdraw(accountId, amount, description) {
        return this.request('/transactions/withdraw', {
            method: 'POST',
            body: { account_id: accountId, amount, description }
        });
    }

    transfer(fromAccountId, toAccountId, amount, description) {
        return this.request('/transactions/transfer', {
            method: 'POST',
            body: { 
                from_account_id: fromAccountId, 
                to_account_id: toAccountId, 
                amount, 
                description 
            }
        });
    }

    getTransaction(id) {
        return this.request(`/transactions/${id}`);
    }

    getAccountTransactions(accountId, limit = 50, offset = 0, transaction_type = '') {
        let q = `?limit=${limit}&offset=${offset}`;
        if (transaction_type) q += `&transaction_type=${encodeURIComponent(transaction_type)}`;
        return this.request(`/accounts/${accountId}/transactions${q}`);
    }

    // Beneficiaries API
    getBeneficiaries(customerId) {
        return this.request(`/customers/${customerId}/beneficiaries`);
    }

    createBeneficiary(customerId, data) {
        return this.request(`/customers/${customerId}/beneficiaries`, {
            method: 'POST',
            body: data
        });
    }

    updateBeneficiaryStatus(beneficiaryId, status) {
        return this.request(`/beneficiaries/${beneficiaryId}/status`, {
            method: 'PUT',
            body: { status }
        });
    }

    // Loans API
    getLoans(limit = 50, offset = 0, customer_id = null, status = '') {
        let q = `?limit=${limit}&offset=${offset}`;
        if (customer_id) q += `&customer_id=${customer_id}`;
        if (status) q += `&status=${encodeURIComponent(status)}`;
        return this.request(`/loans${q}`);
    }

    getLoan(id) {
        return this.request(`/loans/${id}`);
    }

    getCustomerLoans(customerId) {
        return this.request(`/customers/${customerId}/loans`);
    }

    applyLoan(loanData) {
        return this.request('/loans', {
            method: 'POST',
            body: loanData
        });
    }

    updateLoanStatus(loanId, status) {
        return this.request(`/loans/${loanId}/status`, {
            method: 'PUT',
            body: { status }
        });
    }

    // Compliance API
    getSuspiciousTransactions(limit = 50, offset = 0, status = '') {
        let q = `?limit=${limit}&offset=${offset}`;
        if (status) q += `&status=${encodeURIComponent(status)}`;
        return this.request(`/compliance/suspicious${q}`);
    }

    getSuspiciousTransaction(id) {
        return this.request(`/compliance/suspicious/${id}`);
    }

    reviewSuspiciousTransaction(id, status) {
        return this.request(`/compliance/suspicious/${id}/review`, {
            method: 'POST',
            body: { status }
        });
    }

    // Audit API
    getAuditLogs(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        if (params.user_id) queryParams.append('user_id', params.user_id);
        if (params.transaction_id) queryParams.append('transaction_id', params.transaction_id);
        if (params.action) queryParams.append('action', params.action);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        
        return this.request(`/audit/logs?${queryParams.toString()}`);
    }

    // Reports API (MySQL Views)
    getReportCustomerAccounts(limit = 50, offset = 0) {
        return this.request(`/reports/customer-accounts?limit=${limit}&offset=${offset}`);
    }

    getReportTransactions(limit = 50, offset = 0) {
        return this.request(`/reports/transactions?limit=${limit}&offset=${offset}`);
    }

    getReportLoans(limit = 50, offset = 0) {
        return this.request(`/reports/loans?limit=${limit}&offset=${offset}`);
    }

    getReportAudit(limit = 50, offset = 0) {
        return this.request(`/reports/audit?limit=${limit}&offset=${offset}`);
    }
}

const api = new ApiClient();

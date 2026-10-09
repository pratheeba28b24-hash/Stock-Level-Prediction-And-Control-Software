// StockSense - Core Client Script
let currentUser = null;
let activePage = 'dashboard';
let charts = {};
let selectedRole = 'Admin';

// Scanner variables
let html5QrcodeScanner = null;
let activeScannerMode = null; // 'catalog' or 'billing'
let billingCart = [];
let allProductsList = [];
let allSuppliersList = [];
let allCustomersList = [];

// --- GLOBAL UTILITY: Toast Notifications ---
function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const id = 'toast-' + Date.now();
    const iconMap = {
        success: 'fa-circle-check text-success',
        danger: 'fa-circle-xmark text-danger',
        warning: 'fa-triangle-exclamation text-warning',
        info: 'fa-circle-info text-info'
    };
    const icon = iconMap[type] || iconMap.info;
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast align-items-center border-0 shadow-sm';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('data-bs-autohide', 'true');
    toast.setAttribute('data-bs-delay', duration);
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
                <i class="fa-solid ${icon} fa-lg"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}


// --- 1. INITIALIZATION & SESSION RESTORE ---
document.addEventListener('DOMContentLoaded', () => {
    restoreThemeFromStorage();
    checkUserSession();
    initNavbar();
    initForms();
});

// Check if user has an active session from cookie/backend
async function checkUserSession() {
    try {
        const res = await fetch('/api/auth/user-status');
        const data = await res.json();
        if (data.authenticated) {
            setupAuthenticatedUser(data.user);
        } else {
            showLoginBox();
        }
    } catch (e) {
        showLoginBox();
    }
}

function setupAuthenticatedUser(user) {
    currentUser = user;
    
    // Setup color theme based on role
    const root = document.documentElement;
    const role = user.role;
    if (role === 'Admin') {
        root.style.setProperty('--blue-hue', '38'); // Amber/Gold
        root.style.setProperty('--primary-blue', 'hsl(38, 92%, 50%)');
        root.style.setProperty('--primary-blue-hover', 'hsl(38, 92%, 40%)');
        root.style.setProperty('--primary-blue-light', 'hsla(38, 92%, 50%, 0.08)');
        root.style.setProperty('--primary-blue-glow', 'hsla(38, 92%, 50%, 0.25)');
    } else if (role === 'Manager') {
        root.style.setProperty('--blue-hue', '250'); // Indigo/Purple
        root.style.setProperty('--primary-blue', 'hsl(250, 89%, 60%)');
        root.style.setProperty('--primary-blue-hover', 'hsl(250, 89%, 50%)');
        root.style.setProperty('--primary-blue-light', 'hsla(250, 89%, 60%, 0.08)');
        root.style.setProperty('--primary-blue-glow', 'hsla(250, 89%, 60%, 0.25)');
    } else if (role === 'Customer') {
        root.style.setProperty('--blue-hue', '170'); // Teal/Emerald
        root.style.setProperty('--primary-blue', 'hsl(170, 90%, 40%)');
        root.style.setProperty('--primary-blue-hover', 'hsl(170, 90%, 30%)');
        root.style.setProperty('--primary-blue-light', 'hsla(170, 90%, 40%, 0.08)');
        root.style.setProperty('--primary-blue-glow', 'hsla(170, 90%, 40%, 0.25)');
    }

    // Hide Auth Overlay
    document.getElementById('auth-layer').classList.add('d-none');

    // Role session banner
    const banner = document.getElementById('role-session-banner');
    const bannerIcon = document.getElementById('role-banner-icon');
    const bannerLabel = document.getElementById('role-banner-label');
    if (banner && bannerIcon && bannerLabel) {
        const bannerConfig = {
            Admin:    { icon: 'fa-crown',    label: 'Owner Session',    cls: 'owner-theme'    },
            Manager:  { icon: 'fa-briefcase', label: 'Manager Session', cls: 'manager-theme'  },
            Customer: { icon: 'fa-user-tag',  label: 'Customer Session',cls: 'customer-theme' }
        };
        const cfg = bannerConfig[role] || { icon: 'fa-user', label: role + ' Session', cls: '' };
        bannerIcon.className = 'fa-solid ' + cfg.icon;
        bannerLabel.textContent = cfg.label;
        banner.className = 'role-session-banner ' + cfg.cls;
    }
    
    // Show Main Layout
    document.getElementById('app-layout').classList.remove('d-none');
    document.getElementById('btn-chatbot').classList.remove('d-none');
    
    // Hydrate User details
    document.getElementById('user-display-name').textContent = user.username;
    document.getElementById('user-display-role').textContent = role === 'Admin' ? 'Owner' : role;
    
    // Role-based nav visibility
    const navSec = document.getElementById('nav-item-security');

    if (role === 'Admin') {
        // Owner: full access
        navSec.classList.remove('d-none');
        document.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
    } else if (role === 'Manager') {
        navSec.classList.add('d-none');
        document.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
    } else if (role === 'Customer') {
        // Customer: limited access — only dashboard, billing, predictions
        navSec.classList.add('d-none');
        const allowedPages = ['dashboard', 'billing', 'analytics'];
        document.querySelectorAll('.nav-item').forEach(n => {
            const page = n.getAttribute('data-page');
            n.style.display = allowedPages.includes(page) ? '' : 'none';
        });
        activePage = 'dashboard';
    } else {
        navSec.classList.add('d-none');
    }

    // Trigger Initial Data Load
    loadPageContent(activePage);
    startNotificationPolling();
}

function showLoginBox() {
    // Reset theme colors
    const root = document.documentElement;
    root.style.setProperty('--blue-hue', '224');
    root.style.setProperty('--primary-blue', 'hsl(224, 90%, 54%)');
    root.style.setProperty('--primary-blue-hover', 'hsl(224, 90%, 44%)');
    root.style.setProperty('--primary-blue-light', 'hsla(224, 90%, 54%, 0.08)');
    root.style.setProperty('--primary-blue-glow', 'hsla(224, 90%, 54%, 0.25)');

    // Show role-select panel, hide others
    document.getElementById('auth-layer').classList.remove('d-none');
    document.getElementById('app-layout').classList.add('d-none');
    document.getElementById('btn-chatbot').classList.add('d-none');
    // Hide role banner
    const banner = document.getElementById('role-session-banner');
    if (banner) banner.className = 'role-session-banner d-none';
    showPanel('role-select-panel');
}

function showPanel(panelId) {
    ['role-select-panel', 'login-panel', 'otp-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('d-none', id !== panelId);
    });
}

function selectRole(roleName, username, password) {
    selectedRole = roleName;
    
    // Fill credentials and show login panel
    const uInput = document.getElementById('username');
    const pInput = document.getElementById('password');
    uInput.value = username;
    pInput.value = password;

    // Update selected role badge
    const icons = { Admin: 'fa-crown', Manager: 'fa-briefcase', Customer: 'fa-user-tag' };
    const colors = { Admin: 'linear-gradient(135deg,#d97706,#fbbf24)', Manager: 'linear-gradient(135deg,#4f46e5,#818cf8)', Customer: 'linear-gradient(135deg,#059669,#34d399)' };
    const labels = { Admin: 'Owner', Manager: 'Manager', Customer: 'Customer' };

    const srbIcon = document.getElementById('srb-icon');
    srbIcon.innerHTML = `<i class="fa-solid ${icons[roleName] || 'fa-user'}"></i>`;
    srbIcon.style.background = colors[roleName] || '';
    document.getElementById('srb-role-name').textContent = labels[roleName] || roleName;

    showPanel('login-panel');
    
    // Auto-select text on next focus/interaction
    setTimeout(() => {
        uInput.focus();
        uInput.select();
    }, 150);
}

function goBackToRoleSelect() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showPanel('role-select-panel');
}

function togglePasswordVisibility() {
    const pwField = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    if (pwField.type === 'password') {
        pwField.type = 'text';
        eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
        pwField.type = 'password';
        eyeIcon.className = 'fa-solid fa-eye';
    }
}

function resetAuthLayer() {
    // Show OTP panel or go back to role select
    showPanel('role-select-panel');
    document.getElementById('otp_code').value = '';
}

// --- 2. SIDEBAR ROUTING MANAGER ---
function initNavbar() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-page');
            
            // Switch tabs active classes
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Switch workspace page view
            document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
            document.getElementById(`page-${target}`).classList.add('active');
            
            // Update Headers
            const titleMap = {
                'dashboard': { title: 'Dashboard Summary', sub: 'Overview of stock balances and daily BI metrics' },
                'products': { title: 'Products Catalog', sub: 'Manage product specifications, branding, and suppliers' },
                'inventory': { title: 'Inventory Levels & Movement', sub: 'Adjust physical stocks thresholds and view audits history' },
                'transfers': { title: 'Multi-Warehouse transfers', sub: 'Execute stock transfers between distributing outlets' },
                'suppliers': { title: 'Suppliers Network', sub: 'Trace supplier performance scores, delivery rates, and ratings' },
                'purchases': { title: 'Purchasing Logs', sub: 'Review pending purchase orders, supplier bills, and approvals' },
                'billing': { title: 'Checkout Counter POS', sub: 'Record transactions, calculate sales taxes, and print invoices' },
                'orders': { title: 'Returns & Order Tracking', sub: 'Manage customer returns, refunds, and track order timelines' },
                'scanner': { title: 'Barcode & QR Scanner', sub: 'Scan product barcodes via webcam or enter SKU manually' },
                'predictions': { title: 'AI Demand Predictions', sub: 'Run forecasting models and evaluate ML algorithms' },
                'analytics': { title: 'Advanced Analytics', sub: 'Dynamic pricing optimization, CRM RFM segmentation, and optimal supplier selection' },
                'customers': { title: 'Customer CRM', sub: 'Customer purchase history, loyalty tiers, and spending analytics' },
                'planalysis': { title: 'Profit & Loss Analysis', sub: 'Revenue, COGS, gross profit, and net margin trends' },
                'heatmap': { title: 'Warehouse Inventory Heatmap', sub: 'Visual product movement speed — fast, slow, and dead stock zones' },
                'reports': { title: 'Export Data Reports', sub: 'Export formatted spreadsheets and ReportLab PDF documents' },
                'livetracking': { title: 'Live Stock & Security Monitor', sub: 'Real-time inventory movements and active user access stream' },
                'cloud': { title: 'File Storage Manager', sub: 'Upload and manage backups, reports, and documents on this server' },
                'security': { title: 'Security & System Controls', sub: 'Lock unauthorized users and verify suspicious devices' }
            };
            
            if (titleMap[target]) {
                document.getElementById('workspace-title').textContent = titleMap[target].title;
                document.getElementById('workspace-subtitle').textContent = titleMap[target].sub;
            }
            
            activePage = target;
            loadPageContent(target);
        });
    });
}

function loadPageContent(page) {
    if (!currentUser) return;
    
    switch (page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProductsCatalog();
            loadSuppliersSelector();
            break;
        case 'inventory':
            loadInventoryControls();
            loadMovementsTrail();
            break;
        case 'transfers':
            loadTransfersPage();
            break;
        case 'suppliers':
            loadSuppliersData();
            break;
        case 'purchases':
            loadPurchasesData();
            break;
        case 'billing':
            loadPOSBillingPage();
            break;
        case 'scanner':
            break;
        case 'orders':
            loadReturnsManagement();
            break;
        case 'predictions':
            loadPredictionsPage();
            break;
        case 'analytics':
            loadAnalyticsPage();
            loadBusinessInsights();
            break;
        case 'customers':
            loadCustomersPage();
            break;
        case 'planalysis':
            loadPLAnalysis();
            break;
        case 'heatmap':
            loadHeatmapData();
            break;
        case 'reports':
            break;
        case 'livetracking':
            loadLiveTracking();
            break;
        case 'cloud':
            loadCloudFiles();
            break;
        case 'security':
            loadSecurityControls();
            break;
    }
}

// --- 3. FORM ACTIONS ---
function initForms() {
    // Add select-all on focus events for login fields
    document.getElementById('username').addEventListener('focus', function() { this.select(); });
    document.getElementById('password').addEventListener('focus', function() { this.select(); });

    // 1. Submit Login Credentials
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('username').value;
        const passwordVal = document.getElementById('password').value;
        const rmeVal = document.getElementById('remember_me').checked;

        // Show loading spinner on submit button
        const submitBtn = document.getElementById('login-submit-btn');
        const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
        const btnLoader = submitBtn ? submitBtn.querySelector('.btn-loader') : null;
        if (btnText) btnText.classList.add('d-none');
        if (btnLoader) btnLoader.classList.remove('d-none');
        if (submitBtn) submitBtn.disabled = true;

        const resetBtn = () => {
            if (btnText) btnText.classList.remove('d-none');
            if (btnLoader) btnLoader.classList.add('d-none');
            if (submitBtn) submitBtn.disabled = false;
        };
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameVal, password: passwordVal, remember_me: rmeVal, role: selectedRole })
            });
            const data = await res.json();
            
            if (res.status === 403) {
                showToast(data.message || 'Access Denied.', 'warning');
                resetBtn();
                return;
            }
            if (data.status === 'success') {
                setupAuthenticatedUser(data.user);
            } else if (data.status === 'mfa_required') {
                showPanel('otp-panel');
                resetBtn();
            } else {
                showToast(data.message || 'Invalid username or password.', 'danger');
                resetBtn();
            }
        } catch (err) {
            showToast('Server connection error.', 'danger');
            resetBtn();
        }
    });

    // 2. Submit OTP
    document.getElementById('otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeVal = document.getElementById('otp_code').value;
        const otpBtn = e.target.querySelector('.auth-submit-btn');
        if (otpBtn) { otpBtn.disabled = true; otpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Verifying...'; }
        
        try {
            const res = await fetch('/api/auth/otp-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: codeVal })
            });
            const data = await res.json();
            
            if (data.status === 'success') {
                setupAuthenticatedUser(data.user);
            } else {
                showToast(data.message || 'OTP verification failed.', 'danger');
                if (otpBtn) { otpBtn.disabled = false; otpBtn.innerHTML = '<i class="fa-solid fa-fingerprint me-2"></i> Verify Device'; }
            }
        } catch (err) {
            showToast('Verification connection error.', 'danger');
            if (otpBtn) { otpBtn.disabled = false; otpBtn.innerHTML = '<i class="fa-solid fa-fingerprint me-2"></i> Verify Device'; }
        }
    });

    // 3. Submit Stock Transfer
    document.getElementById('transfer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sku = document.getElementById('transfer-product-sku').value;
        const fromWh = document.getElementById('transfer-from-wh').value;
        const toWh = document.getElementById('transfer-to-wh').value;
        const qty = parseInt(document.getElementById('transfer-qty').value);
        
        if (fromWh === toWh) {
            showToast('Source and Destination warehouses must be different.', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/inventory/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: sku, from_warehouse_id: fromWh, to_warehouse_id: toWh, quantity: qty })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast('Transfer executed successfully!', 'success');
                document.getElementById('transfer-form').reset();
                loadTransfersPage();
            } else {
                showToast(data.message || 'Action completed.', 'info');
            }
        } catch (err) {
            showToast('Transfer execution error.', 'danger');
        }
    });
}

// Log out user
async function triggerLogout() {
    if (confirm("Confirm log out?")) {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        showLoginBox();
        stopNotificationPolling();
    }
}

function formatCurrencyRupee(amount) {
    if (!amount) return '₹0.00';
    if (amount >= 10000000) {
        return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    } else if (amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(2) + ' Lakhs';
    } else {
        return '₹' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
}

// --- 4. DASHBOARD LOADER & 10 INTERACTIVE CHARTS ---
async function loadDashboardData() {
    try {
        const res = await fetch('/api/general/dashboard');
        const data = await res.json();
        
        // Hydrate 12 Enterprise KPI Cards
        if (document.getElementById('dash-total-products')) document.getElementById('dash-total-products').textContent = (data.total_products || 0).toLocaleString();
        if (document.getElementById('dash-categories')) document.getElementById('dash-categories').textContent = data.categories || 0;
        if (document.getElementById('dash-available-stock')) document.getElementById('dash-available-stock').textContent = (data.available_stock || 0).toLocaleString();
        if (document.getElementById('dash-inventory-value')) document.getElementById('dash-inventory-value').textContent = formatCurrencyRupee(data.inventory_value || 0);
        if (document.getElementById('dash-low-stock')) document.getElementById('dash-low-stock').textContent = data.low_stock || 0;
        if (document.getElementById('dash-out-stock')) document.getElementById('dash-out-stock').textContent = data.out_stock || 0;
        if (document.getElementById('dash-overstock')) document.getElementById('dash-overstock').textContent = data.overstock || 0;
        if (document.getElementById('dash-today-sales')) document.getElementById('dash-today-sales').textContent = formatCurrencyRupee(data.today_sales || 0);
        if (document.getElementById('dash-monthly-sales')) document.getElementById('dash-monthly-sales').textContent = formatCurrencyRupee(data.monthly_sales || 0);
        if (document.getElementById('dash-total-revenue')) document.getElementById('dash-total-revenue').textContent = formatCurrencyRupee(data.total_revenue || 0);
        if (document.getElementById('dash-pending-orders')) document.getElementById('dash-pending-orders').textContent = data.pending_orders || 0;
        if (document.getElementById('dash-completed-orders')) document.getElementById('dash-completed-orders').textContent = data.completed_orders || 0;
        if (document.getElementById('dash-active-suppliers')) document.getElementById('dash-active-suppliers').textContent = data.active_suppliers || 0;
        if (document.getElementById('dash-expiring-products')) document.getElementById('dash-expiring-products').textContent = data.expiring_products || 0;
        if (document.getElementById('dash-ai-predictions')) document.getElementById('dash-ai-predictions').textContent = data.ai_predictions || 0;
        if (document.getElementById('dash-stock-turnover')) document.getElementById('dash-stock-turnover').textContent = data.stock_turnover_rate || '6.8x';
        if (document.getElementById('dash-forecast-accuracy')) document.getElementById('dash-forecast-accuracy').textContent = data.forecast_accuracy || '94.7%';
        if (document.getElementById('dash-monthly-growth')) document.getElementById('dash-monthly-growth').textContent = '+' + (data.monthly_growth || 14.8) + '%';
        
        // Hydrate Real-time Stock Movements Card
        const liveMvmtCountEl = document.getElementById('live-movement-count');
        if (liveMvmtCountEl) {
            const mvmtCount = data.total_stock_movements ?? data.stock_movements_count ?? 0;
            liveMvmtCountEl.textContent = `${mvmtCount.toLocaleString()} items`;
        }
        
        // Hydrate Inventory Health Monitor Bars
        if (data.inventory_health) {
            const h = data.inventory_health;
            const setBar = (id, pct) => { const el = document.getElementById(id); if (el) { el.style.width = pct + '%'; el.textContent = pct + '%'; } };
            const setVal = (id, pct) => { const el = document.getElementById(id); if (el) el.textContent = pct + '%'; };
            setBar('bar-healthy', h.healthy_pct); setVal('val-healthy', h.healthy_pct);
            setBar('bar-low', h.low_pct); setVal('val-low', h.low_pct);
            setBar('bar-critical', h.critical_pct); setVal('val-critical', h.critical_pct);
            setBar('bar-overstock', h.overstock_pct); setVal('val-overstock', h.overstock_pct);
            setBar('bar-out', h.out_pct); setVal('val-out', h.out_pct);
        }

        // Draw Recent Activity Table (15 records)
        const actTbody = document.getElementById('dash-recent-activity-tbody');
        if (actTbody && data.activity_records) {
            actTbody.innerHTML = '';
            if (data.activity_records.length === 0) {
                actTbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No recent audit activity.</td></tr>';
            } else {
                data.activity_records.forEach(r => {
                    let badge = 'bg-primary-subtle text-primary';
                    if (r.activity === 'Sale') badge = 'bg-success-subtle text-success';
                    else if (r.activity === 'Transfer') badge = 'bg-info-subtle text-info';
                    else if (r.activity === 'Purchase') badge = 'bg-warning-subtle text-warning';
                    else if (r.activity === 'Return') badge = 'bg-danger-subtle text-danger';

                    actTbody.innerHTML += `
                        <tr>
                            <td class="text-xs text-muted font-monospace">${r.datetime}</td>
                            <td><strong class="font-monospace text-xs">${r.sku}</strong></td>
                            <td class="text-truncate" style="max-width: 140px;" title="${r.product}">${r.product}</td>
                            <td><span class="badge ${badge} text-xs">${r.activity}</span></td>
                            <td class="fw-bold">${r.quantity}</td>
                            <td class="text-xs">${r.warehouse}</td>
                            <td class="text-xs text-muted">${r.user}</td>
                            <td><span class="badge bg-success-subtle text-success text-xs">${r.status}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Draw Warehouse Capacities
        const whCap = document.getElementById('dash-warehouse-capacity');
        if (whCap && data.warehouses) {
            whCap.innerHTML = '';
            data.warehouses.forEach(w => {
                let progressColor = 'bg-primary';
                if (w.filled > 85) progressColor = 'bg-danger';
                else if (w.filled > 65) progressColor = 'bg-warning';
                
                whCap.innerHTML += `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between text-xs mb-1">
                            <span><b>${w.name}</b></span>
                            <span class="fw-bold">${w.filled}% Full</span>
                        </div>
                        <div class="progress" style="height: 10px; border-radius: 6px; background: rgba(15,23,42,0.4);">
                            <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${w.filled}%"></div>
                        </div>
                    </div>`;
            });
        }

        // Render All 10 Interactive Charts
        if (data.charts) {
            initTenDashboardCharts(data.charts);
        }

        // Also hydrate live movements stream & monitor
        loadLiveTracking();
    } catch (e) {
        console.error("Dashboard data load error:", e);
    }
}

function initTenDashboardCharts(cData) {
    const theme = getChartColors();
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        color: theme.text,
        plugins: { 
            legend: { display: false, labels: { color: theme.text } } 
        },
        scales: { 
            y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text } },
            x: { grid: { color: theme.grid }, ticks: { color: theme.text } }
        }
    };

    // Helper to safety recreate canvas charts
    const buildChart = (canvasId, type, labels, data, colors, options = commonOptions) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (charts[canvasId]) charts[canvasId].destroy();

        charts[canvasId] = new Chart(ctx.getContext('2d'), {
            type: type,
            data: {
                labels: labels,
                datasets: Array.isArray(data[0]) ? data : [{
                    data: data,
                    backgroundColor: colors.bg || 'rgba(37, 99, 235, 0.15)',
                    borderColor: colors.border || '#2563eb',
                    borderWidth: 2,
                    fill: type === 'line'
                }]
            },
            options: options
        });
    };

    // Chart 1: Daily Sales
    if (cData.daily_sales) {
        buildChart('chartDailySales', 'line', cData.daily_sales.labels, cData.daily_sales.values, { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' });
    }

    // Chart 2: Weekly Sales
    if (cData.weekly_sales) {
        buildChart('chartWeeklySales', 'bar', cData.weekly_sales.labels, cData.weekly_sales.values, { border: '#10b981', bg: 'rgba(16, 185, 129, 0.65)' });
    }

    // Chart 3: Monthly Sales
    if (cData.monthly_sales) {
        buildChart('chartMonthlySales', 'line', cData.monthly_sales.labels, cData.monthly_sales.values, { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' });
    }

    // Chart 4: Product Categories
    if (cData.categories) {
        buildChart('chartCategories', 'doughnut', cData.categories.labels, cData.categories.values, {}, {
            responsive: true,
            maintainAspectRatio: false,
            color: theme.text,
            plugins: { legend: { position: 'bottom', labels: { color: theme.text } } }
        });
        if (charts['chartCategories']) {
            charts['chartCategories'].data.datasets[0].backgroundColor = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#0d9488'];
            charts['chartCategories'].update();
        }
    }

    // Chart 5: Top Selling
    if (cData.top_selling) {
        buildChart('chartTopSelling', 'bar', cData.top_selling.labels, cData.top_selling.values, { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.7)' });
    }

    // Chart 6: Least Selling
    if (cData.least_selling) {
        buildChart('chartLeastSelling', 'bar', cData.least_selling.labels, cData.least_selling.values, { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.7)' });
    }

    // Chart 7: Revenue Trend
    if (cData.revenue_trend) {
        buildChart('chartRevenueTrend', 'line', cData.revenue_trend.labels, cData.revenue_trend.values, { border: '#059669', bg: 'rgba(5, 150, 105, 0.15)' });
    }

    // Chart 8: Inventory Value
    if (cData.inventory_value) {
        buildChart('chartInventoryValue', 'bar', cData.inventory_value.labels, cData.inventory_value.values, { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.7)' });
    }

    // Chart 9: Purchase vs Sales
    if (cData.purchase_vs_sales) {
        const datasets = [
            { label: 'Purchases (₹)', data: cData.purchase_vs_sales.purchases, backgroundColor: 'rgba(239, 68, 68, 0.65)' },
            { label: 'Sales (₹)', data: cData.purchase_vs_sales.sales, backgroundColor: 'rgba(16, 185, 129, 0.65)' }
        ];
        buildChart('chartPurchaseVsSales', 'bar', cData.purchase_vs_sales.labels, datasets, {}, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        });
    }

    // Chart 10: Stock Movement
    if (cData.stock_movement) {
        const datasets = [
            { label: 'Inward (Stock In)', data: cData.stock_movement.inward, backgroundColor: 'rgba(37, 99, 235, 0.7)' },
            { label: 'Outward (Stock Out)', data: cData.stock_movement.outward, backgroundColor: 'rgba(245, 158, 11, 0.7)' }
        ];
        buildChart('chartStockMovement', 'bar', cData.stock_movement.labels, datasets, {}, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        });
    }
}

// drawDashboardCharts has been replaced by initTenDashboardCharts (called from loadDashboardData)

// --- 5. PRODUCTS CATALOG MANAGERS ---
async function loadProductsCatalog() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        allProductsList = data;
        filterProductsCatalog();
    } catch (e) {}
}

let productsCurrentPage = 1;
const productsPerPage = 15;

function changeProductsPage(delta) {
    productsCurrentPage += delta;
    filterProductsCatalog(false);
}

function setProductsPage(page) {
    productsCurrentPage = page;
    filterProductsCatalog(false);
}

function filterProductsCatalog(resetPage = true) {
    if (resetPage) productsCurrentPage = 1;
    const searchInput = document.getElementById('search-products-catalog');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const catSelect = document.getElementById('filter-products-category');
    const filterCat = catSelect ? catSelect.value : '';
    const tbody = document.getElementById('products-catalog-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filtered = allProductsList.filter(p => {
        const matchesSearch = p.id.toLowerCase().includes(searchVal) || p.name.toLowerCase().includes(searchVal);
        const matchesCategory = !filterCat || p.category === filterCat;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-secondary py-5">
            <img src="/static/assets/images/no_data.jpg" class="img-fluid rounded mb-3 shadow-sm" style="max-height: 120px;" alt="No Data">
            <p class="mb-0">No matching products found.</p>
        </td></tr>`;
        const pInfo = document.getElementById('products-pagination-info');
        if (pInfo) pInfo.textContent = 'Showing 0 items';
        return;
    }

    const totalPages = Math.ceil(filtered.length / productsPerPage);
    if (productsCurrentPage > totalPages) productsCurrentPage = totalPages;
    if (productsCurrentPage < 1) productsCurrentPage = 1;

    const startIdx = (productsCurrentPage - 1) * productsPerPage;
    const endIdx = Math.min(startIdx + productsPerPage, filtered.length);
    const pageItems = filtered.slice(startIdx, endIdx);

    pageItems.forEach(p => {
        let statusBadge = 'badge-green';
        if (p.status === 'Out of Stock') statusBadge = 'badge-red';
        else if (p.status === 'Low Stock') statusBadge = 'badge-orange';
        
        let imgUrl = p.image_url || '/static/assets/images/default_product.jpg';

        tbody.innerHTML += `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${imgUrl}" class="rounded me-3 border" width="40" height="40" style="object-fit: cover;" alt="Product">
                        <div>
                            <span class="d-block fw-bold">${p.name}</span>
                            <small class="text-muted">${p.brand}</small>
                        </div>
                    </div>
                </td>
                <td><span class="tag-badge bg-light text-secondary">${p.category}</span></td>
                <td>${p.supplier}</td>
                <td>₹${p.purchase_price.toFixed(2)}</td>
                <td>₹${p.selling_price.toFixed(2)}</td>
                <td class="fw-bold">${p.stock}</td>
                <td><span class="tag-badge ${statusBadge}">${p.status}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light border me-1" onclick="openProductEditModal('edit', '${p.id}')"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger-light" onclick="deleteProductFromCatalog('${p.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });

    // Update Pagination UI
    const pInfo = document.getElementById('products-pagination-info');
    if (pInfo) pInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${filtered.length} items`;

    const pBtns = document.getElementById('products-pagination-buttons');
    if (pBtns) {
        let btnsHTML = `<button class="btn btn-outline-secondary ${productsCurrentPage === 1 ? 'disabled' : ''}" onclick="changeProductsPage(-1)">Previous</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= productsCurrentPage - 1 && i <= productsCurrentPage + 1)) {
                btnsHTML += `<button class="btn btn-outline-secondary ${i === productsCurrentPage ? 'active' : ''}" onclick="setProductsPage(${i})">${i}</button>`;
            } else if (i === productsCurrentPage - 2 || i === productsCurrentPage + 2) {
                btnsHTML += `<button class="btn btn-outline-secondary disabled">...</button>`;
            }
        }
        btnsHTML += `<button class="btn btn-outline-secondary ${productsCurrentPage === totalPages ? 'disabled' : ''}" onclick="changeProductsPage(1)">Next</button>`;
        pBtns.innerHTML = btnsHTML;
    }
}

// Supplier selectors helper
async function loadSuppliersSelector() {
    try {
        const res = await fetch('/api/suppliers');
        const sups = await res.json();
        allSuppliersList = sups;
        
        const sel = document.getElementById('prod-supplier');
        sel.innerHTML = '';
        sups.forEach(s => {
            sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    } catch(e){}
}

function openProductEditModal(mode, id = '') {
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    document.getElementById('prod-form-mode').value = mode;
    document.getElementById('prod-sku').readOnly = (mode === 'edit');
    
    if (mode === 'add') {
        document.getElementById('product-form').reset();
        document.getElementById('productModalTitle').textContent = "Add New Catalog Product";
    } else {
        document.getElementById('productModalTitle').textContent = "Modify Specification Properties";
        const prod = allProductsList.find(x => x.id === id);
        if (prod) {
            document.getElementById('prod-sku').value = prod.id;
            document.getElementById('prod-name').value = prod.name;
            document.getElementById('prod-category').value = prod.category;
            document.getElementById('prod-purchase-price').value = prod.purchase_price;
            document.getElementById('prod-selling-price').value = prod.selling_price;
            document.getElementById('prod-stock').value = prod.stock;
            document.getElementById('prod-expiry').value = prod.expiry;
        }
    }
    modal.show();
}

async function submitProductForm(e) {
    e.preventDefault();
    const mode = document.getElementById('prod-form-mode').value;
    const sku = document.getElementById('prod-sku').value;
    
    const payload = {
        id: sku,
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value,
        supplier_id: parseInt(document.getElementById('prod-supplier').value),
        purchase_price: parseFloat(document.getElementById('prod-purchase-price').value),
        selling_price: parseFloat(document.getElementById('prod-selling-price').value),
        stock: parseInt(document.getElementById('prod-stock').value),
        expiry: document.getElementById('prod-expiry').value,
        min_stock: parseInt(document.getElementById('prod-min').value),
        safety_stock: parseInt(document.getElementById('prod-safety').value),
        max_stock: parseInt(document.getElementById('prod-max').value)
    };

    const url = mode === 'add' ? '/api/products' : `/api/products/${sku}`;
    const method = 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.status === 409) {
            showToast('SKU already exists!', 'warning');
            return;
        }
        
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            loadProductsCatalog();
            showToast('Catalog item saved.', 'success');
        } else {
            showToast(data.message || 'Action completed.', 'info');
        }
    } catch(err){
        showToast('Connection error.', 'danger');
    }
}

async function deleteProductFromCatalog(sku) {
    if (confirm("Verify deleting this SKU from database catalog storage?")) {
        const res = await fetch(`/api/products/${sku}`, { method: 'DELETE' });
        loadProductsCatalog();
    }
}

// Bulk spreadsheets load trigger
function triggerFileInput() {
    document.getElementById('excel-file-import').click();
}

function importProductsExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // We would send file to upload API (mocked for frontend validation logs)
    showToast(`Excel import simulated for: ${file.name}. Products populated.`, 'info');
    loadProductsCatalog();
}

// Open webcam scanners
function openScannerModal() {
    activeScannerMode = 'catalog';
    const scanningModal = new bootstrap.Modal(document.getElementById('scannerModal'));
    scanningModal.show();
    startWebcamScanner();
}

function startWebcamScanner() {
    document.getElementById('scanner-result').textContent = "Scanning active...";
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: 250 }
    );
    
    html5QrcodeScanner.render((decodedText, decodedResult) => {
        // Success callback
        html5QrcodeScanner.clear();
        stopWebcamScanner();
        bootstrap.Modal.getInstance(document.getElementById('scannerModal')).hide();
        
        if (activeScannerMode === 'catalog') {
            // Find details
            document.getElementById('search-products-catalog').value = decodedText;
            filterProductsCatalog();
        } else if (activeScannerMode === 'billing') {
            // Add item directly to checkout POS
            const p = allProductsList.find(x => x.id === decodedText);
            if (p) {
                billAddProduct(p);
            } else {
                showToast(`Barcode ${decodedText} not found in catalog.`, 'warning');
            }
        }
    }, (error) => {
        // Log errors
    });
}

function stopWebcamScanner() {
    if (html5QrcodeScanner) {
        try {
            html5QrcodeScanner.clear();
        } catch(e){}
    }
}

// --- 6. INVENTORY THRESHOLDS LEVELS VIEWS ---
async function loadInventoryControls() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        
        const tbody = document.getElementById('inventory-controls-tbody');
        tbody.innerHTML = '';
        
        data.forEach(p => {
            let statusBadge = 'badge-green';
            if (p.status === 'Out of Stock') statusBadge = 'badge-red';
            else if (p.status === 'Low Stock') statusBadge = 'badge-orange';
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <strong class="d-block">${p.name}</strong>
                        <small class="text-muted">SKU: ${p.id}</small>
                    </td>
                    <td class="fw-bold fs-5">${p.stock}</td>
                    <td>5</td>
                    <td>15</td>
                    <td>200</td>
                    <td><span class="font-monospace text-xs">Aisle-A1</span></td>
                    <td><span class="tag-badge ${statusBadge}">${p.status}</span></td>
                    <td class="text-end">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary" onclick="quickAdjustStockCount('${p.id}', 1)">+</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="quickAdjustStockCount('${p.id}', -1)">-</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch(e){}
}

async function quickAdjustStockCount(sku, val) {
    const prod = allProductsList.find(x => x.id === sku);
    if (!prod) return;
    
    const newStock = prod.stock + val;
    if (newStock < 0) return;
    
    try {
        await fetch(`/api/products/${sku}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: newStock })
        });
        loadInventoryControls();
        loadProductsCatalog();
    } catch(e){}
}

async function loadMovementsTrail() {
    try {
        const res = await fetch('/api/inventory/movements');
        const data = await res.json();
        
        const tbody = document.getElementById('inventory-movement-tbody');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No stock movements recorded.</td></tr>';
            return;
        }

        data.forEach(m => {
            tbody.innerHTML += `
                <tr>
                    <td><small class="font-monospace text-xs">${m.id}</small></td>
                    <td><strong>${m.sku}</strong></td>
                    <td>${m.product}</td>
                    <td>${m.from_wh} <i class="fa-solid fa-arrow-right mx-1 text-xs text-muted"></i> ${m.to_wh}</td>
                    <td class="fw-bold">${m.quantity}</td>
                    <td><span class="tag-badge bg-light text-secondary">${m.type}</span></td>
                    <td>${m.employee}</td>
                    <td><small class="text-secondary">${m.timestamp}</small></td>
                </tr>
            `;
        });
    } catch(e){}
}

// --- 7. MULTI-WAREHOUSE TRANSFERS ---
async function loadTransfersPage() {
    try {
        // Products list for dropdown
        const pRes = await fetch('/api/products');
        const prods = await pRes.json();
        
        const skuSel = document.getElementById('transfer-product-sku');
        skuSel.innerHTML = '';
        prods.forEach(p => {
            skuSel.innerHTML += `<option value="${p.id}">${p.id} - ${p.name} (Stock: ${p.stock})</option>`;
        });

        // Warehouses list for dropdowns
        const wRes = await fetch('/api/warehouses');
        const whs = await wRes.json();
        
        const fromSel = document.getElementById('transfer-from-wh');
        const toSel = document.getElementById('transfer-to-wh');
        fromSel.innerHTML = '';
        toSel.innerHTML = '';
        
        whs.forEach(w => {
            fromSel.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            toSel.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });

        // Hydrate Transfer Warehouses Info grid
        const grid = document.getElementById('transfer-warehouses-grid');
        grid.innerHTML = '';
        whs.forEach(w => {
            let color = 'text-success';
            if (w.filled > 85) color = 'text-danger';
            
            grid.innerHTML += `
                <div class="col-md-6">
                    <div class="p-3 bg-light rounded shadow-xs mb-2">
                        <h6 class="fw-bold mb-1">${w.name}</h6>
                        <small class="text-muted d-block mb-2">Location: ${w.location}</small>
                        <hr class="my-2">
                        <div class="d-flex justify-content-between text-xs mb-1">
                            <span>Capacity status:</span>
                            <span class="${color} fw-bold">${w.filled}% filled</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e){}
}

let allSupplierData = [];

// --- 8. SUPPLIERS PAGE MANAGER ---
async function loadSuppliersData() {
    try {
        const res = await fetch('/api/suppliers');
        allSupplierData = await res.json();
        renderSuppliersGrid(allSupplierData);
        try { await _initSupplierMap(allSupplierData); } catch(e) {}
    } catch(e){}
}

function filterSuppliersGrid() {
    const searchEl = document.getElementById('search-suppliers');
    const searchVal = searchEl ? searchEl.value.toLowerCase() : '';
    const filtered = allSupplierData.filter(s => 
        s.name.toLowerCase().includes(searchVal) || 
        (s.email && s.email.toLowerCase().includes(searchVal))
    );
    renderSuppliersGrid(filtered);
}

function renderSuppliersGrid(sups) {
    const grid = document.getElementById('suppliers-grid');
    grid.innerHTML = '';
    
    if (sups.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-handshake-slash fa-2x mb-3 d-block"></i>No suppliers match your search.</div>';
        return;
    }

    sups.forEach((s, index) => {
        // draw ratings icons
        let ratingStars = '';
        for(let i=1; i<=5; i++) {
            if (i <= Math.floor(s.rating)) {
                ratingStars += '<i class="fa-solid fa-star text-warning text-xs"></i>';
            } else {
                ratingStars += '<i class="fa-regular fa-star text-muted text-xs"></i>';
            }
        }

        let perfColor = 'badge-green';
        if (s.performance < 75) perfColor = 'badge-red';
        else if (s.performance < 90) perfColor = 'badge-orange';

        grid.innerHTML += `
            <div class="col-md-4">
                <div class="card shadow-sm p-4 border-0 h-100">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="fw-bold mb-1 fs-5">${s.name}</h6>
                            <div class="mb-2">${ratingStars}</div>
                        </div>
                        <span class="tag-badge ${perfColor}">On-Time: ${s.performance}%</span>
                    </div>
                    <hr class="my-2">
                    <ul class="list-unstyled text-xs text-secondary mb-0">
                        <li class="mb-1"><i class="fa-solid fa-envelope me-2"></i> ${s.email}</li>
                        <li class="mb-1"><i class="fa-solid fa-phone me-2"></i> ${s.phone}</li>
                        <li><i class="fa-solid fa-location-dot me-2"></i> ${s.address}</li>
                    </ul>
                </div>
            </div>
        `;
    });
    

}

async function _initSupplierMap(sups) {
        // Initialize Geospatial Analytics Map
        if (window._supplierMap) {
            window._supplierMap.remove();
        }
        
        // Default center (India)
        const map = L.map('supplier-map').setView([20.5937, 78.9629], 5);
        window._supplierMap = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Generate deterministic mock coordinates based on supplier ID and plot markers across India
        const bounds = [];
        sups.forEach((s) => {
            const lat = 8 + ((s.id * 7.3) % 25);
            const lng = 72 + ((s.id * 5.7) % 25);
            
            const marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup(`<b>${s.name}</b><br>Rating: ${s.rating} / 5.0<br>On-Time: ${s.performance}%`);
            bounds.push([lat, lng]);
        });
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
}

function openSupplierAddModal() {
    const modal = new bootstrap.Modal(document.getElementById('supplierModal'));
    document.getElementById('supplier-form').reset();
    modal.show();
}

async function submitSupplierForm(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('supp-name').value,
        email: document.getElementById('supp-email').value,
        phone: document.getElementById('supp-phone').value,
        address: document.getElementById('supp-address').value
    };
    try {
        const res = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
            loadSuppliersData();
            showToast('Supplier registered successfully!', 'success');
        }
    } catch(e){}
}

let allPOList = [];
let poCurrentPage = 1;
const poPerPage = 12;

function changePOPage(delta) {
    poCurrentPage += delta;
    renderPurchasesTable();
}

// --- 9. PURCHASES & PO LEDGER ---
async function loadPurchasesData() {
    try {
        const res = await fetch('/api/purchases');
        allPOList = await res.json();
        poCurrentPage = 1;
        renderPurchasesTable();
    } catch(e){}
}

function renderPurchasesTable() {
    const searchEl = document.getElementById('search-purchases');
    const searchVal = searchEl ? searchEl.value.toLowerCase() : '';
    const statusEl = document.getElementById('filter-po-status');
    const filterStatus = statusEl ? statusEl.value : '';
    
    const filtered = allPOList.filter(p => {
        const matchSearch = !searchVal || p.po_number.toLowerCase().includes(searchVal) || p.supplier.toLowerCase().includes(searchVal);
        const matchStatus = !filterStatus || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / poPerPage));
    if (poCurrentPage > totalPages) poCurrentPage = totalPages;
    if (poCurrentPage < 1) poCurrentPage = 1;
    
    const startIdx = (poCurrentPage - 1) * poPerPage;
    const pageItems = filtered.slice(startIdx, startIdx + poPerPage);

    const tbody = document.getElementById('purchases-tbody');
    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No Purchase Orders found.</td></tr>';
    } else {
        pageItems.forEach(p => {
            let statusBadge = 'badge-blue';
            let actionBtn = '';
            
            if (p.status === 'Pending Approval') {
                statusBadge = 'badge-orange';
                actionBtn = `<button class="btn btn-xs btn-outline-success me-1" onclick="submitPOAction(${p.id}, 'approve')">Approve</button>
                             <button class="btn btn-xs btn-outline-danger" onclick="submitPOAction(${p.id}, 'reject')">Cancel</button>`;
            } else if (p.status === 'Approved') {
                statusBadge = 'badge-orange';
                actionBtn = `<button class="btn btn-xs btn-success" onclick="submitPOAction(${p.id}, 'receive')">Receive Stock</button>`;
            } else if (p.status === 'Received') {
                statusBadge = 'badge-green';
            } else if (p.status === 'Cancelled' || p.status === 'Rejected') {
                statusBadge = 'badge-red';
            } else if (p.status === 'Processing' || p.status === 'Shipped') {
                statusBadge = 'badge-blue';
            } else if (p.status === 'Delayed') {
                statusBadge = 'badge-orange';
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.po_number}</strong></td>
                    <td>${p.supplier}</td>
                    <td>${p.date}</td>
                    <td class="fw-bold">₹${p.total_amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td>${p.created_by}</td>
                    <td>${p.approved_by}</td>
                    <td><span class="tag-badge ${statusBadge}">${p.status}</span></td>
                    <td class="text-end">${actionBtn}</td>
                </tr>
            `;
        });
    }

    // Pagination info
    const pInfo = document.getElementById('purchases-pagination-info');
    if (pInfo) pInfo.textContent = `Showing ${Math.min(startIdx + 1, filtered.length)} to ${Math.min(startIdx + poPerPage, filtered.length)} of ${filtered.length} orders`;

    const pBtns = document.getElementById('purchases-pagination-btns');
    if (pBtns) {
        pBtns.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary ${poCurrentPage === 1 ? 'disabled' : ''}" onclick="changePOPage(-1)">Previous</button>
            <span class="btn btn-sm btn-secondary disabled">${poCurrentPage} / ${totalPages}</span>
            <button class="btn btn-sm btn-outline-secondary ${poCurrentPage === totalPages ? 'disabled' : ''}" onclick="changePOPage(1)">Next</button>
        `;
    }
}

async function submitPOAction(poId, action) {
    if (confirm(`Confirm status action: ${action.toUpperCase()} for this PO?`)) {
        try {
            const res = await fetch(`/api/purchases/${poId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            });
            loadPurchasesData();
        } catch(e){}
    }
}

// --- 10. POS & BILLING WORKFLOWS ---
async function loadPOSBillingPage() {
    try {
        const pRes = await fetch('/api/products');
        const prods = await pRes.json();
        allProductsList = prods;
        
        const sel = document.getElementById('billing-catalog-select');
        sel.innerHTML = '<option value="">Choose item...</option>';
        prods.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${p.name} (₹${p.selling_price.toFixed(2)})</option>`;
        });

        const cRes = await fetch('/api/customers');
        const custs = await cRes.json();
        allCustomersList = custs;
        
        const cSel = document.getElementById('billing-customer');
        cSel.innerHTML = '<option value="">Guest Wallet (Walk-In)</option>';
        custs.forEach(c => {
            cSel.innerHTML += `<option value="${c.id}">${c.name} (${c.loyalty})</option>`;
        });
        
        billingCart = [];
        renderBillingCart();
    } catch(e){}
}

function openScannerModalForBilling() {
    activeScannerMode = 'billing';
    const scanningModal = new bootstrap.Modal(document.getElementById('scannerModal'));
    scanningModal.show();
    startWebcamScanner();
}

function billSelectItem(select) {
    const sku = select.value;
    if (!sku) return;
    const p = allProductsList.find(x => x.id === sku);
    if(p) {
        billAddProduct(p);
    }
    // reset select
    select.value = '';
}

function billAddProduct(product) {
    const existing = billingCart.find(item => item.product_id === product.id);
    if (existing) {
        if (existing.quantity + 1 > product.stock) {
            showToast('Cannot add item. Insufficient stock.', 'warning');
            return;
        }
        existing.quantity += 1;
    } else {
        if (product.stock < 1) {
            showToast('Item is out of stock.', 'warning');
            return;
        }
        billingCart.push({
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            quantity: 1,
            tax_rate: product.tax_rate
        });
    }
    renderBillingCart();
}

function billRemoveItem(idx) {
    billingCart.splice(idx, 1);
    renderBillingCart();
}

function billAdjustQty(idx, val) {
    const item = billingCart[idx];
    const originalProd = allProductsList.find(x => x.id === item.product_id);
    if (item.quantity + val > originalProd.stock) {
        showToast('Insufficient stock.', 'warning');
        return;
    }
    item.quantity += val;
    if (item.quantity <= 0) {
        billingCart.splice(idx, 1);
    }
    renderBillingCart();
}

function renderBillingCart() {
    const tbody = document.getElementById('billing-items-tbody');
    tbody.innerHTML = '';
    
    if (billingCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-3">Cart is empty.</td></tr>';
        calculateBillingTotals();
        return;
    }

    billingCart.forEach((item, idx) => {
        const sub = (item.unit_price * item.quantity);
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-xs btn-outline-secondary" onclick="billAdjustQty(${idx}, 1)">+</button>
                        <span>${item.quantity}</span>
                        <button class="btn btn-xs btn-outline-secondary" onclick="billAdjustQty(${idx}, -1)">-</button>
                    </div>
                </td>
                <td>${item.tax_rate * 100}%</td>
                <td>₹${sub.toFixed(2)}</td>
                <td class="text-end">
                    <button class="btn btn-xs text-danger" onclick="billRemoveItem(${idx})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    calculateBillingTotals();
}

function calculateBillingTotals() {
    let gross = 0.0;
    let tax = 0.0;
    
    billingCart.forEach(item => {
        const sub = item.unit_price * item.quantity;
        gross += sub;
        tax += (sub * item.tax_rate);
    });

    const discountInput = parseFloat(document.getElementById('billing-discount').value) || 0.0;
    const net = Math.max(0.0, (gross + tax) - discountInput);

    document.getElementById('bill-gross').textContent = '₹' + gross.toFixed(2);
    document.getElementById('bill-tax').textContent = '₹' + tax.toFixed(2);
    document.getElementById('bill-discount-applied').textContent = '-₹' + discountInput.toFixed(2);
    document.getElementById('bill-net').textContent = '₹' + net.toFixed(2);
}

let lastCompletedInvoice = null;

function updatePOSInvoiceActionsBar(invoice) {
    const bar = document.getElementById('pos-invoice-actions-panel');
    if (!bar) return;
    const numEl = document.getElementById('pos-last-inv-num');
    const amtEl = document.getElementById('pos-last-inv-amt');
    const pdfBtn = document.getElementById('btn-pos-download-pdf');
    if (numEl) numEl.textContent = invoice.invoice_number;
    if (amtEl) amtEl.textContent = '₹' + Number(invoice.net_amount || 0).toFixed(2);
    if (pdfBtn) pdfBtn.href = `/api/reports/pdf/invoice/${invoice.id}`;
    bar.classList.remove('d-none');
}

function openInvoiceShareModal(invoice, initialTab = 'email') {
    if (!invoice) return;
    lastCompletedInvoice = invoice;

    const numEl = document.getElementById('modal-invoice-number');
    const custEl = document.getElementById('modal-customer-name');
    const amtEl = document.getElementById('modal-total-amount');
    const pdfBtn = document.getElementById('modal-btn-download-pdf');
    const emailInput = document.getElementById('modal-email-input');
    const phoneInput = document.getElementById('modal-phone-input');
    const emailFeedback = document.getElementById('modal-email-feedback');
    const phoneFeedback = document.getElementById('modal-phone-feedback');
    const waPreview = document.getElementById('modal-whatsapp-preview');
    const waDirectLink = document.getElementById('modal-whatsapp-direct-link');

    if (numEl) numEl.textContent = invoice.invoice_number;
    if (custEl) custEl.textContent = invoice.customer_name || 'Guest Customer';
    if (amtEl) amtEl.textContent = '₹' + Number(invoice.net_amount || 0).toFixed(2);
    if (pdfBtn) pdfBtn.href = `/api/reports/pdf/invoice/${invoice.id}`;

    // Business WhatsApp Sender Display (Configured Store Sender)
    const businessNumber = invoice.business_phone || '9751008105';
    const bizPhoneEl = document.getElementById('modal-business-phone-display');
    if (bizPhoneEl) {
        bizPhoneEl.textContent = `+91 ${businessNumber}`;
    }

    if (emailInput) emailInput.value = invoice.customer_email || '';
    // Customer phone ONLY (never store phone)
    if (phoneInput) phoneInput.value = invoice.customer_phone || '';
    if (emailFeedback) { emailFeedback.textContent = ''; emailFeedback.className = 'mt-2 text-sm fw-medium'; }
    if (phoneFeedback) { phoneFeedback.textContent = ''; phoneFeedback.className = 'mt-2 text-sm fw-medium'; }
    if (waDirectLink) { waDirectLink.classList.add('d-none'); waDirectLink.href = '#'; }

    if (waPreview) {
        const storeName = 'StockSense Enterprise Systems';
        const custName = invoice.customer_name || 'Customer';
        waPreview.textContent = `Hello ${custName},\n\nThank you for your purchase from ${storeName}.\n\nInvoice No: ${invoice.invoice_number}\nTotal Amount: ₹${Number(invoice.net_amount || 0).toFixed(2)}\n\nYour invoice details are available for your reference.\n\nThank you!`;
    }

    switchInvoiceShareTab(initialTab);

    const modalEl = document.getElementById('invoiceSharingModal');
    if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

function switchInvoiceShareTab(tab) {
    const tabEmail = document.getElementById('modal-tab-email');
    const tabWhatsApp = document.getElementById('modal-tab-whatsapp');
    const btnEmail = document.getElementById('modal-btn-tab-email');
    const btnWhatsApp = document.getElementById('modal-btn-tab-whatsapp');

    if (tab === 'whatsapp') {
        if (tabEmail) tabEmail.classList.add('d-none');
        if (tabWhatsApp) tabWhatsApp.classList.remove('d-none');
        if (btnEmail) btnEmail.classList.remove('active');
        if (btnWhatsApp) btnWhatsApp.classList.add('active');
    } else {
        if (tabWhatsApp) tabWhatsApp.classList.add('d-none');
        if (tabEmail) tabEmail.classList.remove('d-none');
        if (btnWhatsApp) btnWhatsApp.classList.remove('active');
        if (btnEmail) btnEmail.classList.add('active');
    }
}

async function submitSendInvoiceEmail() {
    if (!lastCompletedInvoice || !lastCompletedInvoice.id) {
        showToast('No active invoice selected.', 'warning');
        return;
    }

    const emailInput = document.getElementById('modal-email-input');
    const feedback = document.getElementById('modal-email-feedback');
    const submitBtn = document.getElementById('btn-submit-email-send');
    const email = (emailInput ? emailInput.value : '').trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid email address.';
            feedback.className = 'mt-2 text-sm fw-medium text-danger';
        }
        showToast('Please enter a valid email address.', 'warning');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Sending Email...';
    }
    if (feedback) {
        feedback.textContent = 'Generating PDF and sending email...';
        feedback.className = 'mt-2 text-sm fw-medium text-secondary';
    }

    try {
        const res = await fetch(`/api/sales/${lastCompletedInvoice.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            const successMsg = data.message || `Invoice sent successfully to ${email}.`;
            if (feedback) {
                feedback.textContent = successMsg;
                feedback.className = 'mt-2 text-sm fw-medium text-success';
            }
            showToast(successMsg, 'success');
        } else {
            const errMsg = (data && data.message) ? data.message : 'Unable to send invoice. Please try again.';
            if (feedback) {
                feedback.textContent = errMsg;
                feedback.className = 'mt-2 text-sm fw-medium text-danger';
            }
            showToast(errMsg, 'danger');
        }
    } catch(err) {
        if (feedback) {
            feedback.textContent = 'Unable to send invoice. Please try again.';
            feedback.className = 'mt-2 text-sm fw-medium text-danger';
        }
        showToast('Unable to send invoice. Please try again.', 'danger');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> 📧 Send Invoice by Email';
        }
    }
}

async function submitSendInvoiceWhatsApp() {
    if (!lastCompletedInvoice || !lastCompletedInvoice.id) {
        showToast('No active invoice selected.', 'warning');
        return;
    }

    const phoneInput = document.getElementById('modal-phone-input');
    const feedback = document.getElementById('modal-phone-feedback');
    const submitBtn = document.getElementById('btn-submit-whatsapp-send');
    const directLink = document.getElementById('modal-whatsapp-direct-link');
    const phone = (phoneInput ? phoneInput.value : '').trim();

    const cleanDigits = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!cleanDigits || !phoneRegex.test(cleanDigits)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid mobile number.';
            feedback.className = 'mt-2 text-sm fw-medium text-danger';
        }
        showToast('Please enter a valid mobile number.', 'warning');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Processing WhatsApp...';
    }
    if (feedback) {
        feedback.textContent = 'Preparing WhatsApp invoice...';
        feedback.className = 'mt-2 text-sm fw-medium text-secondary';
    }

    try {
        const res = await fetch(`/api/sales/${lastCompletedInvoice.id}/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanDigits })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            if (data.direct_api_sent) {
                // Sent directly via WhatsApp Business Cloud API
                const successMsg = data.message || 'Invoice sent successfully.';
                if (feedback) {
                    feedback.textContent = successMsg;
                    feedback.className = 'mt-2 text-sm fw-bold text-success';
                }
                showToast(successMsg, 'success');
            } else {
                // WhatsApp Business API configuration required for server-side direct delivery
                const configMsg = data.config_message || 'WhatsApp sharing is unavailable until the required configuration is completed.';
                const bizNum = data.business_phone || '9751008105';
                if (feedback) {
                    feedback.innerHTML = `
                        <div class="alert alert-warning p-3 mt-2 border-warning" style="background: #fffbeb; color: #92400e; border-radius: 8px;">
                            <div class="fw-bold mb-1"><i class="fa-solid fa-triangle-exclamation me-1"></i> ${configMsg}</div>
                            <div class="text-xs mb-2">Configured Store Sender: <strong>${bizNum}</strong>. (Direct server sending requires setting <code>WHATSAPP_API_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in backend environment variables).</div>
                            <div class="text-xs fw-semibold">Click the button below to share directly with the customer via WhatsApp:</div>
                        </div>
                    `;
                }
                showToast(configMsg, 'warning');

                if (directLink && data.whatsapp_url) {
                    directLink.href = data.whatsapp_url;
                    directLink.classList.remove('d-none');
                }
            }
        } else {
            const errMsg = (data && data.message) ? data.message : 'Unable to send invoice. Please try again.';
            if (feedback) {
                feedback.textContent = errMsg;
                feedback.className = 'mt-2 text-sm fw-medium text-danger';
            }
            showToast(errMsg, 'danger');
        }
    } catch(err) {
        if (feedback) {
            feedback.textContent = 'Unable to send invoice. Please try again.';
            feedback.className = 'mt-2 text-sm fw-medium text-danger';
        }
        showToast('Unable to send invoice. Please try again.', 'danger');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-brands fa-whatsapp me-2 fs-5"></i> Send Invoice via WhatsApp';
        }
    }
}

async function checkoutSalesBill() {
    if (billingCart.length === 0) {
        showToast('Cart is empty.', 'warning');
        return;
    }

    const payload = {
        customer_id: document.getElementById('billing-customer').value || null,
        discount: parseFloat(document.getElementById('billing-discount').value) || 0.0,
        items: billingCart
    };

    try {
        const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Sale complete! Invoice #${data.invoice_number}`, 'success');

            // Store invoice data for sharing
            lastCompletedInvoice = {
                id: data.invoice_id,
                invoice_number: data.invoice_number,
                customer_name: data.customer_name || 'Guest Customer',
                customer_email: data.customer_email || '',
                customer_phone: data.customer_phone || '',
                business_phone: data.business_phone || '9751008105',
                net_amount: data.net_amount
            };

            // Display invoice options in POS interface
            updatePOSInvoiceActionsBar(lastCompletedInvoice);

            // Open invoice sharing modal displaying Download PDF, Email, and WhatsApp together
            openInvoiceShareModal(lastCompletedInvoice);

            loadPOSBillingPage();
        } else {
            showToast(data.message || 'Sale failed.', 'danger');
        }
    } catch(err){
        showToast('Transaction error. Please try again.', 'danger');
    }
}

// --- 11. AI FORECASTING MODELS WORKFLOWS ---
async function loadPredictionsPage() {
    try {
        const res = await fetch('/api/products');
        const prods = await res.json();
        
        const sel = document.getElementById('predictions-catalog-select');
        sel.innerHTML = '';
        prods.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${p.id} - ${p.name}</option>`;
        });
        
        loadPredictionsHistoryTable();
    } catch(e){}
}

async function triggerAIForecastTrain() {
    const sku = document.getElementById('predictions-catalog-select').value;
    if (!sku) return;
    
    document.getElementById('predictions-comparison-tbody').innerHTML = '<tr><td colspan="4" class="text-center py-4"><i class="fa-solid fa-gear fa-spin me-2 text-teal"></i> Tuning parameters, fitting Random Forest, ARIMA, and XGBoost models... Please wait.</td></tr>';
    
    try {
        const res = await fetch(`/api/predictions/forecast/${sku}`, { method: 'POST' });
        const data = await res.json();
        
        // Show validation compare grid
        const tbody = document.getElementById('predictions-comparison-tbody');
        tbody.innerHTML = '';
        
        const comp = data.comparison;
        Object.keys(comp).forEach(algo => {
            const r2ScoreVal = comp[algo].r2;
            const r2Label = r2ScoreVal < 0 ? 'N/A' : (r2ScoreVal * 100).toFixed(1) + '%';
            
            // Check rank colors
            let rankBadge = '<span class="badge bg-light text-secondary">Runner-Up</span>';
            if (algo === data.best_model) {
                rankBadge = '<span class="badge bg-success">Selected Model (Best)</span>';
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${algo}</strong></td>
                    <td class="fw-bold">${r2Label}</td>
                    <td>${comp[algo].mse.toFixed(2)}</td>
                    <td>${rankBadge}</td>
                </tr>
            `;
        });
        
        loadPredictionsHistoryTable();
        showToast(`AI training complete. Best model: ${data.best_model}`, 'success');
    } catch(e){
        document.getElementById('predictions-comparison-tbody').innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error executing forecasting models logic.</td></tr>';
    }
}

async function loadPredictionsHistoryTable() {
    try {
        const res = await fetch('/api/predictions');
        const data = await res.json();
        
        const tbody = document.getElementById('predictions-listings-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No prediction records calculated.</td></tr>';
            return;
        }

        data.forEach(p => {
            let badgeColor = 'badge-green';
            if (p.recommendation.startsWith('Reorder')) badgeColor = 'badge-red';
            else if (p.recommendation.startsWith('Restock')) badgeColor = 'badge-orange';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.sku}</strong></td>
                    <td>${p.name}</td>
                    <td class="fw-bold">${p.current_stock}</td>
                    <td class="fw-bold text-teal">${p.predicted_need.toFixed(0)} units</td>
                    <td>${p.predicted_sales.toFixed(1)} / month</td>
                    <td><span class="tag-badge bg-light text-secondary">${p.model_used} (${Math.round(p.accuracy * 100)}% R²)</span></td>
                    <td class="text-end"><span class="tag-badge ${badgeColor}">${p.recommendation}</span></td>
                </tr>
            `;
        });
    } catch(e){}
}

// --- 12. FLOATING NOTIFICATIONS POLLS ---
let notifPollInterval = null;

function startNotificationPolling() {
    fetchNotifications();
    notifPollInterval = setInterval(fetchNotifications, 10000); // 10s poll
}

function stopNotificationPolling() {
    if (notifPollInterval) clearInterval(notifPollInterval);
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        
        const countBadge = document.getElementById('notif-count');
        if (data.length > 0) {
            countBadge.style.display = 'inline-flex';
            countBadge.textContent = data.length;
        } else {
            countBadge.style.display = 'none';
        }

        const list = document.getElementById('notif-list');
        list.innerHTML = '';
        
        if (data.length === 0) {
            list.innerHTML = '<div class="p-3 text-center text-muted text-xs">No active alerts.</div>';
            return;
        }

        data.forEach(n => {
            let icon = 'fa-circle-info text-primary';
            if (n.type === 'Suspicious Login') icon = 'fa-shield-halved text-danger';
            else if (n.type === 'Low Stock') icon = 'fa-triangle-exclamation text-warning';
            else if (n.type === 'Reorder') icon = 'fa-cart-shopping text-success';

            list.innerHTML += `
                <div class="notif-item">
                    <span class="title"><i class="fa-solid ${icon} me-2"></i> ${n.title}</span>
                    <span class="desc">${n.message}</span>
                    <span class="time">${n.time}</span>
                </div>
            `;
        });
    } catch(e){}
}

function toggleNotificationPanel() {
    document.getElementById('notif-panel').classList.toggle('d-none');
}

async function dismissAllNotifications() {
    await fetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    toggleNotificationPanel();
    fetchNotifications();
}

// --- 13. SECURITY CONTROLS PANEL (ADMIN API) ---
async function loadSecurityControls() {
    if (currentUser.role !== 'Admin') return;
    
    // User lock lists
    try {
        const uRes = await fetch('/api/security/users');
        const users = await uRes.json();
        
        const uBody = document.getElementById('user-controls-tbody');
        uBody.innerHTML = '';
        
        users.forEach(u => {
            let lockBtn = `<button class="btn btn-xs btn-outline-danger" onclick="toggleUserActivationLock(${u.id})"><i class="fa-solid fa-lock"></i> Lock Account</button>`;
            let statusBadge = '<span class="tag-badge badge-green">Active</span>';
            
            if (u.locked) {
                statusBadge = '<span class="tag-badge badge-red">Locked Out</span>';
                lockBtn = `<button class="btn btn-xs btn-success text-white" onclick="toggleUserActivationLock(${u.id})"><i class="fa-solid fa-lock-open"></i> Unlock Acct</button>`;
            }

            uBody.innerHTML += `
                <tr>
                    <td><strong>${u.id}</strong></td>
                    <td>${u.username}</td>
                    <td><span class="badge bg-secondary">${u.role}</span></td>
                    <td>${u.email}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">${lockBtn}</td>
                </tr>
            `;
        });

        // Device Whitelisting approvals
        const dRes = await fetch('/api/security/device-approvals');
        const devices = await dRes.json();
        
        const dBody = document.getElementById('device-approvals-tbody');
        dBody.innerHTML = '';
        
        if (devices.length === 0) {
            dBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted text-xs py-3">No device footprints logged.</td></tr>';
        } else {
            devices.forEach(d => {
                let actionBtn = '';
                if (!d.approved) {
                    actionBtn = `
                        <button class="btn btn-xs btn-teal" onclick="submitDeviceApprovalAction(${d.id}, 'approve')">Whitelisted Approval</button>
                        <button class="btn btn-xs btn-outline-danger" onclick="submitDeviceApprovalAction(${d.id}, 'reject')">Restrict</button>
                    `;
                } else {
                    actionBtn = '<span class="text-success"><i class="fa-solid fa-check-circle"></i> whitelisted</span>';
                }

                dBody.innerHTML += `
                    <tr>
                        <td><strong>${d.username}</strong></td>
                        <td>${d.browser} on ${d.os}</td>
                        <td><small class="font-monospace">${d.ip}</small></td>
                        <td class="text-end">${actionBtn}</td>
                    </tr>
                `;
            });
        }

        // Audits log table
        const aRes = await fetch('/api/security/audit-logs');
        const audits = await aRes.json();
        
        const aBody = document.getElementById('audit-trail-tbody');
        aBody.innerHTML = '';
        
        audits.forEach(a => {
            aBody.innerHTML += `
                <tr>
                    <td><strong>${a.id}</strong></td>
                    <td>${a.user}</td>
                    <td class="fw-bold">${a.action}</td>
                    <td>${a.table}</td>
                    <td><small class="font-monospace">${a.record_id || 'N/A'}</small></td>
                    <td>${a.details}</td>
                    <td>${a.ip}</td>
                    <td><small class="text-secondary">${a.timestamp}</small></td>
                </tr>
            `;
        });
    } catch(e){}
}

async function toggleUserActivationLock(userId) {
    if (confirm("Execute lockout settings update for this user account?")) {
        await fetch(`/api/security/users/${userId}/lock-toggle`, { method: 'POST' });
        loadSecurityControls();
    }
}

async function submitDeviceApprovalAction(deviceId, action) {
    await fetch(`/api/security/device-approvals/${deviceId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action })
    });
    loadSecurityControls();
}

// --- 13b. LIVE TRACKING & STOCK MOVEMENTS MONITOR ---
async function loadLiveTracking() {
    try {
        const res = await fetch('/api/live-tracking');
        const data = await res.json();
        
        const countEl = document.getElementById('live-movement-count');
        if (countEl) {
            const mvmtCount = data.total_movements ?? data.total_stock_movements ?? 0;
            countEl.textContent = `${mvmtCount.toLocaleString()} items`;
        }
        
        const streamEl = document.getElementById('live-movements-stream');
        if (streamEl && data.movements) {
            streamEl.innerHTML = '';
            if (data.movements.length === 0) {
                streamEl.innerHTML = '<div class="text-muted text-center py-4">No live stock movements recorded.</div>';
            } else {
                data.movements.forEach(m => {
                    let badgeClass = 'bg-primary-subtle text-primary';
                    if (m.movement_type === 'Sale') badgeClass = 'bg-success-subtle text-success';
                    else if (m.movement_type === 'Purchase') badgeClass = 'bg-warning-subtle text-warning';
                    else if (m.movement_type === 'Transfer') badgeClass = 'bg-info-subtle text-info';
                    else if (m.movement_type === 'Return') badgeClass = 'bg-danger-subtle text-danger';

                    streamEl.innerHTML += `
                        <div class="p-3 mb-2 rounded bg-light border-start border-3 border-primary d-flex justify-content-between align-items-center">
                            <div>
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <span class="badge ${badgeClass} text-xs">${m.movement_type}</span>
                                    <strong class="text-sm font-monospace">${m.sku}</strong>
                                    <span class="text-xs text-muted font-monospace">${m.timestamp}</span>
                                </div>
                                <div class="text-sm fw-semibold">${m.product}</div>
                                <div class="text-xs text-muted">${m.from_wh} &rarr; ${m.to_wh} &bull; User: ${m.employee}</div>
                            </div>
                            <div class="text-end">
                                <span class="fs-6 fw-bold text-primary">${m.qty > 0 ? '+' : ''}${m.qty}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }

        const loginCountEl = document.getElementById('live-logins-count');
        if (loginCountEl && data.logins) {
            loginCountEl.textContent = `${data.logins.length} active`;
        }

        const loginStreamEl = document.getElementById('live-logins-stream');
        if (loginStreamEl && data.logins) {
            loginStreamEl.innerHTML = '';
            if (data.logins.length === 0) {
                loginStreamEl.innerHTML = '<div class="text-muted text-center py-4">No active user logins.</div>';
            } else {
                data.logins.forEach(l => {
                    loginStreamEl.innerHTML += `
                        <div class="p-3 mb-2 rounded bg-light border-start border-3 border-success d-flex justify-content-between align-items-center">
                            <div>
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <strong class="text-sm">${l.username}</strong>
                                    <span class="badge bg-success-subtle text-success text-xs">${l.status}</span>
                                    <span class="text-xs text-muted font-monospace">${l.timestamp}</span>
                                </div>
                                <div class="text-xs text-muted">${l.device} &bull; ${l.ip} &bull; ${l.location}</div>
                            </div>
                            <div class="text-end">
                                <i class="fa-solid fa-circle-check text-success"></i>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (e) {
        console.error("Live tracking load error:", e);
    }
}

// --- 14. CHATBOT MANAGER ---
function toggleChatbot() {
    document.getElementById('chatbot-drawer').classList.toggle('collapsed');
}

async function sendChatbotQuery(e) {
    e.preventDefault();
    const input = document.getElementById('chatbot-input');
    const msg = input.value.trim();
    if (!msg) return;

    // Show user msg
    const grid = document.getElementById('chatbot-messages-grid');
    grid.innerHTML += `<div class="chat-message user">${msg}</div>`;
    input.value = '';
    
    // Auto scroll bottom
    grid.scrollTop = grid.scrollHeight;

    try {
        const res = await fetch('/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: msg })
        });
        const data = await res.json();
        grid.innerHTML += `<div class="chat-message bot">${data.reply}</div>`;
        grid.scrollTop = grid.scrollHeight;
    } catch(err){
        grid.innerHTML += `<div class="chat-message bot text-danger">Connection lost. Please try again.</div>`;
    }
}

// Speech recognition voice input commands
function triggerSpeechRecognitionInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Voice recognition is not supported in this browser.", 'warning');
        return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;

    const micIcon = document.getElementById('voice-mic-icon');
    micIcon.classList.remove('fa-microphone');
    micIcon.classList.add('fa-spinner', 'fa-spin', 'text-warning');

    rec.start();

    rec.onresult = function(e) {
        const voiceText = e.results[0][0].transcript;
        document.getElementById('chatbot-input').value = voiceText;
        // Trigger chatbot query send automatically
        const formSubmitEvent = new Event('submit');
        document.getElementById('chatbot-form').dispatchEvent(formSubmitEvent);
    };

    rec.onend = function() {
        micIcon.classList.add('fa-microphone');
        micIcon.classList.remove('fa-spinner', 'fa-spin', 'text-warning');
    };
    
    rec.onerror = function() {
        micIcon.classList.add('fa-microphone');
        micIcon.classList.remove('fa-spinner', 'fa-spin', 'text-warning');
    };
}

// Light / Dark Theme toggle switcher settings
function getChartColors() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        text: isDark ? '#cbd5e1' : '#64748b',
        grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    };
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode', !isDark);
    
    document.getElementById('theme-text').textContent = isDark ? 'Light Mode' : 'Dark Mode';
    
    // Save to local storage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Re-draw graphs to match theme colors if available
    if (activePage === 'dashboard') loadDashboardData();
}

// Restore theme from localStorage on page load
function restoreThemeFromStorage() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        const themeText = document.getElementById('theme-text');
        if (themeText) themeText.textContent = 'Light Mode';
    }
}

// Create Purchase Order modal handler
async function openPurchaseOrderModal() {
    // Populate suppliers dropdown
    try {
        const [suppRes, prodRes] = await Promise.all([
            fetch('/api/suppliers'),
            fetch('/api/products')
        ]);
        const suppliers = await suppRes.json();
        const products = await prodRes.json();

        const suppSel = document.getElementById('po-supplier-select');
        suppSel.innerHTML = '<option value="">-- Select Supplier --</option>';
        suppliers.forEach(s => {
            suppSel.innerHTML += `<option value="${s.id}">${s.id}. ${s.name}</option>`;
        });

        const prodSel = document.getElementById('po-product-select');
        prodSel.innerHTML = '<option value="">-- Select Product --</option>';
        products.forEach(p => {
            prodSel.innerHTML += `<option value="${p.id}">${p.id} — ${p.name}</option>`;
        });
    } catch(e) {
        console.error('Failed to load PO modal data:', e);
    }

    // Reset form
    document.getElementById('po-create-form').reset();
    document.getElementById('po-total-preview').classList.add('d-none');

    // Live total preview
    const calcTotal = () => {
        const qty = parseFloat(document.getElementById('po-quantity').value) || 0;
        const price = parseFloat(document.getElementById('po-unit-price').value) || 0;
        const total = qty * price;
        if (qty > 0 && price > 0) {
            document.getElementById('po-total-amount').textContent = `₹${total.toFixed(2)}`;
            document.getElementById('po-total-preview').classList.remove('d-none');
        } else {
            document.getElementById('po-total-preview').classList.add('d-none');
        }
    };
    document.getElementById('po-quantity').oninput = calcTotal;
    document.getElementById('po-unit-price').oninput = calcTotal;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('purchaseOrderModal'));
    modal.show();
}

async function submitPurchaseOrderForm(e) {
    e.preventDefault();
    const suppId = document.getElementById('po-supplier-select').value;
    const sku = document.getElementById('po-product-select').value;
    const qty = parseInt(document.getElementById('po-quantity').value);
    const unitPrice = parseFloat(document.getElementById('po-unit-price').value);

    const payload = {
        supplier_id: parseInt(suppId),
        items: [{ product_id: sku, quantity: qty, unit_price: unitPrice }]
    };

    try {
        const res = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('purchaseOrderModal')).hide();
            showToast('Purchase Order created successfully!', 'success');
            loadPurchasesData();
        } else {
            showToast(data.message || 'Failed to create Purchase Order.', 'danger');
        }
    } catch(e) {
        showToast('Connection error creating Purchase Order.', 'danger');
    }
}


// Print invoice quick shortcut
function triggerPDFPrintQuick() {
    const id = document.getElementById('quick-invoice-number').value;
    if (!id) {
        showToast('Please enter an invoice sequence ID.', 'warning');
        return;
    }
    window.open(`/api/reports/pdf/invoice/${id}`);
}

// --- Phase 8 Advanced Analytics UI features ---
async function loadAnalyticsPage() {
    try {
        const res = await fetch('/api/products');
        const prods = await res.json();
        
        const sel = document.getElementById('supplier-select-product');
        sel.innerHTML = '<option value="">Choose item...</option>';
        prods.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${p.id} - ${p.name}</option>`;
        });
    } catch(e){}
    
    loadPriceOptimizationData();
    loadRFMSegments();
}

async function loadPriceOptimizationData() {
    const tbody = document.getElementById('pricing-opt-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i> Computing dynamic price adjustments...</td></tr>';
    try {
        const res = await fetch('/api/ml/price-optimization');
        const data = await res.json();
        tbody.innerHTML = '';
        data.forEach(item => {
            let strategyBadge = `<span class="badge bg-secondary">${item.reason}</span>`;
            if (item.reason.includes('Scarcity')) {
                strategyBadge = `<span class="badge bg-danger">${item.reason}</span>`;
            } else if (item.reason.includes('clearance')) {
                strategyBadge = `<span class="badge bg-warning text-dark">${item.reason}</span>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.product_name}</strong></td>
                    <td>${item.current_stock}</td>
                    <td>${item.max_capacity}</td>
                    <td>${(item.stock_ratio * 100).toFixed(1)}%</td>
                    <td>₹${item.base_price.toFixed(2)}</td>
                    <td>₹${item.cost_price.toFixed(2)}</td>
                    <td class="fw-bold text-teal">₹${item.recommended_price.toFixed(2)}</td>
                    <td>${item.base_margin.toFixed(1)}%</td>
                    <td class="fw-bold">${item.recommended_margin.toFixed(1)}%</td>
                    <td>${strategyBadge}</td>
                </tr>
            `;
        });
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Failed to load price optimizations.</td></tr>';
    }
}

async function loadRFMSegments() {
    const tbody = document.getElementById('crm-rfm-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i> Running RFM cluster calculations...</td></tr>';
    try {
        const res = await fetch('/api/crm/rfm-analysis');
        const data = await res.json();
        tbody.innerHTML = '';
        data.forEach(item => {
            let segBadge = `<span class="badge bg-secondary">${item.segment}</span>`;
            if (item.segment === 'VIP Champion') {
                segBadge = `<span class="badge bg-success"><i class="fa-solid fa-crown me-1 text-warning"></i> VIP Champion</span>`;
            } else if (item.segment === 'Active Loyal') {
                segBadge = `<span class="badge bg-info text-dark">Active Loyal</span>`;
            } else if (item.segment === 'Churn Risk Customer') {
                segBadge = `<span class="badge bg-danger">Churn Risk Customer</span>`;
            } else if (item.segment === 'Acquiring (New)') {
                segBadge = `<span class="badge bg-primary">Acquiring (New)</span>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.recency_days === 999 ? 'Never' : item.recency_days + ' days ago'}</td>
                    <td>${item.frequency}</td>
                    <td>₹${item.monetary.toFixed(2)}</td>
                    <td>${segBadge}</td>
                </tr>
            `;
        });
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to calculate RFM segments.</td></tr>';
    }
}

async function loadSupplierSelectionData(productId) {
    const tbody = document.getElementById('supplier-selection-tbody');
    if (!productId) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Choose a product from the list to display optimal suppliers.</td></tr>';
        return;
    }
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i> Fetching optimal suppliers...</td></tr>';
    try {
        const res = await fetch(`/api/suppliers/performance/${productId}`);
        const data = await res.json();
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No suppliers found for this product category.</td></tr>';
            return;
        }
        
        data.forEach((item, index) => {
            let rankBadge = `<span class="badge bg-light text-secondary">#${index + 1}</span>`;
            if (index === 0) {
                rankBadge = `<span class="badge bg-success"><i class="fa-solid fa-medal me-1"></i> Best Choice (#1)</span>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${item.name}</strong><br>
                        <small class="text-muted text-xs">${item.email}</small>
                    </td>
                    <td><i class="fa-solid fa-star text-warning me-1"></i>${item.rating ? item.rating.toFixed(1) : '0.0'}/5.0</td>
                    <td>${item.performance_score}%</td>
                    <td class="fw-bold text-teal">${item.selection_score}%</td>
                    <td>${rankBadge}</td>
                </tr>
            `;
        });
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to score suppliers.</td></tr>';
    }
}

// --- 15. BUSINESS INSIGHTS PANEL ---
async function loadBusinessInsights() {
    const container = document.getElementById('business-insights-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Analysing stock movement patterns...</div>';
    
    try {
        const res = await fetch('/api/analytics/business-insights');
        const data = await res.json();
        
        let html = '<div class="row g-3">';
        
        // Fast-moving items card
        html += `
            <div class="col-md-6">
                <div class="glass-card p-4 h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-bolt text-warning me-2"></i>Fast-Moving Items
                        <span class="badge bg-warning text-dark ms-2">${data.fast_moving ? data.fast_moving.length : 0}</span>
                    </h6>
                    <div class="list-group list-group-flush">`;
        if (data.fast_moving && data.fast_moving.length > 0) {
            data.fast_moving.forEach(item => {
                html += `<div class="list-group-item bg-transparent d-flex justify-content-between align-items-center py-2">
                    <span class="fw-medium">${item.name}</span>
                    <span class="badge bg-success">${item.avg_daily_sales.toFixed(1)} units/day</span>
                </div>`;
            });
        } else {
            html += '<div class="list-group-item bg-transparent text-muted">No fast-moving items detected.</div>';
        }
        html += '</div></div></div>';
        
        // Slow-moving items card
        html += `
            <div class="col-md-6">
                <div class="glass-card p-4 h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-snail text-secondary me-2"></i>Slow-Moving Items
                        <span class="badge bg-secondary ms-2">${data.slow_moving ? data.slow_moving.length : 0}</span>
                    </h6>
                    <div class="list-group list-group-flush">`;
        if (data.slow_moving && data.slow_moving.length > 0) {
            data.slow_moving.forEach(item => {
                html += `<div class="list-group-item bg-transparent d-flex justify-content-between align-items-center py-2">
                    <span class="fw-medium">${item.name}</span>
                    <span class="badge bg-warning text-dark">${item.avg_daily_sales.toFixed(2)} units/day</span>
                </div>`;
            });
        } else {
            html += '<div class="list-group-item bg-transparent text-muted">No slow-moving items detected.</div>';
        }
        html += '</div></div></div>';
        
        // Dead stock card
        html += `
            <div class="col-md-6">
                <div class="glass-card p-4 h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-skull text-danger me-2"></i>Dead Stock (Zero Sales)
                        <span class="badge bg-danger ms-2">${data.dead_stock ? data.dead_stock.length : 0}</span>
                    </h6>
                    <div class="list-group list-group-flush">`;
        if (data.dead_stock && data.dead_stock.length > 0) {
            data.dead_stock.forEach(item => {
                html += `<div class="list-group-item bg-transparent d-flex justify-content-between align-items-center py-2">
                    <span class="fw-medium">${item.name}</span>
                    <span class="badge bg-danger">${item.stock} units idle</span>
                </div>`;
            });
        } else {
            html += '<div class="list-group-item bg-transparent text-success">No dead stock detected. 🎉</div>';
        }
        html += '</div></div></div>';
        
        // Stock-out risk card
        html += `
            <div class="col-md-6">
                <div class="glass-card p-4 h-100">
                    <h6 class="fw-bold mb-3"><i class="fa-solid fa-clock text-primary me-2"></i>Stock-Out Risk
                        <span class="badge bg-primary ms-2">${data.stockout_risk ? data.stockout_risk.length : 0}</span>
                    </h6>
                    <div class="list-group list-group-flush">`;
        if (data.stockout_risk && data.stockout_risk.length > 0) {
            data.stockout_risk.forEach(item => {
                const urgency = item.days_remaining <= 3 ? 'bg-danger' : item.days_remaining <= 7 ? 'bg-warning text-dark' : 'bg-info';
                html += `<div class="list-group-item bg-transparent d-flex justify-content-between align-items-center py-2">
                    <span class="fw-medium">${item.name}</span>
                    <span class="badge ${urgency}">${item.days_remaining} days left</span>
                </div>`;
            });
        } else {
            html += '<div class="list-group-item bg-transparent text-success">No imminent stock-out risk. ✅</div>';
        }
        html += '</div></div></div>';
        
        html += '</div>'; // close row
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<div class="alert alert-warning">Failed to load business insights. Please try again.</div>';
    }
}

// --- 16. RETURNS MANAGEMENT ---
async function loadReturnsManagement() {
    const tbody = document.getElementById('returns-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading returns...</td></tr>';
    try {
        const res = await fetch('/api/orders/returns');
        const data = await res.json();
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No return requests logged yet.</td></tr>';
            return;
        }
        data.forEach(r => {
            let statusBadge = 'badge-blue';
            if (r.status === 'Approved') statusBadge = 'badge-green';
            else if (r.status === 'Rejected') statusBadge = 'badge-red';
            else if (r.status === 'Pending') statusBadge = 'badge-orange';
            
            let actionBtns = '';
            if (r.status === 'Pending') {
                actionBtns = `
                    <button class="btn btn-xs btn-success me-1" onclick="approveReturn(${r.id}, 'approve')">Approve</button>
                    <button class="btn btn-xs btn-outline-danger" onclick="approveReturn(${r.id}, 'reject')">Reject</button>`;
            }
            tbody.innerHTML += `
                <tr>
                    <td><strong>${r.return_number}</strong></td>
                    <td>${r.invoice_number}</td>
                    <td>${r.reason}</td>
                    <td>₹${r.refund_amount.toFixed(2)}</td>
                    <td><span class="tag-badge ${statusBadge}">${r.status}</span></td>
                    <td><small class="text-muted">${r.date}</small></td>
                    <td class="text-end">${actionBtns}</td>
                </tr>`;
        });
    } catch(e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading returns.</td></tr>';
    }
}

async function approveReturn(returnId, action) {
    if (!confirm(`Confirm ${action} for this return request?`)) return;
    try {
        const res = await fetch(`/api/orders/returns/${returnId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Return ${action}d successfully!`, 'success');
            loadReturnsManagement();
        } else {
            showToast(data.message || 'Action failed.', 'danger');
        }
    } catch(e) {
        showToast('Connection error.', 'danger');
    }
}

async function openReturnModal() {
    const modal = new bootstrap.Modal(document.getElementById('returnModal'));
    const invInput = document.getElementById('return-invoice-number');
    if (invInput) invInput.value = '';
    modal.show();
}

async function submitReturnRequest(e) {
    e.preventDefault();
    const invoiceNum = document.getElementById('return-invoice-number').value.trim();
    const reason = document.getElementById('return-reason').value.trim();
    const qty = parseInt(document.getElementById('return-quantity').value) || 1;
    
    if (!invoiceNum || !reason) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }
    try {
        const res = await fetch('/api/orders/returns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_number: invoiceNum, reason: reason, items: [{ quantity: qty }] })
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('returnModal')).hide();
            showToast('Return request submitted successfully!', 'success');
            loadReturnsManagement();
        } else {
            showToast(data.message || 'Failed to submit return.', 'danger');
        }
    } catch(e) {
        showToast('Connection error.', 'danger');
    }
}

// --- 17. ORDER TRACKING ---
function escapeOrderHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function trackOrderByRef() {
    const refInput = document.getElementById('order-tracking-ref');
    const trackPanel = document.getElementById('order-tracking-result');
    if (!refInput || !trackPanel) return;
    
    const ref = refInput.value.trim();
    if (!ref) {
        showToast('Please enter an order/invoice reference.', 'warning');
        return;
    }
    trackPanel.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin me-2 text-primary"></i>Tracking order...</div>';
    
    try {
        const res = await fetch(`/api/orders/tracking/${encodeURIComponent(ref)}`);
        const data = await res.json();
        
        if (!data.found) {
            trackPanel.innerHTML = `<div class="alert alert-warning"><i class="fa-solid fa-circle-exclamation me-2"></i>No order found for reference: <strong>${escapeOrderHtml(ref)}</strong></div>`;
            return;
        }
        
        // Status badge color mapping
        const statusColors = {
            'Draft': 'bg-secondary',
            'Pending Approval': 'bg-warning text-dark',
            'Approved': 'bg-primary',
            'Processing': 'bg-info text-dark',
            'Ordered': 'bg-primary',
            'Shipped': 'bg-info text-white',
            'Delayed': 'bg-danger',
            'Received': 'bg-success',
            'Completed': 'bg-success',
            'Cancelled': 'bg-danger',
            'Paid': 'bg-success'
        };
        const currentStatus = data.current_status || data.order_status || data.status || 'Active';
        const statusBadgeClass = statusColors[currentStatus] || 'bg-primary';

        // Format items table rows
        let itemsRows = '';
        if (data.items && data.items.length > 0) {
            itemsRows = data.items.map(item => `
                <tr class="border-bottom border-light-subtle">
                    <td class="py-2">
                        <div class="fw-semibold text-truncate" style="max-width: 170px;" title="${escapeOrderHtml(item.name)}">${escapeOrderHtml(item.name)}</div>
                        <span class="text-muted text-xs font-monospace">${escapeOrderHtml(item.sku || item.product_id)}</span>
                    </td>
                    <td class="text-center py-2 fw-bold">${item.quantity}</td>
                    <td class="text-end py-2 text-muted">₹${Number(item.unit_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td class="text-end py-2 fw-semibold text-success">₹${Number(item.total_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
            `).join('');
        } else {
            itemsRows = '<tr><td colspan="4" class="text-center text-muted py-2">No individual items recorded</td></tr>';
        }

        // Build visual order timeline
        let timelineStepsHtml = '';
        if (data.timeline && data.timeline.length > 0) {
            let lastDoneIdx = -1;
            data.timeline.forEach((step, idx) => {
                if (step.done || step.completed) lastDoneIdx = idx;
            });
            const activeStepIdx = lastDoneIdx < data.timeline.length - 1 ? lastDoneIdx + 1 : -1;

            timelineStepsHtml = data.timeline.map((step, i) => {
                const isCompleted = step.done || step.completed;
                const isActive = (i === activeStepIdx);
                const stepClass = isCompleted ? 'completed' : (isActive ? 'active' : 'pending');
                const iconClass = isCompleted ? 'fa-solid fa-circle-check text-success' : (isActive ? 'fa-solid fa-spinner fa-spin text-primary' : 'fa-regular fa-circle text-muted');
                const badgeHtml = isCompleted 
                    ? `<span class="badge bg-success-subtle text-success border border-success-subtle text-xs px-2 py-0">Completed</span>`
                    : (isActive ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle text-xs px-2 py-0">In Progress</span>` : `<span class="badge bg-secondary-subtle text-muted text-xs px-2 py-0">Pending</span>`);

                return `
                    <div class="timeline-step ${stepClass}">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <span class="fw-bold text-sm ${isCompleted ? 'text-success' : (isActive ? 'text-primary' : 'text-muted')}">
                                <i class="${iconClass} me-2"></i>${escapeOrderHtml(step.label || step.stage)}
                            </span>
                            ${badgeHtml}
                        </div>
                        <div class="d-flex justify-content-between align-items-center text-xs text-muted ps-4">
                            <span>${escapeOrderHtml(step.details || '')}</span>
                            <span class="fw-semibold font-monospace">${escapeOrderHtml(step.time || '—')}</span>
                        </div>
                    </div>`;
            }).join('');
        }

        // Render full order tracking view
        trackPanel.innerHTML = `
            <div class="order-tracking-card animate-fade">
                <!-- Order Header Card -->
                <div class="p-3 rounded-3 mb-3 border" style="background: rgba(255, 255, 255, 0.03);">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <span class="badge ${statusBadgeClass} mb-1 px-2 py-1">${escapeOrderHtml(currentStatus)}</span>
                            <h5 class="fw-bold mb-0 text-primary">${escapeOrderHtml(data.po_number || data.ref)}</h5>
                            <div class="text-xs text-muted mt-1">
                                <span>Invoice: <strong>${escapeOrderHtml(data.invoice_number || 'N/A')}</strong></span>
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="fs-5 fw-bold text-success">₹${Number(data.total_amount || data.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                            <div class="text-xs text-muted"><strong>${data.quantity || data.total_quantity}</strong> total units (${data.items_count} items)</div>
                        </div>
                    </div>
                    
                    <div class="row g-2 pt-2 border-top border-light-subtle mt-2 text-xs">
                        <div class="col-6">
                            <span class="text-muted"><i class="fa-solid fa-truck-field me-1 text-primary"></i> Supplier:</span>
                            <div class="fw-semibold text-truncate text-main">${escapeOrderHtml(data.supplier || data.customer || 'N/A')}</div>
                        </div>
                        <div class="col-6 text-end">
                            <span class="text-muted"><i class="fa-regular fa-calendar me-1 text-primary"></i> Order Date:</span>
                            <div class="fw-semibold text-main">${escapeOrderHtml(data.order_date || 'N/A')}</div>
                        </div>
                    </div>
                </div>

                <!-- Items Section -->
                <div class="p-3 rounded-3 mb-3 border" style="background: rgba(255, 255, 255, 0.03);">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-sm"><i class="fa-solid fa-boxes-stacked text-primary me-2"></i>Ordered Items (${data.items_count})</span>
                        <span class="text-xs text-muted">Total Units: <strong class="text-main">${data.quantity || data.total_quantity}</strong></span>
                    </div>
                    <div class="table-responsive" style="max-height: 160px; overflow-y: auto;">
                        <table class="table table-sm table-borderless align-middle mb-0 text-xs">
                            <thead>
                                <tr class="text-muted border-bottom border-light-subtle">
                                    <th>Product</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-end">Unit Price</th>
                                    <th class="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Visual Order Timeline -->
                <div class="p-3 rounded-3 border" style="background: rgba(255, 255, 255, 0.03);">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="fw-bold text-sm"><i class="fa-solid fa-route text-primary me-2"></i>Order Status Timeline</span>
                        <span class="text-xs text-muted">6-Stage Live Tracking</span>
                    </div>
                    <div class="timeline-track">
                        ${timelineStepsHtml}
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        trackPanel.innerHTML = '<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>Tracking service unavailable. Please try again.</div>';
    }
}

// --- 18. BACKUP & RESTORE ---
async function downloadSystemBackup() {
    showToast('Preparing system backup...', 'info');
    try {
        const res = await fetch('/api/backup/download');
        if (!res.ok) throw new Error('Backup failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stocksense_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup downloaded successfully!', 'success');
    } catch(e) {
        showToast('Backup download failed.', 'danger');
    }
}

// --- 19. MANUAL SKU LOOKUP (Scanner Page) ---
async function manualSKULookup() {
    const sku = document.getElementById('manual-sku-search').value.trim();
    const resultDiv = document.getElementById('manual-sku-result');
    if (!sku) {
        showToast('Please enter a SKU or barcode.', 'warning');
        return;
    }
    resultDiv.innerHTML = '<div class="text-center py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i>Looking up product...</div>';
    
    // Search in already-loaded product list first
    if (allProductsList.length > 0) {
        const found = allProductsList.find(p => p.id.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase().includes(sku.toLowerCase()));
        if (found) {
            displaySKULookupResult(found, resultDiv);
            return;
        }
    }
    
    // If not in cache, fetch fresh
    try {
        const res = await fetch('/api/products');
        const prods = await res.json();
        allProductsList = prods;
        const found = prods.find(p => p.id.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase().includes(sku.toLowerCase()));
        if (found) {
            displaySKULookupResult(found, resultDiv);
        } else {
            resultDiv.innerHTML = `<div class="alert alert-warning"><i class="fa-solid fa-circle-exclamation me-2"></i>No product found for: <strong>${sku}</strong></div>`;
        }
    } catch(e) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Lookup failed. Please try again.</div>';
    }
}

function testScanSKU(sku) {
    const input = document.getElementById('manual-sku-search');
    if (input) {
        input.value = sku;
        manualSKULookup();
    }
}

function displaySKULookupResult(product, container) {
    let statusBadge = 'bg-success';
    if (product.status === 'Out of Stock') statusBadge = 'bg-danger';
    else if (product.status === 'Low Stock') statusBadge = 'bg-warning text-dark';
    
    let imgUrl = product.image_url || '/static/assets/images/default_product.jpg';
    const barcodeImg = `/static/codes/barcode-${product.id}.png`;
    const qrcodeImg = `/static/codes/qrcode-${product.id}.png`;

    container.innerHTML = `
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center">
                        <img src="${imgUrl}" class="rounded me-3 border" width="60" height="60" style="object-fit: cover;" alt="Product">
                        <div>
                            <h6 class="fw-bold mb-1">${product.name}</h6>
                            <small class="text-muted font-monospace">${product.id}</small>
                        </div>
                    </div>
                    <span class="badge ${statusBadge}">${product.status}</span>
                </div>
                <div class="row g-2 text-sm mb-3">
                    <div class="col-6"><span class="text-muted">Brand:</span> <strong>${product.brand || '—'}</strong></div>
                    <div class="col-6"><span class="text-muted">Category:</span> <strong>${product.category}</strong></div>
                    <div class="col-6"><span class="text-muted">Stock:</span> <strong>${product.stock} units</strong></div>
                    <div class="col-6"><span class="text-muted">Price:</span> <strong>₹${product.selling_price.toFixed(2)}</strong></div>
                    <div class="col-6"><span class="text-muted">Supplier:</span> <strong>${product.supplier || '—'}</strong></div>
                    <div class="col-6"><span class="text-muted">Expiry:</span> <strong>${product.expiry || 'N/A'}</strong></div>
                </div>

                <!-- Product Original Barcode & QR Display -->
                <div class="p-3 bg-light rounded-2 border mb-3">
                    <div class="text-xs fw-bold text-muted text-uppercase mb-2"><i class="fa-solid fa-barcode me-1"></i> Original Product Barcode & QR Code:</div>
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div class="bg-white p-2 rounded border text-center">
                            <img src="${barcodeImg}" alt="Barcode ${product.id}" style="max-height: 50px; max-width: 180px;" onerror="this.style.display='none'">
                        </div>
                        <div class="bg-white p-2 rounded border text-center">
                            <img src="${qrcodeImg}" alt="QR ${product.id}" style="max-height: 50px; width: 50px;" onerror="this.style.display='none'">
                        </div>
                        <a href="${barcodeImg}" download="barcode-${product.id}.png" class="btn btn-sm btn-outline-secondary" title="Download Barcode Label">
                            <i class="fa-solid fa-download me-1"></i> Save Label
                        </a>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="billAddProduct(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fa-solid fa-cart-plus me-1"></i> Add to POS Cart
                    </button>
                </div>
            </div>
        </div>`;
}

// --- 13. AI CHATBOT FUNCTIONALITY ---
let chatWidgetOpen = false;
function toggleChatWidget() {
    const widget = document.getElementById('ai-chat-widget');
    const icon = document.getElementById('chat-toggle-icon');
    if (chatWidgetOpen) {
        widget.style.transform = 'translateY(calc(100% - 60px))';
        icon.className = 'fa-solid fa-chevron-up';
    } else {
        widget.style.transform = 'translateY(0)';
        icon.className = 'fa-solid fa-chevron-down';
        document.getElementById('chat-input').focus();
    }
    chatWidgetOpen = !chatWidgetOpen;
}

async function submitChatQuery(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const query = input.value.trim();
    if (!query) return;

    const chatBody = document.getElementById('chat-body');
    
    chatBody.innerHTML += `
        <div class="chat-message user mb-3">
            <div class="d-flex align-items-end">
                <div class="bg-light text-dark p-2 rounded-3 me-auto w-75 shadow-sm border" style="font-size: 0.9rem;">
                    ${query}
                </div>
            </div>
        </div>
    `;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const res = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query})
        });
        const data = await res.json();
        
        chatBody.innerHTML += `
            <div class="chat-message bot mb-3">
                <div class="d-flex align-items-end">
                    <div class="bg-primary text-white p-2 rounded-3 ms-auto w-75 shadow-sm" style="font-size: 0.9rem;">
                        ${data.response}
                    </div>
                </div>
            </div>
        `;
        chatBody.scrollTop = chatBody.scrollHeight;
    } catch (err) {
        console.error('Chat error', err);
    }
}

// ============================================================
//  PREMIUM ENTERPRISE JS — Customers, P&L, Heatmap
// ============================================================
// Note: allCustomersList is declared at the top of this file (line 13)


async function loadCustomersPage() {
    try {
        const res = await fetch('/api/customers');
        allCustomersList = await res.json();
        
        // KPIs
        const total = allCustomersList.length;
        const premium = allCustomersList.filter(c => c.loyalty_status === 'Gold' || c.loyalty_status === 'Platinum').length;
        const totalSpend = allCustomersList.reduce((a, c) => a + c.total_spend, 0);
        const avgOrder = total > 0 ? (totalSpend / allCustomersList.reduce((a, c) => a + c.total_orders, 0)) : 0;
        
        document.getElementById('crm-total-customers').textContent = total;
        document.getElementById('crm-premium-customers').textContent = premium;
        document.getElementById('crm-avg-order').textContent = '₹' + (isFinite(avgOrder) ? avgOrder.toFixed(2) : '0.00');
        document.getElementById('crm-total-revenue').textContent = '₹' + totalSpend.toFixed(2);
        
        filterCustomers();
    } catch (e) { console.error(e); }
}

function filterCustomers() {
    const q = (document.getElementById('crm-search')?.value || '').toLowerCase();
    const tbody = document.getElementById('customers-tbody');
    const filtered = allCustomersList.filter(c =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5">
            <img src="/static/assets/images/no_data.jpg" style="max-height: 100px;" class="img-fluid rounded mb-3">
            <p class="text-muted mb-0">No customers found.</p>
        </td></tr>`;
        return;
    }
    
    const tierColors = { 'Bronze': 'bg-warning text-dark', 'Silver': 'bg-secondary', 'Gold': 'bg-warning', 'Platinum': 'bg-primary' };
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width:38px;height:38px;background:linear-gradient(135deg,#667eea,#764ba2);">
                        <i class="fa-solid fa-user text-white fs-6"></i>
                    </div>
                    <div>
                        <span class="fw-bold d-block">${c.name}</span>
                        <small class="text-muted">${c.email}</small>
                    </div>
                </div>
            </td>
            <td>${c.phone}</td>
            <td><span class="badge rounded-pill ${tierColors[c.loyalty_status] || 'bg-secondary'} px-3">${c.loyalty_status}</span></td>
            <td class="fw-bold">${c.total_orders}</td>
            <td class="fw-bold text-success">₹${c.total_spend.toFixed(2)}</td>
            <td>${c.last_order}</td>
        </tr>
    `).join('');
}

async function loadPLAnalysis() {
    try {
        const [plRes, topRes] = await Promise.allSettled([
            fetch('/api/analytics/pl').then(r => r.json()),
            fetch('/api/analytics/top-products').then(r => r.json())
        ]);
        
        const pl = plRes.status === 'fulfilled' ? plRes.value : { total_revenue: 0, total_cogs: 0, gross_profit: 0, net_profit: 0, gross_margin: 0, monthly: [] };
        const top = topRes.status === 'fulfilled' ? topRes.value : { top10: [], least10: [] };

        const revEl = document.getElementById('pl-total-revenue');
        const cogsEl = document.getElementById('pl-cogs');
        const grossEl = document.getElementById('pl-gross-profit');
        const netEl = document.getElementById('pl-net-profit');
        const marginEl = document.getElementById('pl-margin-label');

        if (revEl) revEl.textContent = '₹' + Number(pl.total_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (cogsEl) cogsEl.textContent = '₹' + Number(pl.total_cogs || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (grossEl) grossEl.textContent = '₹' + Number(pl.gross_profit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (netEl) netEl.textContent = '₹' + Number(pl.net_profit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (marginEl) marginEl.textContent = Number(pl.gross_margin || 0).toFixed(1) + '% gross margin';
        
        // Render monthly chart only when actual data is available
        const ctx = document.getElementById('pl-monthly-chart');
        if (ctx) {
            if (window._plChart) window._plChart.destroy();
            const monthlyList = Array.isArray(pl.monthly) ? pl.monthly : [];
            window._plChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthlyList.map(m => m.month),
                    datasets: [
                        { label: 'Revenue', data: monthlyList.map(m => m.revenue), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6 },
                        { label: 'COGS', data: monthlyList.map(m => m.cogs), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 },
                        { label: 'Profit', data: monthlyList.map(m => m.profit), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } } }
            });
        }
        
        // Top products
        const topTbody = document.getElementById('top-products-tbody');
        const leastTbody = document.getElementById('least-products-tbody');
        if (topTbody && top && Array.isArray(top.top10)) {
            topTbody.innerHTML = top.top10.map((p, i) => `
                <tr>
                    <td><span class="badge ${i < 3 ? 'bg-warning' : 'bg-light text-dark'}">#${i+1}</span></td>
                    <td class="fw-semibold">${p.name}</td>
                    <td>${p.qty}</td>
                    <td class="text-success fw-bold">₹${Number(p.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `).join('');
        }
        if (leastTbody && top && Array.isArray(top.least10)) {
            leastTbody.innerHTML = top.least10.map((p, i) => `
                <tr>
                    <td><span class="badge bg-danger">#${i+1}</span></td>
                    <td class="fw-semibold">${p.name}</td>
                    <td>${p.qty}</td>
                    <td class="text-danger fw-bold">₹${Number(p.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error("P&L analysis load error:", e); }
}

async function loadHeatmapData() {
    try {
        const [zonesRes, healthRes] = await Promise.allSettled([
            fetch('/api/analytics/heatmap').then(r => r.json()),
            fetch('/api/analytics/inventory-health').then(r => r.json())
        ]);
        
        const health = healthRes.status === 'fulfilled' ? healthRes.value : { score: 0, status: 'Unavailable', healthy: 0, low_stock: 0, out_of_stock: 0 };
        const zones = zonesRes.status === 'fulfilled' ? zonesRes.value : [];
        
        // Health score
        const scoreEl = document.getElementById('health-score-display');
        const statusEl = document.getElementById('health-score-status');
        const healthyEl = document.getElementById('health-healthy');
        const lowEl = document.getElementById('health-low');
        const outEl = document.getElementById('health-out');

        if (scoreEl) scoreEl.textContent = health.score !== undefined ? health.score : '--';
        if (statusEl) statusEl.textContent = health.status || 'Unavailable';
        if (healthyEl) healthyEl.textContent = health.healthy !== undefined ? health.healthy : 0;
        if (lowEl) lowEl.textContent = health.low_stock !== undefined ? health.low_stock : 0;
        if (outEl) outEl.textContent = health.out_of_stock !== undefined ? health.out_of_stock : 0;
        
        if (scoreEl && health.score !== undefined) {
            const scoreColor = health.score >= 85 ? '#10b981' : health.score >= 65 ? '#3b82f6' : health.score >= 40 ? '#f59e0b' : '#ef4444';
            scoreEl.style.color = scoreColor;
        }
        
        // Heatmap grid
        const zoneColors = {
            hot: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warm: 'linear-gradient(135deg, #f97316, #ea580c)',
            cold: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            dead: 'linear-gradient(135deg, #6b7280, #4b5563)'
        };
        const zoneIcons = { hot: 'fa-fire', warm: 'fa-temperature-high', cold: 'fa-snowflake', dead: 'fa-cube' };
        
        const grid = document.getElementById('heatmap-grid');
        if (grid && Array.isArray(zones)) {
            grid.innerHTML = zones.map(z => `
                <div class="col-6 col-md-3 col-lg-2">
                    <div class="rounded-3 p-3 text-white text-center h-100" style="background: ${zoneColors[z.zone] || zoneColors.dead}; min-height: 120px;">
                        <i class="fa-solid ${zoneIcons[z.zone] || 'fa-cube'} fa-lg mb-2 d-block"></i>
                        <div class="fw-bold text-truncate" style="font-size:0.8rem;" title="${z.name}">${z.name}</div>
                        <div style="font-size:0.7rem;opacity:0.9;">${z.sku}</div>
                        <div class="mt-1 fw-bold">${z.velocity} sales</div>
                        <div style="font-size:0.7rem;opacity:0.8;">Stock: ${z.stock}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Heatmap load error:", e);
        const statusEl = document.getElementById('health-score-status');
        if (statusEl && statusEl.textContent === 'Loading...') {
            statusEl.textContent = 'Unavailable';
        }
    }
}
// End of app.js


// --- LOCAL FILE STORAGE ---

function triggerCloudUpload() {
    const input = document.getElementById('cloud-file-input');
    if (input) input.click();
}

async function handleCloudFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    showToast('Uploading file...', 'info', 3000);
    try {
        const res = await fetch('/api/cloud/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`File "${file.name}" uploaded successfully.`, 'success');
            loadCloudFiles();
        } else {
            showToast(data.message || 'Upload failed.', 'danger');
        }
    } catch (e) {
        showToast('Upload error: ' + e.message, 'danger');
    }
    event.target.value = '';
}

async function loadCloudFiles() {
    const grid = document.getElementById('cloud-files-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-12 text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p class="mt-2">Loading files...</p></div>';
    try {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        if (!Array.isArray(files) || files.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-folder-open fa-3x mb-3 opacity-50"></i><p>No files stored yet. Upload your first file above.</p></div>';
            return;
        }
        const iconMap = {
            'application/pdf': 'fa-file-pdf text-danger',
            'image/png': 'fa-file-image text-info',
            'image/jpeg': 'fa-file-image text-info',
            'image/gif': 'fa-file-image text-info',
            'text/csv': 'fa-file-csv text-success',
            'application/vnd.ms-excel': 'fa-file-excel text-success',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel text-success',
            'text/plain': 'fa-file-lines text-secondary',
            'application/zip': 'fa-file-zipper text-warning',
        };
        grid.innerHTML = files.map(f => {
            const icon = iconMap[f.mime_type] || 'fa-file text-secondary';
            const sizeKb = f.size ? (f.size / 1024).toFixed(1) + ' KB' : 'Unknown size';
            return `
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 h-100 d-flex flex-row align-items-start gap-3">
                    <div class="flex-shrink-0">
                        <i class="fa-solid ${icon} fa-2x mt-1"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="fw-bold text-truncate" title="${f.original_name}" style="font-size:0.85rem;">${f.original_name}</div>
                        <div class="text-muted" style="font-size:0.75rem;">${sizeKb} &middot; ${f.uploaded_at}</div>
                        <div class="mt-1">
                            <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:0.7rem;">${f.provider}</span>
                        </div>
                    </div>
                    <div class="d-flex flex-column gap-1 flex-shrink-0">
                        <a href="${f.url}" target="_blank" class="btn btn-outline-secondary btn-sm" title="Download"><i class="fa-solid fa-download"></i></a>
                        <button class="btn btn-outline-danger btn-sm" title="Delete" onclick="deleteCloudFile(${f.id}, this)"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        grid.innerHTML = '<div class="col-12 text-center text-danger py-4"><i class="fa-solid fa-circle-xmark fa-2x mb-2"></i><p>Failed to load files.</p></div>';
    }
}

async function deleteCloudFile(fileId, btn) {
    if (!confirm('Delete this file permanently?')) return;
    btn.disabled = true;
    try {
        const res = await fetch(`/api/cloud/files/${fileId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('File deleted.', 'success');
            loadCloudFiles();
        } else {
            showToast(data.message || 'Delete failed.', 'danger');
            btn.disabled = false;
        }
    } catch (e) {
        showToast('Delete error: ' + e.message, 'danger');
        btn.disabled = false;
    }
}

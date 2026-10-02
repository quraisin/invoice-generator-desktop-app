/**
 * INVOICE MASTER - Desktop Application Frontend Logic
 */

// Application State
const state = {
  currentUser: null,
  activeView: 'dashboard',
  settings: {},
  clients: [],
  invoices: [],
  currentInvoice: null,
  invoicePagination: {
    currentPage: 1,
    pageSize: 10
  },
  invoiceFilter: {
    status: 'all',
    search: '',
    startDate: '',
    endDate: ''
  }
};

// ======================== HELPER FUNCTIONS ========================

function formatCurrency(amount, symbol = 'Rp') {
  const num = parseFloat(amount) || 0;
  return `${symbol}\u00A0${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumberAmount(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse any date string (ISO 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY') into { day, month, year }
function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return {
        day: String(day).padStart(2, '0'),
        month: String(month).padStart(2, '0'),
        year: String(year)
      };
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return {
        day: String(day).padStart(2, '0'),
        month: String(month).padStart(2, '0'),
        year: String(year)
      };
    }
  }

  return null;
}

// Convert any date to DD/MM/YYYY (Tanggal/Bulan/Tahun)
function toDMYDateString(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const parts = parseDateParts(dateInput);
  if (parts) {
    return `${parts.day}/${parts.month}/${parts.year}`;
  }
  return dateInput;
}

// Convert any date to YYYY-MM-DD (ISO standard for SQL)
function toISODateString(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${year}-${month}-${day}`;
  }
  const parts = parseDateParts(dateInput);
  if (parts) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  return dateInput;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const dmy = toDMYDateString(dateStr);
  return dmy || '-';
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDMYString() {
  return toDMYDateString(new Date());
}

function getFutureDateString(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFutureDateDMYString(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return toDMYDateString(d);
}

function setDateInputValue(id, dateValue) {
  const textInput = document.getElementById(id);
  const pickerInput = document.getElementById(`${id}_picker`);
  
  if (textInput) {
    textInput.value = dateValue ? toDMYDateString(dateValue) : '';
  }
  if (pickerInput) {
    pickerInput.value = dateValue ? toISODateString(dateValue) : '';
  }
}

function getDateInputValueISO(id) {
  const textInput = document.getElementById(id);
  const pickerInput = document.getElementById(`${id}_picker`);
  
  if (textInput && textInput.value && textInput.value.trim()) {
    const iso = toISODateString(textInput.value.trim());
    if (iso) return iso;
  }
  if (pickerInput && pickerInput.value) {
    return pickerInput.value;
  }
  return '';
}

function initDatePicker(textInputId, pickerInputId) {
  const textInput = document.getElementById(textInputId);
  const pickerInput = document.getElementById(pickerInputId);
  if (!textInput || !pickerInput) return;

  const wrapper = textInput.closest('.date-picker-wrapper');
  const triggerBtn = wrapper ? wrapper.querySelector('.btn-picker-trigger') : null;

  const openPicker = () => {
    // If textInput has valid DD/MM/YYYY, sync it to pickerInput before opening
    const parts = parseDateParts(textInput.value.trim());
    if (parts) {
      pickerInput.value = `${parts.year}-${parts.month}-${parts.day}`;
    }
    if (typeof pickerInput.showPicker === 'function') {
      try {
        pickerInput.showPicker();
        return;
      } catch (err) {
        console.warn('showPicker error:', err);
      }
    }
    pickerInput.focus();
    try {
      pickerInput.click();
    } catch (e) {}
  };

  // 1. When native calendar picker changes (user selected date from popup)
  pickerInput.addEventListener('change', () => {
    if (pickerInput.value) {
      textInput.value = toDMYDateString(pickerInput.value);
    } else {
      textInput.value = '';
    }
    // Trigger change event on text input so dependent calculations or listeners run
    textInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 2. Programmatic click on trigger button (keyboard & mouse accessibility)
  if (triggerBtn) {
    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });
  }

  // 3. User types in text input (Auto-formatting mask for DD/MM/YYYY)
  textInput.addEventListener('input', (e) => {
    let val = e.target.value;

    if (e.inputType && !e.inputType.startsWith('delete')) {
      const cleaned = val.replace(/[^\d\/\-]/g, '');
      if (cleaned !== val) {
        val = cleaned;
        e.target.value = val;
      }
      
      // Auto-insert slash after 2 digits and 5 digits if user is just typing numbers
      if (/^\d{2}$/.test(val)) {
        val = val + '/';
        e.target.value = val;
      } else if (/^\d{2}\/\d{2}$/.test(val)) {
        val = val + '/';
        e.target.value = val;
      }
    }

    // Sync to hidden date picker if a valid date is typed
    const parts = parseDateParts(val);
    if (parts) {
      pickerInput.value = `${parts.year}-${parts.month}-${parts.day}`;
    }
  });

  // 4. On blur: standardize display to DD/MM/YYYY
  textInput.addEventListener('blur', () => {
    const val = textInput.value.trim();
    if (!val) {
      pickerInput.value = '';
      return;
    }
    const parts = parseDateParts(val);
    if (parts) {
      textInput.value = `${parts.day}/${parts.month}/${parts.year}`;
      pickerInput.value = `${parts.year}-${parts.month}-${parts.day}`;
    }
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getStatusBadge(status) {
  switch (status) {
    case 'paid':
      return '<span class="status-badge badge-paid">Lunas</span>';
    case 'unpaid':
      return '<span class="status-badge badge-unpaid">Belum Lunas</span>';
    case 'overdue':
      return '<span class="status-badge badge-overdue">Jatuh Tempo</span>';
    case 'cancelled':
      return '<span class="status-badge badge-cancelled">Dibatalkan</span>';
    default:
      return `<span class="status-badge">${status}</span>`;
  }
}

// ======================== INITIALIZATION ========================

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Check session in localStorage
  const savedUser = localStorage.getItem('inv_user_session');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      showMainApp();
    } catch (e) {
      showLogin();
    }
  } else {
    showLogin();
  }
});

// ======================== AUTHENTICATION & RATE LIMITING ========================

let lockoutTimerInterval = null;

function startLockoutTimer(remainingSeconds) {
  if (lockoutTimerInterval) {
    clearInterval(lockoutTimerInterval);
  }

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginAlert = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginSubmitBtn');

  usernameInput.disabled = true;
  passwordInput.disabled = true;
  loginBtn.disabled = true;

  const targetTimestamp = Date.now() + (remainingSeconds * 1000);
  localStorage.setItem('inv_lockout_until', String(targetTimestamp));

  const updateDisplay = () => {
    const leftMs = targetTimestamp - Date.now();
    if (leftMs <= 0) {
      clearInterval(lockoutTimerInterval);
      lockoutTimerInterval = null;
      localStorage.removeItem('inv_lockout_until');

      usernameInput.disabled = false;
      passwordInput.disabled = false;
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <span>Masuk ke Dashboard</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
      loginAlert.className = 'alert alert-info';
      loginAlert.innerHTML = 'Waktu kunci 5 menit telah selesai. Anda dapat mencoba login kembali.';
      loginAlert.style.display = 'block';
      usernameInput.focus();
      return;
    }

    const secLeft = Math.ceil(leftMs / 1000);
    const m = Math.floor(secLeft / 60);
    const s = secLeft % 60;
    const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    loginAlert.className = 'alert alert-danger';
    loginAlert.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 4px;">⚠️ Akses Login Terkunci (3x Percobaan Gagal)</div>
      <div>Untuk keamanan data, percobaan login dihentikan selama 5 menit.</div>
      <div style="margin-top: 6px; font-size: 1.05rem; font-weight: 800; font-family: monospace; color: #f87171;">
        Silakan coba lagi dalam: ${timeFormatted}
      </div>
    `;
    loginAlert.style.display = 'block';

    loginBtn.innerHTML = `<span>Terkunci (${timeFormatted})</span>`;
  };

  updateDisplay();
  lockoutTimerInterval = setInterval(updateDisplay, 1000);
}

async function checkAndApplyLockout() {
  try {
    if (window.electronAPI && window.electronAPI.checkRateLimit) {
      const res = await window.electronAPI.checkRateLimit();
      if (res && res.locked && res.remainingSec > 0) {
        startLockoutTimer(res.remainingSec);
        return true;
      }
    }
  } catch (e) {}

  const savedLockout = localStorage.getItem('inv_lockout_until');
  if (savedLockout) {
    const target = parseInt(savedLockout, 10);
    if (target > Date.now()) {
      const sec = Math.ceil((target - Date.now()) / 1000);
      startLockoutTimer(sec);
      return true;
    } else {
      localStorage.removeItem('inv_lockout_until');
    }
  }
  return false;
}

function showLogin() {
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('mainAppView').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  checkAndApplyLockout();
}

async function showMainApp() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('mainAppView').style.display = 'flex';
  
  if (state.currentUser) {
    document.getElementById('userDisplayName').textContent = state.currentUser.name || 'Super Admin';
  }

  // Load Settings and Data
  await loadSettings();
  await loadClients();
  await switchView('dashboard');
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginAlert = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginSubmitBtn');

  const usernameVal = usernameInput.value.trim();
  const passwordVal = passwordInput.value;

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span>Memeriksa kredensial...</span>';
  loginAlert.style.display = 'none';

  try {
    const res = await window.electronAPI.login({
      username: usernameVal,
      password: passwordVal
    });

    if (res.success) {
      if (lockoutTimerInterval) {
        clearInterval(lockoutTimerInterval);
        lockoutTimerInterval = null;
      }
      localStorage.removeItem('inv_lockout_until');
      state.currentUser = res.user;
      if (document.getElementById('rememberMe').checked) {
        localStorage.setItem('inv_user_session', JSON.stringify(res.user));
      }
      showToast('Selamat datang kembali, ' + res.user.name + '!', 'success');
      showMainApp();
    } else if (res.locked) {
      startLockoutTimer(res.remainingSec || 300);
    } else {
      loginAlert.className = 'alert alert-danger';
      loginAlert.textContent = res.message || 'Username atau password salah!';
      loginAlert.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <span>Masuk ke Dashboard</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
    }
  } catch (err) {
    console.error('Login error:', err);
    loginAlert.className = 'alert alert-danger';
    loginAlert.textContent = 'Terjadi kesalahan sistem login: ' + err.message;
    loginAlert.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
      <span>Masuk ke Dashboard</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
  }
}

function handleLogout() {
  localStorage.removeItem('inv_user_session');
  state.currentUser = null;
  showToast('Anda telah berhasil keluar.', 'info');
  showLogin();
}

// ======================== NAVIGATION ========================

async function switchView(viewName, params = {}) {
  state.activeView = viewName;

  // Update active menu link
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    if (item.dataset.nav === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Hide all sections
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));

  const titleEl = document.getElementById('pageTitle');
  const subEl = document.getElementById('pageSubtitle');

  switch (viewName) {
    case 'dashboard':
      document.getElementById('pageDashboard').classList.add('active');
      titleEl.textContent = 'Ringkasan Dashboard';
      subEl.textContent = 'Pantau performa penjualan dan status faktur real-time';
      await loadDashboardData();
      break;

    case 'invoices':
      document.getElementById('pageInvoices').classList.add('active');
      titleEl.textContent = 'Daftar Faktur Penjualan';
      subEl.textContent = 'Kelola seluruh faktur, pembayaran, dan cetak PDF';
      await loadInvoicesData();
      break;

    case 'create-invoice':
      document.getElementById('pageCreateInvoice').classList.add('active');
      if (params.editId) {
        titleEl.textContent = 'Edit Faktur Penjualan';
        subEl.textContent = `Memperbarui rincian invoice #${params.invoiceNumber || ''}`;
        await prepareEditInvoice(params.editId);
      } else {
        titleEl.textContent = 'Buat Faktur Baru';
        subEl.textContent = 'Lengkapi formulir untuk menerbitkan invoice resmi';
        await prepareCreateInvoice();
      }
      break;

    case 'clients':
      document.getElementById('pageClients').classList.add('active');
      titleEl.textContent = 'Database Pelanggan';
      subEl.textContent = 'Daftar klien, perusahaan rekanan, dan total transaksi';
      await loadClients();
      renderClientsTable();
      break;

    case 'settings':
      document.getElementById('pageSettings').classList.add('active');
      titleEl.textContent = 'Pengaturan Bisnis';
      subEl.textContent = 'Konfigurasi profil perusahaan, nomor rekening, dan tarif pajak';
      renderSettingsForm();
      loadBackupStatus();
      break;
  }
}

// ======================== DASHBOARD ========================

async function loadDashboardData() {
  try {
    const stats = await window.electronAPI.getDashboardStats();

    const setDynamicStatValue = (elId, numVal) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const formatted = formatNumberAmount(numVal);
      el.textContent = formatted;
      el.title = formatted;
      // Auto-scale font size if nominal is very large (e.g. >= 100.000.000,00 or >= 1.000.000.000,00)
      if (formatted.length > 17) {
        el.style.fontSize = '1.05rem';
      } else if (formatted.length > 14) {
        el.style.fontSize = '1.14rem';
      } else {
        el.style.fontSize = '';
      }
    };

    setDynamicStatValue('statTotalRevenue', stats.totalRevenue);
    setDynamicStatValue('statPendingAmount', stats.pendingAmount);
    document.getElementById('statOverdueCount').textContent = stats.overdueCount || '0';
    document.getElementById('statTotalClients').textContent = stats.totalClients || '0';

    document.getElementById('statPaidCount').textContent = stats.paidCount || '0';
    document.getElementById('statUnpaidCount').textContent = stats.unpaidCount || '0';
    document.getElementById('statTotalInvoices').textContent = stats.totalInvoices || '0';

    renderRecentInvoicesTable(stats.recentInvoices || []);
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

function renderRecentInvoicesTable(invoices) {
  const tbody = document.getElementById('dashboardRecentTbody');

  if (!invoices || invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-dim);">Belum ada faktur yang dibuat. Klik "+ Buat Invoice" untuk memulai.</td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(inv => `
    <tr>
      <td><span class="inv-code">${inv.invoice_number}</span></td>
      <td>
        <div style="font-weight: 600;">${inv.client_name || 'Klien Umum'}</div>
        <div style="font-size: 0.78rem; color: var(--text-dim);">${inv.client_company || '-'}</div>
      </td>
      <td>${formatDate(inv.issue_date)}</td>
      <td>${formatDate(inv.due_date)}</td>
      <td class="text-right"><span class="inv-total">${formatNumberAmount(inv.total)}</span></td>
      <td>${getStatusBadge(inv.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon-action" title="Pratinjau / Cetak" onclick="openInvoicePreview(${inv.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="btn-icon-action" title="Edit" onclick="editInvoice(${inv.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ======================== INVOICES LIST ========================

async function loadInvoicesData() {
  try {
    const invoices = await window.electronAPI.getInvoices(state.invoiceFilter);
    state.invoices = invoices;
    renderInvoicesTable(invoices);
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoicesTbody');
  const emptyState = document.getElementById('invoicesEmptyState');
  const paginationBar = document.getElementById('invoicesPaginationBar');

  if (!invoices || invoices.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    if (paginationBar) paginationBar.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';

  // Pagination calculation (10 data per page)
  const totalItems = invoices.length;
  const pageSize = state.invoicePagination.pageSize || 10;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (state.invoicePagination.currentPage > totalPages) {
    state.invoicePagination.currentPage = totalPages;
  }
  if (state.invoicePagination.currentPage < 1) {
    state.invoicePagination.currentPage = 1;
  }
  const curPage = state.invoicePagination.currentPage;

  const startIndex = (curPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageInvoices = invoices.slice(startIndex, endIndex);

  tbody.innerHTML = pageInvoices.map(inv => `
    <tr>
      <td><span class="inv-code">${inv.invoice_number}</span></td>
      <td>
        <div style="font-weight: 600;">${inv.client_name || 'Klien Umum'}</div>
        <div style="font-size: 0.78rem; color: var(--text-dim);">${inv.client_company || '-'}</div>
      </td>
      <td>${formatDate(inv.issue_date)}</td>
      <td>${formatDate(inv.due_date)}</td>
      <td class="text-right"><span class="inv-total">${formatNumberAmount(inv.total)}</span></td>
      <td>
        <select class="form-control-sm" style="font-size: 0.78rem; width: 110px;" onchange="changeInvoiceStatus(${inv.id}, this.value)">
          <option value="unpaid" ${inv.status === 'unpaid' ? 'selected' : ''}>Belum Lunas</option>
          <option value="paid" ${inv.status === 'paid' ? 'selected' : ''}>Lunas</option>
          <option value="overdue" ${inv.status === 'overdue' ? 'selected' : ''}>Jatuh Tempo</option>
          <option value="cancelled" ${inv.status === 'cancelled' ? 'selected' : ''}>Dibatalkan</option>
        </select>
      </td>
      <td class="text-right">
        <div class="action-buttons">
          <button class="btn-icon-action" title="Lihat / Cetak PDF" onclick="openInvoicePreview(${inv.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="btn-icon-action" title="Edit Faktur" onclick="editInvoice(${inv.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon-action delete-action" title="Hapus Faktur" onclick="confirmDeleteInvoice(${inv.id}, '${inv.invoice_number}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update Pagination Controls
  if (paginationBar) {
    paginationBar.style.display = 'flex';
    const infoEl = document.getElementById('invoicesPaginationInfo');
    if (infoEl) {
      infoEl.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalItems} faktur (Halaman ${curPage} dari ${totalPages})`;
    }

    const prevBtn = document.getElementById('invPrevPageBtn');
    const nextBtn = document.getElementById('invNextPageBtn');
    if (prevBtn) prevBtn.disabled = (curPage <= 1);
    if (nextBtn) nextBtn.disabled = (curPage >= totalPages);

    const pagesContainer = document.getElementById('invPaginationPages');
    if (pagesContainer) {
      let pagesHtml = '';
      for (let p = 1; p <= totalPages; p++) {
        if (totalPages <= 7 || p === 1 || p === totalPages || (p >= curPage - 1 && p <= curPage + 1)) {
          pagesHtml += `<button type="button" class="btn-page-number ${p === curPage ? 'active' : ''}" onclick="goToInvoicePage(${p})">${p}</button>`;
        } else if (p === curPage - 2 || p === curPage + 2) {
          pagesHtml += `<span class="page-ellipsis">...</span>`;
        }
      }
      pagesContainer.innerHTML = pagesHtml;
    }
  }
}

function goToInvoicePage(pageNum) {
  state.invoicePagination.currentPage = pageNum;
  renderInvoicesTable(state.invoices);
}

async function changeInvoiceStatus(id, newStatus) {
  try {
    await window.electronAPI.updateInvoiceStatus(id, newStatus);
    showToast('Status faktur berhasil diperbarui.', 'success');
    await loadInvoicesData();
  } catch (err) {
    console.error('Failed to update invoice status:', err);
    showToast('Gagal memperbarui status invoice.', 'error');
  }
}

async function confirmDeleteInvoice(id, invNumber) {
  if (confirm(`Apakah Anda yakin ingin menghapus faktur #${invNumber}? Data item di dalamnya akan ikut terhapus.`)) {
    try {
      await window.electronAPI.deleteInvoice(id);
      showToast(`Faktur #${invNumber} berhasil dihapus.`, 'success');
      await loadInvoicesData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      showToast('Gagal menghapus faktur.', 'error');
    }
  }
}

// ======================== CREATE / EDIT INVOICE ========================

async function prepareCreateInvoice() {
  await loadSettings();
  document.getElementById('invoiceForm').reset();
  document.getElementById('invFormId').value = '';

  // Set default dates (Format: Tanggal/Bulan/Tahun - DD/MM/YYYY)
  const todayIso = getTodayString();
  const futureIso = getFutureDateString(14);
  setDateInputValue('invIssueDate', todayIso);
  setDateInputValue('invDueDate', futureIso);
  document.getElementById('invStatus').value = 'unpaid';

  // Get Next Invoice Number
  const nextNum = await window.electronAPI.getNextInvoiceNumber(todayIso);
  document.getElementById('invNumber').value = nextNum;

  // Tax and Terms from settings
  document.getElementById('invTaxRate').value = state.settings.default_tax_rate || '11';
  document.getElementById('invDiscountType').value = 'percentage';
  document.getElementById('invDiscountValue').value = '0';
  document.getElementById('invNotes').value = 'Terima kasih atas kerja sama Anda.';
  document.getElementById('invPaymentTerms').value = state.settings.default_payment_terms || '';

  // Populate client select
  populateClientSelect();
  document.getElementById('selectedClientPreview').style.display = 'none';

  // Initial Item Row
  const tbody = document.getElementById('invoiceItemsTbody');
  tbody.innerHTML = '';
  addItemRow('', 1, 0);

  calculateInvoiceTotals();
}

async function prepareEditInvoice(id) {
  try {
    const inv = await window.electronAPI.getInvoiceById(id);
    if (!inv) {
      showToast('Faktur tidak ditemukan.', 'error');
      switchView('invoices');
      return;
    }

    document.getElementById('invFormId').value = inv.id;
    document.getElementById('invNumber').value = inv.invoice_number;
    document.getElementById('invStatus').value = inv.status;
    setDateInputValue('invIssueDate', inv.issue_date);
    setDateInputValue('invDueDate', inv.due_date);
    document.getElementById('invNotes').value = inv.notes || '';
    document.getElementById('invPaymentTerms').value = inv.payment_terms || '';

    document.getElementById('invTaxRate').value = inv.tax_rate;
    document.getElementById('invDiscountType').value = inv.discount_type || 'percentage';
    document.getElementById('invDiscountValue').value = inv.discount_value || 0;

    populateClientSelect(inv.client_id);
    updateClientPreview(inv.client_id);

    // Items
    const tbody = document.getElementById('invoiceItemsTbody');
    tbody.innerHTML = '';
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(it => {
        addItemRow(it.description, it.quantity, it.unit_price);
      });
    } else {
      addItemRow('', 1, 0);
    }

    calculateInvoiceTotals();
  } catch (err) {
    console.error('Failed to load invoice for edit:', err);
    showToast('Gagal memuat data faktur untuk diedit.', 'error');
  }
}

function populateClientSelect(selectedId = null) {
  const select = document.getElementById('invClientId');
  select.innerHTML = '<option value="">-- Pilih Pelanggan --</option>';

  state.clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} ${c.company ? '(' + c.company + ')' : ''}`;
    if (selectedId && String(c.id) === String(selectedId)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function updateClientPreview(clientId) {
  const previewBox = document.getElementById('selectedClientPreview');
  if (!clientId) {
    previewBox.style.display = 'none';
    return;
  }

  const client = state.clients.find(c => String(c.id) === String(clientId));
  if (!client) {
    previewBox.style.display = 'none';
    return;
  }

  document.getElementById('cpName').textContent = client.name;
  document.getElementById('cpCompany').textContent = client.company || 'Perorangan';
  document.getElementById('cpContact').textContent = `${client.email || '-'} • ${client.phone || '-'}`;
  document.getElementById('cpAddress').textContent = client.address || 'Alamat belum diatur';
  previewBox.style.display = 'block';
}

function addItemRow(desc = '', qty = 1, price = 0) {
  const tbody = document.getElementById('invoiceItemsTbody');
  const tr = document.createElement('tr');
  const curr = state.settings.currency_symbol || 'Rp';
  const rowTotal = (parseFloat(qty) || 1) * (parseFloat(price) || 0);

  tr.innerHTML = `
    <td>
      <input type="text" class="item-desc" placeholder="Nama item / deskripsi layanan..." value="${desc}" required>
    </td>
    <td>
      <input type="number" class="item-qty" value="${qty}" min="0.1" step="any" required>
    </td>
    <td>
      <input type="number" class="item-price" value="${price}" min="0" step="any" required>
    </td>
    <td class="text-right">
      <span class="row-total-display font-mono">${formatNumberAmount(rowTotal)}</span>
    </td>
    <td class="text-right">
      <button type="button" class="btn-remove-row" title="Hapus Baris">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </td>
  `;

  // Row event listeners for auto-calc
  const qtyInput = tr.querySelector('.item-qty');
  const priceInput = tr.querySelector('.item-price');
  const rowTotalDisplay = tr.querySelector('.row-total-display');
  const removeBtn = tr.querySelector('.btn-remove-row');

  const updateRowTotal = () => {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    rowTotalDisplay.textContent = formatNumberAmount(q * p);
    calculateInvoiceTotals();
  };

  qtyInput.addEventListener('input', updateRowTotal);
  priceInput.addEventListener('input', updateRowTotal);

  removeBtn.addEventListener('click', () => {
    if (tbody.children.length > 1) {
      tr.remove();
      calculateInvoiceTotals();
    } else {
      showToast('Minimal harus ada 1 baris item dalam faktur.', 'error');
    }
  });

  tbody.appendChild(tr);
}

function calculateInvoiceTotals() {
  let subtotal = 0;

  const rows = document.querySelectorAll('#invoiceItemsTbody tr');
  rows.forEach(r => {
    const q = parseFloat(r.querySelector('.item-qty')?.value) || 0;
    const p = parseFloat(r.querySelector('.item-price')?.value) || 0;
    subtotal += (q * p);
  });

  const taxRate = parseFloat(document.getElementById('invTaxRate').value) || 0;
  const taxAmount = (subtotal * taxRate) / 100;

  const discountType = document.getElementById('invDiscountType').value;
  const discountVal = parseFloat(document.getElementById('invDiscountValue').value) || 0;
  let discountAmount = 0;

  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountVal) / 100;
  } else {
    discountAmount = discountVal;
  }

  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  document.getElementById('calcSubtotal').textContent = formatNumberAmount(subtotal);
  document.getElementById('calcTaxAmount').textContent = formatNumberAmount(taxAmount);
  document.getElementById('calcDiscountAmount').textContent = discountAmount > 0 ? `- ${formatNumberAmount(discountAmount)}` : formatNumberAmount(0);
  document.getElementById('calcGrandTotal').textContent = formatNumberAmount(grandTotal);

  return {
    subtotal,
    taxRate,
    taxAmount,
    discountType,
    discountVal,
    discountAmount,
    grandTotal
  };
}

async function handleSaveInvoice(andPdf = false) {
  const form = document.getElementById('invoiceForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const calc = calculateInvoiceTotals();
  const id = document.getElementById('invFormId').value;
  
  // Collect line items
  const items = [];
  const rows = document.querySelectorAll('#invoiceItemsTbody tr');
  rows.forEach(r => {
    const desc = r.querySelector('.item-desc').value.trim();
    const qty = parseFloat(r.querySelector('.item-qty').value) || 1;
    const price = parseFloat(r.querySelector('.item-price').value) || 0;
    items.push({
      description: desc,
      quantity: qty,
      unit_price: price,
      amount: qty * price
    });
  });

  if (items.length === 0) {
    showToast('Harap tambahkan minimal satu baris item barang/jasa.', 'error');
    return;
  }

  const issueDateIso = getDateInputValueISO('invIssueDate');
  const dueDateIso = getDateInputValueISO('invDueDate');

  if (!issueDateIso) {
    showToast('Format tanggal terbit tidak valid. Gunakan format Tanggal/Bulan/Tahun (DD/MM/YYYY).', 'error');
    document.getElementById('invIssueDate').focus();
    return;
  }

  if (!dueDateIso) {
    showToast('Format tanggal jatuh tempo tidak valid. Gunakan format Tanggal/Bulan/Tahun (DD/MM/YYYY).', 'error');
    document.getElementById('invDueDate').focus();
    return;
  }

  const invoiceData = {
    id: id ? parseInt(id, 10) : undefined,
    invoice_number: document.getElementById('invNumber').value.trim(),
    client_id: parseInt(document.getElementById('invClientId').value, 10),
    issue_date: issueDateIso,
    due_date: dueDateIso,
    status: document.getElementById('invStatus').value,
    subtotal: calc.subtotal,
    tax_rate: calc.taxRate,
    tax_amount: calc.taxAmount,
    discount_type: calc.discountType,
    discount_value: calc.discountVal,
    discount_amount: calc.discountAmount,
    total: calc.grandTotal,
    notes: document.getElementById('invNotes').value.trim(),
    payment_terms: document.getElementById('invPaymentTerms').value.trim(),
    items: items
  };

  try {
    const saved = await window.electronAPI.saveInvoice(invoiceData);
    showToast(`Faktur #${saved.invoice_number} berhasil disimpan!`, 'success');

    if (andPdf) {
      openInvoicePreview(saved.id);
    } else {
      switchView('invoices');
    }
  } catch (err) {
    console.error('Failed to save invoice:', err);
    showToast('Gagal menyimpan faktur: ' + err.message, 'error');
  }
}

function editInvoice(id) {
  switchView('create-invoice', { editId: id });
}

// ======================== CLIENTS ========================

async function loadClients() {
  try {
    state.clients = await window.electronAPI.getClients();
  } catch (err) {
    console.error('Failed to load clients:', err);
  }
}

function renderClientsTable() {
  const tbody = document.getElementById('clientsTbody');
  const search = document.getElementById('clientSearchInput').value.toLowerCase().trim();
  const curr = state.settings.currency_symbol || 'Rp';

  const filtered = state.clients.filter(c => {
    return c.name.toLowerCase().includes(search) ||
      (c.company && c.company.toLowerCase().includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-dim);">Belum ada pelanggan terdaftar. Klik "+ Tambah Pelanggan" untuk menambahkan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><span style="font-weight: 700; color: #f8fafc;">${c.name}</span></td>
      <td>${c.company || '<span style="color: var(--text-dim);">-</span>'}</td>
      <td>
        <div>${c.phone || '-'}</div>
        <div style="font-size: 0.78rem; color: var(--text-dim);">${c.email || ''}</div>
      </td>
      <td style="max-width: 200px; font-size: 0.82rem; color: var(--text-muted);">${c.address || '-'}</td>
      <td><span class="code-pill">${c.total_invoices || 0} faktur</span></td>
      <td class="text-right"><span class="inv-total">${formatNumberAmount(c.total_spent || 0)}</span></td>
      <td class="text-right">
        <div class="action-buttons">
          <button class="btn-icon-action" title="Edit Pelanggan" onclick="openEditClientModal(${c.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon-action delete-action" title="Hapus Pelanggan" onclick="confirmDeleteClient(${c.id}, '${c.name}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddClientModal() {
  document.getElementById('clientForm').reset();
  document.getElementById('clientFormId').value = '';
  document.getElementById('clientModalTitle').textContent = 'Tambah Pelanggan Baru';
  document.getElementById('clientModal').style.display = 'flex';
}

function openEditClientModal(id) {
  const client = state.clients.find(c => c.id === id);
  if (!client) return;

  document.getElementById('clientFormId').value = client.id;
  document.getElementById('cliName').value = client.name;
  document.getElementById('cliCompany').value = client.company || '';
  document.getElementById('cliEmail').value = client.email || '';
  document.getElementById('cliPhone').value = client.phone || '';
  document.getElementById('cliAddress').value = client.address || '';
  document.getElementById('clientModalTitle').textContent = 'Edit Data Pelanggan';

  document.getElementById('clientModal').style.display = 'flex';
}

function closeClientModal() {
  document.getElementById('clientModal').style.display = 'none';
}

async function handleSaveClient(e) {
  e.preventDefault();
  const id = document.getElementById('clientFormId').value;
  const clientData = {
    id: id ? parseInt(id, 10) : undefined,
    name: document.getElementById('cliName').value.trim(),
    company: document.getElementById('cliCompany').value.trim(),
    email: document.getElementById('cliEmail').value.trim(),
    phone: document.getElementById('cliPhone').value.trim(),
    address: document.getElementById('cliAddress').value.trim()
  };

  try {
    const saved = await window.electronAPI.saveClient(clientData);
    showToast(`Pelanggan "${saved.name}" berhasil disimpan.`, 'success');
    closeClientModal();
    await loadClients();

    if (state.activeView === 'clients') {
      renderClientsTable();
    } else if (state.activeView === 'create-invoice') {
      populateClientSelect(saved.id);
      updateClientPreview(saved.id);
    }
  } catch (err) {
    console.error('Failed to save client:', err);
    showToast('Gagal menyimpan pelanggan.', 'error');
  }
}

async function confirmDeleteClient(id, name) {
  if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${name}"?`)) {
    try {
      await window.electronAPI.deleteClient(id);
      showToast(`Pelanggan "${name}" berhasil dihapus.`, 'success');
      await loadClients();
      renderClientsTable();
    } catch (err) {
      console.error('Failed to delete client:', err);
      showToast('Gagal menghapus pelanggan.', 'error');
    }
  }
}

// ======================== SETTINGS ========================

async function loadSettings() {
  try {
    state.settings = await window.electronAPI.getSettings();
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function renderSettingsForm() {
  const s = state.settings;
  document.getElementById('setCompanyName').value = s.company_name || '';
  document.getElementById('setCompanyTagline').value = s.company_tagline || '';
  document.getElementById('setCompanyEmail').value = s.company_email || '';
  document.getElementById('setCompanyPhone').value = s.company_phone || '';
  document.getElementById('setCompanyAddress').value = s.company_address || '';

  document.getElementById('setBankName').value = s.bank_name || '';
  document.getElementById('setBankAccountNumber').value = s.bank_account_number || '';
  document.getElementById('setBankAccountHolder').value = s.bank_account_holder || '';

  document.getElementById('setInvoicePrefix').value = s.invoice_prefix || 'INV';
  document.getElementById('setCurrencySymbol').value = s.currency_symbol || 'Rp';
  document.getElementById('setDefaultTaxRate').value = s.default_tax_rate || '11';
  document.getElementById('setDefaultPaymentTerms').value = s.default_payment_terms || '';

  // Company Logo Handling
  const logoVal = s.company_logo || '';
  const setCompanyLogo = document.getElementById('setCompanyLogo');
  const previewImg = document.getElementById('logoPreviewImg');
  const placeholder = document.getElementById('logoPlaceholder');
  const removeBtn = document.getElementById('removeLogoBtn');

  if (setCompanyLogo) setCompanyLogo.value = logoVal;
  if (previewImg && placeholder && removeBtn) {
    if (logoVal) {
      previewImg.src = logoVal;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
      removeBtn.style.display = 'inline-flex';
    } else {
      previewImg.src = '';
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';
      removeBtn.style.display = 'none';
    }
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const logoInput = document.getElementById('setCompanyLogo');
  const newSettings = {
    company_logo: logoInput ? logoInput.value.trim() : '',
    company_name: document.getElementById('setCompanyName').value.trim(),
    company_tagline: document.getElementById('setCompanyTagline').value.trim(),
    company_email: document.getElementById('setCompanyEmail').value.trim(),
    company_phone: document.getElementById('setCompanyPhone').value.trim(),
    company_address: document.getElementById('setCompanyAddress').value.trim(),
    bank_name: document.getElementById('setBankName').value.trim(),
    bank_account_number: document.getElementById('setBankAccountNumber').value.trim(),
    bank_account_holder: document.getElementById('setBankAccountHolder').value.trim(),
    invoice_prefix: document.getElementById('setInvoicePrefix').value.trim() || 'INV',
    currency_symbol: document.getElementById('setCurrencySymbol').value.trim() || 'Rp',
    default_tax_rate: document.getElementById('setDefaultTaxRate').value.trim() || '11',
    default_payment_terms: document.getElementById('setDefaultPaymentTerms').value.trim()
  };

  try {
    state.settings = await window.electronAPI.saveSettings(newSettings);
    
    // Immediately update preview paper if preview modal is open or invoice selected
    if (state.currentInvoice) {
      renderInvoicePaper(state.currentInvoice);
    }

    // Refresh active invoice table to reflect any currency changes
    if (state.invoices && state.invoices.length > 0) {
      renderInvoicesTable(state.invoices);
    }

    showToast('Pengaturan bisnis berhasil disimpan dan diterapkan.', 'success');
  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('Gagal menyimpan pengaturan.', 'error');
  }
}

// ======================== DATABASE BACKUP ========================

async function loadBackupStatus() {
  try {
    const status = await window.electronAPI.getBackupStatus();
    if (status.downloadsFolder) {
      document.getElementById('backupTargetFolder').textContent = status.downloadsFolder;
    }
    if (status.lastBackupDate) {
      const d = new Date(status.lastBackupDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      document.getElementById('backupLastDate').textContent = `${day}/${month}/${year}, ${hours}:${mins}`;
    } else {
      document.getElementById('backupLastDate').textContent = 'Belum pernah dicadangkan';
    }
    if (status.lastBackupFile) {
      document.getElementById('backupLastFile').textContent = status.lastBackupFile;
    } else {
      document.getElementById('backupLastFile').textContent = '-';
    }
  } catch (err) {
    console.error('Failed to load backup status:', err);
  }
}

async function handleManualBackup() {
  const btn = document.getElementById('manualBackupBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Sedang mencadangkan...</span>';
  try {
    const res = await window.electronAPI.backupNow();
    if (res.success) {
      showToast(`Backup berhasil disimpan ke Downloads: ${res.fileName}`, 'success');
      await loadBackupStatus();
    } else {
      showToast('Gagal mencadangkan database: ' + (res.error || res.message), 'error');
    }
  } catch (err) {
    console.error('Backup error:', err);
    showToast('Terjadi kesalahan backup.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Cadangkan Sekarang</span>
    `;
  }
}

async function handleOpenDownloadsFolder() {
  try {
    await window.electronAPI.openDownloadsFolder();
  } catch (err) {
    console.error('Failed to open downloads folder:', err);
  }
}

// ======================== PREVIEW & PDF PRINT ========================

async function openInvoicePreview(id) {
  try {
    await loadSettings();
    const inv = await window.electronAPI.getInvoiceById(id);
    if (!inv) {
      showToast('Faktur tidak ditemukan.', 'error');
      return;
    }
    state.currentInvoice = inv;

    document.getElementById('previewInvNumberBadge').textContent = inv.invoice_number;
    renderInvoicePaper(inv);

    document.getElementById('invoicePreviewModal').style.display = 'flex';
  } catch (err) {
    console.error('Failed to open preview:', err);
    showToast('Gagal membuka pratinjau faktur.', 'error');
  }
}

function closeInvoicePreview() {
  document.getElementById('invoicePreviewModal').style.display = 'none';
  state.currentInvoice = null;
}

function renderInvoicePaper(inv) {
  const container = document.getElementById('printableInvoiceContainer');
  const s = state.settings;
  const curr = s.currency_symbol || 'Rp';

  let itemsHtml = '';
  if (inv.items && inv.items.length > 0) {
    itemsHtml = inv.items.map((it, idx) => `
      <tr>
        <td style="width: 5%; text-align: center;">${idx + 1}</td>
        <td style="width: 39%; font-weight: 500;">${it.description}</td>
        <td style="width: 8%; text-align: center;">${it.quantity}</td>
        <td class="col-price" style="width: 24%; text-align: right; font-family: monospace; font-size: 11.5px; white-space: nowrap;">${formatCurrency(it.unit_price, curr)}</td>
        <td class="col-price" style="width: 24%; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: 600; white-space: nowrap;">${formatCurrency(it.amount, curr)}</td>
      </tr>
    `).join('');
  }

  const hasLogo = Boolean(s.company_logo && s.company_logo.trim().length > 0 && s.company_logo !== 'null');

  const brandHtml = hasLogo ? `
    <div class="inv-brand-block">
      <div class="inv-brand-top">
        <div class="inv-paper-logo-wrap">
          <img src="${s.company_logo}" alt="Logo Perusahaan" class="inv-paper-logo">
        </div>
        <div class="inv-company-name-group">
          <div class="inv-company-title">${s.company_name || 'PT Mandiri Solusi Pratama'}</div>
          <div class="inv-company-tagline">${s.company_tagline || 'Layanan Profesional & Pengadaan Terpercaya'}</div>
        </div>
      </div>
      <div class="inv-company-meta">
        <div>${s.company_address || ''}</div>
        <div>Telp: ${s.company_phone || '-'} &bull; Email: ${s.company_email || '-'}</div>
      </div>
    </div>
  ` : `
    <div class="inv-brand-block">
      <div class="inv-company-title">${s.company_name || 'PT Mandiri Solusi Pratama'}</div>
      <div class="inv-company-tagline" style="margin-bottom: 6px;">${s.company_tagline || 'Layanan Profesional & Pengadaan Terpercaya'}</div>
      <div class="inv-company-meta">
        <div>${s.company_address || ''}</div>
        <div>Telp: ${s.company_phone || '-'} &bull; Email: ${s.company_email || '-'}</div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <!-- HEADER -->
    <div class="inv-paper-header">
      ${brandHtml}
      <div class="inv-title-box">
        <div class="inv-big-title">FAKTUR</div>
        <div class="inv-number-text">NO: ${inv.invoice_number}</div>
        <div style="margin-top: 6px;">
          ${getStatusBadge(inv.status)}
        </div>
      </div>
    </div>

    <!-- CLIENT & DATES META -->
    <div class="inv-meta-grid">
      <div class="inv-bill-box">
        <div class="inv-box-label">DITUJUKAN KEPADA:</div>
        <div class="inv-client-name">${inv.client_name || 'Klien Umum'}</div>
        <div class="inv-client-detail" style="font-weight: 600; color: #1e1b4b; margin: 2px 0;">${inv.client_company || ''}</div>
        <div class="inv-client-detail">${inv.client_address || '-'}</div>
        <div class="inv-client-detail" style="margin-top: 4px;">Kontak: ${inv.client_phone || '-'} | ${inv.client_email || '-'}</div>
      </div>

      <div class="inv-dates-box">
        <div class="inv-date-item">
          <span>Tanggal Terbit:</span>
          <span>${formatDate(inv.issue_date)}</span>
        </div>
        <div class="inv-date-item">
          <span>Tanggal Jatuh Tempo:</span>
          <span>${formatDate(inv.due_date)}</span>
        </div>
        <div class="inv-date-item">
          <span>Status Pembayaran:</span>
          <span style="text-transform: uppercase;">${inv.status}</span>
        </div>
      </div>
    </div>

    <!-- ITEMS TABLE -->
    <table class="inv-paper-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">No</th>
          <th style="width: 39%;">Deskripsi Barang / Jasa</th>
          <th style="width: 8%; text-align: center;">Qty</th>
          <th class="col-price" style="width: 24%; text-align: right; white-space: nowrap;">Harga Satuan</th>
          <th class="col-price" style="width: 24%; text-align: right; white-space: nowrap;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- TOTALS & BANK INFO -->
    <div class="inv-paper-totals">
      <div class="inv-payment-info-box" style="width: 44%;">
        <h5>INSTRUKSI PEMBAYARAN:</h5>
        <div>Silakan transfer pembayaran ke rekening berikut:</div>
        <div style="margin-top: 6px; font-weight: 600; color: #1e1b4b;">
          ${s.bank_name || 'Bank BCA'}<br>
          No. Rekening: <span style="font-family: monospace; font-size: 13px;">${s.bank_account_number || '-'}</span><br>
          Atas Nama: ${s.bank_account_holder || s.company_name || '-'}
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
          ${s.default_payment_terms || inv.payment_terms || ''}
        </div>
      </div>

      <div class="inv-totals-box" style="width: 53%;">
        <div class="inv-totals-row">
          <span style="white-space: nowrap;">Subtotal:</span>
          <span style="font-family: monospace; font-weight: 600; white-space: nowrap;">${formatCurrency(inv.subtotal, curr)}</span>
        </div>
        <div class="inv-totals-row">
          <span style="white-space: nowrap;">Pajak (PPN ${inv.tax_rate}%):</span>
          <span style="font-family: monospace; white-space: nowrap;">${formatCurrency(inv.tax_amount, curr)}</span>
        </div>
        ${inv.discount_amount > 0 ? `
          <div class="inv-totals-row" style="color: #e11d48;">
            <span style="white-space: nowrap;">Diskon:</span>
            <span style="font-family: monospace; white-space: nowrap;">- ${formatCurrency(inv.discount_amount, curr)}</span>
          </div>
        ` : ''}
        <div class="inv-totals-row grand-total">
          <span style="white-space: nowrap;">TOTAL TAGIHAN:</span>
          <span style="font-family: monospace; color: #4338ca; white-space: nowrap; font-size: 14.5px;">${formatCurrency(inv.total, curr)}</span>
        </div>
      </div>
    </div>

    <!-- NOTES & SIGNATURE -->
    <div class="inv-signatures-row">
      <div class="inv-terms-area">
        ${inv.notes ? `<div style="font-weight: 600; color: #334155; margin-bottom: 2px;">Catatan:</div><div>${inv.notes}</div>` : ''}
      </div>

      <div class="inv-sign-area">
        <div>Hormat Kami,</div>
        <div class="inv-sign-line"></div>
        <div style="font-weight: 700; color: #0f172a;">${s.company_name || 'PT Mandiri Solusi Pratama'}</div>
        <div style="color: #64748b; font-size: 10px;">Finance & Billing Dept.</div>
      </div>
    </div>
  `;
}

// Generate full standalone printable HTML for PDF Export
function generatePrintableHtml() {
  const paperContent = document.getElementById('printableInvoiceContainer').innerHTML;
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Invoice</title>
      <style>
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          margin: 0;
          padding: 12mm 14mm;
          color: #1e293b;
          background: #ffffff;
          font-size: 12.5px;
          line-height: 1.45;
        }
        .inv-paper-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .inv-brand-block {
          max-width: 65%;
        }
        .inv-brand-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        .inv-paper-logo-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .inv-paper-logo {
          max-height: 58px;
          max-width: 150px;
          object-fit: contain;
          display: block;
        }
        .inv-company-name-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .inv-company-title {
          font-size: 20px;
          font-weight: 800;
          color: #1e1b4b;
          text-transform: uppercase;
          line-height: 1.25;
        }
        .inv-company-tagline { font-size: 12px; color: #64748b; margin-top: 2px; margin-bottom: 4px; }
        .inv-company-meta { font-size: 11px; color: #475569; line-height: 1.4; }
        .inv-title-box { text-align: right; }
        .inv-big-title { font-size: 28px; font-weight: 900; color: #4338ca; letter-spacing: 1px; }
        .inv-number-text { font-family: monospace; font-weight: 700; font-size: 15px; }
        .inv-meta-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
        .inv-bill-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
        .inv-dates-box { width: 40%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
        .inv-box-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .inv-client-name { font-size: 15px; font-weight: 700; color: #0f172a; }
        .inv-client-detail { font-size: 11px; color: #475569; }
        .inv-date-item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
        .inv-paper-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
        .inv-paper-table th { background: #4338ca; color: white; padding: 9px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; text-align: left; }
        .inv-paper-table td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
        .inv-paper-table th.col-price, .inv-paper-table td.col-price { white-space: nowrap !important; text-align: right; font-size: 11.5px; }
        .inv-paper-table tbody tr:nth-child(even) { background: #f8fafc; }
        .inv-paper-totals { display: flex; justify-content: space-between; margin-top: 10px; margin-bottom: 24px; gap: 16px; }
        .inv-payment-info-box { width: 44%; background: #f1f5f9; border-left: 3px solid #6366f1; padding: 12px 14px; font-size: 11px; border-radius: 4px; box-sizing: border-box; }
        .inv-payment-info-box h5 { font-size: 12px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; margin-top: 0; }
        .inv-totals-box { width: 53%; box-sizing: border-box; }
        .inv-totals-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; font-size: 12px; color: #475569; }
        .inv-totals-row span:first-child { white-space: nowrap !important; margin-right: 12px; }
        .inv-totals-row span:last-child { white-space: nowrap !important; text-align: right; font-family: monospace; font-size: 12px; }
        .inv-totals-row.grand-total { border-top: 2px solid #4338ca; padding-top: 8px; margin-top: 6px; font-size: 13.5px; font-weight: 800; color: #1e1b4b; }
        .inv-totals-row.grand-total span:first-child { white-space: nowrap !important; letter-spacing: 0.5px; }
        .inv-totals-row.grand-total span:last-child { white-space: nowrap !important; font-size: 14.5px; color: #4338ca; font-weight: 800; }
        .inv-signatures-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; font-size: 11px; }
        .inv-terms-area { width: 55%; color: #64748b; font-size: 10px; }
        .inv-sign-area { width: 35%; text-align: center; }
        .inv-sign-line { border-bottom: 1px solid #94a3b8; height: 50px; margin-bottom: 6px; }
        .status-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .badge-paid { background: #d1fae5; color: #065f46; }
        .badge-unpaid { background: #fef3c7; color: #92400e; }
        .badge-overdue { background: #ffe4e6; color: #9f1239; }
        .badge-cancelled { background: #f1f5f9; color: #475569; }
      </style>
    </head>
    <body>
      ${paperContent}
    </body>
    </html>
  `;
}

async function handleDownloadPdf() {
  if (!state.currentInvoice) return;
  // Ensure the latest settings are applied before generating the PDF
  await loadSettings();
  renderInvoicePaper(state.currentInvoice);
  const html = generatePrintableHtml();
  const res = await window.electronAPI.saveInvoicePdf(html, state.currentInvoice.invoice_number);
  if (res.success) {
    showToast(`PDF berhasil disimpan di: ${res.filePath}`, 'success');
  } else if (!res.canceled) {
    showToast('Gagal membuat file PDF: ' + (res.error || ''), 'error');
  }
}

async function handleDirectPrint() {
  if (!state.currentInvoice) return;
  await loadSettings();
  renderInvoicePaper(state.currentInvoice);
  window.print();
}

// ======================== EXPORT EXCEL ========================

async function handleExportExcel() {
  try {
    showToast('Mempersiapkan data laporan Excel...', 'info');
    const res = await window.electronAPI.exportInvoicesToExcel(state.invoiceFilter);
    if (res.success) {
      showToast(`Data berhasil diexport ke Excel: ${res.filePath}`, 'success');
    } else if (!res.canceled) {
      showToast('Gagal mengexport ke Excel: ' + (res.error || ''), 'error');
    }
  } catch (err) {
    console.error('Export error:', err);
    showToast('Terjadi kesalahan export Excel.', 'error');
  }
}

// ======================== EVENT LISTENERS ========================

function setupEventListeners() {
  // Login Form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('togglePasswordBtn').addEventListener('click', () => {
    const pw = document.getElementById('password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Sidebar Menu Navigation
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const nav = link.dataset.nav;
      switchView(nav);
    });
  });

  // Topbar Actions
  document.getElementById('topbarExcelBtn').addEventListener('click', handleExportExcel);
  document.getElementById('topbarCreateInvoiceBtn').addEventListener('click', () => switchView('create-invoice'));

  // Dashboard shortcuts
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.tagName !== 'A' || !el.closest('.sidebar-menu')) {
        const nav = el.dataset.nav;
        if (nav) switchView(nav);
      }
    });
  });

  // Invoice Filters
  document.getElementById('invoiceSearchInput').addEventListener('input', (e) => {
    state.invoiceFilter.search = e.target.value.trim();
    state.invoicePagination.currentPage = 1;
    loadInvoicesData();
  });

  document.querySelectorAll('#statusFilterTabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#statusFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.invoiceFilter.status = tab.dataset.status;
      state.invoicePagination.currentPage = 1;
      loadInvoicesData();
    });
  });

  // Invoice Pagination Buttons
  document.getElementById('invPrevPageBtn')?.addEventListener('click', () => {
    if (state.invoicePagination.currentPage > 1) {
      goToInvoicePage(state.invoicePagination.currentPage - 1);
    }
  });

  document.getElementById('invNextPageBtn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.invoices.length / state.invoicePagination.pageSize) || 1;
    if (state.invoicePagination.currentPage < totalPages) {
      goToInvoicePage(state.invoicePagination.currentPage + 1);
    }
  });

  // Initialize Date Pickers with Tanggal/Bulan/Tahun (DD/MM/YYYY) format
  initDatePicker('filterStartDate', 'filterStartDate_picker');
  initDatePicker('filterEndDate', 'filterEndDate_picker');
  initDatePicker('invIssueDate', 'invIssueDate_picker');
  initDatePicker('invDueDate', 'invDueDate_picker');

  document.getElementById('applyDateFilterBtn').addEventListener('click', () => {
    const startVal = document.getElementById('filterStartDate').value.trim();
    const endVal = document.getElementById('filterEndDate').value.trim();
    const startIso = startVal ? toISODateString(startVal) : '';
    const endIso = endVal ? toISODateString(endVal) : '';

    if (startVal && !startIso) {
      showToast('Format tanggal "Dari" tidak valid. Gunakan format Tanggal/Bulan/Tahun (DD/MM/YYYY).', 'error');
      return;
    }
    if (endVal && !endIso) {
      showToast('Format tanggal "Sampai" tidak valid. Gunakan format Tanggal/Bulan/Tahun (DD/MM/YYYY).', 'error');
      return;
    }
    if (startIso && endIso && startIso > endIso) {
      showToast('Tanggal "Dari" tidak boleh lebih besar dari tanggal "Sampai".', 'error');
      return;
    }

    state.invoiceFilter.startDate = startIso;
    state.invoiceFilter.endDate = endIso;
    state.invoicePagination.currentPage = 1;
    loadInvoicesData();
  });

  document.getElementById('resetDateFilterBtn').addEventListener('click', () => {
    setDateInputValue('filterStartDate', '');
    setDateInputValue('filterEndDate', '');
    state.invoiceFilter.startDate = '';
    state.invoiceFilter.endDate = '';
    state.invoicePagination.currentPage = 1;
    loadInvoicesData();
  });

  document.getElementById('exportExcelBtn').addEventListener('click', handleExportExcel);

  // Invoice Form: Update invoice number when issue date changes
  document.getElementById('invIssueDate').addEventListener('change', async () => {
    const isNew = !document.getElementById('invFormId').value;
    const issueDateIso = getDateInputValueISO('invIssueDate');
    if (isNew && issueDateIso) {
      try {
        const nextNum = await window.electronAPI.getNextInvoiceNumber(issueDateIso);
        document.getElementById('invNumber').value = nextNum;
      } catch (err) {
        console.error('Failed to update invoice number for selected date:', err);
      }
    }
  });

  document.getElementById('invClientId').addEventListener('change', (e) => {
    updateClientPreview(e.target.value);
  });

  document.getElementById('addItemRowBtn').addEventListener('click', () => {
    addItemRow('', 1, 0);
  });

  document.getElementById('invTaxRate').addEventListener('input', calculateInvoiceTotals);
  document.getElementById('invDiscountType').addEventListener('change', calculateInvoiceTotals);
  document.getElementById('invDiscountValue').addEventListener('input', calculateInvoiceTotals);

  document.getElementById('cancelInvoiceBtn').addEventListener('click', () => {
    switchView('invoices');
  });

  document.getElementById('invoiceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveInvoice(false);
  });

  document.getElementById('saveAndPdfBtn').addEventListener('click', () => {
    handleSaveInvoice(true);
  });

  // Quick Client inside Invoice Form
  document.getElementById('quickAddClientBtn').addEventListener('click', openAddClientModal);

  // Clients View
  document.getElementById('addClientBtn').addEventListener('click', openAddClientModal);
  document.getElementById('clientSearchInput').addEventListener('input', renderClientsTable);
  document.getElementById('closeClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('cancelClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('clientForm').addEventListener('submit', handleSaveClient);

  // Settings View
  document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);

  // Logo Upload & Remove Controls
  const uploadLogoBtn = document.getElementById('uploadLogoBtn');
  const logoFileInput = document.getElementById('logoFileInput');
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  const logoPreviewImg = document.getElementById('logoPreviewImg');
  const logoPlaceholder = document.getElementById('logoPlaceholder');
  const setCompanyLogo = document.getElementById('setCompanyLogo');

  if (uploadLogoBtn && logoFileInput) {
    uploadLogoBtn.addEventListener('click', () => {
      logoFileInput.click();
    });

    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran berkas logo maksimal 2 MB.', 'error');
        logoFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        setCompanyLogo.value = base64Data;
        logoPreviewImg.src = base64Data;
        logoPreviewImg.style.display = 'block';
        logoPlaceholder.style.display = 'none';
        removeLogoBtn.style.display = 'inline-flex';
        showToast('Logo berhasil dimuat. Klik "Simpan Pengaturan" untuk menyimpan.', 'info');
      };
      reader.onerror = () => {
        showToast('Gagal membaca berkas logo.', 'error');
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      setCompanyLogo.value = '';
      logoPreviewImg.src = '';
      logoPreviewImg.style.display = 'none';
      logoPlaceholder.style.display = 'flex';
      removeLogoBtn.style.display = 'none';
      if (logoFileInput) logoFileInput.value = '';
      showToast('Logo dihapus. Klik "Simpan Pengaturan" untuk menyimpan perubahan.', 'info');
    });
  }

  // Backup Database Controls
  document.getElementById('manualBackupBtn').addEventListener('click', handleManualBackup);
  document.getElementById('openDownloadsBtn').addEventListener('click', handleOpenDownloadsFolder);
  
  const openDbBtn = document.getElementById('openDbFolderBtn');
  if (openDbBtn) {
    openDbBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.openDbFolder();
      } catch (err) {
        console.error('Failed to open DB folder:', err);
      }
    });
  }

  // Auto-backup completed event from main process
  window.electronAPI.onAutoBackupCompleted((res) => {
    showToast(`Pencadangan mingguan otomatis selesai: ${res.fileName}`, 'info');
    loadBackupStatus();
  });

  // Preview Modal
  document.getElementById('closePreviewModalBtn').addEventListener('click', closeInvoicePreview);
  document.getElementById('previewPrintBtn').addEventListener('click', handleDirectPrint);
  document.getElementById('previewSavePdfBtn').addEventListener('click', handleDownloadPdf);
}

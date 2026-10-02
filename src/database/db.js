const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let dbInstance = null;
let dbFilePath = null;

/**
 * Helper to execute a query and return array of objects (rows)
 */
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper to execute a query and return first object or null
 */
function queryOne(db, sql, params = []) {
  const rows = queryAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to run an insert/update/delete statement and get last inserted ID
 */
function runExec(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  stmt.step();
  stmt.free();
  
  const lastIdRes = queryOne(db, 'SELECT last_insert_rowid() AS id;');
  return lastIdRes ? lastIdRes.id : 0;
}

/**
 * Save in-memory SQLite database to disk file
 */
function persistDb() {
  if (!dbInstance || !dbFilePath) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

function getDatabasePath() {
  return dbFilePath;
}

/**
 * Initialize SQLite Database using sql.js (WebAssembly)
 */
async function initDatabase(customPath) {
  if (dbInstance) return dbInstance;

  dbFilePath = customPath || path.join(process.cwd(), 'data', 'invoices.sqlite');
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load WASM file
  let wasmBinaryPath = path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
  if (!fs.existsSync(wasmBinaryPath) && process.resourcesPath) {
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    if (fs.existsSync(unpackedPath)) {
      wasmBinaryPath = unpackedPath;
    }
  }
  let wasmBinary;
  if (fs.existsSync(wasmBinaryPath)) {
    wasmBinary = fs.readFileSync(wasmBinaryPath);
  }

  const SQL = await initSqlJs({
    wasmBinary: wasmBinary
  });

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database file, creating a fresh one.', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize Schema
  setupSchema(dbInstance);
  seedInitialData(dbInstance);
  persistDb();

  return dbInstance;
}

function setupSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'unpaid',
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      payment_terms TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedInitialData(db) {
  // Check Admin User (username: superadmin, password: Blessings777!)
  const admin = queryOne(db, 'SELECT * FROM users WHERE username = ?', ['superadmin']);
  if (!admin) {
    runExec(db, `
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `, ['superadmin', 'Blessings777!', 'Super Administrator', 'superadmin']);
  }

  // Default Settings
  const defaultSettings = {
    company_name: 'PT Mandiri Solusi Pratama',
    company_tagline: 'Layanan Profesional & Pengadaan Terpercaya',
    company_address: 'Jl. Sudirman Boulevard No. 128, Senayan, Jakarta Selatan 12190',
    company_phone: '+62 812-8888-9999',
    company_email: 'billing@mandiripratama.co.id',
    bank_name: 'BCA (Bank Central Asia)',
    bank_account_number: '8830-9988-7711',
    bank_account_holder: 'PT MANDIRI SOLUSI PRATAMA',
    currency_symbol: 'Rp',
    default_tax_rate: '11',
    default_payment_terms: 'Pembayaran maksimal 14 hari kalender setelah faktur diterima. Mohon cantumkan nomor invoice saat konfirmasi transfer.',
    invoice_prefix: 'INV'
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = queryOne(db, 'SELECT key FROM settings WHERE key = ?', [key]);
    if (!existing) {
      runExec(db, 'INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  // Seed sample client & sample invoice if database is brand new
  const clientCount = queryOne(db, 'SELECT COUNT(*) as count FROM clients').count;
  if (clientCount === 0) {
    const clientId1 = runExec(db, `
      INSERT INTO clients (name, company, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, ['Bapak Hendra Wijaya', 'PT Cahaya Abadi Sukses', 'hendra@cahayaabadi.com', '0813-1122-3344', 'Gedung Wisma Niaga Lt. 5, Jl. Gatot Subroto, Jakarta']);

    const clientId2 = runExec(db, `
      INSERT INTO clients (name, company, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, ['Ibu Siti Rahmawati', 'CV Mitra Kreasi Nusantara', 'siti@mitrakreasi.id', '0857-7788-9900', 'Ruko Emerald Blok B-12, Gading Serpong, Tangerang']);

    // Seed 2 sample invoices
    const inv1Id = runExec(db, `
      INSERT INTO invoices (
        invoice_number, client_id, issue_date, due_date, status,
        subtotal, tax_rate, tax_amount, discount_type, discount_value, discount_amount, total,
        notes, payment_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'INV-01102026-0001', clientId1, '2026-10-01', '2026-10-15', 'paid',
      12500000, 11, 1375000, 'fixed', 0, 0, 13875000,
      'Terima kasih atas kerja sama yang baik.', defaultSettings.default_payment_terms
    ]);

    runExec(db, `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [inv1Id, 'Pengembangan Sistem Dashboard Manajemen', 1, 10000000, 10000000, 1]);
    runExec(db, `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [inv1Id, 'Instalasi & Konfigurasi Server Database SQLite', 1, 2500000, 2500000, 2]);

    const inv2Id = runExec(db, `
      INSERT INTO invoices (
        invoice_number, client_id, issue_date, due_date, status,
        subtotal, tax_rate, tax_amount, discount_type, discount_value, discount_amount, total,
        notes, payment_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'INV-28092026-0001', clientId2, '2026-09-28', '2026-10-12', 'unpaid',
      7500000, 11, 825000, 'percentage', 5, 375000, 7950000,
      'Faktur untuk layanan pemeliharaan berkala.', defaultSettings.default_payment_terms
    ]);

    runExec(db, `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [inv2Id, 'Pemeliharaan Aplikasi & Support Bulanan', 3, 2500000, 7500000, 1]);
  }
}

// ======================== API Methods ========================

function authenticateUser(username, password) {
  const user = queryOne(dbInstance, 'SELECT id, username, name, role FROM users WHERE username = ? AND password = ?', [username, password]);
  return user;
}

function getSettings() {
  const rows = queryAll(dbInstance, 'SELECT key, value FROM settings');
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

function updateSettings(newSettings) {
  for (const [key, value] of Object.entries(newSettings)) {
    const existing = queryOne(dbInstance, 'SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      runExec(dbInstance, 'UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
    } else {
      runExec(dbInstance, 'INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
  }
  persistDb();
  return getSettings();
}

function getClients() {
  return queryAll(dbInstance, `
    SELECT c.*, 
      COUNT(i.id) AS total_invoices,
      COALESCE(SUM(i.total), 0) AS total_spent
    FROM clients c
    LEFT JOIN invoices i ON c.id = i.client_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
}

function getClientById(id) {
  return queryOne(dbInstance, 'SELECT * FROM clients WHERE id = ?', [id]);
}

function saveClient(data) {
  if (data.id) {
    runExec(dbInstance, `
      UPDATE clients
      SET name = ?, company = ?, email = ?, phone = ?, address = ?
      WHERE id = ?
    `, [data.name, data.company || '', data.email || '', data.phone || '', data.address || '', data.id]);
    persistDb();
    return getClientById(data.id);
  } else {
    const newId = runExec(dbInstance, `
      INSERT INTO clients (name, company, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, [data.name, data.company || '', data.email || '', data.phone || '', data.address || '']);
    persistDb();
    return getClientById(newId);
  }
}

function deleteClient(id) {
  runExec(dbInstance, 'DELETE FROM clients WHERE id = ?', [id]);
  persistDb();
  return true;
}

function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return {
      day: dmyMatch[1].padStart(2, '0'),
      month: dmyMatch[2].padStart(2, '0'),
      year: dmyMatch[3]
    };
  }
  // Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    return {
      day: ymdMatch[3].padStart(2, '0'),
      month: ymdMatch[2].padStart(2, '0'),
      year: ymdMatch[1]
    };
  }
  return null;
}

function normalizeToISODate(dateStr) {
  if (!dateStr) return dateStr;
  const parts = parseDateParts(dateStr);
  if (parts) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  return dateStr;
}

function generateNextInvoiceNumber(targetDate) {
  const settings = getSettings();
  const prefix = (settings.invoice_prefix || 'INV').trim() || 'INV';
  
  // Parse target date or use current system date
  let day, month, year;
  const parsed = parseDateParts(targetDate);
  if (parsed) {
    day = parsed.day;
    month = parsed.month;
    year = parsed.year;
  } else {
    const now = new Date();
    day = String(now.getDate()).padStart(2, '0');
    month = String(now.getMonth() + 1).padStart(2, '0');
    year = String(now.getFullYear());
  }

  // Format: PREFIX-TGLBLNTHN-UNIQUE (TGL & BLN: 2 digits, THN: 4 digits)
  const dateStr = `${day}${month}${year}`;
  const searchPattern = `${prefix}-${dateStr}-%`;

  // Find highest sequence for this prefix and date
  const rows = queryAll(dbInstance, `
    SELECT invoice_number FROM invoices
    WHERE invoice_number LIKE ?
  `, [searchPattern]);

  let maxSequence = 0;
  for (const row of rows) {
    if (!row.invoice_number) continue;
    const parts = row.invoice_number.split('-');
    if (parts.length >= 3) {
      const seqStr = parts[parts.length - 1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSequence = maxSequence + 1;
  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}-${dateStr}-${paddedSequence}`;
}

function getInvoices(filter = {}) {
  let sql = `
    SELECT 
      i.*,
      c.name AS client_name,
      c.company AS client_company,
      c.email AS client_email,
      c.phone AS client_phone
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filter.status && filter.status !== 'all') {
    sql += ` AND i.status = ?`;
    params.push(filter.status);
  }

  if (filter.clientId) {
    sql += ` AND i.client_id = ?`;
    params.push(filter.clientId);
  }

  if (filter.search) {
    sql += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
    const searchParam = `%${filter.search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (filter.startDate) {
    sql += ` AND i.issue_date >= ?`;
    params.push(normalizeToISODate(filter.startDate));
  }

  if (filter.endDate) {
    sql += ` AND i.issue_date <= ?`;
    params.push(normalizeToISODate(filter.endDate));
  }

  sql += ` ORDER BY i.id DESC`;

  return queryAll(dbInstance, sql, params);
}

function getInvoiceById(id) {
  const invoice = queryOne(dbInstance, `
    SELECT 
      i.*,
      c.name AS client_name,
      c.company AS client_company,
      c.email AS client_email,
      c.phone AS client_phone,
      c.address AS client_address
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [id]);

  if (!invoice) return null;

  invoice.items = queryAll(dbInstance, `
    SELECT * FROM invoice_items
    WHERE invoice_id = ?
    ORDER BY sort_order ASC, id ASC
  `, [id]);

  return invoice;
}

function saveInvoice(data) {
  const isUpdate = Boolean(data.id);
  const now = new Date().toISOString();
  const issueDate = normalizeToISODate(data.issue_date);
  const dueDate = normalizeToISODate(data.due_date);

  let invoiceId = data.id;

  if (isUpdate) {
    runExec(dbInstance, `
      UPDATE invoices SET
        invoice_number = ?,
        client_id = ?,
        issue_date = ?,
        due_date = ?,
        status = ?,
        subtotal = ?,
        tax_rate = ?,
        tax_amount = ?,
        discount_type = ?,
        discount_value = ?,
        discount_amount = ?,
        total = ?,
        notes = ?,
        payment_terms = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      data.invoice_number,
      data.client_id || null,
      issueDate,
      dueDate,
      data.status || 'unpaid',
      data.subtotal || 0,
      data.tax_rate || 0,
      data.tax_amount || 0,
      data.discount_type || 'percentage',
      data.discount_value || 0,
      data.discount_amount || 0,
      data.total || 0,
      data.notes || '',
      data.payment_terms || '',
      now,
      invoiceId
    ]);

    // Delete existing items to replace with updated list
    runExec(dbInstance, 'DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
  } else {
    invoiceId = runExec(dbInstance, `
      INSERT INTO invoices (
        invoice_number, client_id, issue_date, due_date, status,
        subtotal, tax_rate, tax_amount, discount_type, discount_value, discount_amount, total,
        notes, payment_terms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.invoice_number,
      data.client_id || null,
      issueDate,
      dueDate,
      data.status || 'unpaid',
      data.subtotal || 0,
      data.tax_rate || 0,
      data.tax_amount || 0,
      data.discount_type || 'percentage',
      data.discount_value || 0,
      data.discount_amount || 0,
      data.total || 0,
      data.notes || '',
      data.payment_terms || '',
      now,
      now
    ]);
  }

  // Insert items
  if (Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      runExec(dbInstance, `
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        item.description || '',
        parseFloat(item.quantity) || 1,
        parseFloat(item.unit_price) || 0,
        parseFloat(item.amount) || 0,
        index + 1
      ]);
    });
  }

  persistDb();
  return getInvoiceById(invoiceId);
}

function updateInvoiceStatus(id, newStatus) {
  const now = new Date().toISOString();
  runExec(dbInstance, 'UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);
  persistDb();
  return getInvoiceById(id);
}

function deleteInvoice(id) {
  runExec(dbInstance, 'DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
  runExec(dbInstance, 'DELETE FROM invoices WHERE id = ?', [id]);
  persistDb();
  return true;
}

function getDashboardStats() {
  const totalInvoices = queryOne(dbInstance, 'SELECT COUNT(*) as count FROM invoices').count;
  const totalRevenue = queryOne(dbInstance, "SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid'").total;
  const pendingAmount = queryOne(dbInstance, "SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'unpaid'").total;
  const overdueCount = queryOne(dbInstance, `
    SELECT COUNT(*) as count FROM invoices 
    WHERE status = 'unpaid' AND due_date < date('now')
  `).count;
  const paidCount = queryOne(dbInstance, "SELECT COUNT(*) as count FROM invoices WHERE status = 'paid'").count;
  const unpaidCount = queryOne(dbInstance, "SELECT COUNT(*) as count FROM invoices WHERE status = 'unpaid'").count;
  const totalClients = queryOne(dbInstance, 'SELECT COUNT(*) as count FROM clients').count;

  const recentInvoices = queryAll(dbInstance, `
    SELECT 
      i.id, i.invoice_number, i.issue_date, i.due_date, i.status, i.total,
      c.name as client_name, c.company as client_company
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY i.id DESC
    LIMIT 6
  `);

  return {
    totalInvoices,
    totalRevenue,
    pendingAmount,
    overdueCount,
    paidCount,
    unpaidCount,
    totalClients,
    recentInvoices
  };
}

module.exports = {
  initDatabase,
  getDatabasePath,
  authenticateUser,
  getSettings,
  updateSettings,
  getClients,
  getClientById,
  saveClient,
  deleteClient,
  generateNextInvoiceNumber,
  getInvoices,
  getInvoiceById,
  saveInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getDashboardStats,
  persistDb
};

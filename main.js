const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const db = require('./src/database/db');

let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a', // Dark theme slate background
    frame: true,
    title: 'Invoice Master - Desktop Edition by QuraisEnterprise',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getAppDatabasePath() {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'data', 'invoices.sqlite');
  }
  return path.join(__dirname, 'data', 'invoices.sqlite');
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize Database
  try {
    const targetDbPath = getAppDatabasePath();
    const targetDir = path.dirname(targetDbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // In packaged mode, if the database does not exist in userData,
    // seed it from bundled resources if available
    if (app.isPackaged && !fs.existsSync(targetDbPath)) {
      const bundledDbPath = path.join(process.resourcesPath, 'data', 'invoices.sqlite');
      if (fs.existsSync(bundledDbPath)) {
        try {
          fs.copyFileSync(bundledDbPath, targetDbPath);
          console.log('Seeded database from bundled resources to:', targetDbPath);
        } catch (copyErr) {
          console.warn('Could not copy bundled database:', copyErr);
        }
      }
    }

    await db.initDatabase(targetDbPath);
    console.log('Database initialized successfully at:', targetDbPath);
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  setupIpcHandlers();
  await createWindow();

  // Run weekly backup check after window is ready
  setTimeout(() => {
    checkWeeklyAutoBackup();
  }, 2500);

  // Check periodically (every 4 hours while app is open)
  setInterval(() => {
    checkWeeklyAutoBackup();
  }, 4 * 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.persistDb();
    app.quit();
  }
});

// Login Rate Limiting Tracker
let loginRateLimit = {
  failedAttempts: 0,
  lockoutUntil: 0
};

// Setup IPC handlers
function setupIpcHandlers() {
  // Auth with Rate Limiting (3 failed attempts -> 5 minutes lockout)
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    const now = Date.now();

    // Check if lockout is still active
    if (loginRateLimit.lockoutUntil > now) {
      const remainingSec = Math.ceil((loginRateLimit.lockoutUntil - now) / 1000);
      return {
        success: false,
        locked: true,
        remainingSec,
        message: 'Percobaan login salah sudah mencapai 3x. Akun dikunci sementara selama 5 menit demi keamanan.'
      };
    }

    // Reset expired lockout
    if (loginRateLimit.lockoutUntil && loginRateLimit.lockoutUntil <= now) {
      loginRateLimit.failedAttempts = 0;
      loginRateLimit.lockoutUntil = 0;
    }

    const user = db.authenticateUser(username, password);
    if (!user) {
      loginRateLimit.failedAttempts += 1;
      if (loginRateLimit.failedAttempts >= 3) {
        loginRateLimit.lockoutUntil = now + (5 * 60 * 1000); // 5 minutes
        return {
          success: false,
          locked: true,
          remainingSec: 300,
          failedAttempts: 3,
          message: 'Percobaan login salah sudah mencapai 3x. Akun dikunci selama 5 menit.'
        };
      }

      const remaining = 3 - loginRateLimit.failedAttempts;
      return {
        success: false,
        locked: false,
        failedAttempts: loginRateLimit.failedAttempts,
        remainingAttempts: remaining,
        message: `Username atau password salah! Percobaan gagal: ${loginRateLimit.failedAttempts}/3. Sisa kesempatan: ${remaining}x.`
      };
    }

    // Login successful: reset rate limiter
    loginRateLimit.failedAttempts = 0;
    loginRateLimit.lockoutUntil = 0;
    return { success: true, user };
  });

  ipcMain.handle('auth:checkRateLimit', async () => {
    const now = Date.now();
    if (loginRateLimit.lockoutUntil > now) {
      return {
        locked: true,
        remainingSec: Math.ceil((loginRateLimit.lockoutUntil - now) / 1000)
      };
    }
    return { locked: false, remainingSec: 0 };
  });

  // Dashboard
  ipcMain.handle('dashboard:getStats', async () => {
    return db.getDashboardStats();
  });

  // Clients
  ipcMain.handle('clients:getAll', async () => {
    return db.getClients();
  });

  ipcMain.handle('clients:getById', async (event, id) => {
    return db.getClientById(id);
  });

  ipcMain.handle('clients:save', async (event, clientData) => {
    return db.saveClient(clientData);
  });

  ipcMain.handle('clients:delete', async (event, id) => {
    return db.deleteClient(id);
  });

  // Invoices
  ipcMain.handle('invoices:getAll', async (event, filter) => {
    return db.getInvoices(filter);
  });

  ipcMain.handle('invoices:getById', async (event, id) => {
    return db.getInvoiceById(id);
  });

  ipcMain.handle('invoices:getNextNumber', async (event, issueDate) => {
    return db.generateNextInvoiceNumber(issueDate);
  });

  ipcMain.handle('invoices:save', async (event, invoiceData) => {
    return db.saveInvoice(invoiceData);
  });

  ipcMain.handle('invoices:updateStatus', async (event, { id, status }) => {
    return db.updateInvoiceStatus(id, status);
  });

  ipcMain.handle('invoices:delete', async (event, id) => {
    return db.deleteInvoice(id);
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return db.getSettings();
  });

  ipcMain.handle('settings:save', async (event, settings) => {
    return db.updateSettings(settings);
  });

  // Export Excel
  ipcMain.handle('export:excel', async (event, filter) => {
    try {
      const invoices = db.getInvoices(filter || {});
      const settings = db.getSettings();
      const currency = settings.currency_symbol || 'Rp';

      // Helper: Format date as DD/MM/YYYY (TGL lalu BLN lalu TAHUN)
      const formatToDMY = (dateStr) => {
        if (!dateStr) return '-';
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          const parts = dateStr.slice(0, 10).split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // Format data for sheet
      const excelRows = invoices.map((inv, idx) => ({
        'No': idx + 1,
        'Nomor Faktur': inv.invoice_number,
        'Pelanggan': inv.client_name || '-',
        'Perusahaan': inv.client_company || '-',
        'Tanggal Terbit': formatToDMY(inv.issue_date),
        'Jatuh Tempo': formatToDMY(inv.due_date),
        'Status': inv.status.toUpperCase(),
        'Subtotal': inv.subtotal,
        'Pajak (%)': inv.tax_rate + '%',
        'Jumlah Pajak': inv.tax_amount,
        'Diskon': inv.discount_amount,
        'Total Akhir': inv.total
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);

      // Set column widths
      ws['!cols'] = [
        { wch: 6 },  // No
        { wch: 18 }, // Nomor Faktur
        { wch: 25 }, // Pelanggan
        { wch: 28 }, // Perusahaan
        { wch: 14 }, // Tgl Terbit
        { wch: 14 }, // Jatuh Tempo
        { wch: 12 }, // Status
        { wch: 16 }, // Subtotal
        { wch: 10 }, // Pajak %
        { wch: 16 }, // Pajak Rp
        { wch: 14 }, // Diskon
        { wch: 18 }  // Total Akhir
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Daftar Invoice');

      // Prompt Save Dialog
      const dateStr = new Date().toISOString().slice(0, 10);
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Data Invoice ke Excel',
        defaultPath: `Laporan_Invoice_${dateStr}.xlsx`,
        filters: [{ name: 'Excel Workbook (*.xlsx)', extensions: ['xlsx'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      XLSX.writeFile(wb, filePath);
      
      // Open directory or file
      shell.showItemInFolder(filePath);

      return { success: true, filePath };
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      return { success: false, error: err.message };
    }
  });

  // Export PDF
  ipcMain.handle('export:pdf', async (event, { invoiceHtml, invoiceNumber }) => {
    try {
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Simpan Invoice sebagai PDF',
        defaultPath: `${invoiceNumber || 'Invoice'}.pdf`,
        filters: [{ name: 'Dokumen PDF (*.pdf)', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      // Create a background print window
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Load HTML directly
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);

      // Give a brief moment for layout/fonts
      await new Promise(r => setTimeout(r, 400));

      const pdfData = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          marginType: 'custom',
          top: 0.3,
          bottom: 0.3,
          left: 0.3,
          right: 0.3
        }
      });

      printWindow.close();

      fs.writeFileSync(filePath, pdfData);

      // Open file in default PDF viewer
      shell.openPath(filePath);

      return { success: true, filePath };
    } catch (err) {
      console.error('Error generating PDF:', err);
      return { success: false, error: err.message };
    }
  });

  // Direct print (native print dialog)
  ipcMain.handle('export:printDirect', async () => {
    if (mainWindow) {
      mainWindow.webContents.print({ silent: false, printBackground: true });
      return { success: true };
    }
    return { success: false };
  });

  // Backup IPC Handlers
  ipcMain.handle('backup:manual', async () => {
    return performDatabaseBackup(true);
  });

  ipcMain.handle('backup:openFolder', async () => {
    const downloadsFolder = app.getPath('downloads');
    shell.openPath(downloadsFolder);
    return { success: true, folder: downloadsFolder };
  });

  ipcMain.handle('backup:getStatus', async () => {
    const settings = db.getSettings();
    return {
      downloadsFolder: app.getPath('downloads'),
      lastBackupDate: settings.last_backup_date || null,
      lastBackupFile: settings.last_backup_file || null
    };
  });

  ipcMain.handle('system:openDbFolder', async () => {
    const targetPath = (db.getDatabasePath && db.getDatabasePath()) || getAppDatabasePath();
    const dataDir = path.dirname(targetPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    shell.openPath(dataDir);
    return { success: true };
  });

  // Window Controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
}

/**
 * Performs copy of SQLite database to Windows Downloads folder
 */
function performDatabaseBackup(isManual = false) {
  try {
    const downloadsFolder = app.getPath('downloads');
    const dbPath = (db.getDatabasePath && db.getDatabasePath()) || getAppDatabasePath();
    if (!fs.existsSync(dbPath)) {
      return { success: false, message: 'Database file not found.' };
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Format TGL-BLN-THN (DD-MM-YYYY)
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const backupFileName = `Backup_InvoiceMaster_${dateStr}.sqlite`;
    const targetPath = path.join(downloadsFolder, backupFileName);

    // Save in-memory SQLite to disk first
    db.persistDb();

    // Copy to Downloads folder
    fs.copyFileSync(dbPath, targetPath);

    // Save metadata in database settings
    db.updateSettings({
      last_backup_date: now.toISOString(),
      last_backup_file: backupFileName
    });

    console.log(`[BACKUP SUCCESS] Saved to ${targetPath}`);

    return {
      success: true,
      filePath: targetPath,
      fileName: backupFileName,
      timestamp: now.toISOString(),
      isManual
    };
  } catch (err) {
    console.error('Backup failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks if 7 days have passed since last backup and executes auto-backup
 */
function checkWeeklyAutoBackup() {
  try {
    const settings = db.getSettings();
    const lastBackupStr = settings.last_backup_date;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    let shouldBackup = false;
    if (!lastBackupStr) {
      shouldBackup = true;
    } else {
      const lastBackupTime = new Date(lastBackupStr).getTime();
      if (isNaN(lastBackupTime) || (Date.now() - lastBackupTime >= ONE_WEEK_MS)) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      console.log('Performing weekly automated database backup to Windows Downloads folder...');
      const res = performDatabaseBackup(false);
      if (res.success && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:auto-completed', res);
      }
    }
  } catch (err) {
    console.error('Error during auto-backup check:', err);
  }
}


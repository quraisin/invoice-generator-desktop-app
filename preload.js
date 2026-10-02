const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  checkRateLimit: () => ipcRenderer.invoke('auth:checkRateLimit'),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  
  // Clients
  getClients: () => ipcRenderer.invoke('clients:getAll'),
  getClientById: (id) => ipcRenderer.invoke('clients:getById', id),
  saveClient: (clientData) => ipcRenderer.invoke('clients:save', clientData),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),
  
  // Invoices
  getInvoices: (filter) => ipcRenderer.invoke('invoices:getAll', filter),
  getInvoiceById: (id) => ipcRenderer.invoke('invoices:getById', id),
  getNextInvoiceNumber: (issueDate) => ipcRenderer.invoke('invoices:getNextNumber', issueDate),
  saveInvoice: (invoiceData) => ipcRenderer.invoke('invoices:save', invoiceData),
  updateInvoiceStatus: (id, status) => ipcRenderer.invoke('invoices:updateStatus', { id, status }),
  deleteInvoice: (id) => ipcRenderer.invoke('invoices:delete', id),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  
  // Export & Print
  exportInvoicesToExcel: (filter) => ipcRenderer.invoke('export:excel', filter),
  saveInvoicePdf: (invoiceHtml, invoiceNumber) => ipcRenderer.invoke('export:pdf', { invoiceHtml, invoiceNumber }),
  printInvoice: () => ipcRenderer.invoke('export:printDirect'),
  
  // Backup & Storage
  backupNow: () => ipcRenderer.invoke('backup:manual'),
  openDownloadsFolder: () => ipcRenderer.invoke('backup:openFolder'),
  openDbFolder: () => ipcRenderer.invoke('system:openDbFolder'),
  getBackupStatus: () => ipcRenderer.invoke('backup:getStatus'),
  onAutoBackupCompleted: (callback) => ipcRenderer.on('backup:auto-completed', (event, data) => callback(data)),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
});

# Invoice Master - Desktop Application (Windows)

Aplikasi desktop native Windows untuk manajemen dan pembuatan faktur penjualan (Invoice Generator) dengan database lokal **SQLite**, export **PDF** siap cetak, dan export laporan ke **Microsoft Excel (.xlsx)**.

---

## 🔑 Kredensial Login

Gunakan akun administrator berikut untuk masuk ke dashboard:
* **Username**: `superadmin`
* **Password**: `Blessings777!`

---

## 📦 Instalasi & Pembuatan Berkas Installer (.exe)

> ℹ️ **Catatan Repositori Git**:
> Folder `/node_modules` dan `/dist` **tidak diikutsertakan ke dalam repositori GitHub** (dikecualikan via `.gitignore`) sesuai standar repositori modern agar ukuran repository tetap ringan dan bersih.

Jika Anda baru saja melakukan `git clone https://github.com/quraisin/invoice-generator-desktop-app.git`, Anda dapat membuat kembali folder `/node_modules`, folder `/dist`, dan file installer `Invoice_Master_Setup_v1.0.1.exe` hanya dengan **1 PERINTAH**:

### ⚡ 1 Perintah untuk Generate Ulang Semua (/node_modules, /dist, & Installer EXE):

Jalankan perintah ini di terminal / PowerShell:
```bash
npm run build:all
```
*(Atau cukup klik dua kali berkas skrip [**`Build_Installer.bat`**](file:///d:/Project%20Mandiri/Desktop%20App/invoice-generator-v2/Build_Installer.bat))*

**Proses yang berjalan secara otomatis:**
1. Mengunduh dan memasang semua dependensi ke folder `/node_modules`.
2. Mengompilasi aplikasi, aset, dan database lokal.
3. Menghasilkan folder `/dist` beserta file installer:
   * **Installer Resmi**: `dist/Invoice_Master_Setup_v1.0.1.exe` (~92.2 MB)
   * **Unpacked App**: `dist/win-unpacked/Invoice Master.exe`

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menggunakan Installer Hasil Build
1. Jalankan perintah `npm run build:all` (atau klik dua kali `Build_Installer.bat`).
2. Masuk ke folder `dist/` dan jalankan `Invoice_Master_Setup_v1.0.1.exe` untuk menginstal aplikasi dengan ikon resmi di Desktop & Start Menu.

### Opsi 2: Mode Pengembangan (Live Dev)
Bagi Anda yang ingin langsung menjalankan aplikasi tanpa mengompilasi installer:
```bash
npm install
npm start
```
*(Atau cukup klik dua kali [**`Jalankan_Aplikasi.bat`**](file:///d:/Project%20Mandiri/Desktop%20App/invoice-generator-v2/Jalankan_Aplikasi.bat))*

---

## ✨ Fitur-Fitur Utama

1. **Dashboard Statistik & Ringkasan Penjualan**:
   - Total Pendapatan Faktur yang sudah Lunas.
   - Total Tagihan yang Belum Lunas (menunggu pembayaran).
   - Indikator Faktur Jatuh Tempo (Overdue).
   - Tabel 6 faktur transaksi terbaru dengan tombol aksi cepat.

2. **Manajemen Faktur & Kalkulasi Otomatis**:
   - Penomoran faktur otomatis berurutan (misal: `INV-2026-0001`, `INV-2026-0002`).
   - Penambahan baris barang/jasa tanpa batas dengan kalkulasi subtotal instan.
   - Perhitungan Pajak PPN (persentase) & Diskon (persentase atau nominal rupiah).
   - Kolom catatan pelanggan & instruksi pembayaran / rekening bank.

3. **Status Pembayaran & Pelacakan**:
   - Status: **Lunas** (Hijau), **Belum Lunas** (Kuning), **Jatuh Tempo** (Merah), **Dibatalkan** (Abu-abu).
   - Ubah status pembayaran dalam 1 klik langsung dari tabel daftar invoice.
   - Filter invoice berdasarkan status, rentang tanggal, atau kata kunci pencarian.

4. **Export Laporan ke Excel (.xlsx)**:
   - Export seluruh daftar invoice atau data yang sedang difilter ke format Excel.
   - Lengkap dengan nomor invoice, nama pelanggan, tanggal terbit, jatuh tempo, status, subtotal, pajak, diskon, dan total tagihan.

5. **Pratinjau & Cetak PDF Profesional**:
   - Desain faktur standar kertas A4 yang elegan, rapi, dan siap kirim ke klien.
   - Dilengkapi kop perusahaan, data tagihan klien, tabel rincian, instruksi transfer bank, dan tanda tangan resmi.
   - Tombol **"Download PDF"** untuk menyimpan dokumen PDF secara offline.
   - Tombol **"Cetak Langsung"** untuk print ke printer fisik.

6. **Database Pelanggan / Klien**:
   - Simpan nama kontak, nama perusahaan, email, nomor HP/telepon, dan alamat kantor.
   - Riwayat transaksi per pelanggan & total omzet yang sudah dibelanjakan.
   - Kemudahan memilih pelanggan saat pembuatan invoice atau menambah pelanggan baru secara langsung.

7. **Pengaturan Profil Bisnis**:
   - Kustomisasi nama perusahaan, slogan, alamat, kontak email/telepon.
   - Rekening bank tujuan pembayaran (Bank, No Rekening, Atas Nama).
   - Format standar faktur (Awalan No. Faktur, Simbol Mata Uang, PPN Default).

8. **Pencadangan Database Otomatis (Auto-Backup Mingguan)**:
   - Aplikasi otomatis menduplikasi seluruh database SQLite ke folder **Downloads Windows** Anda setiap **7 hari sekali**.
   - Nama file rapi berstempel waktu: `Backup_InvoiceMaster_YYYY-MM-DD_HH-mm.sqlite`.
   - Tersedia tombol **"Cadangkan Sekarang"** di halaman Pengaturan untuk backup manual sewaktu-waktu.
   - Tombol **"Buka Folder Downloads"** untuk langsung membuka Windows Explorer ke folder cadangan Anda.

---

## 🗄️ Database & Penyimpanan Lokal (SQLite)

* Seluruh data tersimpan secara lokal dan offline di file utama:
  ```
  data/invoices.sqlite
  ```
* **Bebas Ketergantungan**: Tidak membutuhkan koneksi internet, tidak membutuhkan server database terpisah (seperti MySQL/XAMPP), dan tidak membebani memori laptop/PC.
* **Auto-Backup**: Database secara rutin dicadangkan ke folder **Downloads** komputer Anda (`C:\Users\<NamaUser>\Downloads`) seminggu sekali tanpa perlu diingat-ingat secara manual.


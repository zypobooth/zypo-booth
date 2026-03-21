# PANDUAN PENGGUNAAN & TEKNIS EKOSISTEM ZYPO
**Project:** Sparkle Booth & Zypo Links  
**Versi:** 1.0.0  
**Tanggal:** 20 Maret 2026

---

## 📋 DAFTAR ISI
1. Ringkasan Ekosistem
2. Panduan Aplikasi Utama: Sparkle Booth
3. Panduan Panel Dashboard: Zypo Admin
4. Panduan Linktree: Zypo Links
5. Panduan Teknis & Framework
6. Manajemen Data & Kredensial (ID & Password)
7. Panduan Pemeliharaan (Maintenance)

---

## 1. RINGKASAN EKOSISTEM
Ekosistem ZYPO adalah solusi digital terpadu yang terdiri dari tiga komponen utama:
*   **Sparkle Booth**: Web-based Virtual Photobooth untuk pengunjung/user.
*   **Zypo Admin**: Dashboard pusat untuk kendali seluruh data dan pengaturan.
*   **Zypo Links**: Halaman profil (Linktree style) untuk branding dan media sosial.

---

## 2. PANDUAN APLIKASI UTAMA: SPARKLE BOOTH
Aplikasi photobooth online yang dapat diakses langsung melalui browser tanpa instalasi.

### ✨ Fitur Utama:
*   **Capture Mode**: Mendukung berbagai format rasio foto.
*   **Frame Selection**: Koleksi bingkai foto yang dapat dikelola secara dinamis.
*   **Real-time Filters**: Efek visual (Grayscale, Sepia, Vintage, dll).
*   **Instant Result**: Download hasil foto atau akses via QR Code/Gallery.

### 📸 Cara Penggunaan (Tutorial):
1.  Buka browser dan akses URL utama (contoh: `booth.zypocoffee.com`).
2.  Klik tombol **"Start Session"**.
3.  Pilih **Frame** yang diinginkan.
4.  Izinkan akses kamera dan ambil foto.
5.  Pilih filter yang sesuai.
6.  Tunggu proses rendering selesai, lalu simpan hasil foto.

---

## 3. PANDUAN PANEL DASHBOARD: ZYPO ADMIN
Pusat kendali untuk mengelola seluruh asset dan konfigurasi sistem.

### 🛠️ Fitur Utama:
*   **Link Manager**: Mengelola nama, bio, dan daftar link pada Zypo Links.
*   **Frame Manager**: Menambah, mengedit, atau menghapus bingkai photobooth.
*   **Gallery Monitoring**: Memantau database hasil foto user.
*   **Settings**: Mengatur profil global dan integrasi API.

### 🖼️ Cara Mengelola Frame:
1.  Login ke Dashboard Admin.
2.  Masuk ke menu **"Frame Manager"**.
3.  Upload file PNG transparan untuk frame baru.
4.  Atur status ke **"Active"** agar muncul di aplikasi utama.

---

## 4. PANDUAN LINKTREE: ZYPO LINKS
Halaman landing page sederhana untuk mengumpulkan semua tautan penting ZYPO.

### 🔗 Fitur Utama:
*   **Dynamic Social Links**: Update tautan Instagram, TikTok, dll secara real-time.
*   **Profile Identity**: Foto profil dan deskripsi yang dapat diubah kapan saja via Admin.

---

## 5. PANDUAN TEKNIS & FRAMEWORK
Teknologi yang digunakan untuk memastikan performa tinggi dan keamanan:

*   **Frontend**: React.js 19 (Modern UI Library)
*   **Build Tool**: Vite 7 (Sistem build ultra-cepat)
*   **Styling**: Tailwind CSS 4 (Desain modern & responsif)
*   **Animation**: Framer Motion (Transisi interaktif)
*   **Database**: Supabase (Real-time Database & PostgreSQL)
*   **Authentication**: Clerk (Keamanan login tingkat tinggi)
*   **Storage**: Cloudflare R2 (Penyimpanan file foto & asset)
*   **Hosting**: Cloudflare Pages (Deployment stabil)

---

## 6. MANAJEMEN DATA & KREDENSIAL
Berikut adalah daftar akun dan kunci akses (API Keys) yang diperlukan sistem.

### 🔑 Daftar Layanan & Kredensial:

1.  **Google (Macro/Script)**
    *   Fungsi: Otomatisasi data & analytics.
    *   Kredensial/ID: `VITE_GOOGLE_SCRIPT_URL`

2.  **Cloudflare (Hosting & R2)**
    *   Fungsi: Penyimpanan foto dan hosting domain.
    *   Kredensial/ID: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`

3.  **Supabase (Database)**
    *   Fungsi: Dashboard database dan penyimpanan data transaksi.
    *   Kredensial/ID: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

4.  **GitHub**
    *   Fungsi: Penyimpanan kode program dan sinkronisasi asset.
    *   Kredensial/ID: `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_TOKEN`

5.  **Clerk (Auth)**
    *   Fungsi: Manajemen akun login admin.
    *   Kredensial/ID: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

6.  **Sentry**
    *   Fungsi: Pemantauan error sistem secara real-time.
    *   Kredensial/ID: `VITE_SENTRY_DSN`

---

## 7. PANDUAN PEMELIHARAAN (MAINTENANCE)
*   **Update Berkala**: Tidak perlu menyentuh kode untuk mengubah konten, cukup gunakan Dashboard Admin.
*   **Monitoring Storage**: Cek kuota Cloudflare R2 secara berkala di Dashboard Cloudflare.
*   **Keamanan**: Jangan pernah membagikan file `.env` ke pihak ketiga.

---

**Dibuat oleh Tim Developer ZYPO**  
© 2026 ZYPO Ecosystem. All rights reserved.

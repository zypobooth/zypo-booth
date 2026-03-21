# 📸 ZYPO Booth - Documentation

## Project Overview
**ZYPO Booth** adalah platform photobooth online berbasis web yang memungkinkan pengguna untuk mengambil foto secara instan dengan berbagai pilihan frame aesthetic langsung dari browser.

---

## 🛠️ Tech Stack & Architecture
Sistem ini dibangun dengan arsitektur modern untuk memastikan kecepatan dan skalabilitas:

*   **Frontend**: React 19 dengan Vite 7.
*   **Styling**: Tailwind CSS 4 & Framer Motion untuk animasi.
*   **Backend**: Supabase (PostgreSQL & Real-time).
*   **Auth**: Clerk (Authentication provider).
*   **Storage**: Cloudflare R2 (Object Storage).
*   **Infrastructure**: Cloudflare Pages (Hosting).

---

## 📁 Project Structure
```text
zypobooth/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Application views (Home, Booth, Gallery, etc.)
│   ├── services/        # API and Service layers
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Helper functions (Image processing)
├── public/              # Static assets and frames
├── docs/                # Project documentation
└── package.json         # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   NPM or Yarn

### Installation
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Setup environment variables in `.env` file (see list below).
4. Run `npm run dev` to start the development server.

---

## 🔑 Environment Variables
Berikut adalah variabel yang dibutuhkan agar aplikasi berjalan dengan sempurna:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_key
R2_ACCESS_KEY_ID=your_cloudflare_r2_id
R2_SECRET_ACCESS_KEY=your_cloudflare_r2_secret
```

---

## 🤝 Contribution
Untuk kontribusi atau laporan bug, silakan buat Pull Request atau buka Issue di repository GitHub.

---

© 2026 ZYPO Booth. Developed by Nanda Addi Wijaya.

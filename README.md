# 2FA Vault 🔐

A modern, self-hosted, secure 2-Factor Authentication (TOTP) manager. Built with a sleek dashboard interface that rivals commercial password managers, but entirely open source and entirely under your control.

## 🌟 Features

- **Modern Dashboard UI:** A beautiful, responsive interface built with React, Tailwind CSS, and shadcn/ui. Features dark/light mode and elegant SVG animations for countdown timers.
- **Secure by Default:** 
  - **AES-256-GCM Encryption:** Your Base32 secret keys are never stored in plain text. They are encrypted at rest in the database.
  - **Master Key Protection:** The app is protected by a single Master Username and Password (JWT-based authentication).
- **Recycle Bin (Soft Delete):** Accidentally deleted an account? It's moved to a Recycle Bin and kept safe for 10 days before automatic permanent deletion.
- **Data Portability:** Easily export all your 2FA accounts to a JSON backup file, and import them on another device or instance.
- **Robust Parsing:** Built-in sanitization handles all kinds of Base32 secrets (even those with spaces or dashes).
- **Single Page App (SPA):** Lightning-fast navigation with zero page reloads.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, Lucide Icons, `otpauth` for client-side TOTP generation.
- **Backend:** Node.js, Express, Knex.js (supports SQLite via `better-sqlite3` and PostgreSQL via `pg`).
- **Security:** Helmet.js, bcrypt, JSON Web Tokens (JWT), Node's native `crypto` module.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/2fa-vault.git
   cd 2fa-vault
   ```

2. **Install Dependencies**
   Install all dependencies for both the root (backend) and the client (frontend):
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure Database (Hybrid Support)**
   By default, the app uses a local SQLite database (`data/database.sqlite`). 
   If you want to use PostgreSQL (e.g. for deployment on Heroku or other platforms), set the following environment variables:
   ```bash
   DB_CLIENT=pg
   DATABASE_URL=postgres://user:pass@host:5432/dbname
   ```

4. **Development**
   To run both the backend server and Vite client dev server concurrently with auto-reload:
   ```bash
   npm run dev
   ```
   * Frontend: `http://localhost:5173`
   * Backend: `http://localhost:3000`

5. **Production Build & Run**
   To build the frontend client and run the server:
   ```bash
   cd client && npm run build && cd ..
   npm start
   ```
   Open your browser and navigate to `http://localhost:3000`. 
   On your first visit, you will be prompted to create your **Master Key** (username and password). Make sure you remember it, as it's required to access your 2FA codes!

## ⚠️ Security Warning

- **Never commit `database.sqlite` to public repositories.** This file contains your encrypted 2FA secrets. The `.gitignore` is pre-configured to ignore this file.
- **Keep your exported backups safe.** The JSON export feature downloads your secrets in **plain text**. Keep these files in an encrypted vault or offline storage.
- It is highly recommended to run this app behind a reverse proxy (like Nginx or Caddy) with **HTTPS enabled** if you plan to access it over the network or internet.

## 📄 License

MIT License. See `LICENSE` for details.

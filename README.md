# AI Creator Marketplace

A modern SaaS platform and AI Matching engine connecting brands with verified AI content creators. Built for B.Tech Hackathon demonstration with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Zod**, and **Google Gemini API**.

---

## 💻 Prerequisites (On Any System)

Before running the application on Windows, macOS, or Linux, ensure you have:

1. **Node.js** (v18.18 or higher; recommended: **Node.js v20.x or v22.x LTS**)
   * Check if installed:
     ```bash
     node -v
     npm -v
     ```
   * If not installed, download from [nodejs.org](https://nodejs.org/).
2. **Git** (optional, if cloning from GitHub)
3. Any modern web browser (Google Chrome, Microsoft Edge, Brave, Safari, Firefox).

---

## 🚀 Step-by-Step: Running on Another System

### Method 1: If Transferring via ZIP File / Pendrive

1. **Important Before Zipping on Current PC**:
   * Do **NOT** copy `node_modules` or `.next` folders (they are large and platform-dependent).
   * Only copy the source code folders: `app/`, `components/`, `lib/`, `public/`, `scripts/`, `db/`, `package.json`, `tsconfig.json`, etc.

2. **On the Target PC**:
   * Extract the ZIP file into a folder (e.g. `Desktop/AI-Creator-Marketplace`).
   * Open **Terminal** (macOS/Linux) or **PowerShell / Command Prompt** (Windows) inside that folder.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **(Optional) Configure Environment Variables**:
   * Duplicate `.env.example` and rename it to `.env.local`:
     ```bash
     # Windows PowerShell:
     Copy-Item .env.example .env.local

     # macOS / Linux:
     cp .env.example .env.local
     ```
   * *Note: The app is designed with a resilient fallback AI engine, so it runs completely out-of-the-box even without a Gemini API key!*

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```

6. **Open in Browser**:
   * Visit: [http://localhost:3000](http://localhost:3000)

---

### Method 2: If Using GitHub / Git

```bash
# 1. Clone the repository
git clone <your-github-repo-url>
cd <repo-folder-name>

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser:
# http://localhost:3000
```

---

## 📱 Application Routes to Explore

| Page | URL | Description |
| :--- | :--- | :--- |
| **Role Selection** | `http://localhost:3000` | Landing page to choose Brand vs Influencer |
| **Brand Login** | `http://localhost:3000/login/brand` | Brand login portal (Click Login to enter dashboard) |
| **Creator Login** | `http://localhost:3000/login/influencer` | Influencer login portal (Click Login to enter portal) |
| **Brand Dashboard** | `http://localhost:3000/brand/dashboard` | AI Matching with 1-Click presets & creator cards |
| **Creator Dashboard** | `http://localhost:3000/creator/dashboard` | Creator earnings, verification test scores & invitations |
| **Creator Profile** | `http://localhost:3000/creators/ananya-rao` | Detailed profile with portfolio gallery & invite modal |

---

## 🧪 Running the AI Layer Test Scripts

To verify the AI matching and scoring formulas without opening the browser:

```bash
# Test the 6-category dynamic AI matching algorithm
npx tsx scripts/test-matching.ts

# Test the complete AI Layer (Portfolio, Brief extraction, pgvector)
npx tsx scripts/test-ai-layer.ts
```

---

## ⚠️ Common Troubleshooting on Other Machines

1. **Port 3000 Already in Use**:
   * Next.js will automatically try port `3001` or you can specify a custom port:
     ```bash
     npm run dev -- -p 3005
     ```
2. **Permission Errors on Windows (ExecutionPolicy)**:
   * In PowerShell, run:
     ```powershell
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
     ```
3. **Node Version Mismatch**:
   * If you see build errors, verify your Node version with `node -v`. Use Node 18 or 20+.

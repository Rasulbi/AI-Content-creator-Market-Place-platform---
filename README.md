# AI Creator Marketplace

A modern SaaS platform and AI Matching engine connecting brands with verified AI content creators. Built for B.Tech Hackathon demonstration with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Zod**, and a secure, configurable multi-provider AI architecture supporting **OpenRouter API** and **xAI Grok API**.

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

## 🧠 AI Provider Architecture (OpenRouter & xAI Grok)

The AI layer is architected with a decoupled provider pattern (`lib/ai/`):
- **OpenRouter API** (`https://openrouter.ai/api/v1`) — **Primary Provider**. Gives access to leading models including Claude 3.5 Sonnet, GPT-4o Mini, Llama 3.3 70B, and more through a unified API.
- **xAI Grok API** (`https://api.x.ai/v1`) — **Alternative Provider**. Supports direct integration with xAI's Grok models (e.g. `grok-2-latest`, `grok-beta`).
- **Resilient Fallback Engine** — Built-in deterministic 6-category heuristic matching and structured parsing engine that ensures 100% platform uptime and full offline demonstration capability even when external AI API keys are not configured or rate limits are reached.

---

## 🔑 How to Obtain API Keys

### 1. OpenRouter API Key (Primary)
1. Sign up or log in at [https://openrouter.ai/](https://openrouter.ai/).
2. Navigate to [https://openrouter.ai/keys](https://openrouter.ai/keys).
3. Click **Create Key**, give it a name (e.g., `ai-creator-marketplace`), and copy the generated key (starts with `sk-or-v1-...`).
4. Ensure your account has credits if testing paid models, or use free/cost-effective models like `openai/gpt-4o-mini` or `meta-llama/llama-3.3-70b-instruct:free`.

### 2. xAI Grok API Key (Alternative)
1. Sign up or log in to the xAI Console at [https://console.x.ai/](https://console.x.ai/).
2. Navigate to the **API Keys** section.
3. Click **Create API Key**, give it a label, and copy the secret key.
4. Verify your billing balance on the xAI Console. Supported models include `grok-2-latest` and `grok-beta`.

### 3. OpenAI API Key (Content Studio)
1. Sign up or log in at [https://platform.openai.com/](https://platform.openai.com/).
2. Navigate to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
3. Click **Create new secret key**, give it a name (e.g. `creator-content-studio`), and copy the key (starts with `sk-proj-...`).
4. Add `OPENAI_API_KEY` to your `.env.local` to enable live viral hooks, caption, and script generation.


---

## ⚙️ Environment Configuration

Duplicate `.env.example` to `.env.local`:

```bash
# Windows PowerShell:
Copy-Item .env.example .env.local

# macOS / Linux:
cp .env.example .env.local
```

### Configuring AI Variables in `.env.local`

```env
# =============================================================================
# AI Provider Configuration (Server-Side Only)
# =============================================================================

# Select active provider: "openrouter" (default/primary) or "groq" / "grok" (alternative)
AI_PROVIDER=openrouter

# Specify the model ID (never hardcoded in application code)
# Examples for OpenRouter:
#   - openai/gpt-4o-mini
#   - anthropic/claude-3.5-sonnet
#   - meta-llama/llama-3.3-70b-instruct
# Examples for Groq Cloud:
#   - llama-3.3-70b-versatile
#   - mixtral-8x7b-32768
# Examples for xAI Grok:
#   - grok-2-latest
#   - grok-beta
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_MODEL=openai/gpt-4o-mini

# OpenRouter API Key (Required when AI_PROVIDER=openrouter)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here

# Groq Cloud API Key (Required when AI_PROVIDER=groq)
GROQ_API_KEY=gsk_your-groq-key-here
GROQ_MODEL=llama-3.3-70b-versatile

# xAI Grok API Key (Required when AI_PROVIDER=grok with xAI endpoint)
XAI_API_KEY=xai-your-grok-key-here

# Direct OpenAI API Key (For AI Content Studio: hooks, captions, scripts)
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
```

> **Security Note:** All AI API keys are accessed **strictly on the server** via Next.js Server Components and API route handlers (`/api/ai-advisor`, `/api/ai-content`). Keys are never prefixed with `NEXT_PUBLIC_` and are never exposed to browser bundles.


---

## 🚀 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing the AI Layer & Matching Engine

Two standalone test suites are included to verify provider routing, missing-key safety, scoring formulas, and semantic algorithms:

### Test 1: Complete AI Layer Test Suite
```bash
npx tsx scripts/test-ai-layer.ts
```
**What this validates:**
- `analyzePortfolio()`: Structured competencies extraction with `requiresHumanReview: true`.
- `analyzeCampaign()`: Natural language brief parser extracting platforms, deliverables, and budgets.
- `findMatches()`: Creator ranking using the 40/25/15/10/10 weighted multi-attribute model.
- `explainMatch()`: Evidence-based specific strengths and gap analysis.
- `pgvector`: 768-dimensional normalized semantic vector calculation and cosine similarity.
- **Provider Factory**: Seamless dynamic switching between `openrouter` and `grok`.
- **Missing-Key Validation**: Ensures unconfigured providers safely reject unauthorized requests without crashes.
- **Zero-Downtime Fallback**: Guarantees graceful fallback to heuristic engine during outages.
- **Robust JSON Extractor**: Handles markdown fences and embedded JSON safely.

### Test 2: 6-Category Matching Formula Test
```bash
npx tsx scripts/test-matching.ts
```
**What this validates:**
- Ranking across 6 campaign presets: Beauty & Skincare, Technology, Fashion, Fitness & Wellness, Food, and Travel & Lifestyle.
- Weighted score breakdown: Skill Match (40%), Verification (25%), Portfolio (15%), Experience (10%), Client Rating (10%).

### Test 3: AI Assistant & Strategy Engine Test Suite
Run the automated end-to-end test suite verifying free-form requests, scripts, brand briefs, safety guardrails, and rate limits:
```bash
npx tsx scripts/test-assistant-engine.ts
```

### Test 4: Rate Limiting Verification
Verify server-side request frequency limits:
```bash
npx tsx scripts/test-rate-limit.ts
```

---

## 📱 Application Routes to Explore

| Page | URL | Description |
| :--- | :--- | :--- |
| **Role Selection** | `http://localhost:3000` | Landing page to choose Brand vs Influencer |
| **Brand Login** | `http://localhost:3000/login/brand` | Brand login portal (Click Login to enter dashboard) |
| **Creator Login** | `http://localhost:3000/login/influencer` | Influencer login portal (Click Login to enter portal) |
| **Brand Dashboard** | `http://localhost:3000/brand/dashboard` | AI Matching with 1-Click presets & creator cards |
| **Creator Dashboard** | `http://localhost:3000/creator/dashboard` | Creator skill passport, verification test scores & invitations |
| **AI Assistant Workspace** | `http://localhost:3000/assistant` | Full-page production AI creative & marketing workspace |
| **Creator Profile** | `http://localhost:3000/creators/ananya-rao` | Detailed profile with portfolio gallery & invite modal |

---

## 💡 Billing, Rate Limits & Model Compatibility

- **OpenRouter**: Requires maintaining account balance for premium models. Free models (e.g. `meta-llama/llama-3.3-70b-instruct:free`) are subject to provider rate limits (typically 20 requests/minute).
- **xAI Grok**: Requires active xAI credits. Check usage and rate limits in the xAI Console.
- **Zero-Downtime Resilience**: If API calls fail due to rate limits (HTTP 429), balance exhaustion (HTTP 402), or network timeout (30s), the marketplace automatically engages the deterministic heuristic engine, ensuring uninterrupted hackathon demonstrations.

---

## ⚠️ Common Troubleshooting

1. **Port 3000 Already in Use**:
   ```bash
   npm run dev -- -p 3005
   ```
2. **Permission Errors on Windows (ExecutionPolicy)**:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
3. **Missing API Key Warning**:
   If you see `[AI-LAYER] [WARN]` logs regarding unconfigured keys, the application is using the built-in deterministic heuristic engine. Add your `OPENROUTER_API_KEY` or `XAI_API_KEY` to `.env.local` to enable live LLM generation.

   #LIVE LINK : https://ai-content-creator-market-place-platform-awgd.onrender.com/

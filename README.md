# WattWise — Electricity Consumption AI Agent

> Powered by Groq API · Model: `openai/gpt-oss-safeguard-20b`

---

## Quick Start

### Option A — Node.js Backend (Full App)

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Set your Groq API key
#    Copy .env.example to .env and fill in your key
copy .env.example .env
# Edit .env and replace "your_groq_api_key_here" with your actual key

# 3. Start the server
npm start

# 4. Open browser
# → http://localhost:3000
```

---

### Option B — Standalone HTML (No backend required)

Open `standalone.html` directly in your browser.

Your Groq API key will be prompted on first use (saved to localStorage).

---

## Features

| Tab | Description |
|-----|-------------|
| **AI Chat** | Conversational AI agent for electricity advice |
| **Calculator** | Appliance cost calculator with live CO₂ tracking |
| **Saving Tips** | AI-generated electricity saving tips |
| **Stats** | Global benchmarks & household breakdowns |

---

## Project Structure

```
project/
├── server.js          ← Express backend + Groq API routes
├── package.json
├── .env.example       ← Copy to .env and add your API key
├── standalone.html    ← Single-file version (no Node required)
└── public/
    ├── index.html     ← Main UI
    ├── style.css      ← Dark-theme styles
    └── app.js         ← Frontend logic
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send message, get AI reply |
| `GET`  | `/api/tips` | Get 5 AI-generated saving tips |
| `POST` | `/api/calculate` | Calculate appliance costs |
| `DELETE` | `/api/session/:id` | Clear conversation history |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Your Groq API key (required) |
| `MODEL` | `openai/gpt-oss-safeguard-20b` | Model to use |
| `PORT` | `3000` | Server port |

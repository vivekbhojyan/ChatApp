# ◈ Chatter — Real-time Chat App

A production-ready real-time chat application built with **Node.js + Express + Socket.IO + Supabase**.  
No accounts needed — just open the link and start talking.

---

## ✨ Features

- 🔴 **Real-time messaging** via Socket.IO WebSockets
- 💾 **Persistent messages** stored in Supabase (survives server restarts)
- 👤 **Random username** auto-assigned (customizable inline)
- ✍️ **Typing indicators** broadcast to all users
- 🧑‍🤝‍🧑 **Live online count** shown in header + sidebar
- 📜 **Message history** loaded when you join (last 50 messages)
- 📱 **Fully responsive** — works on mobile and desktop
- 🌑 **Dark mode** by default — sleek glassmorphism UI

---

## 📁 Project Structure

```
chat-app/
├── server/
│   └── index.js          ← Express + Socket.IO backend
├── public/
│   ├── index.html        ← Main HTML page
│   ├── css/
│   │   └── style.css     ← All styles
│   └── js/
│       └── chat.js       ← Socket.IO client logic
├── .env.example          ← Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## 🗄️ Step 1 — Set Up Supabase (Free Database)

1. Go to **https://supabase.com** and create a free account
2. Click **"New Project"** → give it a name → set a database password → choose a region close to you
3. Wait ~1 minute for the project to spin up
4. Go to **SQL Editor** (left sidebar) and run this SQL:

```sql
-- Create the messages table
CREATE TABLE messages (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast recent-message queries
CREATE INDEX idx_messages_timestamp ON messages (timestamp DESC);

-- Enable Row Level Security (RLS) but allow public read/insert
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON messages FOR SELECT USING (true);

CREATE POLICY "Allow public insert"
  ON messages FOR INSERT WITH CHECK (true);
```

5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (long JWT string)

---

## ⚙️ Step 2 — Local Setup

### Prerequisites
- Node.js v16+ (download from https://nodejs.org)
- A Supabase project (Step 1)

### Install & Run

```bash
# 1. Clone or download the project
cd chat-app

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env

# 4. Fill in your Supabase credentials in .env:
#    SUPABASE_URL=https://your-project-id.supabase.co
#    SUPABASE_ANON_KEY=your-anon-key-here
#    PORT=3000

# 5. Start the server
npm start

# For development with auto-restart:
npm run dev
```

6. Open **http://localhost:3000** in your browser 🎉

---

## 🚀 Step 3 — Deploy to Render (Free Hosting)

Render gives you a free web service that auto-deploys from GitHub.

### Deploy Steps

1. Push your project to **GitHub** (make sure `.env` is in `.gitignore`)

2. Go to **https://render.com** → Sign up / Log in

3. Click **"New +"** → **"Web Service"**

4. Connect your GitHub repo

5. Configure the service:
   | Field | Value |
   |-------|-------|
   | **Name** | `chatter-app` (or anything) |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server/index.js` |
   | **Instance Type** | `Free` |

6. Click **"Environment"** tab → Add these variables:
   ```
   SUPABASE_URL      = https://your-project-id.supabase.co
   SUPABASE_ANON_KEY = your-anon-key-here
   NODE_ENV          = production
   ```

7. Click **"Create Web Service"** — Render will build and deploy automatically

8. Your app will be live at: `https://your-app-name.onrender.com` ✅

> **Note:** Free Render services "spin down" after 15 minutes of inactivity and take ~30s to wake up. This is normal for the free tier.

---

## 🚀 Alternative: Deploy to Railway

Railway is another great free option.

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize in your project folder
railway init

# 4. Add environment variables
railway variables set SUPABASE_URL=https://xxxx.supabase.co
railway variables set SUPABASE_ANON_KEY=your-key-here
railway variables set NODE_ENV=production

# 5. Deploy
railway up
```

Your app URL will be shown in the Railway dashboard.

---

## 🧪 Testing Locally with Multiple Users

Open **multiple browser tabs** (or different browsers) to test real-time features:
- Messages appear instantly in all tabs
- Typing indicators show in other tabs
- Online count updates when tabs open/close

---

## 📋 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public API key | ✅ Yes |
| `PORT` | Server port (default: 3000) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |

---

## 🔧 Customization

### Change max message history
In `server/index.js`, find `fetchRecentMessages(50)` and change `50` to any number.

### Change username word lists
In `server/index.js`, edit the `adjectives` and `nouns` arrays.

### Add multiple rooms
Extend the Socket.IO logic to use `socket.join(room)` and `io.to(room).emit(...)`.

### Add message reactions, file uploads, or search
These are natural next steps — the architecture is designed for easy extension.

---

## 🛟 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Messages not saving** | Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` |
| **RLS policy error** | Make sure you ran the SQL from Step 1 including the `CREATE POLICY` commands |
| **Can't connect on Render** | Check the "Logs" tab in Render dashboard for startup errors |
| **WebSocket error in browser** | Socket.IO falls back to polling automatically — this is fine |
| **Port already in use** | Change `PORT=3001` in your `.env` file |

---

## 📄 License

MIT — Free to use, modify, and deploy.

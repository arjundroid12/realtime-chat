# Realtime Chat

> A real-time chat application with multiple rooms, nicknames, typing indicators, and an online user list — built with **Node.js, Express, and Socket.io**.

![CI](https://github.com/arjundroid12/realtime-chat/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

## ✨ Features

- **Multiple chat rooms** — join any room by name; share the name with friends to chat together
- **Nicknames** — no account needed; just enter a name and start chatting
- **Real-time messaging** — instant message delivery via WebSockets (Socket.io)
- **Typing indicators** — see when others are typing in real time
- **Online user list** — see who's currently in the room
- **System messages** — automatic "user joined / left" notifications
- **Connection status** — visual indicator of socket connection state
- **Auto-reconnect** — reconnects automatically if the connection drops
- **Dark / light theme** — auto-detects system preference, remembers your choice
- **Responsive design** — works on desktop and mobile

## 📸 Screenshots

**Join screen** — pick a nickname and room name:

![Join Screen](./docs/screenshot-join.png)

**Chat room** — real-time messages, online users, typing indicators:

![Chat Room](./docs/screenshot-chat.png)

## 🚀 Live Demo

This app requires a **Node.js backend** (Socket.io WebSockets), so it can't run on GitHub Pages or Surge.sh (which are static-only). Deploy it free to any Node host below.

### ⚡ One-Click Deploy to Render (recommended, free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/arjundroid12/realtime-chat)

**Steps (~2 minutes):**
1. Click the button above
2. Sign in to Render with your GitHub account (1 click — no credit card needed)
3. Click **"Create Web Service"** (defaults are pre-filled from `render.yaml`)
4. Wait ~90 seconds for build & deploy
5. Your live URL will be `https://realtime-chat-xxxx.onrender.com` (Render shows it at the top-left of your service dashboard)

**Notes:**
- Render free tier **sleeps after 15 min of inactivity** — the first request after sleep takes ~30 sec to wake up. Subsequent requests are fast.
- The app deploys to Render's **Singapore region** (closest to India, low latency).
- Health check endpoint `/health` is configured so Render knows when the app is ready.

### 🛠️ Manual Deploy to Other Hosts

| Host | Build Command | Start Command | Free Tier |
|------|---------------|---------------|-----------|
| **Railway** | `npm install` | `npm start` | Free trial then $5/mo |
| **Fly.io** | `npm install` | `npm start` | Free (needs credit card) |
| **Heroku** | `npm install` | `npm start` | Free tier discontinued |
| **DigitalOcean App Platform** | `npm install` | `npm start` | 3 free static apps |

For any of these, just connect your GitHub repo and use the commands above.
DEMO LIVE : https://realtime-chat-vy6o.onrender.com/

## 📦 Run Locally

Requirements: **Node.js 18+**

```bash
git clone https://github.com/arjundroid12/realtime-chat.git
cd realtime-chat
npm install
npm start
# Visit http://localhost:3000
```

For development with auto-reload on file changes:

```bash
npm run dev
```

## 🛠️ Tech Stack

| Layer    | Tech                 |
|----------|----------------------|
| Runtime  | Node.js 18+          |
| Server   | Express 4            |
| Realtime | Socket.io 4          |
| Frontend | Vanilla HTML/CSS/JS  |
| Fonts    | Inter, JetBrains Mono |

## 📡 API & Events

### HTTP endpoints

| Method | Path     | Description                          |
|--------|----------|--------------------------------------|
| `GET`  | `/`      | Serves the chat frontend             |
| `GET`  | `/health`| Health check JSON (uptime, users, rooms) |

### Socket.io events

**Client → Server:**

| Event           | Payload                       | Description              |
|-----------------|-------------------------------|--------------------------|
| `room:join`     | `{ roomId, nick }`            | Join a room with a nick  |
| `message:send`  | `{ text }`                    | Send a message           |
| `typing:start`  | —                             | Notify typing started    |
| `typing:stop`   | —                             | Notify typing stopped    |

**Server → Client:**

| Event            | Payload                                             | Description              |
|------------------|-----------------------------------------------------|--------------------------|
| `message:new`    | `{ id, userId, nick, text, ts, system }`            | New message              |
| `user:joined`    | `{ id, nick, ts }`                                  | User joined the room     |
| `user:left`      | `{ id, nick, ts }`                                  | User left the room       |
| `room:users`     | `{ users: [{ id, nick }] }`                         | Updated user list        |
| `typing:update`  | `{ id, nick, typing }`                              | Typing state change      |

## 🧪 CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) on every push and PR:

- Installs dependencies
- Runs `node --check` syntax validation on `src/server.js`
- Runs `npm test` (smoke test that imports the server module)
- Caches `~/.npm` for faster runs

## 📁 Project Structure

```
realtime-chat/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/                    # README screenshots
│   ├── screenshot-join.png
│   └── screenshot-chat.png
├── public/                  # Static frontend served by Express
│   ├── app.js               # Client-side Socket.io logic
│   ├── index.html           # Chat UI shell
│   └── styles.css           # Theme, layout, components
├── src/
│   └── server.js            # Express + Socket.io server
├── package.json
├── render.yaml              # One-click Render deploy config
├── LICENSE
├── README.md
└── .gitignore
```

## 🔒 Security Notes

- All messages are sanitized on both client (HTML escape) and server (length cap, type check)
- Maximum message length: 1000 characters (server-enforced)
- Maximum nickname length: 30 characters
- Maximum room name length: 50 characters
- Nicknames and room names are sanitized (non-alphanumeric chars replaced with `-`)
- No persistent storage — messages exist only in memory for the duration of the connection
- No authentication — anyone with the room name can join. Don't share sensitive info.

## 🗺️ Roadmap

Ideas for future enhancements:

- [ ] Persistent message history (Redis or SQLite)
- [ ] User authentication (GitHub OAuth)
- [ ] Private direct messages
- [ ] File & image sharing
- [ ] Emoji picker
- [ ] Message reactions
- [ ] Multi-room sidebar (subscribe to several rooms at once)

## 📄 License

[MIT](./LICENSE) © Arjun Vashishtha

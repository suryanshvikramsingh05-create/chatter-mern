# Chatter

A WhatsApp-like real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) plus Socket.io, JWT auth, and Multer file uploads.

## How to run it

### Prerequisites
- Node.js and npm
- A running local MongoDB server (`mongodb://127.0.0.1:27017` by default)

### Setup
```bash
cd chatter
npm run install:all   # installs root, server, and client dependencies
```

Copy the env templates and adjust if needed (defaults work for local MongoDB):
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Set a real `JWT_SECRET` in `server/.env` before doing anything beyond local testing.

### Development
Runs the API (port 5000, auto-reloading via nodemon) and the Vite dev server (port 5173) together:
```bash
npm run dev
```
Open `http://localhost:5173`.

### Production
Builds the client and serves it from the same Express server as the API (single process, single port):
```bash
npm start
```
Open `http://localhost:5000`.

### Tests
```bash
npm test
```
Runs the backend's Jest/Supertest suite against a separate `chatter_test` database (never touches your dev data). 23 tests covering auth, chats, groups, messaging, pagination, and read receipts.

## Folder structure

```
chatter/
├── package.json            # root convenience scripts (dev/build/start/test)
├── server/                 # Express API
│   ├── app.js               # Express app: middleware + routes (no listen/DB connect — used by tests too)
│   ├── index.js              # entry point: connects DB, starts Socket.io, listens
│   ├── config/
│   │   ├── db.js             # Mongoose connection + sanitizeFilter hardening
│   │   ├── generateToken.js  # JWT signing
│   │   └── socket.js         # Socket.io setup: rooms, typing, presence
│   ├── models/               # User, Chat, Message (Mongoose schemas)
│   ├── controllers/          # auth, user, chat, message business logic
│   ├── routes/                # URL → controller wiring
│   ├── middleware/            # JWT auth guard, upload (Multer), rate limiting, error handling
│   ├── uploads/               # user-uploaded avatars (gitignored, kept via .gitkeep)
│   └── tests/                 # Jest + Supertest suite
└── client/                  # React app (Vite)
    └── src/
        ├── api/axios.js        # axios instance, auto-attaches JWT
        ├── context/AuthContext.jsx
        ├── components/         # ChatList, MessageWindow, UserSearch, GroupChatModal, ProtectedRoute
        ├── pages/               # LoginPage, RegisterPage, ChatPage
        └── utils/getAvatarUrl.js
```

## Features implemented

- **Auth**: register/login, bcrypt password hashing, JWT-based sessions, protected routes
- **1:1 chats**: search users, start or resume a conversation
- **Group chats**: create, rename, add/remove members (admin-only actions enforced server-side)
- **Real-time messaging** via Socket.io: instant delivery, typing indicators
- **Read receipts**: single/double checkmark based on whether the other participant has seen a message
- **Online presence**: live online/offline status and "last seen" timestamps
- **Message pagination**: loads the most recent page of a conversation, with a "load older messages" control instead of fetching entire history at once
- **Avatar upload** via Multer: image-type validation, 5MB limit, served as static files
- **Security hardening**: Helmet HTTP headers, rate limiting on auth routes, Mongoose `sanitizeFilter` + explicit `mongoose.trusted()` markings against NoSQL injection, regex-escaping on user search (ReDoS/injection prevention), centralized error handling that never leaks internals (stack traces/DB schema details) to the client
- **Production serving**: single-process deployment — the Express server serves the built React app and the API from one origin

## Known limitations

- **No message editing/deletion** — messages are permanent once sent.
- **No file/image messages** — Multer is wired up for avatars only, not in-chat media.
- **Read receipts are binary, not per-user in groups** — a group message shows "seen" once *any* other member has read it, not a per-member breakdown (WhatsApp shows who specifically has seen it).
- **Presence is in-memory** — online-user tracking lives in a single Node process's memory (a `Map`), so it will not work correctly if the server is horizontally scaled to multiple instances without adding a shared store (e.g., Redis) for presence state.
- **No password reset / email verification flow.**
- **No automated frontend tests** — only the backend has a Jest/Supertest suite; the React UI was verified manually (curl + a scripted Socket.io client) and via production build checks, not with a browser automation tool (none was available in this environment).
- **Group admin cannot leave/transfer ownership** — there's no "leave group" or "make someone else admin" action, only add/remove by the existing admin.
- **CORS/Socket.io origin is single-origin** — configured via one `CLIENT_URL` env var; deploying client and API on multiple different origins beyond that requires updating this.

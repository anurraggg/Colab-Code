# 🚀 Colab Code - Real-Time Collaborative Code Editor

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Live-success.svg)
![Tech](https://img.shields.io/badge/tech-React%20%7C%20Node.js%20%7C%20Yjs-purple.svg)

**Colab Code** is a powerful, real-time collaborative code editor designed for pair programming, interviews, and team coding sessions. It features instant code synchronization, multi-language execution, and a sleek, customizable interface.

**[🌐 Live Demo](https://colab-code-hazel.vercel.app)**

---

## ✨ Features

### 🤝 Real-Time Collaboration
-   **Instant Sync:** Powered by **Yjs** and **WebSockets**, code changes are reflected instantly across all connected users.
-   **Presence:** See who is in the room and where their cursor is in real-time.
-   **Room Management:** Create unique rooms or join existing ones with a simple code.

### ⚡ Code Execution
-   **Multi-Language Support:** Run code in **JavaScript, TypeScript, Python, Java, C++, Go, and Rust**.
-   **Secure Sandbox:** Code execution is sandboxed via the **Piston API**.
-   **Shared Output:** Terminal output is synchronized for all users in the room.

### 🎨 Modern UI/UX
-   **Themes:** Choose from **Cyberpunk** (Neon), **Midnight** (Professional), or **Light** (Clean) themes.
-   **Glassmorphism:** A modern, translucent design aesthetic.
-   **Responsive:** Works seamlessly on different screen sizes.

### 🔐 Authentication & Security
-   **OAuth:** Secure login via **Google** and **GitHub** (Passport.js).
-   **Persistence:** User sessions and room history are saved securely.

---

## 🛠️ Tech Stack

### Frontend
-   **React** (Vite) - fast and modern UI library.
-   **Monaco Editor** - the code editor that powers VS Code.
-   **Socket.io-client** - for real-time events.
-   **Yjs & y-websocket** - for CRDT-based conflict-free replication.

### Backend
-   **Node.js & Express** - robust server framework.
-   **Socket.io** - real-time bidirectional communication.
-   **Prisma** - next-generation ORM.
-   **SQLite** - lightweight database for sessions and user data.
-   **Passport.js** - authentication middleware.

### DevOps
-   **Vercel** - Frontend deployment.
-   **Render** - Backend deployment.

---

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/anurraggg/Colab-Code.git
    cd Colab-Code
    ```

2.  **Install Dependencies:**
    ```bash
    # Install Client dependencies
    cd client
    npm install

    # Install Server dependencies
    cd ../server
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the `server` directory:
    ```env
    PORT=3001
    DATABASE_URL="file:./dev.db"
    SESSION_SECRET="your_super_secret_key"
    CLIENT_URL="http://localhost:5173"
    
    # OAuth Credentials
    GOOGLE_CLIENT_ID="your_google_id"
    GOOGLE_CLIENT_SECRET="your_google_secret"
    GITHUB_CLIENT_ID="your_github_id"
    GITHUB_CLIENT_SECRET="your_github_secret"
    ```

4.  **Run Locally:**
    ```bash
    # Terminal 1: Start Server
    cd server
    npm run dev

    # Terminal 2: Start Client
    cd client
    npm run dev
    ```

---

## 📦 Deployment

### Backend (Render)
1.  Connect your repo to Render.
2.  Set Build Command: `npm install && npm run build`.
3.  Set Start Command: `npm start`.
4.  Add Environment Variables (same as above, but set `NODE_ENV=production`).

### Frontend (Vercel)
1.  Connect your repo to Vercel.
2.  Set Root Directory to `client`.
3.  Add Environment Variables:
    -   `VITE_API_URL`: Your Render Backend URL.
    -   `VITE_WS_URL`: Your Render Backend WebSocket URL (wss://).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Anurag](https://github.com/anurraggg)

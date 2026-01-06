import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import session from 'express-session';
import passport from 'passport';
import SQLiteStore from 'connect-sqlite3';
import { setupWSConnection } from './yjsHandler';
import './auth'; // Register strategies

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render/Vercel)

const SQLiteStoreSession = (SQLiteStore(session) as any);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: CLIENT_URL, // Allow frontend
    credentials: true
}));
app.use(express.json());

// Session Setup
app.use(session({
    store: new SQLiteStoreSession({ db: 'sessions.db', dir: './' }),
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Required for SameSite=None
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for Cross-Site (Vercel -> Render)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const server = http.createServer(app);

// Auth Routes
app.get('/auth/google', (req, res, next) => {
    console.log('Starting Google Auth...');
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    (req, res, next) => {
        console.log('Google Callback Hit');
        next();
    },
    passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/login` }),
    (req, res) => {
        console.log('Google Auth Success, Redirecting...');
        res.redirect(`${CLIENT_URL}/`);
    }
);

app.get('/auth/github', (req, res, next) => {
    console.log('Starting GitHub Auth...');
    next();
}, passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback',
    (req, res, next) => {
        console.log('GitHub Callback Hit');
        next();
    },
    passport.authenticate('github', { failureRedirect: `${CLIENT_URL}/login` }),
    (req, res) => {
        console.log('GitHub Auth Success, Redirecting...');
        res.redirect(`${CLIENT_URL}/`);
    }
);

app.get('/auth/user', (req, res) => {
    console.log('Checking Auth Status. User:', req.user ? (req.user as any).id : 'None');
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
});

app.post('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.status(200).json({ message: "Logged out" });
    });
});

// Code Execution Proxy (Piston API)
import axios from 'axios';

const LANGUAGE_VERSIONS: Record<string, string> = {
    javascript: '18.15.0',
    typescript: '5.0.3',
    python: '3.10.0',
    java: '15.0.2',
    c: '10.2.0',
    cpp: '10.2.0',
    go: '1.16.2',
    rust: '1.68.2',
};

app.post('/api/execute', async (req, res) => {
    const { language, sourceCode } = req.body;

    if (!language || !sourceCode) {
        return res.status(400).json({ message: 'Language and source code are required' });
    }

    const version = LANGUAGE_VERSIONS[language] || '*';

    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language,
            version,
            files: [
                {
                    content: sourceCode,
                },
            ],
        });
        res.json(response.data);
    } catch (error: any) {
        console.error('Piston API Error:', error.message);
        res.status(500).json({ message: 'Failed to execute code', error: error.message });
    }
});

// Socket.io
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Yjs WebSocket
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
    const handleAuth = (ws: any) => {
        wss.emit('connection', ws, request);
    };
    wss.handleUpgrade(request, socket, head, handleAuth);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

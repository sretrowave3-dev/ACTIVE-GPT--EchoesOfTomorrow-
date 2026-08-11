const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 5000;
const HOST = '127.0.0.1';

// Secret token used for our simple local cookie
const AUTH_TOKEN = 'echoes-secure-token-2026';

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Serve the login page specifically
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Handle login submissions
app.post('/login', (req, res) => {
    const { username, password, remember } = req.body;
    if (username === 'admin' && password === 'echoes2026') {
        const cookieOptions = { httpOnly: true, sameSite: 'strict' };
        if (remember) {
            cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        res.cookie('auth', AUTH_TOKEN, cookieOptions);
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/login?error=1');
    }
});

// Redirect root to dashboard (which will redirect to login if not authed)
app.get('/', (req, res) => res.redirect('/dashboard.html'));

// Auth Middleware to protect static files
app.use((req, res, next) => {
    if (req.cookies.auth === AUTH_TOKEN) {
        next(); // Authenticated
    } else {
        res.redirect('/login'); // Not authenticated
    }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, HOST, () => {
    console.log(`Secure Dashboard running at http://${HOST}:${PORT}/dashboard.html`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

// ── Security ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));  // Allow all origins — safe since JWT protects routes
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '10mb' }));

// ── Request logger (helps debug Railway issues) ───────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));

// ── Health Check (check this URL first on Railway!) ───────
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date(),
  env: IS_PROD ? 'production' : 'development',
  db: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
  jwt: !!process.env.JWT_SECRET
}));

// ── Silence Chrome DevTools probe ────────────────────────
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

// ── Serve Frontend ────────────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_BUILD, { maxAge: '1d' }));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD, 'index.html'));
});

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', detail: err.message });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

console.log('🔧 Starting with config:');
console.log('  PORT:', PORT);
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ NOT SET — using SQLite');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ set' : '❌ NOT SET — using default (insecure)');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB sync failed:', err.message);
    console.error(err);
    process.exit(1);
  });

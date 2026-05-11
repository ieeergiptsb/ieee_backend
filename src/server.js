import cluster from 'cluster';
import os from 'os';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import announcementRoutes from './routes/announcements.js';
import kodekurrentRoutes from './routes/kodekurrent.js';
import rateLimit from 'express-rate-limit';

// ─── Load environment variables ───────────────────────────────────────────────
dotenv.config();

const PORT = process.env.PORT || 8000;
const NUM_CPUS = os.cpus().length;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Cluster Mode (primary process) ───────────────────────────────────────────
// On bare-metal / VPS: spawn one worker per CPU core for true parallelism.
// On managed platforms (Render, Heroku, Railway) that already load-balance
// across dynos, set DISABLE_CLUSTER=true in the env to skip this.
if (cluster.isPrimary && IS_PRODUCTION && !process.env.DISABLE_CLUSTER) {
  console.log(`[Primary ${process.pid}] Starting ${NUM_CPUS} workers...`);

  for (let i = 0; i < NUM_CPUS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Primary] Worker ${worker.process.pid} died (${signal || code}). Restarting…`);
    cluster.fork(); // auto-restart on crash
  });

} else {
  // ─── Worker process (or dev mode) ─────────────────────────────────────────
  startServer();
}

async function startServer() {
  // Connect to MongoDB with a larger connection pool for concurrency
  await connectDB();

  const app = express();

  // ─── Security headers via Helmet ──────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin image loads
  }));

  // ─── Gzip compression ─────────────────────────────────────────────────────
  app.use(compression());

  // ─── Trust proxy (Render / Vercel / Nginx) ────────────────────────────────
  app.set('trust proxy', 1);

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://ieeergipt.in',
    'https://www.ieeergipt.in',
    'https://kodekurrent.ieeergipt.in',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl / mobile
      const normalizeUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
      const allowed = allowedOrigins.some(
        (o) => o === origin || normalizeUrl(o) === normalizeUrl(origin)
      );
      if (allowed) return callback(null, true);
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  // ─── Rate limiting ────────────────────────────────────────────────────────
  // NOTE: When running in cluster mode or behind a reverse-proxy, use a
  // shared Redis store (e.g. rate-limit-redis) so limits are enforced
  // globally across all workers/instances, not just per-process.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  });
  app.use(limiter);

  // ─── Body / cookie parsers ────────────────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // ─── Health & root endpoints ──────────────────────────────────────────────
  app.get('/', (_req, res) => res.status(200).send('IEEE RGIPT API is running'));

  app.get('/health', (_req, res) =>
    res.json({
      success: true,
      message: 'Server is running',
      pid: process.pid,
      timestamp: new Date().toISOString(),
    })
  );

  // ─── API Routes ───────────────────────────────────────────────────────────
  app.use('/auth', authRoutes);
  app.use('/events', eventRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/admin', adminRoutes);
  app.use('/contact', contactRoutes);
  app.use('/announcements', announcementRoutes);
  app.use('/kodekurrent', kodekurrentRoutes);

  // ─── 404 handler ─────────────────────────────────────────────────────────
  app.use((_req, res) =>
    res.status(404).json({ success: false, error: 'Route not found' })
  );

  // ─── Global async error handler ───────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: IS_PRODUCTION ? 'Internal server error' : (err.message || 'Internal server error'),
    });
  });

  // ─── Start listening ──────────────────────────────────────────────────────
  const server = app.listen(PORT, () => {
    console.log(`[Worker ${process.pid}] Server running on port ${PORT} — ${process.env.NODE_ENV || 'development'}`);
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`[Worker ${process.pid}] ${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log(`[Worker ${process.pid}] HTTP server closed.`);
      process.exit(0);
    });

    // Force-exit if still open after 10 s
    setTimeout(() => {
      console.error(`[Worker ${process.pid}] Forcing exit after timeout.`);
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled promise rejections — log & continue (don't crash)
  process.on('unhandledRejection', (reason) => {
    console.error('[Worker] Unhandled promise rejection:', reason);
  });
}

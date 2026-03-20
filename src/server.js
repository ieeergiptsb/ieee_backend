import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware - CORS configuration
// Allow both with and without www subdomain
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://ieeergipt.in',
  'https://www.ieeergipt.in',
  'https://kodekurrent.ieeergipt.in',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin (with or without www)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (origin === allowedOrigin) return true;
      
      // Normalize by removing www for comparison
      const normalizeUrl = (url) => {
        return url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
      };
      
      return normalizeUrl(origin) === normalizeUrl(allowedOrigin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Implement extremely robust rate limiting
// Trust proxy is required when deployed on Vercel/Render
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root endpoint (useful for UptimeRobot)
app.get('/', (req, res) => {
  res.status(200).send('IEEE RGIPT API is running');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/contact', contactRoutes);
app.use('/announcements', announcementRoutes);
app.use('/kodekurrent', kodekurrentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});


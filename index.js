// Modify your server.js file:

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load env variables
dotenv.config();

// Initialize app
const app = express();

// Special route for Stripe webhooks
app.use('/api/stripe/webhooks/stripe', express.raw({ type: 'application/json' }));

const allowedOrigins = [
  'http://localhost:5173',
  'https://www.socialboosts.co',
  'https://socialboosts.co'  // Add this line - you need both www and non-www versions
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin); // Add logging
      callback(null, false); // Don't throw error, just block with proper CORS response
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Standard middleware
app.use(express.json());
app.use(cookieParser());

// Fix route paths to match your actual file names
app.use('/api/auth', require('./routes/authRoutes')); // Changed from authRoutes to auth
app.use('/api/users', require('./routes/usersRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/custombookings', require('./routes/customPlanBookingsRoutes'));

// Root route with version for debugging
app.get('/', (req, res) => {
  res.send('API Running - v1.0.2');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Make MongoDB connection resilient
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social-media-marketing');
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    // Don't exit the process - let the app continue running
    console.log('Will retry MongoDB connection in 30 seconds...');
    setTimeout(connectDB, 30000); // Try again in 30 seconds
  }
};

// Call connectDB but don't wait for it
connectDB();

// Initialize server
const PORT = process.env.PORT || 8080; // DigitalOcean uses 8080 by default
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// /backend/app.js
const express = require('express');
const cors = require('cors');
// Add at the top of your server.js file with other imports
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/usersRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const stripeRoutes = require('./routes/stripe');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Assuming you have admin routes in a separate file
const customBookings = require('./routes/customPlanBookingsRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
// Initialize app
const app = express();
app.use('/api/stripe/webhooks/stripe', express.raw({ type: 'application/json' }));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite's default port
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const cookieParser = require('cookie-parser');
app.use(cookieParser());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes); // Assuming admin routes are in userRoutes
app.use('/api/custombookings', customBookings);
// app.use('/api/payment', paymentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API Running');
});

module.exports = app;

// /backend/server.js
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social-media-marketing');
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

connectDB();

// Initialize server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
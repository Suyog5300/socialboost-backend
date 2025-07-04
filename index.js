// Modify your server.js file:

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// In your server.js after other requires:
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, UserRole } = require('./models/User');
const crypto = require('crypto');


// Load env variables
dotenv.config();

// Initialize app
const app = express();

// Special route for Stripe webhooks
app.use('/api/stripe/webhooks/stripe', express.raw({ type: 'application/json' }));

const allowedOrigins = [
  'http://localhost:5173',
  'https://www.socialboosts.co',
  'https://socialboosts.co',
  // 'https://whale-app-d6vle.ondigitalocean.app',
  'https://socialboost-3nfby.ondigitalocean.app', // Your DigitalOcean backend
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
// Initialize passport
app.use(passport.initialize());

// Fix route paths to match your actual file names
app.use('/api/auth', require('./routes/authRoutes')); // Changed from authRoutes to auth
app.use('/api/users', require('./routes/usersRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/custombookings', require('./routes/customPlanBookingsRoutes'));
app.use('/api/myOrders', require('./routes/userOrdersRoutes')); 

// Root route with version for debugging
app.get('/', (req, res) => {
  res.send('API Running - v1.0.2');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Hash function for server-side
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Endpoint for Meta Conversions API
app.post('/api/meta-conversions', async (req, res) => {
  try {
    const { pixelId, eventName, eventParams } = req.body;
    
    // Get access token from environment variables
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    // Properly hash data on server side if not already hashed
    // This ensures data is always properly hashed before sending to Meta
    if (eventParams.em && eventParams.em.length !== 64) {
      eventParams.em = hashData(eventParams.em);
    }
    if (eventParams.fn && eventParams.fn.length !== 64) {
      eventParams.fn = hashData(eventParams.fn);
    }
    // ...repeat for other PII fields...
    
    // Prepare data for Meta
    const data = {
      data: [{
        event_name: eventName,
        event_time: eventParams.event_time,
        action_source: eventParams.action_source,
        user_data: {
          client_ip_address: req.ip,
          client_user_agent: eventParams.client_user_agent,
          fbp: eventParams.fbp,
          fbc: eventParams.fbc,
          em: eventParams.em,
          fn: eventParams.fn,
          ln: eventParams.ln,
          ph: eventParams.ph,
          ct: eventParams.ct,
          st: eventParams.st,
          country: eventParams.country
        },
        custom_data: {
          value: eventParams.value,
          currency: eventParams.currency,
          content_ids: eventParams.content_ids,
          content_type: eventParams.content_type
        }
      }],
      access_token: accessToken
    };
    
    // Send to Meta
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pixelId}/events`,
      data
    );
    
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error sending to Meta Conversions API:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Make MongoDB connection resilient
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB with URI:', process.env.MONGO_URI ? 'URI is set' : 'URI is missing');
    console.log('URI length:', process.env.MONGO_URI?.length);
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social-media-marketing');
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    console.log('Will retry MongoDB connection in 30 seconds...');
    setTimeout(connectDB, 30000);
  }
};

// Call connectDB but don't wait for it
connectDB();

// Configure Google strategy
// Configure Google strategy - UPDATE THIS SECTION
// Configure Google strategy
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       // Use the current DigitalOcean URL since custom domain isn't active yet
//       callbackURL: process.env.NODE_ENV === 'production' 
//         ? 'https://whale-app-d6vle.ondigitalocean.app/api/auth/google/callback'
//         : 'http://localhost:5000/api/auth/google/callback',
//       scope: ['profile', 'email']
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Check if user already exists
//         let user = await User.findOne({ email: profile.emails[0].value });
        
//         if (user) {
//           return done(null, user);
//         }
        
//         // Create new user with Google profile info
//         user = new User({
//           firstName: profile.name.givenName,
//           lastName: profile.name.familyName,
//           email: profile.emails[0].value,
//           password: crypto.randomBytes(16).toString('hex'),
//           emailVerified: true,
//           role: UserRole.USER
//         });
        
//         await user.save();
//         return done(null, user);
//       } catch (error) {
//         return done(error, null);
//       }
//     }
//   )
// );

// Update your Google Strategy configuration in server.js

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Use the current DigitalOcean URL since custom domain isn't active yet
      callbackURL: process.env.NODE_ENV === 'production' 
        // ? 'https://whale-app-d6vle.ondigitalocean.app/api/auth/google/callback'
        ? 'https://socialboost-3nfby.ondigitalocean.app/api/auth/google/callback'
        : 'http://localhost:5000/api/auth/google/callback',
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // User exists, return the user for login flow
          return done(null, user);
        }
        
        // Create new user with Google profile info
        // This is a new registration via Google
        user = new User({
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          email: profile.emails[0].value,
          password: crypto.randomBytes(16).toString('hex'), // Random password since they use Google
          emailVerified: true, // Google emails are already verified
          role: UserRole.USER
        });
        
        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);



// Initialize server
const PORT = process.env.PORT || 8080; // DigitalOcean uses 8080 by default
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// /backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, UserRole } = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in cookies first (new method)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else {
      // Fall back to header authorization (existing method)
      const authHeader = req.header('Authorization');
      token = authHeader && authHeader.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Add user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware for role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = {
  auth,
  authorize
};
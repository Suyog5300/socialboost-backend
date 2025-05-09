// /backend/routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { User, UserRole } = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendEmail, getVerificationEmailHtml, getPasswordResetEmailHtml, sendOTPEmail } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// @access  Public
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'Email id already exists!' });
      }

      // Create new user with default USER role
      user = new User({
        firstName,
        lastName,
        email,
        password,
        role: UserRole.USER // Default role
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();

      await user.save();

      // Create verification URL - Use frontend port 5173 for Vite
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

      // Send verification email - Use try/catch to prevent email errors from breaking registration
      try {
        await sendEmail({
          email: user.email,
          subject: 'Please verify your email',
          html: getVerificationEmailHtml(user.firstName, verificationUrl)
        });
      } catch (emailError) {
        // Log the error but continue with registration
        console.error('Email sending failed, but registration will continue:', emailError.message);
      }

      // Generate JWT token
      const token = user.generateAuthToken();

      // Create response data
      const responseData = {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        },
        message: 'Registration successful! Please check your email to verify your account.'
      };

      // In development mode, include verification token in response for testing
      if (process.env.NODE_ENV !== 'production') {
        responseData.devInfo = {
          note: 'This information is only included in development mode',
          verificationUrl: verificationUrl
        };
      }

      res.status(201).json(responseData);
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
// /backend/routes/auth.js - Update login route to set cookies
// Update the login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').if(body('otp').not().exists()).exists().withMessage('Password is required'),
    body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be a 6-digit code')
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, otp } = req.body;

    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(400).json({ 
          message: 'Invalid credentials', 
          errorType: 'auth_failed',
          field: 'email'
        });
      }

      // If OTP is provided, verify it
      if (otp) {
        // Hash the provided OTP to compare with stored hash
        const hashedOTP = crypto
          .createHash('sha256')
          .update(otp)
          .digest('hex');
        
        // Check if OTP exists, is valid, and not expired
        if (!user.loginOtp || 
            user.loginOtp !== hashedOTP || 
            !user.loginOtpExpires || 
            user.loginOtpExpires < Date.now()) {
          return res.status(400).json({ 
            message: 'Invalid or expired OTP', 
            errorType: 'auth_failed',
            field: 'otp',
            requiresOTP: true
          });
        }

        // Clear OTP after successful verification
        user.loginOtp = undefined;
        user.loginOtpExpires = undefined;
        await user.save();

        // Generate JWT token
        const token = user.generateAuthToken();

        // Set cookie with the token
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // secure in production
          sameSite: 'lax', // Helps with CSRF
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // Return full user data after successful authentication
        return res.json({
          token,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified
          }
        });
      } 
      // If no OTP, verify password
      else if (password) {
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(400).json({ 
            message: 'Invalid credentials', 
            errorType: 'auth_failed',
            field: 'password'
          });
        }

        // Generate OTP for login verification
        const loginOtp = user.generateLoginOTP();
        await user.save();
        
        // Send OTP email
        await sendOTPEmail(user.email, loginOtp, user.firstName);
        
        // Return a response indicating OTP is required
        return res.status(200).json({
          message: 'OTP sent to your email',
          requiresOTP: true,
          email: user.email
        });
      } else {
        // Neither password nor OTP provided
        return res.status(400).json({ 
          message: 'Password or OTP is required', 
          errorType: 'validation_failed'
        });
      }
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
// Add a route to resend OTP
router.post(
  '/resend-login-otp',
  [body('email').isEmail().withMessage('Please include a valid email')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email } = req.body;
    
    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({ 
          message: 'If your email exists in our system, a new OTP has been sent.' 
        });
      }
      
      // Generate new OTP
      const loginOtp = user.generateLoginOTP();
      await user.save();
      
      // Send OTP email
      await sendOTPEmail(user.email, loginOtp, user.firstName);
      
      res.status(200).json({
        message: 'New OTP sent to your email',
        requiresOTP: true,
        email: user.email
      });
    } catch (error) {
      console.error('Error in resend OTP:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.post('/logout', (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Example of a protected route
router.get('/api/user-profile', auth, (req, res) => {
  // req.user contains all the user information from the database
  const userData = {
    id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    role: req.user.role
  };
  
  res.json(userData);
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    // Hash the token from params
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by verification token and check if token is still valid
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update user verification status
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.status(200).json({
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification',
  [body('email').isEmail().withMessage('Please include a valid email')],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Find user by email
      const user = await User.findOne({ email });

      // Don't reveal if user exists or not for security
      if (!user || user.emailVerified) {
        return res.status(200).json({
          message: 'If your email exists in our system and is not verified, a verification link has been sent.'
        });
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Create verification URL - Use frontend port 5173 for Vite
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

      // Send verification email
      await sendEmail({
        email: user.email,
        subject: 'Please verify your email',
        html: getVerificationEmailHtml(user.firstName, verificationUrl)
      });

      res.status(200).json({
        message: 'Verification email sent! Please check your inbox.'
      });
    } catch (error) {
      console.error('Error in resend verification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password',
  [body('email').isEmail().withMessage('Please include a valid email')],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Find user by email
      const user = await User.findOne({ email });

      // Don't reveal if user exists or not for security
      if (!user) {
        return res.status(200).json({
          message: 'If your email exists in our system, a password reset link has been sent.'
        });
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Create reset URL - Use frontend port 5173 for Vite
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

      // Send password reset email
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        html: getPasswordResetEmailHtml(user.firstName, resetUrl)
      });

      res.status(200).json({
        message: 'If your email exists in our system, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Error in forgot password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Hash the token from params
      const passwordResetToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      // Find user by reset token and check if token is still valid
      const user = await User.findOne({
        passwordResetToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Update password
      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      res.status(200).json({
        message: 'Password reset successful! You can now log in with your new password.'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = req.user;

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    });
  } catch (error) {
    console.error('Error in get me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
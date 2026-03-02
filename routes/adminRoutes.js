// /backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { User, UserRole } = require('../models/User');
const Subscription = require('../models/Subscription');
const Campaign = require('../models/Campaign');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// @route   GET /api/admin/users
// @desc    Get all users with their subscription, campaign, and payment data
// @access  Private (Admin, SuperAdmin)
router.get('/users', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0; // 0 means no limit
    const skip = (page - 1) * limit;
    
    // Get sort parameters
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Get filter parameters
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const plan = req.query.plan || 'all';
    
    // Build filter query
    let filterQuery = {};
    
    // Search filter
    if (search) {
      filterQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Get all users
    const users = await User.find(filterQuery)
      .select('-password')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit > 0 ? limit : undefined);
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filterQuery);
    
    // Get all associated data for these users
    const userIds = users.map(user => user._id);
    
    // Get subscriptions for all users
    const subscriptions = await Subscription.find({ user: { $in: userIds } });
    
    // Get campaigns for all users
    const campaigns = await Campaign.find({ user: { $in: userIds } });
    
    // Get payments for all users
    const payments = await Payment.find({ user: { $in: userIds } });
    
    // Map data to users
    const enrichedUsers = users.map(user => {
      // Get user subscriptions
      const userSubscriptions = subscriptions.filter(sub => 
        sub.user.toString() === user._id.toString()
      );
      
      // Get active subscription if any
      const activeSubscription = userSubscriptions.find(sub => sub.status === 'active');
      
      // Get user campaigns
      const userCampaigns = campaigns.filter(campaign => 
        campaign.user.toString() === user._id.toString()
      );
      
      // Get user payments
      const userPayments = payments.filter(payment => 
        payment.user.toString() === user._id.toString()
      );
      
      // Format the data for frontend
      return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        stripeCustomerId: user.stripeCustomerId,
        
        // Include active subscription if exists
        subscription: activeSubscription ? {
          id: activeSubscription._id,
          planName: activeSubscription.planName,
          status: activeSubscription.status,
          amount: activeSubscription.amount,
          billingType: activeSubscription.billingType,
          nextBillingDate: activeSubscription.nextBillingDate,
          createdAt: activeSubscription.createdAt,
          stripeSubscriptionId: activeSubscription.stripeSubscriptionId
        } : null,
        
        // Include all campaigns
        campaigns: userCampaigns.map(campaign => ({
          id: campaign._id,
          status: campaign.status,
          demographics: campaign.demographics,
          interests: campaign.interests,
          behaviors: campaign.behaviors,
          socialMedia: campaign.socialMedia,
          metrics: campaign.metrics,
          startDate: campaign.startDate
        })),
        
        // Include payment history
        payments: userPayments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          date: payment.createdAt
        }))
      };
    });
    
    res.json({
      users: enrichedUsers,
      pagination: {
        total: totalUsers,
        page,
        pages: limit > 0 ? Math.ceil(totalUsers / limit) : 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this route to your /backend/routes/admin.js file

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin, SuperAdmin)
router.post('/users', [
  auth, 
  authorize(UserRole.ADMIN, UserRole.SUPERADMIN),
  // Validation middleware
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array().reduce((acc, error) => {
          acc[error.param] = error.msg;
          return acc;
        }, {})
      });
    }

    const { firstName, lastName, email, password, role, emailVerified } = req.body;

    // Check if trying to create SuperAdmin
    if (role === UserRole.SUPERADMIN && req.user.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({ 
        message: 'Only SuperAdmins can create SuperAdmin users' 
      });
    }

    // Check if user already exists
    let existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || UserRole.USER,
      emailVerified: emailVerified || false
    });

    await newUser.save();

    // Return user data without password
    const userData = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      user: userData,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }
    
    res.status(500).json({ message: 'Server error while creating user' });
  }
});

// Don't forget to import the validation at the top of your admin.js file:
// const { body, validationResult } = require('express-validator');

// @route   GET /api/admin/users/:id
// @desc    Get detailed information for a specific user
// @access  Private (Admin, SuperAdmin)
router.get('/users/:id', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get user
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user subscription(s)
    const subscriptions = await Subscription.find({ user: userId });
    const activeSubscription = subscriptions.find(sub => sub.status === 'active');
    
    // Get user campaigns
    const campaigns = await Campaign.find({ user: userId });
    
    // Get user payments
    const payments = await Payment.find({ user: userId });
    
    // Calculate total spent
    const totalSpent = payments.reduce((total, payment) => {
      if (payment.status === 'succeeded') {
        return total + payment.amount;
      }
      return total;
    }, 0);
    
    // Format response
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
      
      // Include active subscription if exists
      subscription: activeSubscription ? {
        id: activeSubscription._id,
        planName: activeSubscription.planName,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        billingType: activeSubscription.billingType,
        nextBillingDate: activeSubscription.nextBillingDate,
        createdAt: activeSubscription.createdAt,
        stripeSubscriptionId: activeSubscription.stripeSubscriptionId
      } : null,
      
      // Include all campaigns
      campaigns: campaigns.map(campaign => ({
        id: campaign._id,
        status: campaign.status,
        demographics: campaign.demographics,
        interests: campaign.interests,
        behaviors: campaign.behaviors,
        socialMedia: campaign.socialMedia,
        metrics: campaign.metrics,
        startDate: campaign.startDate
      })),
      
      // Include payment history
      payments: payments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        date: payment.createdAt
      })),
      
      // Additional summary data
      totalSpent: totalSpent,
      totalPayments: payments.length,
      successfulPayments: payments.filter(p => p.status === 'succeeded').length,
      failedPayments: payments.filter(p => p.status === 'failed').length
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user information
// @access  Private (Admin, SuperAdmin)
router.put('/users/:id', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check allowed fields to update
    const { firstName, lastName, email, role, emailVerified } = req.body;
    
    // Check if trying to change role to SuperAdmin
    if (role === UserRole.SUPERADMIN && req.user.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({ message: 'Only SuperAdmins can create or modify SuperAdmin roles' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (emailVerified !== undefined) user.emailVerified = emailVerified;
    
    await user.save();
    
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Check for duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (SuperAdmin only)
router.delete('/users/:id', [auth, authorize(UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deletion of SuperAdmin by another SuperAdmin
    if (user.role === UserRole.SUPERADMIN) {
      return res.status(403).json({ message: 'SuperAdmin users cannot be deleted' });
    }
    
    // Delete user's subscriptions
    await Subscription.deleteMany({ user: userId });
    
    // Delete user's campaigns
    await Campaign.deleteMany({ user: userId });
    
    // Delete user's payments
    await Payment.deleteMany({ user: userId });
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private (Admin, SuperAdmin)
router.get('/stats', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Get time period from query params (default to last 30 days)
    const period = req.query.period || '30d';
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '12m':
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Total users
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    
    // Active campaigns
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    
    // Revenue stats
    const payments = await Payment.find({ 
      status: 'succeeded',
      createdAt: { $gte: startDate }
    });
    
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Subscription stats
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const subscriptionsByPlan = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$planName', count: { $sum: 1 } } }
    ]);
    
    // Format plan distribution
    const planDistribution = subscriptionsByPlan.map(plan => ({
      name: plan._id,
      count: plan.count,
      percentage: Math.round((plan.count / activeSubscriptions) * 100)
    }));
    
    res.json({
      userStats: {
        total: totalUsers,
        new: newUsers,
        growth: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0
      },
      campaignStats: {
        active: activeCampaigns
      },
      revenueStats: {
        total: totalRevenue,
        average: totalUsers > 0 ? totalRevenue / totalUsers : 0
      },
      subscriptionStats: {
        active: activeSubscriptions,
        plans: planDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
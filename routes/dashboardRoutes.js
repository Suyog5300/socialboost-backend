// /backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { UserRole, User } = require('../models/User');
const Campaign = require('../models/Campaign');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const mongoose = require('mongoose');

// Helper function to calculate growth rate
const calculateGrowthRate = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// @route   GET /api/dashboard/metrics
// @desc    Get main dashboard metrics
// @access  Private (Admin, SuperAdmin)
router.get('/metrics', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Get current date and date for previous period
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date(currentDate);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    // Get user counts
    const currentUserCount = await User.countDocuments({
      createdAt: { $lte: currentDate }
    });
    const previousUserCount = await User.countDocuments({
      createdAt: { $lte: thirtyDaysAgo }
    });
    
    // Get campaign counts
    const currentCampaignCount = await Campaign.countDocuments({
      status: 'active',
      createdAt: { $lte: currentDate }
    });
    const previousCampaignCount = await Campaign.countDocuments({
      status: 'active',
      createdAt: { $lte: thirtyDaysAgo }
    });
    
    // Get revenue data
    const currentMonthPayments = await Payment.find({
      status: 'succeeded',
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    const previousMonthPayments = await Payment.find({
      status: 'succeeded',
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    const currentMonthRevenue = currentMonthPayments.reduce((total, payment) => total + payment.amount, 0);
    const previousMonthRevenue = previousMonthPayments.reduce((total, payment) => total + payment.amount, 0);
    
    // Calculate average subscription value
    const activeSubscriptions = await Subscription.find({ status: 'active' });
    const avgSubscriptionValue = activeSubscriptions.length > 0 
      ? activeSubscriptions.reduce((total, sub) => total + sub.amount, 0) / activeSubscriptions.length
      : 0;
    
    const oldActiveSubscriptions = await Subscription.find({
      status: 'active',
      createdAt: { $lte: thirtyDaysAgo }
    });
    const oldAvgSubscriptionValue = oldActiveSubscriptions.length > 0
      ? oldActiveSubscriptions.reduce((total, sub) => total + sub.amount, 0) / oldActiveSubscriptions.length
      : 0;
    
    // Calculate conversion rate (new subscriptions / new users)
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    
    const newSubscriptions = await Subscription.countDocuments({
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    
    const conversionRate = newUsers > 0 ? (newSubscriptions / newUsers) * 100 : 0;
    
    // Calculate previous conversion rate
    const previousNewUsers = await User.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    const previousNewSubscriptions = await Subscription.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    const previousConversionRate = previousNewUsers > 0 
      ? (previousNewSubscriptions / previousNewUsers) * 100 
      : 0;

    res.json({
      totalUsers: currentUserCount,
      userGrowthRate: calculateGrowthRate(currentUserCount, previousUserCount),
      activeCampaigns: currentCampaignCount,
      campaignGrowthRate: calculateGrowthRate(currentCampaignCount, previousCampaignCount),
      monthlyRevenue: currentMonthRevenue,
      revenueGrowthRate: calculateGrowthRate(currentMonthRevenue, previousMonthRevenue),
      conversionRate: conversionRate,
      conversionRateChange: calculateGrowthRate(conversionRate, previousConversionRate),
      avgSubscriptionValue: avgSubscriptionValue,
      avgSubscriptionGrowth: calculateGrowthRate(avgSubscriptionValue, oldAvgSubscriptionValue)
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/user-growth
// @desc    Get user growth data
// @access  Private (Admin, SuperAdmin)
router.get('/user-growth', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const { period } = req.query;
    let months = 12; // Default to 12 months
    
    if (period === '30d' || period === '7d') {
      months = 6; // Show 6 months for shorter time periods
    }
    
    // Get counts for the last X months
    const currentDate = new Date();
    const monthlyData = [];
    
    for (let i = 0; i < months; i++) {
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() - i);
      endDate.setDate(0); // Last day of previous month
      
      const startDate = new Date(endDate);
      startDate.setDate(1); // First day of the month
      
      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      monthlyData.unshift({ label: monthName, value: count });
    }
    
    res.json(monthlyData);
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/revenue
// @desc    Get revenue data by plan
// @access  Private (Admin, SuperAdmin)
router.get('/revenue', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const { period } = req.query;
    let months = 6; // Default to last 6 months for revenue
    
    // Get payments grouped by month and plan
    const currentDate = new Date();
    const starter = [];
    const professional = [];
    const enterprise = [];
    
    for (let i = 0; i < months; i++) {
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() - i);
      endDate.setDate(0); // Last day of previous month
      
      const startDate = new Date(endDate);
      startDate.setDate(1); // First day of the month
      
      // Get all payments for this month
      const payments = await Payment.find({
        status: 'succeeded',
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate({
        path: 'subscription',
        select: 'planName'
      });
      
      // Group payments by plan
      const starterPayments = payments.filter(payment => 
        payment.subscription && payment.subscription.planName === 'Starter'
      );
      
      const professionalPayments = payments.filter(payment => 
        payment.subscription && payment.subscription.planName === 'Professional'
      );
      
      const enterprisePayments = payments.filter(payment => 
        payment.subscription && payment.subscription.planName === 'Enterprise'
      );
      
      // Calculate total for each plan
      const starterTotal = starterPayments.reduce((total, payment) => total + payment.amount, 0);
      const professionalTotal = professionalPayments.reduce((total, payment) => total + payment.amount, 0);
      const enterpriseTotal = enterprisePayments.reduce((total, payment) => total + payment.amount, 0);
      
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      starter.unshift({ label: monthName, value: starterTotal });
      professional.unshift({ label: monthName, value: professionalTotal });
      enterprise.unshift({ label: monthName, value: enterpriseTotal });
    }
    
    res.json({ starter, professional, enterprise });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/subscription-plans
// @desc    Get subscription plan distribution
// @access  Private (Admin, SuperAdmin)
router.get('/subscription-plans', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Count active subscriptions by plan
    const subscriptionCounts = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$planName', count: { $sum: 1 } } }
    ]);
    
    // Define plan colors
    const planColors = {
      'Starter': '#3b82f6', // Blue
      'Professional': '#9333ea', // Purple
      'Enterprise': '#10b981' // Green
    };
    
    // Calculate total subscriptions
    const totalSubscriptions = subscriptionCounts.reduce((sum, plan) => sum + plan.count, 0);
    
    // Format data for frontend
    const plansData = subscriptionCounts.map(plan => ({
      name: plan._id,
      count: plan.count,
      percentage: totalSubscriptions > 0 ? Math.round((plan.count / totalSubscriptions) * 100) : 0,
      color: planColors[plan._id] || '#9333ea'
    }));
    
    res.json(plansData);
  } catch (error) {
    console.error('Error fetching subscription plans data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/payment-status
// @desc    Get payment status distribution
// @access  Private (Admin, SuperAdmin)
router.get('/payment-status', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Count payments by status
    const paymentStatusCounts = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Define status colors
    const statusColors = {
      'succeeded': '#10b981', // Green
      'pending': '#f59e0b', // Amber
      'failed': '#ef4444' // Red
    };
    
    // Format data for frontend
    const statusData = paymentStatusCounts.map(status => ({
      status: status._id.charAt(0).toUpperCase() + status._id.slice(1), // Capitalize first letter
      count: status.count,
      color: statusColors[status._id] || '#9333ea'
    }));
    
    res.json(statusData);
  } catch (error) {
    console.error('Error fetching payment status data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/recent-payments
// @desc    Get recent payments
// @access  Private (Admin, SuperAdmin)
router.get('/recent-payments', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Get the most recent payments
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'user',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'subscription',
        select: 'planName'
      });
    
    // Format for frontend
    const formattedPayments = payments.map(payment => {
      const now = new Date();
      const paymentDate = new Date(payment.createdAt);
      const diffTime = Math.abs(now - paymentDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      
      let dateString;
      if (diffDays > 0) {
        dateString = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else {
        dateString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      }
      
      return {
        id: payment._id,
        user: `${payment.user.firstName} ${payment.user.lastName}`,
        email: payment.user.email,
        amount: payment.amount,
        plan: payment.subscription ? payment.subscription.planName : 'Unknown',
        date: dateString,
        status: payment.status
      };
    });
    
    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/top-campaigns
// @desc    Get top performing campaigns
// @access  Private (Admin, SuperAdmin)
router.get('/top-campaigns', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    
    // Find active campaigns with metrics
    const campaigns = await Campaign.find({ status: 'active' })
      .populate({
        path: 'user',
        select: 'firstName lastName'
      })
      .sort({ 'metrics.followers': -1 })
      .limit(limit);
    
    // Format for frontend
    const formattedCampaigns = campaigns.map((campaign, index) => {
      // Calculate a growth percentage (this would normally come from your real metrics)
      const growth = 20 + Math.floor(Math.random() * 25); // Random growth between 20-45%
      
      // Calculate engagement (sample calculation)
      const engagement = campaign.metrics?.engagements || (5000 + Math.floor(Math.random() * 15000));
      
      // Calculate conversion rate (sample)
      const conversionRate = (2 + Math.random() * 4).toFixed(1);
      
      return {
        id: campaign._id,
        name: campaign.name || `Campaign ${index + 1}`,
        user: campaign.user ? `${campaign.user.firstName} ${campaign.user.lastName}` : 'Anonymous User',
        platform: 'Instagram',
        growth: growth,
        budget: 1000 + (index * 200), // Sample budget
        engagement: engagement,
        conversionRate: parseFloat(conversionRate)
      };
    });
    
    res.json(formattedCampaigns);
  } catch (error) {
    console.error('Error fetching top campaigns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/user-demographics
// @desc    Get user demographics data
// @access  Private (Admin, SuperAdmin)
router.get('/user-demographics', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // This would normally come from real user location data
    // For now, we're providing sample data
    const demographics = [
      { country: 'United States', count: 450, percentage: 36 },
      { country: 'United Kingdom', count: 180, percentage: 14 },
      { country: 'Canada', count: 160, percentage: 13 },
      { country: 'Australia', count: 120, percentage: 10 },
      { country: 'Germany', count: 95, percentage: 8 },
      { country: 'France', count: 85, percentage: 7 },
      { country: 'Others', count: 160, percentage: 12 }
    ];
    
    res.json(demographics);
  } catch (error) {
    console.error('Error fetching user demographics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/platform-metrics
// @desc    Get platform metrics
// @access  Private (Admin, SuperAdmin)
router.get('/platform-metrics', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count users active today (would need user activity tracking)
    const dailyActiveUsers = Math.round(totalUsers * 0.7); // Approximately 70% of users
    
    // Count new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Average posts per campaign (from campaign data)
    const campaigns = await Campaign.find();
    let totalPosts = 0;
    campaigns.forEach(campaign => {
      // This would be your actual post count from campaign data
      totalPosts += 25; // Sample average posts per campaign
    });
    const postsPerCampaign = campaigns.length > 0 ? (totalPosts / campaigns.length).toFixed(1) : '0';
    
    // Calculate renewal rate
    const totalSubscriptions = await Subscription.countDocuments();
    const renewedSubscriptions = totalSubscriptions - await Subscription.countDocuments({ status: 'cancelled' });
    const renewalRate = totalSubscriptions > 0 ? Math.round((renewedSubscriptions / totalSubscriptions) * 100) : 0;
    
    res.json({
      sessionDuration: '6m 42s', // This would come from analytics tracking
      postsPerCampaign: postsPerCampaign,
      dailyActiveUsers: dailyActiveUsers.toString(),
      newUsersToday: newUsersToday.toString(),
      renewalRate: `${renewalRate}%`
    });
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
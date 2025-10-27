// /backend/routes/users.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, UserRole } = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin, SuperAdmin)
router.get(
  '/',
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin, SuperAdmin)
router.get(
  '/:id',
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin, SuperAdmin)
router.put(
  '/:id',
  [
    auth,
    authorize(UserRole.ADMIN, UserRole.SUPERADMIN),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please include a valid email'),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Restrict role change to SuperAdmin only
    if (req.body.role && req.user.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({ message: 'Only SuperAdmin can change roles' });
    }
    
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't allow changing SuperAdmin role unless by another SuperAdmin
      if (user.role === UserRole.SUPERADMIN && req.user.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({ message: 'Cannot modify SuperAdmin' });
      }
      
      // Update fields
      const { firstName, lastName, email, role } = req.body;
      
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (role) user.role = role;
      
      await user.save();
      
      res.json({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (SuperAdmin only)
router.delete(
  '/:id',
  [auth, authorize(UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't allow deleting another SuperAdmin
      if (user.role === UserRole.SUPERADMIN) {
        return res.status(403).json({ message: 'Cannot delete another SuperAdmin' });
      }
      
      await user.deleteOne();
      
      res.json({ message: 'User removed' });
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/users/create-admin
// @desc    Create admin user (SuperAdmin only)
// @access  Private (SuperAdmin)
router.post(
  '/create-admin',
  [
    auth,
    authorize(UserRole.SUPERADMIN),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .isIn([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MARKETER]) // ✅ ADD MARKETER
      .withMessage('Invalid role')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'Email id already exists!' });
      }

      user = new User({
        firstName,
        lastName,
        email,
        password,
        role
      });

      await user.save();

      res.status(201).json({
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error creating admin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
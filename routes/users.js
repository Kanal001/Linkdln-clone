const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users (with pagination and search)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userType = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by user type
    if (userType) {
      query.userType = userType;
    }

    // Exclude current user and get only active users
    query._id = { $ne: req.user._id };
    query.isActive = true;

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('connections.user', 'firstName lastName profileImage headline')
      .populate('followers', 'firstName lastName profileImage')
      .populate('following', 'firstName lastName profileImage');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add profile view
    if (req.user._id.toString() !== user._id.toString()) {
      user.profileViews.push({
        viewer: req.user._id,
        viewedAt: new Date()
      });
      await user.save();
    }

    res.json(user.getPublicProfile());

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'headline', 'summary', 'location',
      'profileImage', 'coverImage', 'skills', 'experience', 'education',
      'companyName', 'companySize', 'industry'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// Send connection request
router.post('/connect/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already connected
    const existingConnection = req.user.connections.find(
      conn => conn.user.toString() === targetUserId
    );

    if (existingConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    // Add pending connection to current user
    req.user.connections.push({
      user: targetUserId,
      status: 'pending'
    });
    await req.user.save();

    // Add connection request to target user
    targetUser.connections.push({
      user: currentUserId,
      status: 'pending'
    });
    await targetUser.save();

    res.json({ message: 'Connection request sent successfully' });

  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({
      error: 'Failed to send connection request',
      details: error.message
    });
  }
});

// Accept connection request
router.post('/connect/accept/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    // Update connection status for current user
    const currentUserConnection = req.user.connections.find(
      conn => conn.user.toString() === targetUserId
    );

    if (!currentUserConnection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    currentUserConnection.status = 'connected';
    currentUserConnection.connectedAt = new Date();
    await req.user.save();

    // Update connection status for target user
    const targetUser = await User.findById(targetUserId);
    const targetUserConnection = targetUser.connections.find(
      conn => conn.user.toString() === currentUserId.toString()
    );

    if (targetUserConnection) {
      targetUserConnection.status = 'connected';
      targetUserConnection.connectedAt = new Date();
      await targetUser.save();
    }

    res.json({ message: 'Connection request accepted' });

  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({
      error: 'Failed to accept connection',
      details: error.message
    });
  }
});

// Get user's connections
router.get('/profile/connections', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'connections.user',
        select: 'firstName lastName profileImage headline location'
      });

    const connections = user.connections
      .filter(conn => conn.status === 'connected')
      .map(conn => ({
        ...conn.user.toObject(),
        connectedAt: conn.connectedAt
      }))
      .sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt));

    res.json({
      connections,
      totalConnections: connections.length
    });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      error: 'Failed to fetch connections',
      details: error.message
    });
  }
});

// Get connection requests
router.get('/profile/connection-requests', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'connections.user',
        select: 'firstName lastName profileImage headline location'
      });

    const pendingRequests = user.connections
      .filter(conn => conn.status === 'pending')
      .map(conn => ({
        ...conn.user.toObject(),
        requestedAt: conn.connectedAt
      }))
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.json({
      requests: pendingRequests,
      totalRequests: pendingRequests.length
    });

  } catch (error) {
    console.error('Get connection requests error:', error);
    res.status(500).json({
      error: 'Failed to fetch connection requests',
      details: error.message
    });
  }
});

// Search users with advanced filters
router.get('/search/advanced', authenticateToken, async (req, res) => {
  try {
    const {
      query = '',
      skills = '',
      location = '',
      experience = '',
      company = '',
      page = 1,
      limit = 20
    } = req.query;

    const skip = (page - 1) * limit;
    let searchQuery = { isActive: true, _id: { $ne: req.user._id } };

    // Text search
    if (query) {
      searchQuery.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { headline: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } }
      ];
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      searchQuery.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    // Location filter
    if (location) {
      searchQuery.location = { $regex: location, $options: 'i' };
    }

    // Company filter
    if (company) {
      searchQuery.$or = [
        { companyName: { $regex: company, $options: 'i' } },
        { 'experience.company': { $regex: company, $options: 'i' } }
      ];
    }

    const users = await User.find(searchQuery)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
});

module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const { Conversation } = require('../models/Message');
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

// Get all conversations for current user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'firstName lastName profileImage headline')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

    const conversationsWithData = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );

      const userUnreadCount = conv.unreadCount.find(
        uc => uc.user.toString() === req.user._id.toString()
      );

      return {
        conversationId: conv.conversationId,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: userUnreadCount ? userUnreadCount.count : 0,
        isArchived: conv.isArchived.find(
          arch => arch.user.toString() === req.user._id.toString()
        )?.archived || false
      };
    });

    res.json({ conversations: conversationsWithData });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      details: error.message
    });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const conversationId = req.params.conversationId;

    // Verify user is part of this conversation
    const conversation = await Conversation.findOne({
      conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
    .populate('sender', 'firstName lastName profileImage')
    .populate('recipient', 'firstName lastName profileImage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversationId,
      isDeleted: false
    });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        recipient: req.user._id,
        status: { $ne: 'read' }
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    // Update unread count
    const userUnreadCount = conversation.unreadCount.find(
      uc => uc.user.toString() === req.user._id.toString()
    );
    if (userUnreadCount) {
      userUnreadCount.count = 0;
    } else {
      conversation.unreadCount.push({
        user: req.user._id,
        count: 0
      });
    }
    await conversation.save();

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      details: error.message
    });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text', attachments = [] } = req.body;

    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Create conversation ID
    const conversationId = Message.createConversationId(req.user._id, recipientId);

    // Create message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      messageType,
      attachments,
      conversationId
    });

    await message.save();

    // Update or create conversation
    let conversation = await Conversation.findOne({ conversationId });
    
    if (!conversation) {
      conversation = new Conversation({
        conversationId,
        participants: [req.user._id, recipientId],
        lastMessage: message._id,
        lastMessageAt: new Date()
      });
    } else {
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
    }

    // Update unread count for recipient
    const recipientUnreadCount = conversation.unreadCount.find(
      uc => uc.user.toString() === recipientId
    );
    if (recipientUnreadCount) {
      recipientUnreadCount.count += 1;
    } else {
      conversation.unreadCount.push({
        user: recipientId,
        count: 1
      });
    }

    await conversation.save();

    // Populate message data for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName profileImage')
      .populate('recipient', 'firstName lastName profileImage');

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: populatedMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// Start new conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ error: 'Recipient and initial message are required' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const conversationId = Message.createConversationId(req.user._id, recipientId);

    // Check if conversation already exists
    let conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      return res.status(400).json({ error: 'Conversation already exists' });
    }

    // Create first message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      conversationId
    });

    await message.save();

    // Create conversation
    conversation = new Conversation({
      conversationId,
      participants: [req.user._id, recipientId],
      lastMessage: message._id,
      lastMessageAt: new Date(),
      unreadCount: [{
        user: recipientId,
        count: 1
      }]
    });

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'firstName lastName profileImage headline')
      .populate('lastMessage');

    res.status(201).json({
      message: 'Conversation started successfully',
      conversation: populatedConversation
    });

  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
      details: error.message
    });
  }
});

// Delete message (soft delete)
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await message.softDelete();

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      details: error.message
    });
  }
});

// Archive conversation
router.put('/conversations/:conversationId/archive', authenticateToken, async (req, res) => {
  try {
    const { archived = true } = req.body;
    const conversationId = req.params.conversationId;

    const conversation = await Conversation.findOne({
      conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const userArchiveStatus = conversation.isArchived.find(
      arch => arch.user.toString() === req.user._id.toString()
    );

    if (userArchiveStatus) {
      userArchiveStatus.archived = archived;
    } else {
      conversation.isArchived.push({
        user: req.user._id,
        archived
      });
    }

    await conversation.save();

    res.json({
      message: archived ? 'Conversation archived' : 'Conversation unarchived'
    });

  } catch (error) {
    console.error('Archive conversation error:', error);
    res.status(500).json({
      error: 'Failed to archive conversation',
      details: error.message
    });
  }
});

// Search conversations
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search in message content and user names
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'firstName lastName profileImage headline');

    // Filter conversations based on participant names or get messages with content search
    const filteredConversations = [];

    for (const conv of conversations) {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );

      const participantMatch = 
        otherParticipant.firstName.toLowerCase().includes(query.toLowerCase()) ||
        otherParticipant.lastName.toLowerCase().includes(query.toLowerCase()) ||
        otherParticipant.headline?.toLowerCase().includes(query.toLowerCase());

      if (participantMatch) {
        filteredConversations.push(conv);
        continue;
      }

      // Search in message content
      const messageMatch = await Message.findOne({
        conversationId: conv.conversationId,
        content: { $regex: query, $options: 'i' },
        isDeleted: false
      });

      if (messageMatch) {
        filteredConversations.push(conv);
      }
    }

    const paginatedResults = filteredConversations
      .slice(skip, skip + parseInt(limit));

    res.json({
      conversations: paginatedResults.map(conv => {
        const otherParticipant = conv.participants.find(
          p => p._id.toString() !== req.user._id.toString()
        );
        return {
          conversationId: conv.conversationId,
          participant: otherParticipant,
          lastMessageAt: conv.lastMessageAt
        };
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredConversations.length / limit),
        totalResults: filteredConversations.length
      }
    });

  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({
      error: 'Failed to search conversations',
      details: error.message
    });
  }
});

module.exports = router;
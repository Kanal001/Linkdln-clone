const express = require('express');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
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

// Get feed posts (with pagination)
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get posts from user's connections and public posts
    const connectedUserIds = req.user.connections
      .filter(conn => conn.status === 'connected')
      .map(conn => conn.user);

    const query = {
      $or: [
        { author: { $in: connectedUserIds } },
        { author: req.user._id },
        { visibility: 'public' }
      ],
      isHidden: false
    };

    const posts = await Post.find(query)
      .populate({
        path: 'author',
        select: 'firstName lastName profileImage headline'
      })
      .populate({
        path: 'comments.user',
        select: 'firstName lastName profileImage'
      })
      .populate({
        path: 'likes.user',
        select: 'firstName lastName profileImage'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    // Add engagement metrics to each post
    const postsWithMetrics = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      sharesCount: post.shares.length,
      isLikedByUser: post.isLikedBy(req.user._id),
      engagementRate: post.getEngagementRate()
    }));

    res.json({
      posts: postsWithMetrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      error: 'Failed to fetch feed',
      details: error.message
    });
  }
});

// Create new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      content,
      postType = 'text',
      images = [],
      video = null,
      document = null,
      visibility = 'public'
    } = req.body;

    // Extract hashtags and mentions from content
    const hashtagRegex = /#[\w]+/g;
    const mentionRegex = /@[\w]+/g;
    
    const hashtags = content.match(hashtagRegex)?.map(tag => tag.slice(1)) || [];
    const mentionHandles = content.match(mentionRegex)?.map(mention => mention.slice(1)) || [];

    // Find mentioned users (simplified - in real app you'd have usernames)
    const mentions = await User.find({
      $or: [
        { firstName: { $in: mentionHandles } },
        { lastName: { $in: mentionHandles } }
      ]
    }).select('_id');

    const post = new Post({
      content,
      author: req.user._id,
      postType,
      images,
      video,
      document,
      hashtags,
      mentions: mentions.map(user => user._id),
      visibility
    });

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'firstName lastName profileImage headline');

    res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      error: 'Failed to create post',
      details: error.message
    });
  }
});

// Get specific post
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName profileImage headline')
      .populate('comments.user', 'firstName lastName profileImage')
      .populate('likes.user', 'firstName lastName profileImage');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    const postWithMetrics = {
      ...post.toObject(),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      sharesCount: post.shares.length,
      isLikedByUser: post.isLikedBy(req.user._id)
    };

    res.json(postWithMetrics);

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: 'Failed to fetch post',
      details: error.message
    });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isLiked = post.isLikedBy(req.user._id);

    if (isLiked) {
      await post.removeLike(req.user._id);
      res.json({ message: 'Post unliked', liked: false });
    } else {
      await post.addLike(req.user._id);
      res.json({ message: 'Post liked', liked: true });
    }

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      error: 'Failed to like post',
      details: error.message
    });
  }
});

// Add comment to post
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.addComment(req.user._id, content.trim());

    const updatedPost = await Post.findById(req.params.id)
      .populate('comments.user', 'firstName lastName profileImage');

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Failed to add comment',
      details: error.message
    });
  }
});

// Delete post (only by author)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      details: error.message
    });
  }
});

// Get user's posts
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      author: req.params.userId,
      isHidden: false
    };

    // If viewing someone else's posts, only show public posts unless connected
    if (req.params.userId !== req.user._id.toString()) {
      const isConnected = req.user.connections.some(
        conn => conn.user.toString() === req.params.userId && conn.status === 'connected'
      );

      if (!isConnected) {
        query.visibility = 'public';
      } else {
        query.visibility = { $in: ['public', 'connections'] };
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'firstName lastName profileImage headline')
      .populate('comments.user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    const postsWithMetrics = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      sharesCount: post.shares.length,
      isLikedByUser: post.isLikedBy(req.user._id)
    }));

    res.json({
      posts: postsWithMetrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      error: 'Failed to fetch user posts',
      details: error.message
    });
  }
});

// Share post
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { shareComment = '' } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already shared
    const alreadyShared = post.shares.some(
      share => share.user.toString() === req.user._id.toString()
    );

    if (alreadyShared) {
      return res.status(400).json({ error: 'Post already shared' });
    }

    post.shares.push({
      user: req.user._id,
      shareComment: shareComment.trim()
    });

    await post.save();

    res.json({ message: 'Post shared successfully' });

  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      error: 'Failed to share post',
      details: error.message
    });
  }
});

// Search posts by hashtag
router.get('/hashtag/:hashtag', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const hashtag = req.params.hashtag.toLowerCase();

    const posts = await Post.find({
      hashtags: hashtag,
      visibility: 'public',
      isHidden: false
    })
    .populate('author', 'firstName lastName profileImage headline')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Post.countDocuments({
      hashtags: hashtag,
      visibility: 'public',
      isHidden: false
    });

    const postsWithMetrics = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      sharesCount: post.shares.length,
      isLikedByUser: post.isLikedBy(req.user._id)
    }));

    res.json({
      hashtag,
      posts: postsWithMetrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });

  } catch (error) {
    console.error('Search hashtag error:', error);
    res.status(500).json({
      error: 'Failed to search posts by hashtag',
      details: error.message
    });
  }
});

// Get trending hashtags
router.get('/trending/hashtags', async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trendingHashtags = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo },
          visibility: 'public',
          isHidden: false
        }
      },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          posts: { $addToSet: '$_id' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      trendingHashtags: trendingHashtags.map(item => ({
        hashtag: item._id,
        postCount: item.count
      }))
    });

  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      error: 'Failed to fetch trending hashtags',
      details: error.message
    });
  }
});

module.exports = router;
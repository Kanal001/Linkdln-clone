const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Post Content
  content: {
    type: String,
    required: true,
    maxlength: 3000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Media attachments
  images: [{
    url: String,
    caption: String
  }],
  video: {
    url: String,
    thumbnail: String,
    duration: Number
  },
  document: {
    url: String,
    filename: String,
    fileType: String
  },
  
  // Post Type
  postType: {
    type: String,
    enum: ['text', 'image', 'video', 'article', 'job_share', 'poll'],
    default: 'text'
  },
  
  // Engagement
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    shareComment: String
  }],
  
  // Hashtags and mentions
  hashtags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Post settings
  visibility: {
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public'
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  
  // Moderation
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ postType: 1 });

// Virtual for total likes count
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for total comments count
postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Virtual for total shares count
postSchema.virtual('sharesCount').get(function() {
  return this.shares.length;
});

// Method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like
postSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Method to remove like
postSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
postSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content
  });
  return this.save();
};

// Method to get engagement rate
postSchema.methods.getEngagementRate = function() {
  if (this.viewCount === 0) return 0;
  const totalEngagements = this.likes.length + this.comments.length + this.shares.length;
  return (totalEngagements / this.viewCount) * 100;
};

module.exports = mongoose.model('Post', postSchema);
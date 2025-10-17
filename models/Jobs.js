const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic Job Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },

  // Job Details
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry-level', 'associate', 'mid-senior', 'director', 'executive'],
    required: true
  },
  workplaceType: {
    type: String,
    enum: ['on-site', 'remote', 'hybrid'],
    default: 'on-site'
  },

  // Requirements and Skills
  skills: [String],
  requirements: [String],
  responsibilities: [String],

  // Compensation
  salaryMin: {
    type: Number,
    default: null
  },
  salaryMax: {
    type: Number,
    default: null
  },
  salaryCurrency: {
    type: String,
    default: 'USD'
  },

  // Company Information
  companyLogo: {
    type: String,
    default: ''
  },
  companySize: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: ''
  },

  // Job Posting Details
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicationEmail: {
    type: String,
    required: true
  },
  applicationUrl: {
    type: String,
    default: ''
  },

  // Job Status
  status: {
    type: String,
    enum: ['active', 'paused', 'closed', 'draft'],
    default: 'active'
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },

  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },

  // Applications
  applications: [{
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    resume: String,
    coverLetter: String,
    customAnswers: [{
      question: String,
      answer: String
    }]
  }]
}, { timestamps: true });

// Indexes
jobSchema.index({ title: 'text', description: 'text', skills: 'text', company: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ expiryDate: 1 });

// Virtuals
jobSchema.virtual('totalApplications').get(function () {
  return this.applications.length;
});

// Methods
jobSchema.methods.isActive = function () {
  return this.status === 'active' && this.expiryDate > new Date();
};

jobSchema.methods.getListingData = function () {
  return {
    _id: this._id,
    title: this.title,
    company: this.company,
    location: this.location,
    employmentType: this.employmentType,
    experienceLevel: this.experienceLevel,
    workplaceType: this.workplaceType,
    skills: this.skills.slice(0, 5),
    createdAt: this.createdAt,
    applicationCount: this.applications.length,
    companyLogo: this.companyLogo
  };
};

module.exports = mongoose.model('Job', jobSchema);

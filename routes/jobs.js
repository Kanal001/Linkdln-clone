const express = require('express');
const jwt = require('jsonwebtoken');
const Job = require('../models/Jobs');
const User = require('../models/User');
const router = express.Router();

// Middleware: Token Authentication
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ✅ Get All Jobs (with filters + pagination)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      location = '',
      employmentType = '',
      experienceLevel = '',
      skills = '',
      company = ''
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {
      status: 'active',
      expiryDate: { $gt: new Date() }
    };

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filters
    if (location) query.location = { $regex: location, $options: 'i' };
    if (employmentType) query.employmentType = employmentType;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (company) query.company = { $regex: company, $options: 'i' };
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'firstName lastName companyName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalJobs: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

// ✅ Get Jobs Posted by Current Employer
router.get('/employer/my-jobs', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employer')
      return res.status(403).json({ error: 'Access denied' });

    const { page = 1, limit = 10, status = '' } = req.query;
    const skip = (page - 1) * limit;
    const query = { postedBy: req.user._id };
    if (status) query.status = status;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    const jobsWithStats = jobs.map(job => ({
      ...job.toObject(),
      totalApplications: job.applications.length,
      newApplications: job.applications.filter(app => app.status === 'pending').length
    }));

    res.json({
      jobs: jobsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalJobs: total
      }
    });
  } catch (error) {
    console.error('Employer jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch employer jobs', details: error.message });
  }
});

// ✅ Get Employee Applications
router.get('/employee/my-applications', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employee')
      return res.status(403).json({ error: 'Access denied' });

    const jobs = await Job.find({ 'applications.applicant': req.user._id })
      .populate('postedBy', 'firstName lastName companyName')
      .select('title company location employmentType applications createdAt');

    const applications = jobs.map(job => {
      const userApp = job.applications.find(
        app => app.applicant.toString() === req.user._id.toString()
      );
      return {
        _id: userApp._id,
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          employmentType: job.employmentType,
          postedBy: job.postedBy
        },
        status: userApp.status,
        appliedAt: userApp.appliedAt,
        coverLetter: userApp.coverLetter
      };
    }).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.json({ applications });
  } catch (error) {
    console.error('Employee applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// ✅ Get Job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'firstName lastName companyName profileImage')
      .populate('applications.applicant', 'firstName lastName profileImage headline');

    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.viewCount += 1;
    await job.save();

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job', details: error.message });
  }
});

// ✅ Create Job
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employer')
      return res.status(403).json({ error: 'Only employers can post jobs' });

    const jobData = {
      ...req.body,
      postedBy: req.user._id,
      company: req.user.companyName || req.body.company
    };

    const job = new Job(jobData);
    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate('postedBy', 'firstName lastName companyName profileImage');

    res.status(201).json({ message: 'Job posted successfully', job: populatedJob });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job', details: error.message });
  }
});

// ✅ Update Job
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    const allowedUpdates = [
      'title', 'description', 'location', 'employmentType', 'experienceLevel',
      'skills', 'requirements', 'responsibilities', 'salaryMin', 'salaryMax',
      'status', 'applicationEmail', 'applicationUrl'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) updates[key] = req.body[key];
    });

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('postedBy', 'firstName lastName companyName profileImage');

    res.json({ message: 'Job updated successfully', job: updatedJob });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job', details: error.message });
  }
});

// ✅ Delete Job
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job', details: error.message });
  }
});

// ✅ Apply for Job
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employee')
      return res.status(403).json({ error: 'Only employees can apply' });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.isActive()) return res.status(400).json({ error: 'Job is inactive' });

    const existingApp = job.applications.find(
      app => app.applicant.toString() === req.user._id.toString()
    );
    if (existingApp) return res.status(400).json({ error: 'Already applied' });

    job.applications.push({
      applicant: req.user._id,
      resume: req.body.resume || '',
      coverLetter: req.body.coverLetter || '',
      customAnswers: req.body.customAnswers || []
    });

    job.applicationCount = job.applications.length;
    await job.save();

    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Failed to apply', details: error.message });
  }
});

// ✅ Get Applications for Specific Job
router.get('/:id/applications', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employer')
      return res.status(403).json({ error: 'Access denied' });

    const job = await Job.findById(req.params.id)
      .populate('applications.applicant', 'firstName lastName email profileImage headline skills experience');

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    const { status = '', page = 1, limit = 20 } = req.query;
    let applications = job.applications;
    if (status) applications = applications.filter(app => app.status === status);

    const skip = (page - 1) * limit;
    const paginated = applications
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(skip, skip + parseInt(limit));

    res.json({
      applications: paginated,
      job: { _id: job._id, title: job.title, company: job.company },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(applications.length / limit),
        totalApplications: applications.length
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// ✅ Update Application Status
router.put('/:jobId/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'employer')
      return res.status(403).json({ error: 'Access denied' });

    const { status } = req.body;
    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    const application = job.applications.id(req.params.applicationId);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = status;
    await job.save();

    res.json({ message: 'Application status updated', application });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application', details: error.message });
  }
});

module.exports = router;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Job = require('../models/Jobs');
const Post = require('../models/Post');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkedin_clone';

// Sample data
const sampleUsers = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    password: 'password123',
    userType: 'employee',
    headline: 'Senior Software Engineer at TechCorp',
    summary: 'Passionate software engineer with 8+ years of experience in building scalable web applications.',
    location: 'San Francisco, CA',
    skills: ['React', 'JavaScript', 'Node.js', 'Python', 'AWS', 'Docker'],
    experience: [{
      title: 'Senior Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      startDate: new Date('2020-01-01'),
      current: true,
      description: 'Leading frontend development for enterprise SaaS products.'
    }],
    education: [{
      institution: 'Stanford University',
      degree: 'MS Computer Science',
      startDate: new Date('2014-09-01'),
      endDate: new Date('2016-06-01')
    }]
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    password: 'password123',
    userType: 'employee',
    headline: 'Software Engineer at Google',
    summary: 'Full-stack developer passionate about building innovative solutions.',
    location: 'Mountain View, CA',
    skills: ['Java', 'Python', 'Kubernetes', 'GCP', 'Machine Learning'],
    experience: [{
      title: 'Software Engineer',
      company: 'Google',
      location: 'Mountain View, CA',
      startDate: new Date('2019-06-01'),
      current: true,
      description: 'Developing scalable backend systems for Google Cloud Platform.'
    }]
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com',
    password: 'password123',
    userType: 'employee',
    headline: 'Product Manager at StartupX',
    summary: 'Strategic product manager with experience in agile methodologies.',
    location: 'New York, NY',
    skills: ['Product Management', 'Agile', 'Scrum', 'Data Analysis', 'UX Design'],
    experience: [{
      title: 'Product Manager',
      company: 'StartupX',
      location: 'New York, NY',
      startDate: new Date('2021-03-01'),
      current: true,
      description: 'Managing product development lifecycle from conception to launch.'
    }]
  },
  {
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@email.com',
    password: 'password123',
    userType: 'employee',
    headline: 'UX Designer at CreativeLabs',
    summary: 'Creative designer with expertise in user-centered design principles.',
    location: 'Austin, TX',
    skills: ['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research']
  },
  // Employers
  {
    firstName: 'Jennifer',
    lastName: 'Wilson',
    email: 'jennifer.wilson@techcorp.com',
    password: 'password123',
    userType: 'employer',
    companyName: 'TechCorp',
    companyId: 'TECH001',
    headline: 'HR Director at TechCorp',
    location: 'San Francisco, CA',
    industry: 'Technology'
  },
  {
    firstName: 'Robert',
    lastName: 'Martinez',
    email: 'robert.martinez@startupx.com',
    password: 'password123',
    userType: 'employer',
    companyName: 'StartupX',
    companyId: 'STX001',
    headline: 'Founder & CEO at StartupX',
    location: 'New York, NY',
    industry: 'Technology'
  }
];

const sampleJobs = [
  {
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    description: 'We are looking for an experienced frontend developer to join our growing team. You will work on cutting-edge web applications using React and modern JavaScript frameworks.',
    employmentType: 'full-time',
    experienceLevel: 'mid-senior',
    workplaceType: 'hybrid',
    skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML5'],
    requirements: ['3+ years of React experience', 'Strong JavaScript skills', 'Experience with modern development tools'],
    responsibilities: ['Develop responsive web applications', 'Collaborate with design team', 'Code review and mentoring'],
    salaryMin: 120000,
    salaryMax: 150000,
    applicationEmail: 'careers@techcorp.com',
    status: 'active'
  },
  {
    title: 'UX/UI Designer',
    company: 'CreativeLabs',
    location: 'Remote',
    description: 'Join our creative team as a UX/UI designer. You will be responsible for creating beautiful and functional user interfaces.',
    employmentType: 'full-time',
    experienceLevel: 'mid-senior',
    workplaceType: 'remote',
    skills: ['Figma', 'Sketch', 'Adobe XD', 'UI Design', 'UX Research'],
    requirements: ['3+ years of UX/UI design experience', 'Portfolio showcasing design work', 'Experience with design systems'],
    responsibilities: ['Create user interface designs', 'Conduct user research', 'Collaborate with development team'],
    salaryMin: 80000,
    salaryMax: 110000,
    applicationEmail: 'design@creativelabs.com',
    status: 'active'
  },
  {
    title: 'Product Manager',
    company: 'StartupX',
    location: 'New York, NY',
    description: 'Lead product development initiatives and work with cross-functional teams to deliver exceptional products.',
    employmentType: 'full-time',
    experienceLevel: 'mid-senior',
    workplaceType: 'on-site',
    skills: ['Product Management', 'Agile', 'Scrum', 'Data Analysis', 'Market Research'],
    requirements: ['5+ years of product management experience', 'Experience with agile methodologies', 'Strong analytical skills'],
    responsibilities: ['Define product roadmap', 'Collaborate with engineering team', 'Analyze market trends'],
    salaryMin: 130000,
    salaryMax: 160000,
    applicationEmail: 'careers@startupx.com',
    status: 'active'
  }
];

const samplePosts = [
  {
    content: 'Just wrapped up an amazing project using React and Node.js! The team did an incredible job delivering this complex application ahead of schedule. 🚀\n\nKey features we implemented:\n- Real-time collaboration\n- Advanced analytics dashboard\n- Mobile-responsive design\n\n#WebDevelopment #React #NodeJS',
    postType: 'text',
    hashtags: ['webdevelopment', 'react', 'nodejs'],
    visibility: 'public'
  },
  {
    content: 'Thrilled to announce that our team is hiring! We\'re looking for passionate Frontend Developers to join our growing team. If you love working with modern JavaScript frameworks and care about user experience, this might be the perfect opportunity for you.\n\n✅ React/Vue experience\n✅ CSS expertise\n✅ 3+ years professional experience\n\nDM me if you\'re interested! #Hiring #Frontend #TechJobs',
    postType: 'text',
    hashtags: ['hiring', 'frontend', 'techjobs'],
    visibility: 'public'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Job.deleteMany({});
    await Post.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`   ✅ Created user: ${user.fullName} (${user.userType})`);
    }

    // Create connections between users
    console.log('🔗 Creating connections...');
    const employees = createdUsers.filter(u => u.userType === 'employee');
    for (let i = 0; i < employees.length - 1; i++) {
      for (let j = i + 1; j < employees.length; j++) {
        employees[i].connections.push({
          user: employees[j]._id,
          status: 'connected',
          connectedAt: new Date()
        });
        employees[j].connections.push({
          user: employees[i]._id,
          status: 'connected',
          connectedAt: new Date()
        });
        await employees[i].save();
        await employees[j].save();
      }
    }

    // Create jobs
    console.log('💼 Creating jobs...');
    const employers = createdUsers.filter(u => u.userType === 'employer');
    
    for (let i = 0; i < sampleJobs.length; i++) {
      const jobData = {
        ...sampleJobs[i],
        postedBy: employers[i % employers.length]._id
      };
      
      const job = new Job(jobData);
      await job.save();
      console.log(`   ✅ Created job: ${job.title} at ${job.company}`);
    }

    // Create posts
    console.log('📝 Creating posts...');
    for (let i = 0; i < samplePosts.length; i++) {
      const postData = {
        ...samplePosts[i],
        author: employees[i % employees.length]._id
      };
      
      const post = new Post(postData);
      await post.save();
      console.log(`   ✅ Created post by ${employees[i % employees.length].fullName}`);
    }

    // Add some applications to jobs
    console.log('📄 Creating job applications...');
    const jobs = await Job.find({});
    for (const job of jobs) {
      // Add 2-3 applications per job
      const applicants = employees.slice(0, 3);
      for (const applicant of applicants) {
        if (applicant._id.toString() !== job.postedBy.toString()) {
          job.applications.push({
            applicant: applicant._id,
            appliedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
            status: Math.random() > 0.7 ? 'reviewed' : 'pending',
            coverLetter: 'I am very interested in this position and believe my skills would be a great fit for your team.'
          });
        }
      }
      job.applicationCount = job.applications.length;
      await job.save();
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users created: ${createdUsers.length}`);
    console.log(`   💼 Jobs created: ${sampleJobs.length}`);
    console.log(`   📝 Posts created: ${samplePosts.length}`);
    console.log(`   🔗 Connections created between employees`);
    console.log(`   📄 Applications added to jobs`);

    console.log('\n🔐 Test Accounts:');
    console.log('   Employee: sarah.johnson@email.com / password123');
    console.log('   Employee: michael.chen@email.com / password123');
    console.log('   Employer: jennifer.wilson@techcorp.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeding script
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
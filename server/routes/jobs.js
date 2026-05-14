const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');

// GET /api/jobs — List all jobs
router.get('/', auth, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        console.error('Get jobs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/jobs/apply/:jobId — Apply to a job (keyword matching)
router.post('/apply/:jobId', auth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
            userId: req.user.id,
            jobId,
        });
        if (existingApplication) {
            return res.status(400).json({
                message: 'Already applied to this job',
                application: existingApplication,
            });
        }

        // Get user profile and resume keywords
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.resumeKeywords || user.resumeKeywords.length === 0) {
            return res.status(400).json({
                message: 'Please upload your resume before applying',
            });
        }

        // Combine resume keywords + user skills for matching
        const candidateKeywords = new Set([
            ...user.resumeKeywords.map((k) => k.toLowerCase()),
            ...user.skills.map((s) => s.toLowerCase()),
        ]);

        const jobKeywords = job.keywords.map((k) => k.toLowerCase());

        // Find matching keywords
        const matchedKeywords = jobKeywords.filter((jk) =>
            candidateKeywords.has(jk)
        );

        // Shortlist if 5 or more keywords match
        const isShortlisted = matchedKeywords.length >= 5;

        // Create application
        const application = await Application.create({
            userId: req.user.id,
            jobId,
            matchedKeywords,
            totalMatchCount: matchedKeywords.length,
            isShortlisted,
            overallResult: isShortlisted ? 'shortlisted' : 'rejected',
            currentStage: isShortlisted ? 'aptitude' : 'completed',
        });

        await application.populate('jobId');

        res.json({
            message: isShortlisted
                ? `🎉 Application submitted! You have been shortlisted for the next round.`
                : `❌ Application submitted. Unfortunately, you were not shortlisted for this role.`,
            application,
            isShortlisted,
        });
    } catch (err) {
        console.error('Apply error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs/applications — Get all user applications
router.get('/applications', auth, async (req, res) => {
    try {
        const applications = await Application.find({ userId: req.user.id })
            .populate('jobId')
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (err) {
        console.error('Get applications error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs/applications/:applicationId — Get single application
router.get('/applications/:applicationId', auth, async (req, res) => {
    try {
        const application = await Application.findOne({
            _id: req.params.applicationId,
            userId: req.user.id,
        }).populate('jobId');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json(application);
    } catch (err) {
        console.error('Get application error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Application = require('../models/Application');
const Job = require('../models/Job');

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const totalCandidates = await User.countDocuments({ role: 'candidate' });
        const totalApplications = await Application.countDocuments();
        const shortlisted = await Application.countDocuments({ isShortlisted: true });
        const aptitudePassed = await Application.countDocuments({ aptitudePassed: true });
        const codingPassed = await Application.countDocuments({ codingPassed: true });
        const interviewPassed = await Application.countDocuments({ interviewPassed: true });
        const selected = await Application.countDocuments({ overallResult: 'selected' });
        const rejected = await Application.countDocuments({ overallResult: { $in: ['rejected', 'aptitude_failed', 'coding_failed', 'interview_failed'] } });

        res.json({
            totalCandidates,
            totalApplications,
            shortlisted,
            aptitudePassed,
            codingPassed,
            interviewPassed,
            selected,
            rejected,
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/candidates — List all candidates
router.get('/candidates', adminAuth, async (req, res) => {
    try {
        const candidates = await User.find({ role: 'candidate' })
            .select('-password -__v')
            .sort({ createdAt: -1 });

        // Get application counts for each candidate
        const candidatesWithApps = await Promise.all(
            candidates.map(async (candidate) => {
                const applications = await Application.find({ userId: candidate._id })
                    .populate('jobId', 'title company')
                    .sort({ createdAt: -1 });

                return {
                    ...candidate.toObject(),
                    applications,
                    applicationCount: applications.length,
                };
            })
        );

        res.json(candidatesWithApps);
    } catch (err) {
        console.error('Admin candidates error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/candidates/:id — Single candidate with all applications
router.get('/candidates/:id', adminAuth, async (req, res) => {
    try {
        const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' })
            .select('-password -__v');

        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const applications = await Application.find({ userId: candidate._id })
            .populate('jobId')
            .sort({ createdAt: -1 });

        res.json({
            candidate,
            applications,
        });
    } catch (err) {
        console.error('Admin candidate detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/applications — All applications
router.get('/applications', adminAuth, async (req, res) => {
    try {
        const applications = await Application.find()
            .populate('userId', 'name email skills')
            .populate('jobId', 'title company')
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (err) {
        console.error('Admin applications error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/applications/:id — Single application detail
router.get('/applications/:id', adminAuth, async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('userId', 'name email phone skills resumeKeywords')
            .populate('jobId');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json(application);
    } catch (err) {
        console.error('Admin application detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

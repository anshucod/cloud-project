const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Application = require('../models/Application');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');

// Middleware to verify HR role
const authHR = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'hr') {
            return res.status(403).json({ message: 'Access denied: HR only' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// GET /api/hr/candidates
router.get('/candidates', authHR, async (req, res) => {
    try {
        const { jobId, skills, minCgpa, minScore } = req.query;

        if (!jobId) {
            return res.status(400).json({ message: 'Job ID is required' });
        }

        // Build base application query
        let appQuery = { jobId };

        // If minScore is provided, filter by totalAssessmentScore
        if (minScore) {
            appQuery.totalAssessmentScore = { $gte: Number(minScore) };
        }

        // Find applications matching the job (and score if provided)
        let applications = await Application.find(appQuery)
            .populate('userId', 'name email phone skills cgpa resumePath profileCompleted')
            .populate('jobId', 'title company');

        // Filter populated results based on User attributes
        applications = applications.filter(app => {
            if (!app.userId) return false; // Filter out orphaned records

            const user = app.userId;
            
            // Check CGPA
            if (minCgpa && Number(minCgpa) > 0) {
                if (user.cgpa == null || user.cgpa < Number(minCgpa)) {
                    return false;
                }
            }

            // Check Skills
            if (skills) {
                const requiredSkills = skills.split(',').map(s => s.trim().toLowerCase());
                const userSkills = user.skills.map(s => s.toLowerCase());
                
                // Check if user has ALL required skills (or AT LEAST ONE, depending on business logic)
                // Let's implement AT LEAST ONE matching skill for broader search
                const hasSkill = requiredSkills.some(skill => userSkills.includes(skill));
                if (!hasSkill && requiredSkills.length > 0) {
                    return false;
                }
            }

            return true;
        });

        res.json({ candidates: applications });
    } catch (err) {
        console.error('Error fetching HR candidates:', err);
        res.status(500).json({ message: 'Failed to fetch candidates' });
    }
});

// GET /api/hr/candidate/:id
router.get('/candidate/:id', authHR, async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('userId', '-password')
            .populate('jobId');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json({ application });
    } catch (err) {
        console.error('Error fetching HR candidate detail:', err);
        res.status(500).json({ message: 'Failed to fetch candidate details' });
    }
});

module.exports = router;

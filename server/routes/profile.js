const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Stop words to remove during keyword extraction
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
    'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you',
    'your', 'he', 'she', 'it', 'they', 'them', 'his', 'her', 'its', 'their',
    'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how',
    'not', 'no', 'nor', 'as', 'if', 'then', 'than', 'too', 'very',
    'just', 'about', 'above', 'after', 'again', 'all', 'also', 'am',
    'any', 'because', 'before', 'below', 'between', 'both', 'each',
    'few', 'more', 'most', 'other', 'over', 'own', 'same', 'so',
    'some', 'such', 'up', 'down', 'out', 'off', 'here', 'there',
    'through', 'during', 'until', 'while', 'into',
    // Common resume filler words
    'experience', 'work', 'working', 'worked', 'using', 'used', 'use',
    'project', 'projects', 'year', 'years', 'month', 'months',
    'strong', 'good', 'excellent', 'well', 'able', 'ability',
    'responsible', 'include', 'including', 'various', 'etc',
    'university', 'college', 'school', 'education', 'degree',
]);

// Configure multer for resume uploads (using memoryStorage to avoid node --watch restarts)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
});

// Extract keywords from resume text
function extractKeywords(text) {
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    // Keep unique words
    const unique = [...new Set(words)];
    return unique;
}

// GET /api/profile — Get current user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/profile — Update profile
router.post('/', auth, async (req, res) => {
    try {
        const { name, phone, skills } = req.body;
        console.log(`👤 Profile Update Request:`, req.body);

        if (!name || !phone || !skills || (Array.isArray(skills) && skills.length === 0)) {
            return res.status(400).json({ message: 'Name, Phone, and at least one Skill are required' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (skills) {
            updateData.skills = Array.isArray(skills)
                ? skills.map((s) => s.toLowerCase().trim()).filter(Boolean)
                : skills.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean);
        }

        // Mark profile as completed if name is provided
        if (name && name.trim()) {
            updateData.profileCompleted = true;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updateData, {
            new: true,
        }).select('-__v');

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/profile/upload-resume — Upload resume PDF and extract keywords
router.post('/upload-resume', auth, upload.single('resume'), async (req, res) => {
    try {
        console.log(`📄 Resume Upload Request from User: ${req.user.id}`);
        
        if (!req.file) {
            console.error('❌ No file received in request');
            return res.status(400).json({ message: 'No file uploaded or invalid file format' });
        }
        // Parse PDF to extract text from buffer
        let resumeText = '';
        try {
            const pdfData = await pdfParse(req.file.buffer);
            resumeText = pdfData.text;
            console.log(`📄 PDF parsed successfully from buffer (${resumeText.length} chars)`);
        } catch (pdfErr) {
            console.error('❌ PDF Parse Error:', pdfErr.message);
            return res.status(400).json({ message: 'Failed to process PDF file. Please ensure it is a valid PDF.' });
        }

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({ message: 'The uploaded PDF seems to be empty or unreadable.' });
        }

        // We skip saving the file to disk because `node --watch` will detect the new file
        // in the `uploads` directory and immediately restart the server, dropping the request connection!
        // Instead, we just use the parsed text and save a dummy string to satisfy the frontend boolean check.
        const filePath = 'parsed_in_memory';
        console.log(`📂 Resume processed in memory. Skipping disk write to prevent server restart.`);

        // AI-Powered Resume Parsing with Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
            Extract professional information from the following resume text.
            Return the result in EXACTLY this JSON format (no markdown, no code blocks):
            {
                "name": "Full Name",
                "phone": "Phone Number",
                "skills": ["skill1", "skill2"],
                "experience": ["job title at company", "another job"],
                "education": ["degree from university"]
            }
            Resume Text:
            ${resumeText}
        `;

        let parsedData;
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            parsedData = JSON.parse(cleanedText);
            console.log("✅ AI Resume Parsing Successful");
        } catch (e) {
            console.warn('⚠️ AI Parsing Failed (Quota or Error):', e.message);
            // Fallback to manual extraction for keywords at least
            parsedData = { 
                name: '', 
                phone: '', 
                skills: extractKeywords(resumeText), 
                experience: [], 
                education: [],
                isAIFallback: true 
            };
        }

        // Update user with resume path and parsed data
        const updateFields = {
            resumePath: filePath,
            resumeKeywords: parsedData.skills || [],
        };
        
        if (parsedData.name) updateFields.name = parsedData.name;
        if (parsedData.phone) updateFields.phone = parsedData.phone;
        if (parsedData.skills && parsedData.skills.length > 0) updateFields.skills = parsedData.skills;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateFields,
            { new: true }
        ).select('-__v');

        res.json({
            message: 'Resume uploaded and AI-parsed successfully',
            parsedData,
            user,
        });
    } catch (err) {
        console.error('Upload resume error:', err.stack || err);
        res.status(500).json({ message: 'Failed to upload resume: ' + (err.message || 'Server error') });
    }
});

module.exports = router;


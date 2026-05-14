const mongoose = require('mongoose');

const codingSubmissionSchema = new mongoose.Schema({
    questionId: Number,
    code: { type: String, default: '' },
    passed: { type: Boolean, default: null },
    testResults: { type: Array, default: [] },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    matchedKeywords: {
        type: [String],
        default: [],
    },
    totalMatchCount: {
        type: Number,
        default: 0,
    },
    isShortlisted: {
        type: Boolean,
        default: false,
    },
    // Dynamic Questions
    aptitudeQuestions: {
        type: [{
            question: String,
            options: [String],
            correctAnswer: Number, // Index of correct option
        }],
        default: [],
    },
    technicalQuestions: {
        type: [{
            question: String,
            options: [String],
            correctAnswer: Number,
        }],
        default: [],
    },
    // Multiple Coding Questions
    codingQuestions: {
        type: [{
            title: String,
            description: String,
            constraints: [String],
            starterCode: {
                python: String,
                cpp: String,
                java: String,
            },
            testCases: [{
                input: mongoose.Schema.Types.Mixed,
                expected: mongoose.Schema.Types.Mixed,
            }],
        }],
        default: [],
    },
    // Progress persistence
    codingDrafts: {
        type: [{
            language: String,
            code: String,
        }],
        default: [],
    },
    isTerminated: {
        type: Boolean,
        default: false,
    },
    terminationReason: {
        type: String,
        default: '',
    },
    // Aptitude round
    aptitudeScore: {
        type: Number,
        default: null,
    },
    aptitudeAnswers: {
        type: [Number],
        default: [],
    },
    // Coding round — multiple questions, multi-language
    codingLanguage: {
        type: String,
        enum: ['python', 'cpp', 'java', null],
        default: null,
    },
    codingSubmissions: {
        type: [codingSubmissionSchema],
        default: [],
    },
    codingScore: {
        type: Number,
        default: null,
    },
    // Shortlisting Logic (combined score)
    totalAssessmentScore: {
        type: Number,
        default: null,
    },
    isShortlistedForInterview: {
        type: Boolean,
        default: false,
    },
    // AI Interview round
    interviewTranscript: {
        type: [{
            role: { type: String, enum: ['interviewer', 'candidate'] },
            content: String,
            timestamp: { type: Date, default: Date.now },
        }],
        default: [],
    },
    interviewScore: {
        type: {
            content: { type: Number, default: 0 },
            attire: { type: Number, default: 0 },
            confidence: { type: Number, default: 0 },
            pronunciationGrammar: { type: Number, default: 0 },
            eyeTracing: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        default: null,
    },
    interviewPassed: {
        type: Boolean,
        default: null,
    },
    interviewFeedback: {
        type: String,
        default: '',
    },
    // Overall
    overallResult: {
        type: String,
        enum: [
            'pending', 'shortlisted', 'rejected',
            'assessment_completed', 'interview_completed',
            'selected',
        ],
        default: 'pending',
    },
    currentStage: {
        type: String,
        enum: ['applied', 'shortlisting', 'aptitude', 'coding', 'interview', 'completed'],
        default: 'applied',
    },
}, { timestamps: true });

// Prevent duplicate applications
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);

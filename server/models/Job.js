const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    keywords: {
        type: [String],
        required: true,
    },
    location: {
        type: String,
        default: 'Remote',
    },
    salary: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Internship', 'Contract'],
        default: 'Full-time',
    },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);

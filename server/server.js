const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const jobRoutes = require('./routes/jobs');
const testRoutes = require('./routes/test');
const adminRoutes = require('./routes/admin');
const interviewRoutes = require('./routes/interview');
const compilerRoutes = require('./routes/compiler');
const hrRoutes = require('./routes/hr');
const seedJobs = require('./data/sampleJobs');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/hr', hrRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('<h2>Antigravity API server is running successfully!</h2><p>This is the backend server. Please run and access the <b>client</b> app to view the user interface.</p>');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Seed default admin account
async function seedAdmin() {
    try {
        const existing = await User.findOne({ email: 'admin@recruit.com', role: 'admin' });
        if (!existing) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                email: 'admin@recruit.com',
                password: hashedPassword,
                role: 'admin',
                name: 'Admin',
                profileCompleted: true,
            });
            console.log('👤 Default admin created (admin@recruit.com / admin123)');
        }
    } catch (err) {
        console.error('Admin seed error:', err.message);
    }
}

// Seed default HR account
async function seedHR() {
    try {
        const existing = await User.findOne({ email: 'anshukashyap9142@gmail.com', role: 'hr' });
        if (!existing) {
            const hashedPassword = await bcrypt.hash('hr1234', 10);
            await User.create({
                email: 'anshukashyap9142@gmail.com',
                password: hashedPassword,
                role: 'hr',
                name: 'HR Manager',
                profileCompleted: true,
            });
            console.log('👤 Default HR created (anshukashyap9142@gmail.com / hr1234)');
        }
    } catch (err) {
        console.error('HR seed error:', err.message);
    }
}

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_DB_URL)
    .then(async () => {
        console.log('✅ MongoDB connected');
        await seedJobs();
        await seedAdmin();
        await seedHR();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

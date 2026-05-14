const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const axios = require('axios');

async function diagnose() {
    console.log('🔍 Starting System Diagnosis...');

    // 1. Check Gemini
    console.log('\n--- Gemini API Status ---');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Hi, reply with "Gemini is Online"');
        console.log('✅ Gemini Response:', result.response.text().trim());
    } catch (err) {
        console.error('❌ Gemini Error:', err.message);
    }

    // 2. Check Judge0
    console.log('\n--- Judge0 API Status ---');
    const judge0Url = process.env.JUDGE0_HOST || 'http://localhost:2358';
    try {
        const health = await axios.get(`${judge0Url}/healthz`);
        console.log('✅ Judge0 Health:', health.status, health.statusText);
    } catch (err) {
        console.error('❌ Judge0 Error:', err.message);
        console.log('💡 TIP: Check if Docker containers are running and if your firewall allows connection to port 2358.');
    }
}

diagnose();


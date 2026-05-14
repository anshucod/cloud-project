const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_DB_URL).then(async () => {
    const Application = require('./models/Application');
    const result = await Application.updateMany({}, {
        $set: {
            interviewScore: null,
            interviewTranscript: [],
            interviewPassed: false,
            isTerminated: false,
            currentStage: 'interview',
            interviewFeedback: null
        }
    });
    console.log('Reset applications:', result);
    mongoose.disconnect();
}).catch(console.error);

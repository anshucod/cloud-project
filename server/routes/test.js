const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Application = require('../models/Application');
const aptitudeQuestions = require('../data/aptitudeQuestions');
const codingQuestions = require('../data/codingQuestions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GET /api/test/aptitude/:applicationId — Get aptitude questions (dynamic or static)
router.get('/aptitude/:applicationId', auth, async (req, res) => {
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // If questions aren't generated yet, generate them now
        if (application.aptitudeQuestions.length === 0) {
            try {
                console.log(`🔍 [AI] Generating ${application.jobId.title} MCQs...`);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const jobTitle = application.jobId.title;
                
                const prompt = `Generate 10 Aptitude and 10 Technical MCQs for ${jobTitle}. 
                Return ONLY a JSON object: {"aptitude": [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0-3}], "technical": [...]}. 
                No markdown, no backticks.`;

                const result = await model.generateContent(prompt);
                let text = result.response.text().trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

                application.aptitudeQuestions = data.aptitude || [];
                application.technicalQuestions = data.technical || [];
                console.log(`✅ [GENAI] Dynamic Aptitude/Tech for ${jobTitle} generated.`);
            } catch (aiErr) {
                console.error("🚨 [GENAI] Aptitude Failure:", aiErr.message);
                // Enhanced Fallback Strategy: Randomize from bank
                const bank = [...aptitudeQuestions].sort(() => 0.5 - Math.random());
                application.aptitudeQuestions = bank.slice(0, 10);
                application.technicalQuestions = bank.slice(10, 20); 
            }
            await application.save();
        }

        // Return questions without correct answers
        const aptQuestions = application.aptitudeQuestions.map(q => ({
            question: q.question,
            options: q.options
        }));
        const techQuestions = application.technicalQuestions.map(q => ({
            question: q.question,
            options: q.options
        }));

        res.json({
            aptitudeQuestions: aptQuestions,
            technicalQuestions: techQuestions,
            totalAptitude: aptQuestions.length,
            totalTechnical: techQuestions.length,
            timeLimit: 1200, // 20 minutes
        });
    } catch (err) {
        console.error('Fetch aptitude error:', err);
        res.status(500).json({ message: 'Failed to fetch/generate questions' });
    }
});

// POST /api/test/aptitude/:applicationId — Submit aptitude & technical answers
router.post('/aptitude/:applicationId', auth, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { aptitudeAnswers, technicalAnswers } = req.body;

        const application = await Application.findOne({
            _id: applicationId,
            userId: req.user.id,
        });

        if (!application) return res.status(404).json({ message: 'Application not found' });
        if (application.aptitudeScore !== null) return res.status(400).json({ message: 'Test already submitted' });

        let correctCount = 0;
        application.aptitudeQuestions.forEach((q, i) => {
            if (aptitudeAnswers[i] === q.correctAnswer) correctCount++;
        });
        application.technicalQuestions.forEach((q, i) => {
            if (technicalAnswers[i] === q.correctAnswer) correctCount++;
        });

        // 20 questions total, each 2 marks = 40 marks
        application.aptitudeScore = correctCount * 2;
        application.currentStage = 'coding'; // ALWAYS proceed to coding
        application.overallResult = 'pending';
        await application.save();

        res.json({
            message: 'Aptitude assessment completed. Moving to coding challenge...',
            score: application.aptitudeScore,
            total: 40,
            application,
        });
    } catch (err) {
        console.error('Aptitude submit error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/test/coding/:applicationId — Get coding questions (dynamic or static)
router.get('/coding/:applicationId', auth, async (req, res) => {
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (application.codingQuestions.length === 0) {
            try {
                console.log(`🔍 [AI] Generating coding challenges for ${application.jobId?.title || 'Software Engineer'}...`);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const jobTitle = application.jobId?.title || 'Software Engineer';
                
                const prompt = `Generate 2 medium coding challenges for ${jobTitle}.
                Return ONLY a JSON object: {"questions": [{"title": "...", "description": "...", "constraints": [], "starterCode": {"python": "...", "cpp": "...", "java": "..."}, "testCases": [{"input": "...", "expected": "..."}]}]}.
                No markdown, no backticks. Function name must be 'solution'.`;

                const result = await model.generateContent(prompt);
                let text = result.response.text().trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

                application.codingQuestions = data.questions || [];
                console.log(`✅ [GENAI] Dynamic Coding for ${jobTitle} generated.`);
            } catch (aiErr) {
                console.error("🚨 [GENAI] Coding Failure:", aiErr.message);
                // Fallback to our now-standardized static questions
                application.codingQuestions = codingQuestions.slice(0, 2);
            }
            await application.save();
        }

        res.json({
            questions: application.codingQuestions,
            languages: ['python', 'cpp', 'java'],
            drafts: application.codingDrafts || [],
        });
    } catch (err) {
        console.error('Fetch coding error:', err);
        res.status(500).json({ message: 'Failed to fetch/generate coding questions: ' + err.message });
    }
});


// PUT /api/test/coding/:applicationId/draft — Save progress
router.put('/coding/:applicationId/draft', auth, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { solutions } = req.body;

        const application = await Application.findOne({
            _id: applicationId,
            userId: req.user.id,
        });

        if (!application) return res.status(404).json({ message: 'Application not found' });
        
        application.codingDrafts = solutions;
        await application.save();

        res.json({ message: 'Draft saved successfully' });
    } catch (err) {
        console.error('Draft save error:', err);
        res.status(500).json({ message: 'Failed to save draft' });
    }
});

// POST /api/test/coding/:applicationId — Submit multiple coding answers
router.post('/coding/:applicationId', auth, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { solutions } = req.body; 

        const application = await Application.findOne({
            _id: applicationId,
            userId: req.user.id,
        });

        if (!application) return res.status(404).json({ message: 'Application not found' });
        if (application.codingScore !== null) return res.status(400).json({ message: 'Test already submitted' });

        const axios = require('axios');
        // Local Judge0 doesn't require RapidAPI keys
        const apiHost = process.env.JUDGE0_HOST || 'http://localhost:2358';

        const LANGUAGE_MAP = {
            python: 71, // Python 3.11.2 (Judge0)
            cpp: 54,    // C++ (GCC 9.2.0)
            java: 62,   // Java (OpenJDK 13.0.1)
        };

        let totalCodingScore = 0;
        const allResults = [];

        for (let i = 0; i < application.codingQuestions.length; i++) {
            const question = application.codingQuestions[i];
            const solution = (Array.isArray(solutions) ? solutions[i] : null) || { code: '', language: 'python' };
            
            let passedCount = 0;
            const testResults = [];

            for (const testCase of question.testCases) {
                const toLiteral = (val, lang) => {
                    if (lang === 'python') {
                        if (val === true) return 'True';
                        if (val === false) return 'False';
                        if (val === null) return 'None';
                        if (typeof val === 'object') return JSON.stringify(val);
                        if (typeof val === 'string') return `"${val}"`;
                        return String(val);
                    } else if (lang === 'cpp') {
                        if (val === true) return 'true';
                        if (val === false) return 'false';
                        if (val === null) return 'NULL';
                        if (Array.isArray(val)) {
                            return `{${val.map(v => toLiteral(v, 'cpp')).join(', ')}}`;
                        }
                        if (typeof val === 'string') return `"${val}"`;
                        return String(val);
                    } else { // Java
                        if (val === true) return 'true';
                        if (val === false) return 'false';
                        if (val === null) return 'null';
                        if (Array.isArray(val)) {
                            return `{${val.map(v => toLiteral(v, 'java')).join(', ')}}`;
                        }
                        if (typeof val === 'string') return `"${val}"`;
                        return String(val);
                    }
                };

                const getArgs = (input, lang) => {
                    if (typeof input === 'object' && !Array.isArray(input)) {
                        return Object.values(input).map(v => toLiteral(v, lang)).join(', ');
                    }
                    return toLiteral(input, lang);
                };

                const argsStr = getArgs(testCase.input, solution.language);
                const expectedStr = typeof testCase.expected === 'object' ? JSON.stringify(testCase.expected) : String(testCase.expected);
                
                let fullCode = solution.code;
                if (solution.language === 'python') {
                    fullCode += `\nimport json\nprint(json.dumps(solution(${argsStr})))`;
                } else if (solution.language === 'cpp') {
                    fullCode = `#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n${solution.code}\nint main(){ Solution sol; cout << sol.solution(${argsStr}) << endl; return 0; }`;
                } else if (solution.language === 'java') {
                    fullCode = `import java.util.*;\n${solution.code}\npublic class Main { public static void main(String[] args) { Solution sol = new Solution(); System.out.println(sol.solution(${argsStr})); } }`;
                }

                try {
                    const encodedCode = Buffer.from(fullCode).toString('base64');
                    // Local Judge0 doesn't require RapidAPI keys
                    const apiHost = process.env.JUDGE0_HOST || 'http://localhost:2358';
                    
                    const response = await axios.post(`${apiHost}/submissions`, {
                        source_code: encodedCode,
                        language_id: LANGUAGE_MAP[solution.language],
                    }, {
                        params: { base64_encoded: 'true', wait: 'true' },
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const decode = (str) => str ? Buffer.from(str, 'base64').toString('utf-8') : '';
                    const output = (decode(response.data.stdout) || decode(response.data.compile_output) || '').trim();
                    const isCorrect = output === expectedStr.trim();
                    if (isCorrect) passedCount++;
                    testResults.push({ passed: isCorrect, got: output, expected: expectedStr });
                } catch (err) {
                    console.error('Judge0 error:', err.response?.data || err.message);
                    testResults.push({ passed: false, error: 'Execution Failed' });
                }
            }

            const qScore = Math.round((passedCount / question.testCases.length) * 30);
            totalCodingScore += qScore;
            allResults.push({ questionId: i, score: qScore, testResults });
        }

        application.codingScore = totalCodingScore;
        application.totalAssessmentScore = application.aptitudeScore + totalCodingScore;
        
        // 0/100 threshold (Guaranteed Progression)
        const shortlisted = application.totalAssessmentScore >= 0;
        application.isShortlistedForInterview = shortlisted;
        application.currentStage = shortlisted ? 'interview' : 'completed';
        application.overallResult = shortlisted ? 'assessment_completed' : 'rejected';
        
        await application.save();

        res.json({
            message: shortlisted ? '🎉 Shortlisted for Interview!' : 'Assessment completed.',
            aptitudeScore: application.aptitudeScore,
            codingScore: totalCodingScore,
            totalFullScore: application.totalAssessmentScore,
            shortlisted,
            results: allResults
        });
    } catch (err) {
        console.error('Coding eval error:', err);
        res.status(500).json({ message: 'Execution failed: ' + err.message });
    }
});

// Helper: convert Python/C++/Java code to JS for evaluation
// This does a best-effort transpilation of simple algorithm code
function convertToJSForEval(code, language, questionId) {
    if (language === 'python') {
        return convertPythonToJS(code, questionId);
    } else if (language === 'cpp') {
        return convertCppToJS(code, questionId);
    } else if (language === 'java') {
        return convertJavaToJS(code, questionId);
    }
    return code;
}

function convertPythonToJS(code, questionId) {
    // Basic Python to JS conversion for simple algorithms
    let js = code
        .replace(/def two_sum\(nums, target\):/g, 'function twoSum(nums, target) {')
        .replace(/def is_palindrome\(s\):/g, 'function isPalindrome(s) {')
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\blen\((\w+)\)/g, '$1.length')
        .replace(/\belif\b/g, '} else if')
        .replace(/\belse:/g, '} else {')
        .replace(/\breturn\b/g, 'return')
        .replace(/#(.*)$/gm, '//$1')
        .replace(/\bfor (\w+) in range\((\w+)\):/g, 'for (let $1 = 0; $1 < $2; $1++) {')
        .replace(/\bfor (\w+) in range\((\w+),\s*(\w+)\):/g, 'for (let $1 = $2; $1 < $3; $1++) {')
        .replace(/\bif (.+):/g, 'if ($1) {')
        .replace(/\bwhile (.+):/g, 'while ($1) {')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!')
        .replace(/(\w+)\.append\((.+)\)/g, '$1.push($2)')
        .replace(/(\w+)\.lower\(\)/g, '$1.toLowerCase()')
        .replace(/(\w+)\.isalnum\(\)/g, '/[a-zA-Z0-9]/.test($1)')
        .replace(/\bpass\b/g, '');

    // Handle Python indentation → JS braces (simplified)
    const lines = js.split('\n');
    let result = [];
    let prevIndent = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        const indent = line.length - trimmed.length;

        if (indent < prevIndent && trimmed && !trimmed.startsWith('}') && !trimmed.startsWith('return')) {
            const closeBraces = Math.floor((prevIndent - indent) / 4);
            for (let j = 0; j < closeBraces; j++) {
                result.push(' '.repeat(indent) + '}');
            }
        }
        prevIndent = indent;
        result.push(line);
    }

    // Close any remaining open braces
    result.push('}');

    return result.join('\n');
}

function convertCppToJS(code, questionId) {
    let js = code
        .replace(/#include\s*<[^>]+>/g, '')
        .replace(/using namespace std;/g, '')
        .replace(/class Solution \{[\s\S]*?public:/g, '')
        .replace(/vector<int>/g, 'Array')
        .replace(/unordered_map<int,\s*int>/g, 'Map')
        .replace(/string/g, 'String')
        .replace(/\bvector<int>&?\s*/g, '')
        .replace(/\bint&?\s+(?=\w+\s*[=;,\)])/g, 'let ')
        .replace(/\bbool\s+/g, 'let ')
        .replace(/\bstring\s+/g, 'let ')
        .replace(/\bauto\s+/g, 'let ')
        .replace(/twoSum/g, 'twoSum')
        .replace(/isPalindrome/g, 'isPalindrome')
        .replace(/\.size\(\)/g, '.length')
        .replace(/\.push_back\((.+?)\)/g, '.push($1)')
        .replace(/\btolower\((.+?)\)/g, '$1.toLowerCase()')
        .replace(/\bisalnum\((.+?)\)/g, '/[a-zA-Z0-9]/.test($1)')
        .replace(/\{(\s*)\}/g, '{ $1}');

    // Remove trailing class brace
    js = js.replace(/\};\s*$/, '');

    // Wrap standalone functions
    if (questionId === 1 && !js.includes('function twoSum')) {
        js = js.replace(/(Array|let\s+\w+\s+)?\s*twoSum\s*\(([^)]*)\)\s*\{/,
            'function twoSum($2) {');
    }
    if (questionId === 2 && !js.includes('function isPalindrome')) {
        js = js.replace(/(let\s+)?\s*isPalindrome\s*\(([^)]*)\)\s*\{/,
            'function isPalindrome($2) {');
    }

    return js;
}

function convertJavaToJS(code, questionId) {
    let js = code
        .replace(/import\s+java\.[^;]+;/g, '')
        .replace(/class Solution \{/g, '')
        .replace(/public\s+/g, '')
        .replace(/static\s+/g, '')
        .replace(/int\[\]\s*/g, '')
        .replace(/boolean\s+/g, 'let ')
        .replace(/\bint\s+(?=\w+\s*[=;,\)])/g, 'let ')
        .replace(/String\s+(?=\w+)/g, 'let ')
        .replace(/char\s+/g, 'let ')
        .replace(/HashMap<[^>]+>/g, 'Map')
        .replace(/new HashMap<>\(\)/g, 'new Map()')
        .replace(/\.length(?!\()/g, '.length')
        .replace(/\.charAt\((.+?)\)/g, '[$1]')
        .replace(/Character\.isLetterOrDigit\((.+?)\)/g, '/[a-zA-Z0-9]/.test($1)')
        .replace(/Character\.toLowerCase\((.+?)\)/g, '$1.toLowerCase()')
        .replace(/\.toLowerCase\(\)/g, '.toLowerCase()')
        .replace(/System\.out\.println\([^)]*\);/g, '');

    // Remove trailing class brace
    js = js.replace(/\}\s*$/, '');

    if (questionId === 1 && !js.includes('function twoSum')) {
        js = js.replace(/\s*twoSum\s*\(([^)]*)\)\s*\{/, 'function twoSum($1) {');
    }
    if (questionId === 2 && !js.includes('function isPalindrome')) {
        js = js.replace(/\s*isPalindrome\s*\(([^)]*)\)\s*\{/, 'function isPalindrome($1) {');
    }

    return js;
}

// GET /api/test/results/:applicationId — Get overall results
router.get('/results/:applicationId', auth, async (req, res) => {
    try {
        const application = await Application.findOne({
            _id: req.params.applicationId,
            userId: req.user.id,
        }).populate('jobId');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const result = {
            jobTitle: application.jobId?.title || 'Unknown',
            company: application.jobId?.company || 'Unknown',

            // Stage 1: Resume
            shortlisting: {
                matchedKeywords: application.matchedKeywords,
                totalMatches: application.totalMatchCount,
                isShortlisted: application.isShortlisted,
                status: application.isShortlisted ? 'Resumed Passed ✅' : 'Failed ❌',
            },

            // Stage 2: Assessment (Combined Aptitude + Coding)
            assessment: {
                aptitudeScore: application.aptitudeScore || 0,
                codingScore: application.codingScore || 0,
                totalScore: (application.aptitudeScore || 0) + (application.codingScore || 0),
                isShortlistedForInterview: application.isShortlistedForInterview,
                status: application.isShortlistedForInterview ? 'Shortlisted for Interview ✅' : 'Assessment Failed ❌',
            },

            // Stage 3: AI Interview
            interview: {
                score: application.interviewScore, // This is the object with breakdown
                passed: application.interviewPassed,
                feedback: application.interviewFeedback,
                status: application.interviewScore?.total > 0 
                    ? (application.interviewPassed ? 'Selected 🎉' : 'Interview Failed ❌')
                    : 'Not attempted ⏳',
            },

            // Overall
            currentStage: application.currentStage,
            overallResult: application.overallResult,
            overallVerdict: getVerdict(application),
        };

        res.json(result);
    } catch (err) {
        console.error('Get results error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

function getVerdict(app) {
    if (app.overallResult === 'selected') return '🎉 SELECTED — Congratulations, you have been selected!';
    if (app.overallResult === 'interview_failed') return '❌ Interview Not Cleared — Professional criteria not met';
    
    if (app.isShortlistedForInterview) return '📋 SHORTLISTED — Proceed to Video AI Interview';
    if (app.aptitudeScore !== null && !app.isShortlistedForInterview) return '❌ Assessment Failed — Performance below criteria';
    
    if (app.isShortlisted) return '🧠 RESUME PASSED — Complete the Aptitude & Coding Assessment';
    
    return '📋 APPLICATION PENDING — Resume review in progress';
}

module.exports = router;


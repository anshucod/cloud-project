const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const auth = require('../middleware/auth');

const TIMEOUT_MS = 10000;
const WANDBOX_URL = 'https://wandbox.org/api/compile.json';

// Helper: run a shell command with timeout
function execWithTimeout(command, timeout) {
    return new Promise((resolve) => {
        exec(command, { timeout }, (err, stdout, stderr) => {
            if (err && err.killed) {
                resolve({ stdout: '', stderr: 'Time Limit Exceeded (10s)', error: err });
            } else {
                resolve({ 
                    stdout: stdout || '', 
                    stderr: stderr || '', 
                    error: err 
                });
            }
        });
    });
}

// POST /api/compiler/execute — Hybrid Local/Remote Execution
router.post('/execute', auth, async (req, res) => {
    try {
        const { language, code } = req.body;
        // Ensure testCases is always an array to avoid crashes
        const testCases = Array.isArray(req.body.testCases) ? req.body.testCases : [];

        if (!language || !code) {
            return res.status(400).json({ message: 'Language and code are required' });
        }

        console.log(`[Compiler] Executing ${language} code... (${testCases.length} test cases)`);

        let fullCode = code;

        // Code Injection Logic
        const hasSolution = (src, lang) => {
            if (lang === 'python') return /def solution\s*\(/.test(src);
            if (lang === 'cpp')    return /solution\s*\(/.test(src);
            if (lang === 'java')   return /\bsolution\s*\(/.test(src);
            return false;
        };

        if (testCases.length > 0 && hasSolution(code, language)) {
            const toLiteral = (val, lang) => {
                if (lang === 'python') {
                    if (val === true) return 'True';
                    if (val === false) return 'False';
                    if (val === null) return 'None';
                    if (Array.isArray(val)) return `[${val.map(v => toLiteral(v, lang)).join(', ')}]`;
                    if (typeof val === 'string') return `"${val}"`;
                    return JSON.stringify(val);
                } else if (lang === 'cpp') {
                    if (val === true) return 'true';
                    if (val === false) return 'false';
                    if (val === null) return 'nullptr';
                    if (Array.isArray(val)) return `{${val.map(v => toLiteral(v, 'cpp')).join(', ')}}`;
                    if (typeof val === 'string') return `"${val}"`;
                    return String(val);
                } else { // java
                    if (val === true) return 'true';
                    if (val === false) return 'false';
                    if (val === null) return 'null';
                    if (Array.isArray(val)) return `new int[]{${val.map(v => toLiteral(v, 'java')).join(', ')}}`;
                    if (typeof val === 'string') return `"${val}"`;
                    return String(val);
                }
            };

            const getArgs = (input, lang) => {
                if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
                    return Object.values(input).map(v => toLiteral(v, lang)).join(', ');
                }
                return toLiteral(input, lang);
            };

            if (language === 'python') {
                testCases.forEach((tc, i) => {
                    fullCode += `print('FINAL_RESULT_${i}:', json.dumps(solution(${getArgs(tc.input, 'python')})))\n`;
                });
            } else if (language === 'cpp') {
                let mainCode = `\nvoid printRes(vector<int> v){ cout << "["; for(int i=0; i<v.size(); i++) cout << v[i] << (i==v.size()-1?"":","); cout << "]"; }\nint main(){ Solution sol; `;
                testCases.forEach((tc, i) => {
                    mainCode += `cout << "FINAL_RESULT_${i}: "; printRes(sol.solution(${getArgs(tc.input, 'cpp')})); cout << endl; `;
                });
                mainCode += `return 0; }`;
                if (!code.includes('int main')) {
                    fullCode = `#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_map>\nusing namespace std;\n${code}${mainCode}`;
                }
            } else if (language === 'java') {
                if (!code.includes('public static void main')) {
                    let mainCode = `public class Main { public static void main(String[] args) { Solution sol = new Solution(); `;
                    testCases.forEach((tc, i) => {
                        mainCode += `System.out.println("FINAL_RESULT_${i}: " + sol.solution(${getArgs(tc.input, 'java')})); `;
                    });
                    mainCode += `} }`;
                    fullCode = `import java.util.*;\n${code}\n${mainCode}`;
                }
            }
        }

        // --- Execution Logic ---
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-'));

        try {
            let stdout = '', stderr = '', status = 'Accepted';

            if (language === 'cpp') {
                // REMOTE (Wandbox) for C++ because user lacks g++
                try {
                    const response = await axios.post(WANDBOX_URL, {
                        compiler: 'gcc-head',
                        code: fullCode,
                        options: '--std=c++17 -O2'
                    }, { timeout: 20000 });

                    const data = response.data;
                    stdout = data.program_output || '';
                    stderr = data.program_error || data.compiler_error || '';
                    if (data.compiler_error) status = 'Compilation Error';
                    else if (data.status !== "0") status = 'Runtime Error';
                } catch (wandboxErr) {
                    console.error('[Wandbox Error]', wandboxErr.message);
                    return res.status(503).json({ message: 'Remote compilation service (Wandbox) is currently unavailable. Please try again later.' });
                }
            } else if (language === 'python') {
                const filePath = path.join(tmpDir, 'prog.py');
                fs.writeFileSync(filePath, fullCode);
                const result = await execWithTimeout(`python "${filePath}"`, TIMEOUT_MS);
                stdout = result.stdout;
                stderr = result.stderr;
                if (result.error) status = 'Runtime Error';
            } else if (language === 'java') {
                const filePath = path.join(tmpDir, 'Main.java');
                fs.writeFileSync(filePath, fullCode);
                const compile = await execWithTimeout(`javac "${filePath}"`, TIMEOUT_MS);
                if (compile.error) {
                    return res.json({ stdout: '', stderr: compile.stderr || compile.error.message, status: 'Compilation Error' });
                }
                const run = await execWithTimeout(`java -cp "${tmpDir}" Main`, TIMEOUT_MS);
                stdout = run.stdout;
                stderr = run.stderr;
                if (run.error) status = 'Runtime Error';
            }

            // --- Parsing Logic for Multiple Test Cases ---
            let results = [];
            if (testCases) {
                testCases.forEach((tc, i) => {
                    const marker = `FINAL_RESULT_${i}:`;
                    const line = stdout.split('\n').find(l => l.includes(marker));
                    if (line) {
                        const actualValue = line.split(marker)[1].trim();
                        const expectedValue = typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : String(tc.expected);
                        results.push({
                            input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input),
                            expected: expectedValue,
                            actual: actualValue,
                            passed: actualValue.replace(/\s+/g, '') === expectedValue.replace(/\s+/g, '')
                        });
                    }
                });
            }

            return res.json({ stdout, stderr, status, results });

        } finally {
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        }

    } catch (err) {
        console.error('Compiler error:', err.message);
        res.status(500).json({ message: 'Code execution service failed: ' + err.message });
    }
});

module.exports = router;

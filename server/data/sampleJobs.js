const Job = require('../models/Job');

const baseKeywords = ['fresher', 'junior', 'beginner', 'cpp', 'c', 'c++', 'java', 'python', 'sql', 'linux', 'html', 'css', 'javascript'];

const sampleJobs = [
    {
        title: 'Full Stack Developer',
        company: 'TechCorp Solutions',
        description: 'Looking for a full stack developer (freshers welcome!) to build and maintain web applications using React, Node.js, and databases like MongoDB or SQL.',
        keywords: [...baseKeywords, 'react', 'node', 'nodejs', 'mongodb', 'express', 'api', 'rest', 'git', 'fullstack'],
        location: 'Bangalore, India',
        salary: '₹6,00,000 - ₹12,00,000',
        type: 'Full-time',
    },
    {
        title: 'Frontend Developer',
        company: 'DesignHub Inc.',
        description: 'Join our design team to create beautiful, responsive user interfaces. Proficiency in web basics and React or angular required. Perfect for freshers.',
        keywords: [...baseKeywords, 'react', 'typescript', 'figma', 'frontend', 'ui', 'ux', 'design', 'web'],
        location: 'Mumbai, India',
        salary: '₹5,00,000 - ₹10,00,000',
        type: 'Full-time',
    },
    {
        title: 'Backend Engineer',
        company: 'DataFlow Systems',
        description: 'Seeking a backend engineer skilled in any server language like Java, Python, C++, or Node. Experience with SQL and Linux is a plus. Open to junior engineers.',
        keywords: [...baseKeywords, 'django', 'postgresql', 'docker', 'backend', 'microservices', 'aws', 'api', 'database'],
        location: 'Hyderabad, India',
        salary: '₹8,00,000 - ₹15,00,000',
        type: 'Full-time',
    },
    {
        title: 'Data Analyst Intern',
        company: 'Insight Analytics',
        description: 'Great opportunity for students and freshers interested in data analytics. Skills in Excel, SQL, and Python welcome.',
        keywords: [...baseKeywords, 'data', 'analytics', 'excel', 'tableau', 'powerbi', 'visualization', 'intern'],
        location: 'Remote',
        salary: '₹15,00,000 - ₹25,00,000/month', // Corrected a typo from previous version!
        type: 'Internship',
    },
    {
        title: 'Mobile App Developer',
        company: 'AppWorks Studio',
        description: 'Build cross-platform mobile applications. Experience with Java, Kotlin, React Native, or Flutter. Junior developers and freshers can apply.',
        keywords: [...baseKeywords, 'react', 'native', 'flutter', 'mobile', 'android', 'ios', 'firebase', 'dart', 'app', 'kotlin'],
        location: 'Pune, India',
        salary: '₹5,00,000 - ₹12,00,000',
        type: 'Full-time',
    },
    {
        title: 'DevOps & SysAdmin Trainee',
        company: 'CloudBridge Technologies',
        description: 'Looking for a trainee with passion for Linux, networking, and scripting (Python/Bash) to grow into a DevOps role.',
        keywords: [...baseKeywords, 'devops', 'aws', 'docker', 'kubernetes', 'cicd', 'automation', 'bash', 'scripting'],
        location: 'Chennai, India',
        salary: '₹4,00,000 - ₹8,00,000',
        type: 'Full-time',
    },
    {
        title: 'AI & Data Science Trainee',
        company: 'NeuralNet AI',
        description: 'Learn and implement machine learning models. Must have a strong foundation in Python, SQL, and algorithms.',
        keywords: [...baseKeywords, 'ai', 'ml', 'nlp', 'pytorch', 'tensorflow', 'deep-learning', 'openai', 'llm', 'data-science'],
        location: 'Bangalore, India',
        salary: '₹8,00,000 - ₹14,00,000',
        type: 'Full-time',
    },
    {
        title: 'Junior Software Engineer',
        company: 'StartUp Alpha',
        description: 'Fresh graduates welcome! Learn and grow with our engineering team. We use Java, C++, and Python for our core services.',
        keywords: [...baseKeywords, 'coding', 'web', 'algorithms', 'data-structures'],
        location: 'Noida, India',
        salary: '₹4,00,000 - ₹7,00,000',
        type: 'Full-time',
    },
    {
        title: 'Technical Support Executive',
        company: 'Global Helpdesk',
        description: 'Provide technical support and troubleshooting. Basic knowledge of Linux, SQL, and coding (Java/Python/C++) is advantageous.',
        keywords: [...baseKeywords, 'support', 'technical', 'troubleshooting', 'communication', 'customer', 'it', 'helpdesk'],
        location: 'Gurgaon, India',
        salary: '₹3,00,000 - ₹5,00,000',
        type: 'Full-time',
    },
    {
        title: 'Software Development Engineer (SDE-1)',
        company: 'BigTech Prime',
        description: 'Focus on distributed systems and high-scale backend services. Strong CS fundamentals in C++, Java, or Python required.',
        keywords: [...baseKeywords, 'sde', 'distributed-systems', 'microservices', 'aws', 'scalable', 'algorithms', 'datastructures'],
        location: 'Hyderabad, India',
        salary: '₹12,00,000 - ₹20,00,000',
        type: 'Full-time',
    },
    {
        title: 'Software Testing Trainee',
        company: 'QualityFirst',
        description: 'Develop and maintain automated test suites. Freshers with programming fundamentals in Java, Python, or C++ welcome.',
        keywords: [...baseKeywords, 'qa', 'automation', 'selenium', 'cypress', 'testing', 'jenkins'],
        location: 'Remote',
        salary: '₹4,00,000 - ₹8,00,000',
        type: 'Full-time',
    },
    {
        title: 'UI/UX Design Intern',
        company: 'Creative Pixel',
        description: 'Create engaging user experiences. Knowledge of HTML/CSS is a plus alongside design tools.',
        keywords: [...baseKeywords, 'ui', 'ux', 'figma', 'adobe-xd', 'creative', 'design', 'prototyping'],
        location: 'Ahmedabad, India',
        salary: '₹20,000 - ₹35,000/month',
        type: 'Internship',
    },
    {
        title: 'Junior Cloud Administrator',
        company: 'SkyScale Systems',
        description: 'Help manage cloud infrastructure. Requires basic knowledge of Linux, Python scripting, and SQL.',
        keywords: [...baseKeywords, 'cloud', 'architect', 'azure', 'gcp', 'aws', 'networking', 'security', 'infrastructure'],
        location: 'Bangalore, India',
        salary: '₹6,00,000 - ₹10,00,000',
        type: 'Full-time',
    },
    {
        title: 'Web3 & Blockchain Intern',
        company: 'CryptoNode',
        description: 'Develop smart contracts. Strong backing in C++, Java or Python is required to learn Solidity on the job.',
        keywords: [...baseKeywords, 'blockchain', 'solidity', 'ethereum', 'web3', 'smart-contracts', 'cryptography'],
        location: 'Remote',
        salary: '₹25,000 - ₹40,000/month',
        type: 'Internship',
    },
    {
        title: 'Cyber Security Trainee',
        company: 'SecureNet',
        description: 'Monitor systems for vulnerabilities. Requires strong foundation in networking, Linux, and C/C++.',
        keywords: [...baseKeywords, 'security', 'cybersecurity', 'penetration-testing', 'firewall', 'soc', 'networking'],
        location: 'Chennai, India',
        salary: '₹5,00,000 - ₹9,00,000',
        type: 'Full-time',
    },
    {
        title: 'Associate Product Manager',
        company: 'MarketLeap',
        description: 'Define product vision. Technical background (B.Tech) with understanding of coding concepts (Java, Python, SQL) preferred.',
        keywords: [...baseKeywords, 'product', 'management', 'agile', 'roadmap', 'strategy', 'business-analysis'],
        location: 'Delhi, India',
        salary: '₹8,00,000 - ₹15,00,000',
        type: 'Full-time',
    },
    {
        title: 'Embedded Firmware Intern',
        company: 'SensorSoft',
        description: 'Write firmware for hardware devices. Strong skills in C, C++, and basic Linux commands required.',
        keywords: [...baseKeywords, 'embedded', 'firmware', 'microcontrollers', 'rtos', 'hardware', 'iot'],
        location: 'Pune, India',
        salary: '₹20,000 - ₹30,000/month',
        type: 'Internship',
    },
    {
        title: 'HR Tech Recruiter',
        company: 'PeopleFirst Corp',
        description: 'We are looking for recruiters who understand technical jargon like Java, C++, Python, SQL, and Linux to hire the best engineers.',
        keywords: [...baseKeywords, 'hr', 'operations', 'recruiter', 'hiring', 'talent', 'people', 'management'],
        location: 'Mumbai, India',
        salary: '₹4,00,000 - ₹7,00,000',
        type: 'Full-time',
    },
    {
        title: 'Pre-Sales Associate',
        company: 'SalesForce Plus',
        description: 'Identify new tech business opportunities. Understanding of software architecture, SQL, and cloud is helpful.',
        keywords: [...baseKeywords, 'sales', 'marketing', 'business-development', 'client-relations', 'growth'],
        location: 'Kolkata, India',
        salary: '₹4,00,000 - ₹8,00,000',
        type: 'Full-time',
    },
    {
        title: 'Technical Content Writer',
        company: 'MediaWorks',
        description: 'Write articles about programming languages (C++, Java, Python, SQL) and tech tutorials.',
        keywords: [...baseKeywords, 'content', 'writing', 'copywriting', 'seo', 'tutorial', 'blog', 'technical-writing'],
        location: 'Remote',
        salary: '₹3,00,000 - ₹6,00,000',
        type: 'Full-time',
    },
    {
        title: 'Systems & Network Admin',
        company: 'IT Infra Solutions',
        description: 'Maintain and troubleshoot server infrastructure. Mastery of Linux and Python scripting is essential.',
        keywords: [...baseKeywords, 'linux', 'windows-server', 'network', 'system-admin', 'virtualization', 'support'],
        location: 'Lucknow, India',
        salary: '₹5,00,000 - ₹9,00,000',
        type: 'Full-time',
    }
];

async function seedJobs() {
    try {
        const count = await Job.countDocuments();
        // Force re-seed immediately to load new keywords
        await Job.deleteMany({});
        await Job.insertMany(sampleJobs);
        console.log('📋 Sample jobs re-seeded successfully with fresher friendly keywords');
    } catch (err) {
        console.error('Error seeding jobs:', err.message);
    }
}

module.exports = seedJobs;

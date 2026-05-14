import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function HRDashboard() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    // Filters
    const [selectedJob, setSelectedJob] = useState('');
    const [skillsFilter, setSkillsFilter] = useState('');
    const [minCgpa, setMinCgpa] = useState('');
    const [minScore, setMinScore] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/jobs', {
                headers: { Authorization: `Bearer ${localStorage.getItem('hrToken')}` }
            });
            setJobs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch jobs', err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!selectedJob) {
            setError('Please select a Job Role to view candidates.');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            let url = `/hr/candidates?jobId=${selectedJob}`;
            if (skillsFilter) url += `&skills=${encodeURIComponent(skillsFilter)}`;
            if (minCgpa) url += `&minCgpa=${minCgpa}`;
            if (minScore) url += `&minScore=${minScore}`;

            const res = await api.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('hrToken')}` }
            });
            setCandidates(res.data.candidates);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch candidates');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('hrToken');
        localStorage.removeItem('hrUser');
        navigate('/hr/login');
    };

    return (
        <div className="min-h-screen bg-[#050510] text-slate-200 font-sans selection:bg-emerald-500/30">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-[#050510]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                            👥
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white italic tracking-tight">HR <span className="text-emerald-400 not-italic">PORTAL</span></h1>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Antigravity System</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-8">
                {/* Filters Section */}
                <div className="glass-card p-8 border-white/10 rounded-3xl bg-[#0a0a1a]/40 shadow-2xl space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Candidate Sourcing & Filters</h2>
                        <p className="text-sm text-slate-400">Select parameters to identify the best candidates for your open roles.</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Role *</label>
                            <select
                                value={selectedJob}
                                onChange={(e) => setSelectedJob(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                                required
                            >
                                <option value="">Select a Role...</option>
                                {jobs.map(job => (
                                    <option key={job._id} value={job._id} className="bg-[#0a0a1a]">{job.title} - {job.company}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Required Skills</label>
                            <input
                                type="text"
                                value={skillsFilter}
                                onChange={(e) => setSkillsFilter(e.target.value)}
                                placeholder="e.g. React, Python"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min CGPA</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={minCgpa}
                                onChange={(e) => setMinCgpa(e.target.value)}
                                placeholder="e.g. 7.5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Assessment Score</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={minScore}
                                onChange={(e) => setMinScore(e.target.value)}
                                placeholder="e.g. 60"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="md:col-span-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Searching...' : 'Search Candidates'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                    {!searched ? (
                        <div className="text-center py-20 opacity-50">
                            <div className="text-4xl mb-4">🔍</div>
                            <h3 className="text-lg font-bold text-white">No Criteria Selected</h3>
                            <p className="text-sm text-slate-400">Select a job role and apply filters to view candidates.</p>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="text-4xl mb-4">📭</div>
                            <h3 className="text-lg font-bold text-white">No Candidates Found</h3>
                            <p className="text-sm text-slate-400">Try adjusting your filters or selecting a different job role.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {candidates.map(app => (
                                <div key={app._id} onClick={() => navigate(`/hr/candidate/${app._id}`)} className="glass-card p-6 border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all cursor-pointer group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                    
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{app.userId?.name || 'Anonymous'}</h3>
                                            <p className="text-xs text-slate-400">{app.userId?.email}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${
                                            app.currentStage === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        }`}>
                                            {(app.currentStage || 'Pending').replace(/_/g, ' ')}
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                            <span className="text-slate-500">Overall Score</span>
                                            <span className="font-bold text-white">{app.totalAssessmentScore !== null ? `${app.totalAssessmentScore}/100` : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                            <span className="text-slate-500">CGPA</span>
                                            <span className="font-bold text-white">{app.userId?.cgpa || 'N/A'}</span>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Matched Skills</p>
                                            <div className="flex flex-wrap gap-2">
                                                {app.userId?.skills?.slice(0, 3).map((skill, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-300">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {app.userId?.skills?.length > 3 && (
                                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-400">
                                                        +{app.userId.skills.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

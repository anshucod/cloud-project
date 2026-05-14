import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function HRCandidateDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCandidate = async () => {
            try {
                const res = await api.get(`/hr/candidate/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('hrToken')}` }
                });
                setApp(res.data.application);
            } catch (err) {
                setError('Failed to load candidate details');
            } finally {
                setLoading(false);
            }
        };
        fetchCandidate();
    }, [id]);

    if (loading) return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white">Loading...</div>;
    if (error) return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-red-400">{error}</div>;
    if (!app) return null;

    const user = app.userId;
    const job = app.jobId;

    return (
        <div className="min-h-screen bg-[#050510] text-slate-200 font-sans pb-20 selection:bg-emerald-500/30">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-[#050510]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/hr/dashboard')} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors">
                            ←
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">{user?.name || 'Candidate'}</h1>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{job?.title}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Overall Score</div>
                        <div className="text-2xl font-black text-white">{app.totalAssessmentScore !== null ? `${app.totalAssessmentScore}%` : 'Pending'}</div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Candidate Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-8 border-white/10 rounded-3xl bg-[#0a0a1a]/40 shadow-xl space-y-6 md:col-span-1">
                        <div>
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Candidate Profile</h2>
                            <div className="space-y-4 text-sm">
                                <div><span className="text-slate-400 block mb-1">Email</span> <span className="font-medium text-white">{user?.email}</span></div>
                                <div><span className="text-slate-400 block mb-1">Phone</span> <span className="font-medium text-white">{user?.phone || 'N/A'}</span></div>
                                <div><span className="text-slate-400 block mb-1">CGPA</span> <span className="font-bold text-emerald-400 text-lg">{user?.cgpa || 'N/A'}</span></div>
                                <div>
                                    <span className="text-slate-400 block mb-2">Self-Reported Skills</span>
                                    <div className="flex flex-wrap gap-2">
                                        {user?.skills?.map((skill, i) => (
                                            <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 border-white/10 rounded-3xl bg-[#0a0a1a]/40 shadow-xl space-y-6 md:col-span-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Assessment Breakdown</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center space-y-2">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aptitude</div>
                                <div className="text-3xl font-black text-white">{app.aptitudeScore !== null ? `${app.aptitudeScore}%` : '-'}</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center space-y-2">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coding</div>
                                <div className="text-3xl font-black text-white">{app.codingScore !== null ? `${app.codingScore}%` : '-'}</div>
                            </div>
                            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center space-y-2">
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">AI Interview</div>
                                <div className="text-3xl font-black text-emerald-400">{app.interviewScore?.total !== undefined ? `${app.interviewScore.total}%` : '-'}</div>
                            </div>
                        </div>

                        {app.isTerminated && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <h3 className="text-red-400 font-bold text-sm mb-1">⚠️ Assessment Terminated</h3>
                                <p className="text-xs text-red-400/80">{app.terminationReason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Interview Deep Dive */}
                <div className="glass-card p-8 border-white/10 rounded-3xl bg-[#0a0a1a]/40 shadow-xl space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">🤖</div>
                        <h2 className="text-lg font-bold text-white">AI Interview Deep Dive</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Performance Metrics</h3>
                            {app.interviewScore ? (
                                <div className="space-y-4">
                                    {Object.entries(app.interviewScore).map(([key, val]) => {
                                        if (key === 'total' || key === '_id') return null;
                                        return (
                                            <div key={key}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                    <span className="text-white font-bold">{val} pts</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(val / (key === 'content' ? 50 : 15)) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Interview metrics pending or unavailable.</p>
                            )}

                            {app.interviewFeedback && (
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2 mt-4">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Counselor Feedback</h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">{app.interviewFeedback}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Session Transcript</h3>
                            <div className="bg-[#050510] border border-white/5 rounded-2xl p-6 h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                                {app.interviewTranscript?.length > 0 ? app.interviewTranscript.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                                            msg.role === 'candidate' 
                                                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-br-sm' 
                                                : 'bg-white/5 text-slate-300 border border-white/10 rounded-bl-sm'
                                        }`}>
                                            <div className="text-[9px] opacity-50 mb-1 uppercase font-black tracking-wider">
                                                {msg.role === 'candidate' ? user?.name : 'AI Proctor'}
                                            </div>
                                            {msg.content}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-slate-500 text-xs italic mt-20">No transcript available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as cam from '@mediapipe/camera_utils';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function AIInterview() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const chatEndRef = useRef(null);
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);

    const [transcript, setTranscript] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [ending, setEnding] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);
    const startingRef = useRef(false);

    // CV Metrics
    const [isFaceDetected, setIsFaceDetected] = useState(false);
    const [gazeStatus, setGazeStatus] = useState('Checking...');
    const [confidence, setConfidence] = useState(85);
    const [snapshots, setSnapshots] = useState([]);

    // Proctoring & Audio
    const [warnings, setWarnings] = useState(0);
    const [isTerminated, setIsTerminated] = useState(false);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [listeningTranscript, setListeningTranscript] = useState('');
    const [suspiciousTimer, setSuspiciousTimer] = useState(0); // in seconds
    const suspiciousTimerRef = useRef(null);
    const audioContextRef = useRef(null);
    const recognitionRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        setupFaceMesh();
        setupAudioMonitoring();
        setupSpeechRecognition();
        
        return () => {
            audioContextRef.current?.close();
            recognitionRef.current?.stop();
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!started && !startingRef.current) {
                setGazeStatus('Good Contact'); // Bypass stuck checking
                startingRef.current = true;
                startInterview();
            }
        }, 3000);

        if (!started && !startingRef.current && isFaceDetected && gazeStatus === 'Good Contact') {
            clearTimeout(timer);
            startingRef.current = true;
            startInterview();
        }

        return () => clearTimeout(timer);
    }, [isFaceDetected, gazeStatus, started]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const setupFaceMesh = () => {
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new cam.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (isTerminated) return;
                    await faceMesh.send({ image: webcamRef.current.video });
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }
    };

    const setupAudioMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            audioContextRef.current = audioContext;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudio = () => {
                if (isTerminated || (gazeStatus !== 'Good Contact' && gazeStatus !== 'Checking...')) {
                    if (!isTerminated) requestAnimationFrame(checkAudio);
                    return;
                }
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((src, val) => src + val, 0) / bufferLength;
                setNoiseLevel(average);
                requestAnimationFrame(checkAudio);
            };
            checkAudio();
        } catch (err) {
            console.error('Audio monitoring failed:', err);
        }
    };

    const setupSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
            if (gazeStatus !== 'Good Contact' && gazeStatus !== 'Checking...') return;
            
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setListeningTranscript(prev => prev + ' ' + finalTranscript);
                setMessage(prev => prev + ' ' + finalTranscript); // Auto-fill hidden input but saved
            }
        };

        recognition.onend = () => {
            if (started && !isTerminated) recognition.start();
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const onResults = async (results) => {
        if (isTerminated) return;
        
        let activityStatus = 'Good Contact';
        let isSuspicious = false;

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            setIsFaceDetected(true);
            const landmarks = results.multiFaceLandmarks[0];
            
            // Multiple faces detection
            if (results.multiFaceLandmarks.length > 1) {
                activityStatus = 'Multiple Faces Detected';
                isSuspicious = true;
            } else {
                // Eye tracking
                const leftIris = landmarks[468];
                if (leftIris.x < 0.4 || leftIris.x > 0.6 || leftIris.y < 0.4 || leftIris.y > 0.6) {
                    activityStatus = 'Looking Away';
                    isSuspicious = true;
                }
            }

            // Real-time AI analysis (throttled)
            if (webcamRef.current && Math.random() < 0.1) { 
                const frame = webcamRef.current.getScreenshot();
                if (frame) {
                    try {
                        const res = await api.post(`/interview/analyze-frame/${applicationId}`, { frame });
                        if (res.data.metrics) {
                            setConfidence(res.data.metrics.gaze_confidence);
                            if (res.data.metrics.posture_score < 60) {
                                activityStatus = 'Posture Alert';
                                isSuspicious = true;
                            }
                        }
                    } catch (err) { }
                }
            }
        } else {
            setIsFaceDetected(false);
            activityStatus = 'Face Not Detected';
            isSuspicious = true;
            setConfidence(prev => Math.max(10, prev - 2));
        }

        // Noise detection
        if (noiseLevel > 40) { // Threshold for background noise
            activityStatus = 'High Background Noise';
            isSuspicious = true;
        }

        setGazeStatus(activityStatus);

        // Proctoring Logic: Warnings & Termination
        if (isSuspicious) {
            if (!suspiciousTimerRef.current) {
                suspiciousTimerRef.current = setInterval(() => {
                    setSuspiciousTimer(t => t + 1);
                }, 1000);
            }
        } else {
            if (suspiciousTimerRef.current) {
                clearInterval(suspiciousTimerRef.current);
                suspiciousTimerRef.current = null;
                setSuspiciousTimer(0);
            }
        }
    };

    // React to suspicion
    useEffect(() => {
        if (suspiciousTimer > 0 && suspiciousTimer % 10 === 0) { // Warn every 10 seconds of continuous suspicion
            handleWarning(gazeStatus);
        }
        if (suspiciousTimer >= 180) { // 3 minutes
            terminateTest('Sustained suspicious activity');
        }
    }, [suspiciousTimer]);

    const [silenceTimer, setSilenceTimer] = useState(0);
    const silenceTimerRef = useRef(null);

    const handleWarning = (reason) => {
        if (warnings >= 3) {
            terminateTest('Maximum warnings exceeded');
            return;
        }
        setWarnings(prev => prev + 1);
        setError(`Warning: ${reason}. Please stay focused on the screen.`);
        setTimeout(() => setError(''), 5000);
    };

    // Silence detection for auto-submit
    useEffect(() => {
        if (noiseLevel < 5 && message.length > 20) { // If quiet and they've spoken something
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setInterval(() => {
                    setSilenceTimer(t => t + 1);
                }, 1000);
            }
        } else {
            if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
                setSilenceTimer(0);
            }
        }
    }, [noiseLevel, message]);

    useEffect(() => {
        if (silenceTimer >= 4) { // 4 seconds of silence = submit
            sendMessage();
            setSilenceTimer(0);
        }
    }, [silenceTimer]);

    const terminateTest = async (reason) => {
        if (isTerminated) return;
        setIsTerminated(true);
        if (suspiciousTimerRef.current) clearInterval(suspiciousTimerRef.current);
        
        try {
            await api.post(`/interview/end/${applicationId}`, {
                isTerminated: true,
                terminationReason: reason
            });
        } catch (err) { console.error('Failed to notify termination:', err); }
    };

    const startInterview = async () => {
        setLoading(true);
        try {
            console.log('🎤 [Interview] Starting session...');
            const res = await api.post(`/interview/start/${applicationId}`);
            setTranscript(res.data.transcript);
            setStarted(true);
            console.log('✅ [Interview] Session started successfully.');
        } catch (err) {
            console.error('🚨 [Interview] Start failed:', err);
            const msg = err.response?.data?.message || 'Failed to start interview';
            if (msg.includes('already completed')) {
                try {
                    const transcriptRes = await api.get(`/interview/transcript/${applicationId}`);
                    setTranscript(transcriptRes.data.transcript || []);
                    if (transcriptRes.data.score !== null) {
                        setResult(transcriptRes.data.score); // Simplify for now
                    }
                    setStarted(true);
                } catch { }
            } else {
                setError(msg);
                startingRef.current = false; // Reset so we can try again
            }
        } finally {
            setLoading(false);
        }
    };

    const takeSnapshot = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) setSnapshots(prev => [...prev.slice(-2), imageSrc]);
        }
    }, [webcamRef]);

    useEffect(() => {
        if (started && !result) {
            const interval = setInterval(takeSnapshot, 30000); // Every 30s
            return () => clearInterval(interval);
        }
    }, [started, result, takeSnapshot]);

    const sendMessage = async () => {
        if (!message.trim() || sending) return;

        const userMsg = message.trim();
        setMessage('');
        setSending(true);
        setTranscript(prev => [...prev, { role: 'candidate', content: userMsg }]);

        try {
            const res = await api.post(`/interview/message/${applicationId}`, { 
                message: userMsg,
                cvMetrics: { confidence, gazeStatus } 
            });
            setTranscript(res.data.transcript);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const endInterview = async () => {
        setEnding(true);
        try {
            const res = await api.post(`/interview/end/${applicationId}`, {
                snapshots,
                cvMetrics: { confidence, gazeStatus }
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to end interview');
        } finally {
            setEnding(false);
        }
    };

    if (isTerminated) {
        return (
            <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-6">
                <div className="glass-card max-w-lg w-full p-12 text-center space-y-8 border-red-500/20 bg-red-500/5">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white">Test Terminated</h1>
                        <p className="text-red-400 font-bold uppercase tracking-widest text-xs">Security Protocol Breach</p>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        This session has been terminated due to repeated suspicious activity or a sustained breach of the interview security protocol.
                    </p>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for termination</p>
                        <p className="text-xs text-slate-300 font-mono italic">Suspected malpractice detected by AI Proctor.</p>
                    </div>
                    <button 
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all"
                        onClick={() => navigate('/dashboard')}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Removed full-page loading screen so webcam can mount and initialize
    return (
        <div className="min-h-screen bg-[#0a0a1a] text-slate-200">
            <Navbar />
            
            {error && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-100px)]">
                {/* Left: Video Analysis Suite */}
                <div className="lg:w-1/2 space-y-6 flex flex-col">
                    <div className="glass-card relative aspect-video rounded-[32px] overflow-hidden border border-white/10 flex items-center justify-center bg-black/40">
                        {/* Scanning Animation */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_3s_linear_infinite] z-20 opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                        
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover grayscale-[20%]"
                            mirrored={true}
                        />

                        {/* Proctoring Warning Overlay */}
                        {(gazeStatus !== 'Good Contact' && gazeStatus !== 'Checking...' && started) && (
                            <div className="absolute inset-0 z-50 bg-red-600/40 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                                <div className="bg-white text-red-600 px-8 py-4 rounded-3xl font-black tracking-widest text-sm shadow-[0_20px_50px_rgba(220,38,38,0.5)] border-4 border-red-600 flex flex-col items-center gap-2">
                                    <span className="text-4xl animate-bounce">⚠️</span>
                                    <span>{gazeStatus.toUpperCase()}</span>
                                </div>
                                <p className="mt-6 text-white font-bold text-xs uppercase tracking-[0.2em] bg-black/60 px-4 py-2 rounded-full">Test Paused until fixed</p>
                            </div>
                        )}

                        {/* Analysis Overlays */}
                        <div className="absolute inset-x-6 bottom-6 flex justify-between items-end gap-4 z-30">
                            <div className="flex flex-col gap-2">
                                <div className={`px-4 py-2 rounded-2xl backdrop-blur-xl border flex items-center gap-3 transition-all duration-300 ${gazeStatus === 'Good Contact' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${gazeStatus === 'Good Contact' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <span className="text-xs font-bold tracking-tight uppercase">{gazeStatus}</span>
                                </div>
                                {warnings > 0 && (
                                    <div className="px-4 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Warnings: {warnings}/3
                                    </div>
                                )}
                            </div>
                            
                            <div className="w-56 glass-card p-4 rounded-2xl border-white/5 bg-black/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Input Audio Intensity</span>
                                    <span className="text-xs font-bold text-white">{Math.round(noiseLevel)}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-300 ${noiseLevel > 40 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(100, noiseLevel * 2)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Recognition Markers (Visual Flair) */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-indigo-500/30 rounded-tl-lg"></div>
                            <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-indigo-500/30 rounded-tr-lg"></div>
                            <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-indigo-500/30 rounded-bl-lg"></div>
                            <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-indigo-500/30 rounded-br-lg"></div>
                        </div>
                    </div>

                    <div className="glass-card p-8 space-y-4 flex-1 border-white/5">
                        <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-6 h-[1px] bg-indigo-500/30"></span>
                            Visual Protocol Active
                        </h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: '👁️', text: 'Maintain consistent eye contact' },
                                { icon: '🗣️', text: 'Clear and measured articulation' },
                                { icon: '🏠', text: 'Minimize ambient noise' },
                                { icon: '👔', text: 'Semi-formal attire required' }
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-[11px] font-medium text-slate-400">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right: Smart Chat Panel */}
                <div className="flex-1 glass-card flex flex-col border-white/10 rounded-[40px] overflow-hidden bg-[#050515]/30">
                    <header className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">AI Talent Counselor</h3>
                            <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest opacity-60">Session ID: {applicationId.slice(-6)}</p>
                        </div>
                        {result && <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold font-mono">ENCRYPTED REPORT READY</div>}
                    </header>

                    <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar relative">
                        {/* Current Question Focus (Flashed) */}
                        {!result && (!started || transcript.length === 0) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-[#050515]/80 backdrop-blur-md z-10 animate-in fade-in zoom-in-95 duration-500">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                                    {!started ? 'Environment Verification' : 'Initializing Interview'}
                                </p>
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-50"></div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white relative leading-tight">
                                        {!started 
                                            ? (gazeStatus === 'Checking...' ? 'Connecting to secure AI Proctor...' : (gazeStatus !== 'Good Contact' ? `Please correct: ${gazeStatus}` : 'Environment secured. Starting interview...'))
                                            : 'Preparing your first question...'}
                                    </h2>
                                </div>
                                {!started && gazeStatus === 'Checking...' && (
                                    <div className="mt-12 flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Analyzing visual & audio feeds...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {!result && started && transcript.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-[#050515]/80 backdrop-blur-md z-10 animate-in fade-in zoom-in-95 duration-500">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Current Question From Interviewer</p>
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-50"></div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white relative leading-tight">
                                        "{transcript[transcript.length - 1].role === 'interviewer' ? transcript[transcript.length - 1].content : 'Processing your response...'}"
                                    </h2>
                                </div>
                                <div className="mt-12 flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">AI Counselor is listening...</span>
                                </div>
                                {message.length > 0 && (
                                    <button 
                                        onClick={sendMessage}
                                        className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-xs transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        Submit Response Now
                                    </button>
                                )}
                            </div>
                        )}

                        {result && transcript.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'interviewer' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] px-5 py-4 rounded-3xl ${msg.role === 'interviewer' 
                                    ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-sm' 
                                    : 'bg-indigo-600 text-white rounded-tr-sm shadow-[0_10px_30px_rgba(79,70,229,0.3)]'}`}>
                                    <p className="text-[10px] font-bold uppercase opacity-40 mb-1">{msg.role === 'interviewer' ? 'Agent AI' : 'Candidate (You)'}</p>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {!result ? (
                        <div className="p-6 bg-white/5 border-t border-white/5 space-y-4">
                            <div className="flex gap-4 p-2 bg-white/5 rounded-[24px] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                <textarea
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 resize-none p-3 h-20 custom-scrollbar"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Synthesize your response here..."
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                                />
                                <button 
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${message && !sending ? 'bg-indigo-600 shadow-indigo-500/40 hover:scale-95' : 'bg-white/5 text-slate-700 opacity-50'}`} 
                                    onClick={sendMessage} 
                                    disabled={!message || sending}
                                >
                                    {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '➤'}
                                </button>
                            </div>
                            <div className="flex justify-between items-center px-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Question {transcript.filter(t => t.role === 'candidate').length}/8</span>
                                    <div className="w-32 h-1 bg-white/5 rounded-full">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(transcript.filter(t => t.role === 'candidate').length / 8) * 100}%` }}></div>
                                    </div>
                                </div>
                                {transcript.filter(t => t.role === 'candidate').length >= 3 && (
                                    <button 
                                        className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors flex items-center gap-2" 
                                        onClick={endInterview} 
                                        disabled={ending}
                                    >
                                        {ending ? 'Synthesizing...' : '🏁 Finalize session'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 text-center space-y-8 animate-in zoom-in-95 duration-700 bg-indigo-500/[0.02]">
                            <div className="relative inline-block">
                                <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                                    <span className="text-3xl font-black text-white">{result.score?.total || 0}</span>
                                </div>
                                <svg className="absolute top-0 left-0 w-24 h-24 -rotate-90">
                                    <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                                    <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray="276" strokeDashoffset={276 - (276 * (result.score?.total || 0) / 100)} className="text-indigo-500" strokeLinecap="round" />
                                </svg>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">Interview Evaluated</h3>
                                <p className="text-slate-400 text-xs">Our AI counselors have processed your transcript and metrics.</p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { val: result.score?.content, max: 50, label: 'CONTENT' },
                                    { val: result.score?.attire, max: 10, label: 'ATTIRE' },
                                    { val: result.score?.confidence, max: 10, label: 'POISE' }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="block text-lg font-black text-white">{item.val}<span className="text-[10px] text-slate-600">/{item.max}</span></span>
                                        <span className="text-[9px] font-bold text-slate-500 tracking-widest leading-none">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="btn-premium w-full py-4 shadow-indigo-500/20" onClick={() => navigate(`/results/${applicationId}`)}>
                                📊 View Comprehensive Report
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Mic, Timer, ArrowRight, Dot, TrendingUp, Zap, Minus, ArrowDown, Maximize, Minimize, Settings, Plus, Trash2, X } from 'lucide-react';
import './App.css';

interface Section {
  id: number;
  title: string;
  timeRange: string;
  durationMs: number;
  text: string;
}

interface ChunkInfo {
  words: string[];
  type: 'FLOW' | 'END';
  punctuation: string | null;
}

const DEFAULT_SECTIONS: Section[] = [
  {
    id: 1,
    title: "1. The Problem",
    timeRange: "0:00-0:45",
    durationMs: 45000,
    text: "Hello everyone. Today I am proposing a significant upgrade to our school website. As we know, the current Satit Patumwan site, which was designed several years ago, is starting to feel quite chunky and outdated. I’ve noticed that many students can’t stand waiting for the MIS portal to load during peak hours. Currently, if you want to find your exam schedule, you have to scroll down through multiple layers of text and log on to a system that isn't very user-friendly. We need a website that doesn't just store data but actually helps us use it."
  },
  {
    id: 2,
    title: "2. Introducing askPDS",
    timeRange: "0:45-1:45",
    durationMs: 60000,
    text: "My proposal is to set up 'askPDS.' This is an AI-driven chatbot which acts as a centralized brain for our school. Unlike a static page, askPDS is a cutting-edge tool that interprets your needs. For example, if you key in a question about your attendance, the AI immediately searches the cloud database to find the answer. This feature, which uses high-resolution data visualization, makes complex information easy to understand at a glance. Instead of scrolling down endlessly, you get exactly what you need in a pop-up window."
  },
  {
    id: 3,
    title: "3. Benefits",
    timeRange: "1:45-2:45",
    durationMs: 60000,
    text: "Students often prefer to access their study materials quickly before a big test. With askPDS, you can ask for a personalized preparation plan. The AI, which tracks your previous grades, can identify your weak spots and suggest specific back-up materials to study. For teachers, the benefits are even greater. Teachers dislike spending hours on manual grading reports. askPDS can generate a 'heat map' of the classroom. This map, which provides a visual overview of student performance, helps teachers see who is struggling and who is excelling. This allows them to go on teaching while the AI handles the data organization."
  },
  {
    id: 4,
    title: "4. Conclusion",
    timeRange: "2:45-3:45",
    durationMs: 60000,
    text: "To make this work, we need to update features on our main server. We should include a drop-down menu for quick settings and ensure touch screen compatibility for students using tablets in class. By setting up this versatile system, we transform our school into a truly modern environment. In conclusion, we should stop using inefficient methods and start embracing AI. This improvement, which will save us hours of work every week, is the future of Satit Patumwan. Let’s make our school life easier. Just ask PDS!"
  }
];

const splitIntoSentenceGuidedChunks = (text: string): ChunkInfo[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const allChunks: ChunkInfo[] = [];

  sentences.forEach(sentence => {
    const trimmedSentence = sentence.trim();
    const words = trimmedSentence.split(/\s+/).filter(w => w.length > 0);
    const punc = sentence.trim().slice(-1);

    for (let i = 0; i < words.length; i += 3) {
      const chunkWords = words.slice(i, i + 3);
      const isEnd = i + 3 >= words.length;
      allChunks.push({
        words: chunkWords,
        type: isEnd ? 'END' : 'FLOW',
        punctuation: isEnd ? punc : null
      });
    }
  });

  return allChunks;
};

function App() {
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const saved = localStorage.getItem('pds_prompter_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved sections', e);
    }
    return DEFAULT_SECTIONS;
  });
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const uiTimeoutRef = useRef<any>(null);

  // Auto-hide UI logic
  useEffect(() => {
    const handleMouseMove = () => {
      setShowUI(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);

      if (isPlaying || countdown !== null) {
        uiTimeoutRef.current = setTimeout(() => {
          setShowUI(false);
        }, 3000);
      }
    };

    if (isPlaying || countdown !== null) {
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      setShowUI(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [isPlaying, countdown]);

  useEffect(() => {
    localStorage.setItem('pds_prompter_sections', JSON.stringify(sections));
  }, [sections]);

  const currentSection = useMemo(() => sections[currentSectionIndex] || sections[0], [sections, currentSectionIndex]);
  const sectionChunks = useMemo(() => splitIntoSentenceGuidedChunks(currentSection.text), [currentSection.text]);

  const timing = useMemo(() => {
    const counts = sectionChunks.map(chunk => (chunk.type === 'END' ? 1.75 : 1.0));
    const totalUnits = counts.reduce((a, b) => a + b, 0);
    const unitMs = currentSection.durationMs / totalUnits;
    return { unitMs, chunkDurations: counts.map(c => c * unitMs) };
  }, [sectionChunks, currentSection.durationMs]);

  // Countdown Logic
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setIsPlaying(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && currentChunkIndex < sectionChunks.length - 1) {
      const duration = timing.chunkDurations[currentChunkIndex];
      timer = setTimeout(() => {
        setCurrentChunkIndex(prev => prev + 1);
      }, duration);
    } else if (currentChunkIndex >= sectionChunks.length - 1 && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentChunkIndex, sectionChunks.length, timing]);

  const togglePlay = () => {
    if (countdown !== null) {
      setCountdown(null);
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setCountdown(5);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingScript) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'Escape' && (isPlaying || countdown !== null)) {
        setIsPlaying(false);
        setCountdown(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, countdown, isEditingScript]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const progress = (currentChunkIndex / Math.max(1, sectionChunks.length - 1)) * 100;
  const currentChunk = sectionChunks[currentChunkIndex] || { words: [], type: 'FLOW', punctuation: null };

  return (
    <div
      className={`app-container ${isFullscreen ? 'is-fullscreen' : ''} ${!showUI ? 'hide-ui' : ''}`}
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
    >
      <header className={`nav-header glass-panel ${(isPlaying || countdown !== null) && !showUI ? 'hidden' : ''}`}>
        <div className="brand"><Mic size={18} color="#4d7cfe" /> PDS PROMPTER</div>
        <nav className="sections-nav">
          {sections.map((s, i) => (
            <button key={s.id} className={`nav-button ${currentSectionIndex === i ? 'active' : ''}`} onClick={() => { setCurrentSectionIndex(i); setCurrentChunkIndex(0); setIsPlaying(false); setCountdown(null); }}>
              {s.title}
            </button>
          ))}
          <button className="icon-button edit-script-btn" onClick={() => setIsEditingScript(true)} style={{ marginLeft: '1rem', color: '#00f2ff' }}>
            <Settings size={18} />
          </button>
        </nav>
        <button className="icon-button fs-toggle" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </header>

      {isEditingScript && (
        <div className="script-editor-overlay">
          <div className="script-editor-modal glass-panel">
            <header className="modal-header">
              <h2>CUSTOMIZE SCRIPT</h2>
              <button className="icon-button" onClick={() => setIsEditingScript(false)}><X size={24} /></button>
            </header>

            <div className="sections-list">
              {sections.map((section, idx) => (
                <div key={section.id} className="section-edit-card">
                  <div className="card-header">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[idx].title = e.target.value;
                        setSections(newSections);
                      }}
                      placeholder="Section Title"
                      className="title-input"
                    />
                    <div className="time-input-group">
                      <Timer size={14} />
                      <input
                        type="text"
                        value={section.timeRange}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[idx].timeRange = e.target.value;
                          setSections(newSections);
                        }}
                        placeholder="0:00-1:00"
                        className="time-input"
                      />
                      <input
                        type="number"
                        value={section.durationMs / 1000}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[idx].durationMs = parseInt(e.target.value) * 1000;
                          setSections(newSections);
                        }}
                        placeholder="Seconds"
                        className="duration-input"
                      />
                      <span className="unit">SEC</span>
                    </div>
                    <button className="icon-button delete-btn" onClick={() => {
                      if (sections.length > 1) {
                        if (confirm(`Delete section "${section.title}"?`)) {
                          const newSections = sections.filter((_, i) => i !== idx);
                          setSections(newSections);
                          if (currentSectionIndex >= newSections.length) {
                            setCurrentSectionIndex(newSections.length - 1);
                          }
                        }
                      }
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    value={section.text}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[idx].text = e.target.value;
                      setSections(newSections);
                    }}
                    placeholder="Enter script text here..."
                    className="text-input"
                  />
                </div>
              ))}
            </div>

            <footer className="modal-footer">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="secondary-btn" onClick={() => {
                  const newId = sections.length > 0 ? Math.max(...sections.map(s => s.id)) + 1 : 1;
                  setSections([...sections, {
                    id: newId,
                    title: `Section ${sections.length + 1}`,
                    timeRange: "0:00-1:00",
                    durationMs: 60000,
                    text: ""
                  }]);
                }}>
                  <Plus size={18} /> ADD SECTION
                </button>
                <button className="secondary-btn" style={{ opacity: 0.6 }} onClick={() => {
                  if (confirm('Reset to default script? All custom changes will be lost.')) {
                    setSections(DEFAULT_SECTIONS);
                    setCurrentSectionIndex(0);
                  }
                }}>
                  RESET TO DEFAULT
                </button>
              </div>
              <button className="primary-btn" onClick={() => setIsEditingScript(false)}>
                DONE
              </button>
            </footer>
          </div>
        </div>
      )}

      <main className="prompter-main">
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-label">GET READY</div>
          </div>
        )}

        {/* EYE FOCUS GUIDES - VERTICAL LINES */}
        <div className="eye-focus-guides">
          <div className="v-guide left"></div>
          <div className="v-guide right"></div>
        </div>

        <div className="status-sign-container-large">
          {currentChunk.type === 'FLOW' ? (
            <div className="sign-flow-large">
              <ArrowRight size={48} /> <span>FLOWING</span>
            </div>
          ) : (
            <div className="sign-end-large">
              <Dot size={80} strokeWidth={8} /> <span>PAUSE</span>
            </div>
          )}
        </div>

        <div className="teleprompter-track">
          <div className="word-display">
            <div className={`chunk-container ${currentChunk.type === 'END' ? 'is-end' : ''}`}>
              {currentChunk.words.map((word: string, idx: number) => {
                const isFocus = currentChunk.words.length === 1 ? true : (currentChunk.words.length === 2 ? idx === 0 : idx === 1);
                return (
                  <span key={idx} className={`word ${isFocus ? 'focus-word' : 'flank-word'}`}>
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tonation-graph-sidebar">
          {currentChunk.punctuation === '?' && (
            <div className="tone-graph upward">
              <TrendingUp size={64} />
              <div className="graph-viz"><div className="bar up"></div></div>
              <span>PITCH UP</span>
            </div>
          )}
          {currentChunk.punctuation === '!' && (
            <div className="tone-graph power">
              <Zap size={64} fill="currentColor" />
              <div className="graph-viz"><div className="bar full"></div></div>
              <span>ENERGY</span>
            </div>
          )}
          {currentChunk.type === 'FLOW' && (
            <div className="tone-graph steady">
              <Minus size={64} strokeWidth={3} />
              <div className="graph-viz"><div className="bar flat"></div></div>
              <span>STEADY</span>
            </div>
          )}
          {currentChunk.punctuation === '.' && (
            <div className="tone-graph drop">
              <ArrowDown size={64} />
              <div className="graph-viz"><div className="bar low"></div></div>
              <span>PITCH DOWN</span>
            </div>
          )}
        </div>
      </main>

      <footer className={`controls-footer glass-panel ${(isPlaying || countdown !== null) && !showUI ? 'hidden' : ''}`}>
        <div className="time-marker-info" style={{ marginBottom: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center', opacity: 0.6 }}>
          <Timer size={14} />
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            LOCKED TO MARKER: {currentSection.timeRange}
          </span>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="playback-controls">
          <button className="icon-button" onClick={() => setCurrentChunkIndex(Math.max(0, currentChunkIndex - 1))}><SkipBack size={24} /></button>
          <button className="icon-button play-pause-btn" onClick={togglePlay}>
            {isPlaying || countdown !== null ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
          </button>
          <button className="icon-button" onClick={() => setCurrentChunkIndex(Math.min(sectionChunks.length - 1, currentChunkIndex + 1))}><SkipForward size={24} /></button>
          <button className="icon-button" onClick={() => { setCurrentChunkIndex(0); setIsPlaying(false); setCountdown(null); }} style={{ marginLeft: '1rem' }}><RotateCcw size={20} /></button>
        </div>
      </footer>
    </div>
  );
}

export default App;

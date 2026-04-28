import { useState, useEffect, useRef } from 'react';
import { Volume2, Pause, Square, Trash2, Copy, RefreshCw, Save, Download } from 'lucide-react';

// ─── Text Filters ───
const FILTERS: { id: string; label: string; desc: string; fn: (t: string) => string; default: boolean }[] = [
  { id: 'urls', label: 'Strip URLs', desc: 'Remove http(s) links', fn: t => t.replace(/https?:\/\/\S+/g, ' '), default: true },
  { id: 'hashtags', label: 'Strip #hashtags', desc: 'Remove hashtag tokens', fn: t => t.replace(/#[\w-]+/g, ' '), default: true },
  { id: 'mentions', label: 'Strip @mentions', desc: 'Remove @user tokens', fn: t => t.replace(/@[\w.-]+/g, ' '), default: true },
  { id: 'code', label: 'Strip code blocks', desc: '``` and inline `code`', fn: t => t.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' '), default: false },
  { id: 'math', label: 'Strip math', desc: '$...$ and $$...$$ blocks', fn: t => t.replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$]+\$/g, ' '), default: false },
  { id: 'emoji', label: 'Strip emoji', desc: 'Unicode pictographs', fn: t => t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' '), default: false },
  { id: 'markdown', label: 'Strip markdown', desc: '*, _, ~, headings, links', fn: t => t.replace(/[*_~]{1,3}/g, '').replace(/^#{1,6}\s/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'), default: false },
  { id: 'parens', label: 'Strip parentheticals', desc: '(...) and [...]', fn: t => t.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' '), default: false },
];

const STORAGE_KEY = 'pof2828_tts';
const DEFAULT_VOICE = 'BrianMultilingual';

export function TTSView() {
  const synth = useRef(window.speechSynthesis);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [inputText, setInputText] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [status, setStatus] = useState<'ready' | 'speaking' | 'paused' | 'error'>('ready');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(FILTERS.filter(f => f.default).map(f => f.id))
  );
  const [tab, setTab] = useState<'speak' | 'filters' | 'voice'>('speak');
  const voiceResolved = useRef(false);

  // Find voice index by name substring (case-insensitive)
  const findVoiceByName = (list: SpeechSynthesisVoice[], name: string): number => {
    const lower = name.toLowerCase();
    const idx = list.findIndex(v => v.name.toLowerCase().includes(lower));
    return idx >= 0 ? idx : 0;
  };

  // Load voices + resolve saved/default voice by name
  useEffect(() => {
    const load = () => {
      const v = synth.current.getVoices();
      if (!v.length) return;
      setVoices(v);

      // Re-resolve every time onvoiceschanged fires.
      // Edge loads SAPI voices instantly but neural voices stream in
      // asynchronously over the network. We only "lock" the voice when
      // the actual saved voice has arrived in the list — never fall
      // back to index 0 (the robot trap).
      let saved: { voiceName?: string; rate?: number; volume?: number; filters?: string[] } = {};
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch { saved = {}; }

      const targetName = saved.voiceName || DEFAULT_VOICE;
      const exactIdx = v.findIndex(voice =>
        voice.name.toLowerCase().includes(targetName.toLowerCase())
      );

      if (exactIdx >= 0) {
        // Saved voice is in the list — lock it in.
        setVoiceIdx(exactIdx);
        voiceResolved.current = true;
        // Apply non-voice prefs (idempotent).
        if (saved.rate != null) setRate(saved.rate);
        if (saved.volume != null) setVolume(saved.volume);
        if (saved.filters) setActiveFilters(new Set(saved.filters));
      } else if (!voiceResolved.current) {
        // Saved voice not loaded yet AND we haven't locked anything.
        // Hold position — do NOT fall back to voice 0. Wait for the
        // next onvoiceschanged event to re-check. Still apply other
        // prefs so rate/volume/filters are correct on first paint.
        if (saved.rate != null) setRate(saved.rate);
        if (saved.volume != null) setVolume(saved.volume);
        if (saved.filters) setActiveFilters(new Set(saved.filters));
      }
      // else: voice already locked from a previous load() call. No-op.
    };
    load();
    if (synth.current.onvoiceschanged !== undefined) {
      synth.current.onvoiceschanged = load;
    }
  }, []);

  const saveConfig = () => {
    const voiceName = voices[voiceIdx]?.name || DEFAULT_VOICE;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      voiceName, rate, volume, filters: [...activeFilters]
    }));
  };

  const normalize = (raw: string) => {
    let t = raw;
    for (const f of FILTERS) {
      if (activeFilters.has(f.id)) t = f.fn(t);
    }
    return t.replace(/\s+/g, ' ').trim();
  };

  const speak = (text: string) => {
    synth.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    if (voices[voiceIdx]) utt.voice = voices[voiceIdx];
    utt.rate = rate;
    utt.volume = volume;
    utt.onstart = () => setStatus('speaking');
    utt.onend = () => setStatus('ready');
    utt.onerror = () => setStatus('error');
    synth.current.speak(utt);
  };

  const doSpeak = () => {
    if (!inputText.trim()) return;
    const cleaned = normalize(inputText);
    setCleanedText(cleaned);
    if (cleaned) speak(cleaned);
  };

  const doPause = () => {
    if (synth.current.speaking && !synth.current.paused) {
      synth.current.pause();
      setStatus('paused');
    } else if (synth.current.paused) {
      synth.current.resume();
      setStatus('speaking');
    }
  };

  const doStop = () => {
    synth.current.cancel();
    setStatus('ready');
  };

  const [downloading, setDownloading] = useState(false);
  const [edgeVoice, setEdgeVoice] = useState('en-US-BrianMultilingualNeural');

  // Edge TTS voice options for download
  const EDGE_VOICES = [
    { id: 'en-US-AriaNeural', name: 'Aria (Female)' },
    { id: 'en-US-GuyNeural', name: 'Guy (Male)' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Female)' },
    { id: 'en-US-BrianMultilingualNeural', name: 'Brian (Male)' },
    { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (Female)' },
    { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (Male)' },
    { id: 'en-US-AvaMultilingualNeural', name: 'Ava (Female)' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia (UK Female)' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)' },
  ];

  const downloadMP3 = async (text: string) => {
    if (!text.trim()) return;
    setDownloading(true);
    setStatus('ready');

    try {
      const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud';
      const connId = crypto.randomUUID().replace(/-/g, '');
      const ws = new WebSocket(`${wsUrl}?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connId}`);

      const audioChunks: Uint8Array[] = [];
      const rateStr = rate >= 1 ? `+${Math.round((rate - 1) * 100)}%` : `-${Math.round((1 - rate) * 100)}%`;
      const volStr = `+${Math.round((volume - 1) * 100)}%`;

      ws.onopen = () => {
        // Send config
        ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);

        // Send SSML
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${edgeVoice}'><prosody rate='${rateStr}' volume='${volStr}'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`;
        const reqId = crypto.randomUUID().replace(/-/g, '');
        ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          // Binary message — audio data with header
          event.data.arrayBuffer().then(buf => {
            const view = new DataView(buf);
            // First 2 bytes = header length (big endian)
            const headerLen = view.getUint16(0);
            // Audio data starts after header
            const audioData = new Uint8Array(buf, 2 + headerLen);
            if (audioData.length > 0) {
              audioChunks.push(audioData);
            }
          });
        } else if (typeof event.data === 'string') {
          if (event.data.includes('Path:turn.end')) {
            // Done — assemble and download
            const totalLen = audioChunks.reduce((s, c) => s + c.length, 0);
            const mp3 = new Uint8Array(totalLen);
            let offset = 0;
            for (const chunk of audioChunks) {
              mp3.set(chunk, offset);
              offset += chunk.length;
            }
            const blob = new Blob([mp3], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nerve-tts-${Date.now()}.mp3`;
            a.click();
            URL.revokeObjectURL(url);
            ws.close();
            setDownloading(false);
            setStatus('ready');
          }
        }
      };

      ws.onerror = () => {
        setDownloading(false);
        setStatus('error');
      };

      ws.onclose = () => {
        if (downloading) {
          setDownloading(false);
        }
      };

      // Timeout after 30s
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setDownloading(false);
          setStatus('error');
        }
      }, 30000);

    } catch {
      setDownloading(false);
      setStatus('error');
    }
  };

  const doDownload = () => {
    const text = cleanedText || normalize(inputText);
    if (!text.trim()) return;
    setCleanedText(text);
    downloadMP3(text);
  };

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const statusColor = status === 'speaking' ? 'text-green-400' : status === 'paused' ? 'text-yellow-400' : status === 'error' ? 'text-red-400' : 'text-muted-foreground';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {(['speak', 'filters', 'voice'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 ${tab === t ? 'text-gold border-gold' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SPEAK TAB */}
        {tab === 'speak' && (
          <>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gold uppercase mb-1 block">Input Text</label>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder="Paste or type text here..."
                className="w-full min-h-[120px] bg-card border border-border rounded-md p-3 text-sm text-foreground resize-y focus:border-gold/50 focus:outline-none font-mono" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={doSpeak} className="px-3 py-1.5 rounded text-xs font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors">
                <Volume2 className="w-3 h-3 inline mr-1" /> SPEAK
              </button>
              <button onClick={doPause} className="px-3 py-1.5 rounded text-xs font-bold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Pause className="w-3 h-3 inline mr-1" /> {status === 'paused' ? 'RESUME' : 'PAUSE'}
              </button>
              <button onClick={doStop} className="px-3 py-1.5 rounded text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
                <Square className="w-3 h-3 inline mr-1" /> STOP
              </button>
              <button onClick={() => { setCleanedText(normalize(inputText)); }}
                className="px-3 py-1.5 rounded text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors">
                <Trash2 className="w-3 h-3 inline mr-1" /> CLEAN
              </button>
              <button onClick={doDownload} disabled={downloading}
                className="px-3 py-1.5 rounded text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50">
                <Download className="w-3 h-3 inline mr-1" /> {downloading ? 'GENERATING...' : 'DOWNLOAD MP3'}
              </button>
            </div>

            {/* Edge voice for download */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold tracking-widest text-purple-400 uppercase shrink-0">Download Voice:</label>
              <select value={edgeVoice} onChange={e => setEdgeVoice(e.target.value)}
                className="flex-1 p-1.5 bg-card border border-border rounded text-xs text-foreground focus:border-purple-400/50 focus:outline-none">
                {EDGE_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {cleanedText && (
              <details className="group">
                <summary className="text-[10px] font-bold tracking-widest text-green-400 uppercase cursor-pointer select-none flex items-center gap-1 hover:text-green-300 transition-colors list-none">
                  <span className="text-green-400/60 group-open:rotate-90 transition-transform text-xs">&#9654;</span>
                  Cleaned Output
                  <button onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(cleanedText); }}
                    className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-card border border-border text-muted-foreground hover:text-foreground">
                    <Copy className="w-3 h-3 inline mr-1" />COPY
                  </button>
                </summary>
                <textarea value={cleanedText} readOnly
                  className="w-full min-h-[80px] bg-card border border-border rounded-md p-3 text-sm text-green-400 resize-y font-mono mt-2" />
              </details>
            )}
          </>
        )}

        {/* FILTERS TAB */}
        {tab === 'filters' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest text-gold uppercase mb-2 block">Text Normalization</label>
            {FILTERS.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-md">
                <div>
                  <div className="text-sm text-foreground">{f.label}</div>
                  <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                </div>
                <button onClick={() => toggleFilter(f.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${activeFilters.has(f.id) ? 'bg-gold/30' : 'bg-border'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${activeFilters.has(f.id) ? 'translate-x-5 bg-gold' : 'translate-x-0.5 bg-muted-foreground'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* VOICE TAB */}
        {tab === 'voice' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gold uppercase mb-1 block">Voice</label>
              <select value={voiceIdx} onChange={e => setVoiceIdx(Number(e.target.value))}
                className="w-full p-2 bg-card border border-border rounded-md text-sm text-foreground focus:border-gold/50 focus:outline-none">
                {voices.map((v, i) => (
                  <option key={i} value={i}>{v.name.replace('Microsoft ', '')} ({v.lang})</option>
                ))}
                {voices.length === 0 && <option>Loading voices...</option>}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-gold uppercase mb-1 block">
                Speed: {rate.toFixed(1)}x
              </label>
              <input type="range" min="0.25" max="3" step="0.25" value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full accent-gold" />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-gold uppercase mb-1 block">
                Volume: {Math.round(volume * 100)}%
              </label>
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-full accent-gold" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => speak('Nerve text to speech is working.')}
                className="px-3 py-1.5 rounded text-xs font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20">
                <Volume2 className="w-3 h-3 inline mr-1" /> TEST
              </button>
              <button onClick={() => { saveConfig(); }}
                className="px-3 py-1.5 rounded text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20">
                <Save className="w-3 h-3 inline mr-1" /> SAVE DEFAULT
              </button>
              <button onClick={() => { const v = synth.current.getVoices(); setVoices(v); }}
                className="px-3 py-1.5 rounded text-xs font-bold bg-card border border-border text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3 h-3 inline mr-1" /> REFRESH
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'speaking' ? 'bg-green-400 animate-pulse' : status === 'paused' ? 'bg-yellow-400' : status === 'error' ? 'bg-red-400' : 'bg-muted-foreground'}`} />
          <span className={`text-[10px] font-bold tracking-widest uppercase ${statusColor}`}>
            {status === 'ready' ? (voices.length + ' VOICES') : status.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-widest">WEB SPEECH</span>
      </div>
    </div>
  );
}

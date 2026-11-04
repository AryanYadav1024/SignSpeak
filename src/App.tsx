import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Download, Hand, Lightbulb, MessageCircle,
  Mic, Moon, Pause, Pencil, Play, RotateCcw, Square, Sun, Volume2,
} from 'lucide-react';
import signs from './signs.json';
import { speakConfirmation, useSpeech } from './speech';
import { GeneratedNotation } from './GeneratedNotation';
import { generateSignWriting } from './generateSignWriting';

type Sign = (typeof signs)[number];
type Result = { original: string } & (
  { sign: Sign; simplified: string | null; method: 'Gemini' | 'Dictionary' }
  | { fsw: string; method: 'Generated' }
);

function Panel({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: ReactNode; children: ReactNode;
}) {
  const id = title.toLowerCase().replaceAll(' ', '-');
  return <section className={`panel ${id}`} aria-labelledby={id}>
    <div className="panel-heading">
      <span className="panel-icon">{icon}</span>
      <div><h2 id={id}>{title}</h2><p>{subtitle}</p></div>
    </div>
    {children}
  </section>;
}

function Status({ ready, label }: { ready: boolean; label: string }) {
  return <span className={`status ${ready ? 'ready' : ''}`}><i />{label}</span>;
}

function Empty({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="empty"><span className="empty-icon">{icon}</span><strong>{title}</strong><small>{detail}</small></div>;
}

function Playback({ sign }: { sign: Sign | undefined }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  async function play() {
    const player = video.current;
    if (!player) return;
    try {
      if (player.ended) player.currentTime = 0;
      await player.play();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true);
    }
  }

  return <>
    <div className="result-row"><span>Animation</span><Status ready={!!sign?.video && !failed} label={failed ? 'Unavailable' : playing ? 'Playing' : sign?.video ? 'Ready' : 'Standby'} /></div>
    <div className="viewport video-viewport">
      {sign?.video && !failed
        ? <video ref={video} src={sign.video} muted playsInline preload="auto" aria-label={`ASL Signbank video for ${sign.label}`}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)} />
        : <Empty icon={<Hand />} title={failed ? 'Playback unavailable' : sign ? 'Video unavailable' : 'Signing preview'} detail={failed ? 'Open the source clip below.' : 'Translate a supported phrase to load a signer clip.'} />}
      <div className="playback-controls">
        <button type="button" className="icon-button" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} disabled={!sign?.video || failed}
          onClick={() => playing ? video.current?.pause() : void play()}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
        <button type="button" className="icon-button" title="Restart" aria-label="Restart" disabled={!sign?.video || failed}
          onClick={() => { if (video.current) { video.current.currentTime = 0; void play(); } }}><RotateCcw size={17} /></button>
      </div>
    </div>
    <div className="panel-footer">{sign ? <a href={sign.source} target="_blank" rel="noreferrer">ASL Signbank source clip ↗</a> : 'Use controls to play, pause, or restart'}</div>
  </>;
}

export default function App() {
  const [text, setText] = useState('');
  const [simplify, setSimplify] = useState(true);
  const [light, setLight] = useState(false);
  const [message, setMessage] = useState('');
  const [exported, setExported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [translationId, setTranslationId] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const { listening, toggle } = useSpeech((transcript) => {
    setText(transcript.slice(0, 500));
    setMessage('Transcript added. Review it, then translate.');
  }, setMessage);

  async function translate() {
    if (busy || listening) return;
    const original = text.trim();
    if (!original) {
      setMessage('Type a message or record your voice first.');
      input.current?.focus();
      return;
    }
    setBusy(true);
    setResult(null);
    setUnsupported(false);
    setExported(false);
    setMessage('');
    const normalized = original.toLowerCase().replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim();
    const exact = signs.find((sign) => sign.aliases.includes(normalized));
    let sign = exact;
    let method: 'Gemini' | 'Dictionary' = 'Dictionary';
    let simplified: string | null = null;
    let notice = '';
    try {
      const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: original, targetSignLanguage: 'ASL', simplifyText: simplify }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The translation service is unavailable.');
      if (data.signId !== null) {
        const match = signs.find(({ id }) => id === data.signId);
        if (!match) throw new Error('The translation service returned an unknown sign.');
        if (exact && match.id !== exact.id) throw new Error('Gemini returned a different sign.');
        sign = match;
        method = 'Gemini';
        simplified = simplify && data.simplifiedText === match.label && original !== match.label ? match.label : null;
      }
    } catch (error) {
      notice = error instanceof TypeError || error instanceof SyntaxError
        ? 'AI service is unavailable.'
        : error instanceof Error ? error.message : 'AI service is unavailable.';
    }
    if (sign) {
      setResult({ sign, original, simplified, method });
      setTranslationId((id) => id + 1);
      setMessage(notice ? `${notice} Showing a dictionary match.` : '');
      speakConfirmation();
    } else {
      setMessage('Generating SignWriting…');
      try {
        const fsw = await generateSignWriting(original);
        setResult({ fsw, original, method: 'Generated' });
        setMessage('');
        speakConfirmation();
      } catch (error) {
        setUnsupported(true);
        setMessage(error instanceof Error ? error.message : 'Could not generate SignWriting. Try again.');
      }
    }
    setBusy(false);
  }

  const knownSign = result && 'sign' in result ? result.sign : undefined;
  const generated = result?.method === 'Generated' ? result : null;

  return <div className={`app ${light ? 'light' : ''}`}>
    <header>
      <div className="header-content">
        <div className="brand"><span className="logo"><MessageCircle size={24} /></span><div><h1>SignBridge</h1><p>AI-Powered Voice-to-Sign Translator</p></div></div>
        <div className="header-actions">
          <label className="simplify"><span><strong>Simplify Text</strong><small>Optimize for translation</small></span>
            <input type="checkbox" role="switch" checked={simplify} onChange={(e) => setSimplify(e.target.checked)} /><span className="switch" /></label>
          <button className="icon-button theme" type="button" title="Toggle theme" aria-label="Toggle theme" aria-pressed={light} onClick={() => setLight(!light)}>{light ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>
    </header>
    <main>
      <div className="workspace-label"><span><i /> TRANSLATION WORKSPACE</span><span className="language">ASL <b>·</b> SignWriting</span></div>
      <div className="grid">
        <Panel title="Input Text" subtitle="Type or speak your message to translate" icon={<Pencil size={19} />}>
          <div className="input-field">
            <textarea ref={input} aria-label="Message to translate" maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Type your message here, or use the microphone to speak…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void translate();
                }
              }} />
            <span className="count">{text.length} / 500</span>
          </div>
          <div className="keyboard"><kbd>↵ Enter</kbd> to translate <span>·</span> <kbd>Shift + Enter</kbd> for a new line</div>
          <div className="examples"><span>Examples with signer clips</span><div>{signs.map((sign) => <button type="button" key={sign.id} onClick={() => { setText(sign.label); setMessage(''); input.current?.focus(); }}>{sign.label}</button>)}</div></div>
          <p className="feedback" role="status">{listening ? 'Listening… speak now.' : message || (busy ? 'Translating…' : '')}</p>
          <div className="input-actions">
            <button type="button" className="primary record" onClick={toggle} disabled={busy}>{listening ? <Square size={17} /> : <Mic size={18} />}{listening ? 'Stop recording' : 'Record Voice'}</button>
            <button type="button" className="primary translate" disabled={busy || listening} onClick={() => void translate()}>{busy ? 'Translating…' : 'Translate'}<ArrowRight size={19} /></button>
          </div>
        </Panel>
        <Panel title="SignWriting" subtitle="Visual notation system" icon={<BookOpen size={20} />}>
          <div className="result-row"><span>{generated ? 'Machine-generated' : knownSign?.notation ? '1 sign' : '0 signs'}</span><Status ready={!!knownSign?.notation} label={busy ? 'Working' : generated ? 'Experimental' : knownSign?.notation ? 'Ready' : unsupported ? 'Unavailable' : 'Standby'} /></div>
          <div className="viewport notation-viewport">
            {knownSign?.notation && <a className="icon-button export" href={knownSign.notation} download={`SignBridge-${knownSign.id}.svg`} title="Download SignWriting SVG" aria-label="Download SignWriting SVG" onClick={() => setExported(true)}><Download size={17} /></a>}
            {generated ? <GeneratedNotation fsw={generated.fsw} /> : knownSign?.notation
              ? <figure tabIndex={0} title={`SignWriting for ${knownSign.label}`}><img src={knownSign.notation} alt={`SignWriting for ${knownSign.label}`} /><figcaption>{knownSign.label}</figcaption></figure>
              : <Empty icon={<BookOpen />} title={unsupported || result ? 'Notation unavailable' : 'Your signs appear here'} detail={unsupported || result ? 'No verified SignWriting mapping for this input.' : 'Enter a message and select Translate.'} />}
          </div>
          <div className="panel-footer" role="status">{generated ? 'Generated notation may contain ASL errors.' : exported ? 'SVG download started' : 'Hover for details · Scroll for more'}</div>
        </Panel>
        <Panel title="Animation" subtitle="Sign language animation" icon={<Lightbulb size={21} />}>
          {generated ? <div className="viewport"><Empty icon={<Hand />} title="No signer clip for this result" detail="Machine translation produces written symbols. Signer clips are available for dictionary entries." /></div>
            : <Playback key={translationId + (result ? '-result' : '-empty')} sign={knownSign} />}
        </Panel>
      </div>
      {result && <div className="result-summary" aria-live="polite">
        <span><b>{generated ? 'Machine-generated SignWriting' : `${result.method} match`}</b> · {result.original}{'simplified' in result && result.simplified && <> → <b>{result.simplified}</b></>}</span>
        <button type="button" className="icon-button" title="Repeat spoken confirmation" aria-label="Repeat spoken confirmation" onClick={speakConfirmation}><Volume2 size={17} /></button>
      </div>}
      <footer className="site-footer"><span>SignBridge · Experimental ASL translation</span><span><a href="/credits.txt" target="_blank" rel="noreferrer">Model and media credits</a></span></footer>
    </main>
  </div>;
}

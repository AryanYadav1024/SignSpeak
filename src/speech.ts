import { useEffect, useRef, useState } from 'react';

interface Recognition {
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function useSpeech(onTranscript: (text: string) => void, onMessage: (text: string) => void) {
  const active = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  useEffect(() => () => {
    if (!active.current) return;
    active.current.onresult = active.current.onerror = active.current.onend = null;
    active.current.abort();
    active.current = null;
  }, []);

  function toggle() {
    if (active.current) {
      active.current.stop();
      return;
    }
    const browser = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) {
      onMessage('Speech recognition is unavailable here. Type below or try desktop Chrome.');
      return;
    }
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.onresult = ({ results }) => {
      const transcript = Array.from(results, (result) => result[0].transcript).join(' ').trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = ({ error }) => {
      const errors: Record<string, string> = {
        'not-allowed': 'Allow microphone access in your browser, or type your message.',
        'service-not-allowed': 'Speech recognition is blocked. You can type your message.',
        'audio-capture': 'No microphone is available. You can type your message.',
        'no-speech': 'No speech detected. Try again or type your message.',
        network: 'Speech recognition could not connect. You can type your message.',
      };
      onMessage(errors[error] ?? 'Recording stopped. Try again or type your message.');
    };
    recognition.onend = () => {
      active.current = null;
      setListening(false);
    };
    try {
      recognition.start();
      active.current = recognition;
      setListening(true);
      onMessage('');
    } catch {
      onMessage('Could not start the microphone. You can type your message.');
    }
  }

  return { listening, toggle };
}

export function speakConfirmation() {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const confirmation = new SpeechSynthesisUtterance('Your sign representation is ready.');
  confirmation.lang = 'en-US';
  window.speechSynthesis.speak(confirmation);
}

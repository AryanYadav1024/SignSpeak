import { useState } from 'react';
import { Download } from 'lucide-react';
import './GeneratedNotation.css';

const symbol = 'S(?:[12][0-9a-f]{2}|3[0-7][0-9a-f]|38[0-9ab])[0-5][0-9a-f]';
const coordinate = '[0-9]{3}x[0-9]{3}';
const sign = new RegExp(`^(?:A(?:${symbol})+)?[BLMR]${coordinate}(?:${symbol}${coordinate})+$`);
const punctuation = new RegExp(`^S38[7-9ab][0-5][0-9a-f]${coordinate}$`);

export function parseFsw(fsw: string): string[] {
  if (fsw.length > 12_000) return [];
  const tokens = fsw.trim().split(/\s+/);
  if (tokens.length > 48 || !tokens.every((token) =>
    token.length <= 768 && (sign.test(token) || punctuation.test(token)))) return [];
  return tokens;
}

function SignImage({ token, index }: { token: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return <li>{failed
    ? <span className="generated-sign-error">Sign {index + 1} could not load</span>
    : <img
        src={`https://signpuddle.com/server/fsw/svg/${encodeURIComponent(token)}`}
        alt={`Generated SignWriting symbol ${index + 1}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />}
  </li>;
}

export function GeneratedNotation({ fsw }: { fsw: string }) {
  const tokens = parseFsw(fsw);
  if (!tokens.length) return <p className="generated-sign-error">The generated notation could not be displayed.</p>;

  function downloadNotation() {
    const file = new Blob([tokens.join(' ') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'signbridge-generated.fsw';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <figure className="generated-notation">
    <button
      type="button"
      className="icon-button export"
      onClick={downloadNotation}
      aria-label="Download Formal SignWriting"
      title="Download Formal SignWriting"
    ><Download size={17} /></button>
    <ol className="generated-signs" aria-label="Generated signs">
      {tokens.map((token, index) => <SignImage key={`${index}-${token}`} token={token} index={index} />)}
    </ol>
    <figcaption>
      Machine-generated SignWriting preview · <a href="https://signpuddle.com/" target="_blank" rel="noreferrer">SignPuddle rendering</a>
    </figcaption>
  </figure>;
}

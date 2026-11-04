import { parseFsw } from './GeneratedNotation';

export async function generateSignWriting(text: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(24000),
    });
  } catch {
    throw new Error('The SignWriting model did not respond. Try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'SignWriting generation is unavailable.');
  if (typeof data?.fsw !== 'string' || !parseFsw(data.fsw).length) {
    throw new Error('The model returned notation that could not be displayed. Try a shorter sentence.');
  }
  return data.fsw;
}

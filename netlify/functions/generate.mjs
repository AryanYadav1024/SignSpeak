export default async function generate(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let text;
  try {
    const body = await request.text();
    if (body.length > 3000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const input = JSON.parse(body);
    text = typeof input?.text === 'string' ? input.text.trim() : '';
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!text || text.length > 500) {
    return Response.json({ error: 'Enter 1–500 characters.' }, { status: 400 });
  }

  const endpoint = process.env.SIGNWRITING_MODEL_URL;
  if (!endpoint) {
    return Response.json({ error: 'Sentence generation is unavailable on this site.' }, { status: 503 });
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.SIGNWRITING_MODEL_TOKEN) {
      headers.Authorization = `Bearer ${process.env.SIGNWRITING_MODEL_TOKEN}`;
    }
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ texts: [text], spoken_language: 'en', signed_language: 'ase' }),
    });
    if (!upstream.ok) throw new Error('Model request failed');

    const data = await upstream.json();
    const fsw = Array.isArray(data?.output) && data.output[0];
    if (typeof fsw !== 'string' || !fsw.trim() || fsw.length > 12000) {
      return Response.json({ error: 'The model returned no usable SignWriting for this input.' }, { status: 422 });
    }
    return Response.json({ fsw });
  } catch {
    return Response.json({ error: 'The SignWriting model could not be reached. Try again.' }, { status: 502 });
  }
}

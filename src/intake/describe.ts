// Clothing and belongings from a photo, by the local vision model behind /api/photo/describe.
// The model shares the GPU with speech and field extraction, so a description can be slow; give up after 20 s.
export const DESCRIBE_FAILED = 'Could not describe the photo. Please type.';
const DESCRIBE_TIMEOUT_MS = 20000;

/** The description, or null if the server, the model or the time limit failed. */
export async function describePhoto(image: string): Promise<string | null> {
  const started = performance.now();
  try {
    const res = await fetch('/api/photo/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { description } = (await res.json()) as { description: string };
    console.info(`[Reunite] photo described in ${Math.round(performance.now() - started)} ms`);
    return description.trim() || null;
  } catch (err) {
    console.warn(`[Reunite] photo description failed after ${Math.round(performance.now() - started)} ms`, err);
    return null;
  }
}

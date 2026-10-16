import { configuredAIProvider } from '@/lib/ai/gateway';

type Content = { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'high' | 'low' | 'auto' };

export const aiConfigured = () => { try { const p = configuredAIProvider(); return !!(p === 'GROK' ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY); } catch { return false; } };
export const extractModel = () => process.env.BIZBETTER_AI_EXTRACT_MODEL || (configuredAIProvider() === 'GROK' ? 'grok-4.20-non-reasoning' : 'gpt-4.1-mini');

/**
 * Structured call used for document classification/extraction. The model only labels and locates;
 * every value it returns is re-checked against the file by the caller.
 */
export async function structuredCall<T>(input: { system: string; content: Content[]; name: string; schema: object; timeoutMs?: number; model?: string }): Promise<{ value: T; model: string } | null> {
  if (!aiConfigured()) return null;
  const provider = configuredAIProvider();
  const key = provider === 'GROK' ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY;
  const endpoint = provider === 'GROK' ? 'https://api.x.ai/v1/responses' : 'https://api.openai.com/v1/responses';
  const model = input.model || extractModel();
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), input.timeoutMs ?? (Number(process.env.BIZBETTER_AI_EXTRACT_TIMEOUT_MS) || 120_000));
  try {
    const r = await fetch(endpoint, { method: 'POST', signal: ac.signal, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, store: false, max_output_tokens: 8000, input: [{ role: 'system', content: [{ type: 'input_text', text: input.system }] }, { role: 'user', content: input.content }],
        text: { format: { type: 'json_schema', name: input.name, strict: true, schema: input.schema } } }) });
    if (!r.ok) throw new Error(`AI provider unavailable (${r.status}).`);
    const d = await r.json() as { output?: Array<{ content?: Array<{ type: string; text?: string }> }>; model?: string };
    const text = d.output?.flatMap((o) => o.content || []).find((c) => c.type === 'output_text')?.text;
    if (!text) throw new Error('Provider returned no structured output.');
    return { value: JSON.parse(text) as T, model: d.model || model };
  } finally { clearTimeout(timer); }
}

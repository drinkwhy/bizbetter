// lib/demo/engines/gemini-analyst.ts
// ISOLATED DEMO / TEST ONLY. NEVER IMPORT FROM PRODUCTION ROUTES.

import type { AIAnalystQueryContext, StructuredAnalysisResponse } from './ai-analyst';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiAnalystEngine {
  /**
   * Live Gemini analysis for temporary demo data only.
   * Returns the same shape as the rule-based AIAnalystEngine.
   */
  public static async analyze(
    query: string,
    ctx: AIAnalystQueryContext,
    options?: { model?: string; apiKey?: string }
  ): Promise<StructuredAnalysisResponse> {
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = options?.model || process.env.BIZBETTER_DEMO_GEMINI_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
      // Safe fallback so demo still works offline
      return {
        summary: 'Gemini API key not configured. Using deterministic demo response.',
        facts: ['No live Gemini call was made.'],
        calculations: [],
        estimates: [],
        hypotheses: ['Set GEMINI_API_KEY (or GOOGLE_API_KEY) in your .env to enable live analysis.'],
        recommendedActions: ['Add the key and restart the demo test.']
      };
    }

    const systemInstruction = `You are a temporary demo financial analyst for fictional HVAC contractor data.
Answer using ONLY the supplied context. Never invent numbers that are not present.
Strictly separate:
1. FACTS (directly from the numbers)
2. CALCULATIONS (math you perform)
3. ESTIMATES (reasonable projections)
4. HYPOTHESES (possible root causes)
5. RECOMMENDED ACTIONS

Return ONLY valid JSON matching this exact shape:
{
  "summary": "string",
  "facts": ["string"],
  "calculations": ["string"],
  "estimates": ["string"],
  "hypotheses": ["string"],
  "recommendedActions": ["string"]
}`;

    const userPayload = {
      query,
      business: ctx.businessName,
      financials: {
        revenue: ctx.revenue,
        grossProfit: ctx.grossProfit,
        netProfit: ctx.netProfit,
        netMargin: ctx.netMargin,
        laborExpense: ctx.laborExpense,
        materialExpense: ctx.materialExpense,
        marketingExpense: ctx.marketingExpense,
        softwareExpense: ctx.softwareExpense,
        averageJobValue: ctx.averageJobValue,
        jobsCompleted: ctx.jobsCompleted
      },
      activeLeaks: ctx.activeLeaks,
      opportunities: ctx.opportunities,
      recentDecisions: ctx.recentDecisions
    };

    const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(userPayload) }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini demo call failed (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini returned no content.');
    }

    // Parse the structured JSON
    let parsed: StructuredAnalysisResponse;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Some models wrap JSON in markdown; try to extract it
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Gemini returned non-JSON output.');
      parsed = JSON.parse(match[0]);
    }

    // Minimal shape validation
    if (!parsed.summary || !Array.isArray(parsed.facts)) {
      throw new Error('Gemini response missing required fields.');
    }

    return {
      summary: parsed.summary,
      facts: parsed.facts || [],
      calculations: parsed.calculations || [],
      estimates: parsed.estimates || [],
      hypotheses: parsed.hypotheses || [],
      recommendedActions: parsed.recommendedActions || []
    };
  }
}

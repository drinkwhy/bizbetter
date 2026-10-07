# Gemini setup

Get an API key from https://aistudio.google.com/apikey. In the project's local `.env`, set:

```dotenv
BIZBETTER_AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
BIZBETTER_AI_GEMINI_MODEL=gemini-2.5-flash
```

Replace the existing provider setting rather than adding a duplicate. Keep the key server-side. Restart `pnpm dev`, select the business on AI Analyst, and choose Analyze my business.

Gemini uses its own model setting; OpenAI model overrides do not change it. All analysis depths use this model. Missing keys, rejected/truncated output and provider failures leave deterministic findings available. Output still passes BizBetter's evidence-ID and quantitative-claim validation.

Google's unpaid API tier has model-dependent quotas and permits product-improvement use of inputs/outputs. Use the fictional exports for free-tier testing. Do not submit confidential customer financial records to unpaid services. See https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/terms.

Run the mocked integration check with `node --import tsx scripts/verify-gemini.ts`. No real provider calls or API keys are used in this test.

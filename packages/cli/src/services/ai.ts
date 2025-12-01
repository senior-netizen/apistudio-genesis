import { readSecret, storeSecret } from '../core/vault.js';

const OPENAI_ENDPOINT = process.env.SQUIRREL_OPENAI_URL ?? 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.SQUIRREL_AI_MODEL ?? 'gpt-4.1-mini';
const OPENAI_SECRET_ID = 'openai-api-key';

async function resolveApiKey(): Promise<string | undefined> {
  const direct = process.env.OPENAI_API_KEY;
  if (direct) return direct;
  return readSecret(OPENAI_SECRET_ID);
}

async function callOpenAI(prompt: string, system?: string): Promise<string | undefined> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return undefined;
  }
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        system ? { role: 'system', content: system } : undefined,
        { role: 'user', content: prompt },
      ].filter(Boolean),
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { output_text?: string };
  return data.output_text ?? 'AI response unavailable';
}

export async function rememberOpenAIKey(key: string): Promise<void> {
  await storeSecret(OPENAI_SECRET_ID, key);
}

export async function suggestRequest(path: string): Promise<string> {
  const prompt = `Suggest improvements for API request ${path}. Provide bullet list of tips.`;
  const response = await callOpenAI(prompt, 'You are an API expert improving HTTP requests.');
  if (!response) {
    return 'AI disabled. Set OPENAI_API_KEY to receive intelligent suggestions.';
  }
  return response;
}

export async function generateDocsForCollection(collectionName: string, summary: string): Promise<string> {
  const prompt = `Generate succinct API documentation for collection ${collectionName}. Use markdown.`;
  const response = await callOpenAI(prompt, 'You are an API technical writer.');
  if (!response) {
    return `# ${collectionName}\n\n${summary || 'Documentation generated locally. Provide OPENAI_API_KEY for AI enriched docs.'}`;
  }
  return response;
}

export async function fixErrorMessage(error: string): Promise<string> {
  const prompt = `Explain how to resolve this API error: ${error}. Provide actionable steps.`;
  const response = await callOpenAI(prompt, 'You are a senior backend engineer helping to debug APIs.');
  if (!response) {
    return `Unable to reach AI services. Investigate manually: ${error}`;
  }
  return response;
}

export async function generateRunInsights(
  collectionName: string,
  results: { request: { name: string; method: string; path: string }; status: number; duration: number }[]
): Promise<string[]> {
  const prompt = `Analyze the following API run for collection ${collectionName} and provide 3 improvement tips with focus on performance and reliability.\n${JSON.stringify(
    results,
    null,
    2
  )}`;
  const response = await callOpenAI(prompt, 'You are an observability and reliability specialist.');
  if (!response) {
    return results.map((result) => {
      if (result.status >= 400) {
        return `${result.request.name} returned ${result.status}. Inspect server logs or retry with tracing enabled.`;
      }
      if (result.duration > 1000) {
        return `${result.request.name} took ${result.duration}ms. Consider enabling Smart Retry or caching.`;
      }
      return `${result.request.name} is healthy. Track in dashboards for regressions.`;
    });
  }
  return response
    .split('\n')
    .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean);
}

import { getServerEnv } from "@/config/env";

export type AIProviderName = "openrouter" | "openai" | "anthropic";

export interface AICompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface AICompletionResult {
  provider: AIProviderName;
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) {
        return res;
      }
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt === maxAttempts) throw err;
    }

    const delayMs = 400 * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("AI provider request failed after retries.");
}

async function callOpenAI(
  apiKey: string,
  model: string,
  req: AICompletionRequest
): Promise<AICompletionResult> {
  const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  const promptTokens = json.usage?.prompt_tokens ?? 0;
  const completionTokens = json.usage?.completion_tokens ?? 0;

  return {
    provider: "openai",
    model,
    content,
    promptTokens,
    completionTokens,
    totalTokens: json.usage?.total_tokens ?? promptTokens + completionTokens,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  req: AICompletionRequest
): Promise<AICompletionResult> {
  const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const content = json.content?.find((c) => c.type === "text")?.text;
  if (!content) {
    throw new Error("Anthropic returned an empty response.");
  }

  const promptTokens = json.usage?.input_tokens ?? 0;
  const completionTokens = json.usage?.output_tokens ?? 0;

  return {
    provider: "anthropic",
    model,
    content,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  appUrl: string,
  req: AICompletionRequest
): Promise<AICompletionResult> {
  const res = await fetchWithRetry(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": "Quoventra",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter API error (${res.status}): ${body.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  const promptTokens = json.usage?.prompt_tokens ?? 0;
  const completionTokens = json.usage?.completion_tokens ?? 0;

  return {
    provider: "openrouter",
    model,
    content,
    promptTokens,
    completionTokens,
    totalTokens: json.usage?.total_tokens ?? promptTokens + completionTokens,
  };
}

/**
 * Checks whether the configured server-side AI provider has an API key set.
 */
export function getConfiguredAIProvider(): {
  provider: AIProviderName;
  model: string;
  configured: boolean;
} {
  const env = getServerEnv();
  if (env.AI_PROVIDER === "openrouter") {
    return {
      provider: "openrouter",
      model: env.OPENROUTER_MODEL,
      configured: Boolean(env.OPENROUTER_API_KEY?.trim()),
    };
  }
  if (env.AI_PROVIDER === "anthropic") {
    return {
      provider: "anthropic",
      model: env.ANTHROPIC_MODEL,
      configured: Boolean(env.ANTHROPIC_API_KEY?.trim()),
    };
  }
  return {
    provider: "openai",
    model: env.OPENAI_MODEL,
    configured: Boolean(env.OPENAI_API_KEY?.trim()),
  };
}

/**
 * Executes a structured completion against the active server-side AI provider.
 */
export async function generateAICompletion(
  req: AICompletionRequest
): Promise<AICompletionResult> {
  const env = getServerEnv();

  if (env.AI_PROVIDER === "openrouter") {
    const apiKey = env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "AI provider (openrouter) is not configured. Set OPENROUTER_API_KEY in .env.local."
      );
    }
    return callOpenRouter(
      apiKey,
      env.OPENROUTER_MODEL,
      env.NEXT_PUBLIC_APP_URL,
      req
    );
  }

  if (env.AI_PROVIDER === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "AI provider (anthropic) is not configured. Set ANTHROPIC_API_KEY in .env.local."
      );
    }
    return callAnthropic(apiKey, env.ANTHROPIC_MODEL, req);
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI provider (openai) is not configured. Set OPENAI_API_KEY in .env.local."
    );
  }
  return callOpenAI(apiKey, env.OPENAI_MODEL, req);
}


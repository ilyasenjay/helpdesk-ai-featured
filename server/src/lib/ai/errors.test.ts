import { describe, expect, test } from "bun:test";
import { APICallError } from "ai";
import { classifyAiError } from "./errors";

function apiError(statusCode: number, responseBody?: string): APICallError {
  return new APICallError({
    message: "API call failed",
    url: "https://api.groq.com/openai/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    responseBody,
  });
}

describe("classifyAiError — billing", () => {
  test("classifies a 402 as billing required", () => {
    const result = classifyAiError(apiError(402));
    expect(result.code).toBe("ai_billing_required");
    expect(result.status).toBe(502);
  });

  test("classifies a 403 mentioning credits as billing required, not auth failure", () => {
    const result = classifyAiError(
      apiError(403, JSON.stringify({ error: "Your team has no credits or licenses yet." }))
    );
    expect(result.code).toBe("ai_billing_required");
  });
});

describe("classifyAiError — auth", () => {
  test("classifies a bare 401 as auth failed", () => {
    const result = classifyAiError(apiError(401, JSON.stringify({ error: "invalid api key" })));
    expect(result.code).toBe("ai_auth_failed");
  });

  test("classifies a bare 403 with no billing wording as auth failed", () => {
    const result = classifyAiError(apiError(403, JSON.stringify({ error: "forbidden" })));
    expect(result.code).toBe("ai_auth_failed");
  });
});

describe("classifyAiError — model not found", () => {
  test("classifies a 404 mentioning the model as model not found", () => {
    const result = classifyAiError(
      apiError(404, JSON.stringify({ error: { message: "The model does not exist" } }))
    );
    expect(result.code).toBe("ai_model_not_found");
  });

  test("does not classify an unrelated 404 as model not found", () => {
    const result = classifyAiError(apiError(404, JSON.stringify({ error: "not found" })));
    expect(result.code).not.toBe("ai_model_not_found");
  });
});

describe("classifyAiError — rate limiting", () => {
  test("classifies a 429 with daily wording distinctly from a plain rate limit", () => {
    const result = classifyAiError(
      apiError(429, JSON.stringify({ error: "daily request limit reached" }))
    );
    expect(result.code).toBe("ai_rate_limited");
    expect(result.message).toMatch(/daily/i);
  });

  test("classifies a 429 without daily wording as a generic rate limit", () => {
    const result = classifyAiError(apiError(429, JSON.stringify({ error: "rate limited" })));
    expect(result.code).toBe("ai_rate_limited");
    expect(result.message).not.toMatch(/daily/i);
  });
});

describe("classifyAiError — server errors and fallback", () => {
  test("classifies a 500+ as overloaded", () => {
    const result = classifyAiError(apiError(503));
    expect(result.code).toBe("ai_overloaded");
  });

  test("falls back to a generic unavailable message for non-API-call errors", () => {
    const result = classifyAiError(new Error("network exploded"));
    expect(result.code).toBe("ai_unavailable");
  });
});

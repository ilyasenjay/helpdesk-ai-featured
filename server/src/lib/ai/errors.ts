import { APICallError } from "ai";
import { AI_MODEL_ID } from "./model";

export interface AiErrorResponse {
  status: number;
  code: string;
  message: string;
}

function parseProviderErrorMessage(responseBody?: string): string | undefined {
  if (!responseBody) return undefined;
  try {
    const parsed = JSON.parse(responseBody) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") return parsed.error;
    return parsed.error?.message;
  } catch {
    return undefined;
  }
}

export function classifyAiError(err: unknown): AiErrorResponse {
  if (err instanceof APICallError) {
    const providerMessage = parseProviderErrorMessage(err.responseBody) ?? "";

    // Check billing/credits signals before the blanket auth-failure bucket: some providers
    // return 401/403 "permission-denied" for a team with no credits/plan, which is a billing
    // problem, not an invalid key — the two need different, actionable messages.
    if (
      err.statusCode === 402 ||
      /credit|balance|billing|licens|subscription/i.test(providerMessage)
    ) {
      return {
        status: 502,
        code: "ai_billing_required",
        message:
          "The Groq API account has no active billing/credits. Check your plan at console.groq.com to re-enable AI features.",
      };
    }

    if (err.statusCode === 401 || err.statusCode === 403) {
      return {
        status: 502,
        code: "ai_auth_failed",
        message:
          "The Groq API key was rejected. It may be invalid or revoked — check console.groq.com.",
      };
    }

    if (err.statusCode === 404 && /model/i.test(providerMessage)) {
      return {
        status: 502,
        code: "ai_model_not_found",
        message: `The configured Groq model ("${AI_MODEL_ID}") wasn't found. Check GROQ_MODEL against the current model list at console.groq.com/docs/models and update it.`,
      };
    }

    if (err.statusCode === 429) {
      const isDailyLimit = /\bday\b|\bdaily\b/i.test(providerMessage);
      return {
        status: 503,
        code: "ai_rate_limited",
        message: isDailyLimit
          ? "Groq's free-tier daily request limit has been reached. It resets on a rolling basis — try again later, or upgrade the plan at console.groq.com."
          : "The AI service is temporarily rate-limited. Please wait a moment and try again.",
      };
    }

    if (err.statusCode && err.statusCode >= 500) {
      return {
        status: 503,
        code: "ai_overloaded",
        message: "The AI service is temporarily overloaded. Please try again shortly.",
      };
    }
  }

  return {
    status: 502,
    code: "ai_unavailable",
    message: "This AI feature is temporarily unavailable. Please try again later.",
  };
}

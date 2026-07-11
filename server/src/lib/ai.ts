// Master entry point for the AI features (Reply Polish, Ticket Summarize, Auto-Classification,
// and shared error handling). Each feature's implementation lives in its own file under ./ai/ —
// this file just re-exports the public surface so callers only need one import path.

export { AI_MODEL_ID } from "./ai/model";
export { classifyAiError } from "./ai/errors";
export type { AiErrorResponse } from "./ai/errors";
export { formatPolishedReply } from "./ai/polish";
export { buildTicketSummaryPrompt } from "./ai/summary";
export {
  classifyTicketCategory,
  buildTicketCategoryPrompt,
  parseTicketCategoryResponse,
} from "./ai/classify";

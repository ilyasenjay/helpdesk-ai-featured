// Strips Gmail-style quoted reply history from a plain-text email body, so only the customer's
// new reply is kept — not the "On <date>, <name> wrote:" header and the "> "-quoted message below
// it. Heuristic, not a full email-reply parser, but matches what Gmail's own plain-text
// alternative actually produces, which is what the poller receives.
export function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);

  // The quote header is usually one line ("On <date> ... <name> <email> wrote:") but Gmail
  // soft-wraps it onto a second line ending in just "wrote:" when the name/date is long.
  const headerIndex = lines.findIndex((line, i) => {
    const trimmed = line.trim();
    if (/^on\s.+\swrote:$/i.test(trimmed)) return true;
    return /^on\s/i.test(trimmed) && /^wrote:$/i.test(lines[i + 1]?.trim() ?? "");
  });

  let cutIndex = headerIndex;

  if (cutIndex === -1) {
    // No header found (e.g. a mail client that doesn't add one) — fall back to the first line
    // that starts a run of "> " quoted lines continuing to the end of the message.
    const quoteStart = lines.findIndex((line) => line.trim().startsWith(">"));
    if (
      quoteStart !== -1 &&
      lines.slice(quoteStart).every((line) => line.trim() === "" || line.trim().startsWith(">"))
    ) {
      cutIndex = quoteStart;
    }
  }

  const kept = cutIndex === -1 ? lines : lines.slice(0, cutIndex);
  return kept.join("\n").trimEnd();
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

// Some mail clients generate their plain-text alternative by stripping HTML tags without
// decoding entities, leaving literal "&gt;"/"&amp;" etc. in what's supposed to be plain text.
// Decodes just the common ones rather than pulling in a full HTML-entity library for this.
export function decodeCommonHtmlEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => HTML_ENTITIES[match] ?? match);
}

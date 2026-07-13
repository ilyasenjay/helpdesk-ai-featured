import type { ReactNode } from "react";

// Renders *word* as bold. Some mail clients' plain-text alternative represents what was actually
// bold HTML (e.g. a name in a signature) as asterisk-wrapped text — this is the display-side
// counterpart to that, so it shows as real bold instead of literal asterisks. Call this on text
// that's already been through sanitizeText — it only ever produces plain strings and <strong>
// elements, never raw HTML, so it's safe to run on unsanitized input too, but sanitizing first is
// still the point of defense against other markup.
export function renderPlainTextWithBold(text: string): ReactNode[] {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) => {
    const match = /^\*([^*\n]+)\*$/.exec(part);
    return match ? <strong key={i}>{match[1]}</strong> : part;
  });
}

import { google } from "googleapis";
import { env } from "../env";

export function isGmailConfigured(): boolean {
  return Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken);
}

const SUPPORT_ALIAS_TAG = "support";

// The "+support" alias of the configured Gmail account (see server/.env.example) — mail sent here
// still lands in the same inbox, but a Gmail filter labels it "Helpdesk" so the poller can tell it
// apart from ordinary personal mail. Outbound replies must be sent From this address, not the
// plain account address: when the customer hits Reply, their reply is addressed back to whatever
// From we used, so sending from the plain address would make their reply miss the filter (and
// therefore the poller) entirely.
export function getGmailSupportAddress(): string {
  const [local, domain] = env.gmailAddress!.split("@");
  return `${local}+${SUPPORT_ALIAS_TAG}@${domain}`;
}

let gmailClient: ReturnType<typeof google.gmail> | null = null;

// The underlying OAuth2Client auto-refreshes its access token from the refresh token as needed —
// callers never have to think about token expiry.
export function getGmailClient() {
  if (!isGmailConfigured()) {
    throw new Error("Gmail is not configured — set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN");
  }

  gmailClient ??= (() => {
    const auth = new google.auth.OAuth2({
      clientId: env.gmailClientId,
      clientSecret: env.gmailClientSecret,
    });
    auth.setCredentials({ refresh_token: env.gmailRefreshToken });
    return google.gmail({ version: "v1", auth });
  })();

  return gmailClient;
}

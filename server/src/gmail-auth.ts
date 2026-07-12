// One-time interactive script to obtain a Gmail API refresh token for GMAIL_REFRESH_TOKEN.
// Run with: bun run gmail:auth
// Requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET already set in server/.env — see the setup
// steps in server/.env.example.
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in server/.env before running this script.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri: REDIRECT_URI });

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.modify"],
});

console.log("1. Open this URL and sign in with the Gmail account that should receive tickets:\n");
console.log(authUrl);
console.log("\n2. After granting access you'll be redirected to localhost — this script picks it up automatically.\n");
console.log("Waiting for authorization...\n");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error(`Authorization denied: ${error}`);
      setTimeout(() => { server.stop(); process.exit(1); }, 100);
      return new Response(`Authorization denied: ${error}`, { status: 400 });
    }

    if (!code) {
      return new Response("Missing ?code param", { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken({ code, redirect_uri: REDIRECT_URI });

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh token was returned. This Gmail account has likely already authorized this " +
          "app before. Revoke access at https://myaccount.google.com/permissions and run this " +
          "script again.",
      );
      setTimeout(() => { server.stop(); process.exit(1); }, 100);
      return new Response("No refresh token returned — see terminal for next steps.", { status: 500 });
    }

    console.log("\n✓ Authorization complete. Add this to server/.env:\n");
    console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log();

    setTimeout(() => { server.stop(); process.exit(0); }, 500);
    return new Response("Success! You can close this tab and return to the terminal.");
  },
});

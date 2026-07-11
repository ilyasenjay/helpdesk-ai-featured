const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "CLIENT_URL"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const env = {
  clientUrl: process.env.CLIENT_URL as string,
  port: process.env.PORT ?? "3000",
  mailgunWebhookSigningKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
};

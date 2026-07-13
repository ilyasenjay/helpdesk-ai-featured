import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const authClient = createAuthClient({
  // In dev, the client and server run on different ports (5173 / 3000), so this must point at the
  // Vite proxy origin to keep cookies same-origin. In production the server serves the built
  // client itself, so client and API share one origin — baseURL can be omitted (Better Auth
  // defaults to the current origin).
  baseURL: import.meta.env.DEV ? "http://localhost:5173" : undefined,
  plugins: [inferAdditionalFields<typeof auth>()],
});

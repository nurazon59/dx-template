import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { authAccount, authSession, authUser, authVerification } from "../db/schema.js";
import { env } from "../env.js";

const trustedOrigins = ["http://localhost:3000", "http://localhost:5173", ...env.TRUSTED_ORIGINS];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  trustedOrigins,
});

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { authAccount, authSession, authUser, authVerification } from "../db/schema.js";

const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env["TRUSTED_ORIGINS"]
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

export const auth = betterAuth({
  baseURL: process.env["BETTER_AUTH_URL"],
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

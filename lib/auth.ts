import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink, twoFactor } from "better-auth/plugins";
import prisma from "./prisma";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  "development-only-secret-min-32-chars-long!!";

// Every origin that is allowed to send credentialed requests (cookies).
// Wildcards do NOT work with withCredentials=true — list each origin explicitly.
const trustedOrigins = [
  // Flutter web (GitHub Pages)
  "https://notoriouszx.github.io",
  // Local development
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  // The Vercel deployment itself (for the web dashboard)
  "https://project-9g6if.vercel.app",
  // Any extra origins from the environment variable (comma-separated)
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

export const auth = betterAuth({
  trustedOrigins,

  appName: "E-HealthCare",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "patient",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.info(`[magic-link] ${email}\n${url}`);
      },
      expiresIn: 600,
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        console.info(`[email-otp:${type}] ${email} → ${otp}`);
      },
      otpLength: 6,
      expiresIn: 300,
    }),
    twoFactor({
      issuer: "E-HealthCare",
      otpOptions: {
        async sendOTP({ user, otp }) {
          console.info(`[2fa-otp] ${user.email} → ${otp}`);
        },
      },
    }),
  ],
});

export type SessionUser = typeof auth.$Infer.Session.user;

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink, twoFactor } from "better-auth/plugins";
import prisma from "./prisma";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  "development-only-secret-min-32-chars-long!!";

export const auth = betterAuth({
  trustedOrigins: ["*"],

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

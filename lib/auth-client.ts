"use client";

import { createAuthClient } from "better-auth/client";
import {
  emailOTPClient,
  magicLinkClient,
  twoFactorClient,
} from "better-auth/client/plugins";

function getBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    magicLinkClient(),
    emailOTPClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        if (typeof window === "undefined") return;
        const seg = window.location.pathname.split("/").filter(Boolean);
        const locale = seg[0] === "en" || seg[0] === "fr" || seg[0] === "ar" ? seg[0] : "en";
        window.location.href = `/${locale}/auth/two-factor`;
      },
    }),
  ],
});

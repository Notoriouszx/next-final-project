import withNextIntl from "next-intl/plugin";

const nextConfig = withNextIntl("./i18n/request.ts")({
  experimental: {
    useCache: true,
  },
  serverExternalPackages: ["@prisma/client", "better-auth"],
});

export default nextConfig;

import withNextIntl from "next-intl/plugin";

const nextConfig = withNextIntl("./i18n/request.ts")({
  experimental: {
    useCache: true,
  },
  
  /* config options here */


});

export default nextConfig;

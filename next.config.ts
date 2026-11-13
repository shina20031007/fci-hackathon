import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  agentRules: false,
  distDir:
    process.env.NODE_ENV === "production"
      ? ".next"
      : (process.env.NEXT_DIST_DIR ?? ".next"),
};
export default config;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (and partial prefetching, which depends on it) are off on purpose:
  // almost every page here reads the signed-in user, and classic dynamic rendering keeps
  // the mental model simple for the hackathon. Revisit after the event.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

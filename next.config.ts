import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // The first daily game (a grid with a warm-up and a bonus round) was retired.
      { source: "/daily", destination: "/", permanent: true },
      { source: "/keyword-collage", destination: "/close-ups", permanent: true },
      { source: "/keyword-collage/:puzzleId", destination: "/close-ups/:puzzleId", permanent: true },
      // Casting call's fixed boards (1 to 6) gave way to a daily board.
      { source: "/casting-call/:board(\\d{1,2})", destination: "/casting-call", permanent: true },
    ];
  },
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

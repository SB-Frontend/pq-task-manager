import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js otherwise writes AGENTS.md / CLAUDE.md into the repo on every run.
  agentRules: false,
};

export default nextConfig;

import pkg from "@next/env";
import path from "path";
import { fileURLToPath } from "url";

const { loadEnvConfig } = pkg;

// Load carehomeos/.env so AUTH0_* and other server secrets reach the dashboard.
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(repoRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: [
    "carehomeos.localtest.me",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;

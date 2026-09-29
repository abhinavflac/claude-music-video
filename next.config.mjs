/** @type {import('next').NextConfig} */
const nextConfig = {
  // this repo is not a monorepo, but there is a stray lockfile above it; keep Next's workspace root here
  turbopack: { root: import.meta.dirname },
  // the checks run their own server; a separate build folder lets them run next to a dev server you already have open
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;

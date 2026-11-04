/** @type {import('next').NextConfig} */
// Static export (out/) for any static host (Netlify Drop, Cloudflare Pages, GitHub Pages…).
// NEXT_PUBLIC_BASE_PATH=/repo builds for a sub-path host such as a GitHub Pages project site; leave unset for root hosts.
// Images render via a plain <img>, so the built-in optimizer is off.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {output: 'export', trailingSlash: true, basePath, images: {unoptimized: true}};
export default nextConfig;

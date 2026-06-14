/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone', // required for Docker multi-stage build
}

module.exports = nextConfig

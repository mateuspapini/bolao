/** @type {import('next').NextConfig} */
const nextConfig = {
  // site 100% estático: pode ir para Vercel ou para qualquer hospedagem comum
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

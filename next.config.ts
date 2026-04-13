import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', 'mongoose', 'bcryptjs'],
  // @ts-ignore - Turbopack root configuration
  turbopack: {
    root: 'C:\\Users\\Elbek\\Desktop\\PRO\\aiscan3',
  },
};

export default nextConfig;

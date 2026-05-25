import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', 'mongoose', 'bcryptjs', 'jszip'],
};

export default nextConfig;

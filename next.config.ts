import type { NextConfig } from "next";

// Usamos o modelo de renderização dinâmico "clássico" (sem Cache Components)
// para manter o código simples para quem for contribuir.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
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

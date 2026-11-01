import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Permite abrir o servidor de desenvolvimento pela rede local (IP ou nome .local do Mac),
  // além de localhost. Sem isso o Next bloqueia o hot reload e a página não hidrata.
  allowedDevOrigins: ["10.0.0.163", "MacBook-Air-de-Marcel.local"],
}

export default nextConfig

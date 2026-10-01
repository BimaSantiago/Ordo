import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Probar desde el celular en la red local (npm run dev -- -H 0.0.0.0). Next 16 bloquea por
  // defecto los recursos de desarrollo pedidos desde otros hosts y la página no se hidrata.
  // Si tu PC cambia de IP, actualízala aquí. Solo aplica en desarrollo.
  allowedDevOrigins: ["192.168.100.72"],
};

export default nextConfig;

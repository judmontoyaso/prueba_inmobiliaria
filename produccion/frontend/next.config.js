const nextConfig = {
  // El backend corre en el Droplet; en Vercel se configura via env var.
  // En desarrollo local se puede hacer proxy para evitar CORS:
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8001";
    return [
      { source: "/api/etl/:path*",   destination: `${backendUrl}/etl/:path*` },
      { source: "/api/etl",          destination: `${backendUrl}/etl/` },      { source: "/api/clima/:path*", destination: `${backendUrl}/clima/:path*` },
      { source: "/api/clima",        destination: `${backendUrl}/clima/` },
      { source: "/api/health",       destination: `${backendUrl}/health` },
    ];
  },
};

module.exports = nextConfig;

const nextConfig = {
  // El backend corre en el Droplet; en Vercel se configura via env var.
  // En desarrollo local se puede hacer proxy para evitar CORS:
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      { source: "/etl/:path*",   destination: `${backendUrl}/etl/:path*` },
      { source: "/clima/:path*", destination: `${backendUrl}/clima/:path*` },
      { source: "/health",       destination: `${backendUrl}/health` },
    ];
  },
};

module.exports = nextConfig;

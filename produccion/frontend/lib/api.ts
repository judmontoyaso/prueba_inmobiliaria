/**
 * lib/api.ts — helpers para llamar al backend.
 *
 * En producción Next.js rewrites /etl/* y /clima/* al Droplet
 * (configurado en next.config.ts con BACKEND_URL).
 * El navegador llama a URLs relativas → sin CORS.
 */

export async function uploadCSV(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/etl/upload", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json() as Promise<{
    reporte: Reporte;
    preview_propiedades: Record<string, unknown>[];
    preview_anuncios: Record<string, unknown>[];
  }>;
}

export async function resetETL() {
  const res = await fetch("/api/etl/reset", { method: "DELETE" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<{ ok: boolean; mensaje: string }>;
}

export async function getPropiedades(limit = 20, offset = 0) {
  const res = await fetch(`/api/etl/propiedades?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<{ data: Record<string, unknown>[]; count: number }>;
}

export async function getAnuncios(limit = 20, offset = 0) {
  const res = await fetch(`/api/etl/anuncios?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<{ data: Record<string, unknown>[]; count: number }>;
}

export async function getClima() {
  const res = await fetch("/api/clima");
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<{ data: ClimaRow[] }>;
}

export async function actualizarClima(nombres?: string[]) {
  const params = nombres?.length
    ? "?" + nombres.map((n) => `nombres=${encodeURIComponent(n)}`).join("&")
    : "";
  const res = await fetch(`/api/clima/actualizar${params}`, { method: "POST" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<{
    actualizados: number;
    errores: number;
    data: ClimaRow[];
  }>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Reporte {
  filas_crudas: number;
  duplicados: number;
  propiedades_validas: number;
  propiedades_rechazadas: number;
  propiedades_nuevas: number;
  propiedades_omitidas: number;
  anuncios_validos: number;
  anuncios_nuevos: number;
  anuncios_actualizados: number;
  anuncios_rechazados: number;
  metraje_nulo: number;
  precio_nulo: number;
  sin_tipo: number;
}

export interface ClimaRow {
  municipio: string;
  latitud: number;
  longitud: number;
  temperatura_c: number;
  weather_code: number;
  descripcion_clima: string;
  ultima_actualizacion: string;
}

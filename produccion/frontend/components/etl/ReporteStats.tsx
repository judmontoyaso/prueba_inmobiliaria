import type { Reporte } from "@/lib/api";

const STATS: { key: keyof Reporte; label: string; valueColor: string; accent: string }[] = [
  { key: "filas_crudas",           label: "Filas crudas",         valueColor: "#4b5563",  accent: "#9ca3af" },
  { key: "duplicados",             label: "Duplicados",           valueColor: "#c27a00",  accent: "#f0a830" },
  { key: "propiedades_validas",    label: "Props válidas",        valueColor: "#0d2b4a",  accent: "#1773a0" },
  { key: "propiedades_nuevas",     label: "Props nuevas",         valueColor: "#1a7c32",  accent: "#22a34a" },
  { key: "propiedades_omitidas",   label: "Props omitidas",       valueColor: "#6b7585",  accent: "#a0aab8" },
  { key: "propiedades_rechazadas", label: "Props rechazadas",     valueColor: "#c42400",  accent: "#e04020" },
  { key: "anuncios_validos",       label: "Anuncios procesados",  valueColor: "#1773a0",  accent: "#3399cc" },
  { key: "anuncios_nuevos",        label: "Anuncios nuevos",      valueColor: "#1a7c32",  accent: "#22a34a" },
  { key: "anuncios_actualizados",  label: "Actualizados",         valueColor: "#c27a00",  accent: "#f0a830" },
  { key: "anuncios_rechazados",    label: "Idénticos",            valueColor: "#6b7585",  accent: "#a0aab8" },
  { key: "metraje_nulo",           label: "Metraje nulo",         valueColor: "#bf5a00",  accent: "#e07520" },
  { key: "precio_nulo",            label: "Precio nulo",          valueColor: "#bf5a00",  accent: "#e07520" },
  { key: "sin_tipo",               label: "Sin tipo",             valueColor: "#6b7585",  accent: "#a0aab8" },
];

export default function ReporteStats({ reporte }: { reporte: Reporte }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
      {STATS.map(({ key, label, valueColor, accent }) => (
        <div
          key={key}
          className="stat-card"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <p className="text-2xl font-bold" style={{ color: valueColor }}>
            {(reporte[key] ?? 0).toLocaleString("es-CO")}
          </p>
          <p className="text-xs mt-1 leading-tight" style={{ color: "var(--muted)" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

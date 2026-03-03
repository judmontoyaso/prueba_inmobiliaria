import type { Reporte } from "@/lib/api";

type Stat = { key: keyof Reporte; label: string; valueColor: string; accent: string };

const GROUPS: { title: string; stats: Stat[] }[] = [
  {
    title: "Archivo CSV",
    stats: [
      { key: "filas_crudas", label: "Filas totales", valueColor: "#4b5563", accent: "#9ca3af" },
      { key: "duplicados",   label: "Duplicados",    valueColor: "#c27a00", accent: "#f0a830" },
    ],
  },
  {
    title: "Propiedades",
    stats: [
      { key: "propiedades_validas",    label: "Válidas",   valueColor: "#0d2b4a", accent: "#1773a0" },
      { key: "propiedades_nuevas",     label: "Nuevas",    valueColor: "#1a7c32", accent: "#22a34a" },
      { key: "propiedades_omitidas",   label: "Omitidas",  valueColor: "#6b7585", accent: "#a0aab8" },
      { key: "propiedades_rechazadas", label: "Rechazadas",valueColor: "#c42400", accent: "#e04020" },
    ],
  },
  {
    title: "Anuncios",
    stats: [
      { key: "anuncios_validos",      label: "Procesados",  valueColor: "#1773a0", accent: "#3399cc" },
      { key: "anuncios_nuevos",       label: "Nuevos",      valueColor: "#1a7c32", accent: "#22a34a" },
      { key: "anuncios_actualizados", label: "Actualizados",valueColor: "#c27a00", accent: "#f0a830" },
      { key: "anuncios_rechazados",   label: "Idénticos",   valueColor: "#6b7585", accent: "#a0aab8" },
    ],
  },
  {
    title: "Calidad",
    stats: [
      { key: "metraje_nulo", label: "Sin metraje", valueColor: "#bf5a00", accent: "#e07520" },
      { key: "precio_nulo",  label: "Sin precio",  valueColor: "#bf5a00", accent: "#e07520" },
      { key: "sin_tipo",     label: "Sin tipo",    valueColor: "#6b7585", accent: "#a0aab8" },
    ],
  },
];

function StatCard({ stat, reporte }: { stat: Stat; reporte: Reporte }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${stat.accent}` }}>
      <p className="text-2xl font-bold" style={{ color: stat.valueColor }}>
        {(reporte[stat.key] ?? 0).toLocaleString("es-CO")}
      </p>
      <p className="text-xs mt-1 leading-tight" style={{ color: "var(--muted)" }}>{stat.label}</p>
    </div>
  );
}

export default function ReporteStats({ reporte }: { reporte: Reporte }) {
  return (
    <div className="space-y-3">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--muted)" }}
          >
            {group.title}
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${group.stats.length}, minmax(0, 1fr))` }}>
            {group.stats.map((stat) => (
              <StatCard key={stat.key} stat={stat} reporte={reporte} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

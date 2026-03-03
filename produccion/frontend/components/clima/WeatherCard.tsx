import type { ClimaRow } from "@/lib/api";

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  return "⛈️";
}

export default function WeatherCard({ d }: { d: ClimaRow }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <p className="font-semibold text-sm">
        {weatherIcon(d.weather_code)} {d.municipio}
      </p>
      <p className="text-3xl font-bold text-indigo-400 my-2">{d.temperatura_c}°C</p>
      <p className="text-slate-400 text-xs">{d.descripcion_clima}</p>
      <p className="text-slate-600 text-xs mt-2">
        📍 {d.latitud}, {d.longitud}
      </p>
      {d.ultima_actualizacion && (
        <p className="text-slate-600 text-xs">{d.ultima_actualizacion}</p>
      )}
    </div>
  );
}

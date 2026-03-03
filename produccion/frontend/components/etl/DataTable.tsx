type Row = Record<string, unknown>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function DataTable({ rows, title }: { rows: Row[]; title: string }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);

  return (
    <div className="card overflow-hidden">
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)", background: "#f9fafc" }}
      >
        <span
          className="text-xs font-semibold tracking-wide uppercase"
          style={{ color: "var(--primary)" }}
        >
          {title}
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded"
          style={{ background: "#e8eef7", color: "var(--primary)" }}
        >
          {rows.length} filas
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#f4f6fb" }}>
              {keys.map((k) => (
                <th
                  key={k}
                  className="text-left px-4 py-2 font-medium uppercase tracking-wider whitespace-nowrap"
                  style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f0f5fc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {keys.map((k) => (
                  <td key={k} className="px-4 py-2 whitespace-nowrap" style={{ color: "var(--text)" }}>
                    {cell(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

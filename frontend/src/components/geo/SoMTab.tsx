import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { geoAPI } from "../../services/api";
import { SoMResponse } from "../../types";

interface Props {
  projectId: string;
}

const BRAND_COLORS = [
  "#818cf8",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#60a5fa",
  "#a78bfa",
];

export default function SoMTab({ projectId }: Props) {
  const [data, setData] = useState<SoMResponse | null>(null);
  const [granularity, setGranularity] = useState<"day" | "week">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [projectId, granularity]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await geoAPI.getSoM(projectId, { granularity });
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Flatten series → chart data grouped by bucket
  const chartData = (() => {
    if (!data) return [];
    const bucketMap = new Map<string, Record<string, number>>();
    for (const row of data.series) {
      if (!bucketMap.has(row.bucket))
        bucketMap.set(row.bucket, { bucket: row.bucket as unknown as number });
      const entry = bucketMap.get(row.bucket)!;
      for (const b of row.brands) {
        entry[b.name] = (entry[b.name] ?? 0) + b.som;
      }
    }
    return [...bucketMap.values()].sort((a, b) =>
      String(a.bucket).localeCompare(String(b.bucket)),
    );
  })();

  // Collect all unique brand names
  const brands = [
    ...new Set(data?.series.flatMap((s) => s.brands.map((b) => b.name)) ?? []),
  ];

  // Summary: latest bucket totals
  const latestBucket = data?.series[data.series.length - 1];

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>📈 Share of Model (SoM)</h3>
        <div className="pill-toggle">
          <button
            className={granularity === "day" ? "active" : ""}
            onClick={() => setGranularity("day")}
          >
            Daily
          </button>
          <button
            className={granularity === "week" ? "active" : ""}
            onClick={() => setGranularity("week")}
          >
            Weekly
          </button>
        </div>
      </div>

      {latestBucket && (
        <div className="som-summary">
          {latestBucket.brands.slice(0, 5).map((b, i) => (
            <div
              key={b.name}
              className="som-card"
              style={{
                borderTop: `3px solid ${BRAND_COLORS[i % BRAND_COLORS.length]}`,
              }}
            >
              <div className="som-brand">{b.name}</div>
              <div className="som-value">{b.som.toFixed(1)}%</div>
              <div className="som-label">SoM</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : chartData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📉</div>
          <p>No SoM data yet. Run an analysis scan first.</p>
        </div>
      ) : (
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis
                dataKey="bucket"
                stroke="#718096"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="#718096" tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: "#1a202c",
                  border: "1px solid #2d3748",
                  borderRadius: 8,
                }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, ""]}
              />
              <Legend />
              {brands.map((brand, i) => (
                <Line
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

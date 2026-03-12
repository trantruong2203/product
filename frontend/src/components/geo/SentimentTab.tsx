import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { geoAPI } from "../../services/api";
import { SentimentResponse, NarrativeResponse } from "../../types";

interface Props {
  projectId: string;
}

const SENTIMENT_COLORS = {
  positive: "#34d399",
  neutral: "#94a3b8",
  negative: "#f87171",
};

export default function SentimentTab({ projectId }: Props) {
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [narratives, setNarratives] = useState<NarrativeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, nRes] = await Promise.all([
        geoAPI.getSentiment(projectId),
        geoAPI.getNarratives(projectId),
      ]);
      if (sRes.data.success) setSentiment(sRes.data.data);
      if (nRes.data.success) setNarratives(nRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pieData = sentiment
    ? [
        {
          name: "Positive",
          value: sentiment.distribution.positive,
          color: SENTIMENT_COLORS.positive,
        },
        {
          name: "Neutral",
          value: sentiment.distribution.neutral,
          color: SENTIMENT_COLORS.neutral,
        },
        {
          name: "Negative",
          value: sentiment.distribution.negative,
          color: SENTIMENT_COLORS.negative,
        },
      ].filter((d) => d.value > 0)
    : [];

  const totalSentiment = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>💬 Sentiment & Narrative Analysis</h3>
        <div className="score-pill">
          Avg Score:{" "}
          <strong>
            {sentiment?.avgSentimentScore !== undefined
              ? (sentiment.avgSentimentScore > 0 ? "+" : "") +
                (sentiment.avgSentimentScore * 10).toFixed(1) +
                "/10"
              : "—"}
          </strong>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : !sentiment || totalSentiment === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>No sentiment data yet. Run an analysis scan first.</p>
        </div>
      ) : (
        <div className="sentiment-layout">
          {/* Pie Chart */}
          <div className="chart-card half">
            <h4>Sentiment Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1a202c",
                    border: "1px solid #2d3748",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="sentiment-legend">
              {pieData.map((d) => (
                <span key={d.name} style={{ color: d.color }}>
                  ● {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>

          {/* Top Narratives bar chart */}
          {narratives && narratives.topNarratives.length > 0 && (
            <div className="chart-card half">
              <h4>Top Narrative Tags</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={narratives.topNarratives.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis type="number" stroke="#718096" />
                  <YAxis
                    dataKey="tag"
                    type="category"
                    stroke="#718096"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a202c",
                      border: "1px solid #2d3748",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tag list with share */}
          {narratives && narratives.topNarratives.length > 0 && (
            <div className="chart-card full">
              <h4>Narrative Tag Breakdown</h4>
              <div className="tag-list">
                {narratives.topNarratives.slice(0, 15).map((n) => (
                  <div key={n.tag} className="tag-row">
                    <span className="tag-name">#{n.tag}</span>
                    <div className="tag-bar-wrap">
                      <div
                        className="tag-bar"
                        style={{ width: `${n.share}%`, background: "#818cf8" }}
                      />
                    </div>
                    <span className="tag-share">{n.share.toFixed(1)}%</span>
                    <span className="tag-count">({n.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

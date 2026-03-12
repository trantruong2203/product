import { useState, useEffect } from "react";
import { geoAPI } from "../../services/api";
import { ContentGapResponse, RecommendationItem } from "../../types";

interface Props {
  projectId: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#f87171",
  MEDIUM: "#fb923c",
  LOW: "#34d399",
};

const FORMAT_ICONS: Record<string, string> = {
  faq: "❓",
  "schema.org": "🏷️",
  table: "📊",
  list: "📋",
};

export default function ContentGapTab({ projectId }: Props) {
  const [gap, setGap] = useState<ContentGapResponse | null>(null);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    try {
      const [gapRes, recRes] = await Promise.all([
        geoAPI.getContentGap(projectId),
        geoAPI.getRecommendations(projectId),
      ]);
      if (gapRes.data.success) setGap(gapRes.data.data);
      if (recRes.data.success) setRecs(recRes.data.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecStatus = async (
    recId: string,
    status: "ACCEPTED" | "DISMISSED",
  ) => {
    try {
      await geoAPI.updateRecommendationStatus(recId, status);
      setRecs((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status } : r)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>📝 Content Gap Analysis</h3>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div className="gap-layout">
          {/* Format Gaps */}
          {gap && gap.formatGaps.length > 0 && (
            <div className="gap-section">
              <h4>Missing Content Formats</h4>
              <div className="format-chips">
                {gap.formatGaps.map((f) => (
                  <span key={f} className="format-chip">
                    {FORMAT_ICONS[f] ?? "📄"} Add {f.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Topics */}
          {gap && gap.missingTopics.length > 0 && (
            <div className="gap-section">
              <h4>Topics AI Expects but You Don't Cover</h4>
              <div className="topic-tags">
                {gap.missingTopics.map((t) => (
                  <span key={t} className="topic-tag">
                    "{t}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Preference */}
          {gap && gap.sourcePreference.length > 0 && (
            <div className="gap-section">
              <h4>Sources AI Prefers to Cite (instead of you)</h4>
              <div className="source-pref-list">
                {gap.sourcePreference.slice(0, 10).map((s, i) => (
                  <div key={s.domain} className="source-pref-row">
                    <span className="source-rank">#{i + 1}</span>
                    <span className="source-domain">{s.domain}</span>
                    <span className="source-count">{s.count} citations</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div className="gap-section">
              <h4>Actionable Recommendations</h4>
              <div className="rec-list">
                {recs
                  .filter((r) => r.status === "OPEN" || r.status === "ACCEPTED")
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="rec-card"
                      style={{
                        borderLeft: `4px solid ${PRIORITY_COLOR[rec.priority] ?? "#718096"}`,
                      }}
                    >
                      <div className="rec-header">
                        <span
                          className="rec-priority"
                          style={{ color: PRIORITY_COLOR[rec.priority] }}
                        >
                          {rec.priority}
                        </span>
                        <span className="rec-type">{rec.type}</span>
                        <span className="rec-keyword">{rec.keyword}</span>
                      </div>
                      <div className="rec-title">{rec.title}</div>
                      <div className="rec-action">→ {rec.suggestedAction}</div>
                      {rec.status === "OPEN" && (
                        <div className="rec-actions">
                          <button
                            className="btn-accept"
                            onClick={() => handleRecStatus(rec.id, "ACCEPTED")}
                          >
                            Accept
                          </button>
                          <button
                            className="btn-dismiss"
                            onClick={() => handleRecStatus(rec.id, "DISMISSED")}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      {rec.status === "ACCEPTED" && (
                        <span className="accepted-tag">✓ Accepted</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!gap?.missingTopics.length &&
            !gap?.formatGaps.length &&
            recs.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>
                  No content gap data. Run an analysis scan to generate
                  recommendations.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { geoAPI } from "../../services/api";
import { DashboardTableRow } from "../../types";

interface Props {
  projectId: string;
}

export default function DashboardTab({ projectId }: Props) {
  const [rows, setRows] = useState<DashboardTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    load(page);
  }, [projectId, page]);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await geoAPI.getDashboardTable(projectId, {
        page: p,
        pageSize: PAGE_SIZE,
      });
      if (res.data.success) {
        setRows(res.data.data.rows);
        setTotal(res.data.data.pagination.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = (score: number) => {
    if (score > 0.2) return "#4ade80";
    if (score < -0.2) return "#f87171";
    return "#94a3b8";
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>📊 GEO Dashboard Table</h3>
        <span className="total-badge">{total} records</span>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No data yet. Run an analysis scan to see results here.</p>
        </div>
      ) : (
        <>
          <div className="geo-table-wrap">
            <table className="geo-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>AI Model</th>
                  <th>Brand Mention</th>
                  <th>Citation Link</th>
                  <th>Sentiment Score</th>
                  <th>Suggested Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="keyword-cell">{row.keyword}</td>
                    <td>
                      <span className="engine-badge">{row.aiModel}</span>
                    </td>
                    <td>
                      <span
                        className={`mention-badge ${row.brandMention ? "yes" : "no"}`}
                      >
                        {row.brandMention ? "✓ Yes" : "✗ No"}
                      </span>
                    </td>
                    <td>
                      {row.citationLink ? (
                        <a
                          href={row.citationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="citation-link"
                        >
                          {new URL(row.citationLink).hostname}
                        </a>
                      ) : (
                        <span className="na">N/A</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          color: sentimentColor(row.sentimentScore),
                          fontWeight: 600,
                        }}
                      >
                        {row.sentimentScore > 0 ? "+" : ""}
                        {(row.sentimentScore * 10).toFixed(1)}/10
                      </span>
                    </td>
                    <td className="action-cell">
                      {row.suggestedAction || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

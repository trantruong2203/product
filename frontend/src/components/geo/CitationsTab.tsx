import { useState, useEffect } from "react";
import { geoAPI } from "../../services/api";
import { CitationItem, CitationsResponse } from "../../types";

interface Props {
  projectId: string;
}

const SOURCE_COLORS: Record<string, string> = {
  OWN: "#34d399",
  COMPETITOR: "#f87171",
  THIRD_PARTY: "#818cf8",
};

export default function CitationsTab({ projectId }: Props) {
  const [items, setItems] = useState<CitationItem[]>([]);
  const [summary, setSummary] = useState<{
    totals: Record<string, number>;
    topDomains: { hostname: string; count: number }[];
  } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadAll(page);
  }, [projectId, page]);

  const loadAll = async (p: number) => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        geoAPI.getCitations(projectId, { page: p, pageSize: PAGE_SIZE }),
        geoAPI.getCitationSummary(projectId),
      ]);
      if (listRes.data.success) {
        const d: CitationsResponse = listRes.data.data;
        setItems(d.items);
        setTotal(d.pagination.total);
      }
      if (summaryRes.data.success) setSummary(summaryRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>🔗 Citation & Source Tracking</h3>
        <span className="total-badge">{total} citations</span>
      </div>

      {summary && (
        <div className="summary-cards">
          <div
            className="summary-card"
            style={{ borderTop: "3px solid #34d399" }}
          >
            <div className="sc-value">{summary.totals.own ?? 0}</div>
            <div className="sc-label">Own Links</div>
          </div>
          <div
            className="summary-card"
            style={{ borderTop: "3px solid #f87171" }}
          >
            <div className="sc-value">{summary.totals.competitor ?? 0}</div>
            <div className="sc-label">Competitor Links</div>
          </div>
          <div
            className="summary-card"
            style={{ borderTop: "3px solid #818cf8" }}
          >
            <div className="sc-value">{summary.totals.thirdParty ?? 0}</div>
            <div className="sc-label">Third-party</div>
          </div>
          <div
            className="summary-card"
            style={{ borderTop: "3px solid #fb923c" }}
          >
            <div className="sc-value">{summary.totals.invalidLinks ?? 0}</div>
            <div className="sc-label">Invalid Links ⚠️</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <p>No citations found. Run a scan to collect citation data.</p>
        </div>
      ) : (
        <>
          <div className="geo-table-wrap">
            <table className="geo-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Engine</th>
                  <th>Brand</th>
                  <th>URL</th>
                  <th>Source Type</th>
                  <th>Valid</th>
                  <th>Mentioned</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="keyword-cell">{item.keyword}</td>
                    <td>
                      <span className="engine-badge">{item.engine}</span>
                    </td>
                    <td>{item.brand}</td>
                    <td>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="citation-link"
                        >
                          {item.hostname || item.url.substring(0, 40)}
                        </a>
                      ) : (
                        <span className="na">N/A</span>
                      )}
                    </td>
                    <td>
                      {item.sourceType ? (
                        <span
                          className="source-badge"
                          style={{
                            background: `${SOURCE_COLORS[item.sourceType]}22`,
                            color: SOURCE_COLORS[item.sourceType],
                          }}
                        >
                          {item.sourceType}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {item.isValid === null ? (
                        <span className="na">—</span>
                      ) : item.isValid ? (
                        <span style={{ color: "#34d399" }}>✓</span>
                      ) : (
                        <span style={{ color: "#f87171" }}>
                          ✗ {item.httpStatus}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.mentionedBrand ? (
                        <span style={{ color: "#34d399" }}>✓</span>
                      ) : (
                        "—"
                      )}
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

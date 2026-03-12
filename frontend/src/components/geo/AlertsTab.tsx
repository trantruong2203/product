import { useState, useEffect } from "react";
import { geoAPI } from "../../services/api";
import { AlertItem, AlertStatus } from "../../types";

interface Props {
  projectId: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "#f87171",
  MEDIUM: "#fb923c",
  LOW: "#fbbf24",
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "#818cf8",
  ACKNOWLEDGED: "#fb923c",
  RESOLVED: "#34d399",
};

export default function AlertsTab({ projectId }: Props) {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    load(page);
  }, [projectId, page]);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await geoAPI.getAlerts(projectId, {
        page: p,
        pageSize: PAGE_SIZE,
      });
      if (res.data.success) {
        setItems(res.data.data.items);
        setTotal(res.data.data.pagination.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (alertId: string, status: AlertStatus) => {
    try {
      await geoAPI.updateAlertStatus(alertId, status);
      setItems((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status } : a)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const openCount = items.filter((a) => a.status === "OPEN").length;

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>🔔 Alerts</h3>
        {openCount > 0 && (
          <span className="alert-count-badge">{openCount} open</span>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p>
            No alerts. All clear! Alerts fire when AI mentions your brand but
            links to a competitor.
          </p>
        </div>
      ) : (
        <>
          <div className="alert-feed">
            {items.map((alert) => (
              <div
                key={alert.id}
                className="alert-card"
                style={{
                  borderLeft: `4px solid ${SEVERITY_COLOR[alert.severity] ?? "#718096"}`,
                }}
              >
                <div className="alert-top">
                  <div className="alert-meta">
                    <span
                      className="severity-badge"
                      style={{ color: SEVERITY_COLOR[alert.severity] }}
                    >
                      {alert.severity}
                    </span>
                    <span className="alert-type">{alert.type}</span>
                    <span
                      className="status-badge"
                      style={{ color: STATUS_COLOR[alert.status] }}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <span className="alert-date">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="alert-title">{alert.title}</div>
                <div className="alert-desc">{alert.description}</div>
                {alert.status !== "RESOLVED" && (
                  <div className="alert-actions">
                    {alert.status === "OPEN" && (
                      <button
                        className="btn-acknowledge"
                        onClick={() =>
                          handleStatusChange(alert.id, "ACKNOWLEDGED")
                        }
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      className="btn-resolve"
                      onClick={() => handleStatusChange(alert.id, "RESOLVED")}
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
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

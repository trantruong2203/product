import { useState, useEffect } from "react";
import { resultsAPI } from "../../services/api";

interface ScreenshotRow {
  id: string;
  runId: string;
  screenshot: string | null;
  createdAt: string;
  keyword: string;
  engine: string;
}

interface Props {
  projectId: string;
}

export default function ScreenshotTab({ projectId }: Props) {
  const [screenshots, setScreenshots] = useState<ScreenshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterEngine, setFilterEngine] = useState<string>("");

  useEffect(() => {
    load();
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await resultsAPI.getScreenshots(projectId);
      if (res.data.success) {
        setScreenshots(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load screenshots:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredScreenshots = filterEngine
    ? screenshots.filter((s) => s.engine === filterEngine)
    : screenshots;

  const engines = [...new Set(screenshots.map((s) => s.engine))];

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <h3>📸 Browser Screenshots</h3>
        <span className="total-badge">{screenshots.length} screenshots</span>
      </div>

      {screenshots.length > 0 && (
        <div className="filter-group" style={{ marginBottom: "1rem" }}>
          <label>Filter by Engine:</label>
          <select
            value={filterEngine}
            onChange={(e) => setFilterEngine(e.target.value)}
          >
            <option value="">All Engines</option>
            {engines.map((engine) => (
              <option key={engine} value={engine}>
                {engine}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : filteredScreenshots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <p>No screenshots yet. Run a scan to capture browser screenshots.</p>
        </div>
      ) : (
        <div className="screenshots-grid">
          {filteredScreenshots.map((screenshot) => (
            <div key={screenshot.id} className="screenshot-card">
              <div className="screenshot-header">
                <span className="engine-badge">{screenshot.engine}</span>
                <span className="screenshot-date">
                  {new Date(screenshot.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="screenshot-preview">
                {screenshot.screenshot ? (
                  <img
                    src={`data:image/png;base64,${screenshot.screenshot}`}
                    alt="Browser screenshot"
                    onClick={() =>
                      setSelectedImage(
                        `data:image/png;base64,${screenshot.screenshot}`
                      )
                    }
                    style={{ cursor: "pointer" }}
                  />
                ) : (
                  <div className="no-screenshot">No screenshot</div>
                )}
              </div>
              <div className="screenshot-keyword">{screenshot.keyword}</div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div
          className="screenshot-modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="screenshot-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="screenshot-modal-close"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
            <img src={selectedImage} alt="Full screenshot" />
          </div>
        </div>
      )}

      <style>{`
        .screenshots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .screenshot-card {
          background: #2a2a2a;
          border-radius: 8px;
          overflow: hidden;
        }
        .screenshot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #333;
        }
        .screenshot-date {
          color: #888;
          font-size: 0.75rem;
        }
        .screenshot-preview {
          aspect-ratio: 16/10;
          overflow: hidden;
          background: #1a1a1a;
        }
        .screenshot-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        .screenshot-preview img:hover {
          transform: scale(1.02);
        }
        .no-screenshot {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
        }
        .screenshot-keyword {
          padding: 0.75rem;
          color: #ccc;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .screenshot-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }
        .screenshot-modal {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }
        .screenshot-modal img {
          max-width: 100%;
          max-height: 90vh;
          border-radius: 8px;
        }
        .screenshot-modal-close {
          position: absolute;
          top: -2rem;
          right: 0;
          background: transparent;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          padding: 0.5rem;
        }
        .screenshot-modal-close:hover {
          color: #646cff;
        }
      `}</style>
    </div>
  );
}

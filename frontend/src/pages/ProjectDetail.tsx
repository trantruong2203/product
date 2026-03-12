import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  projectsAPI,
  promptsAPI,
  competitorsAPI,
  runsAPI,
  resultsAPI,
  enginesAPI,
} from "../services/api";
import {
  Project,
  Prompt,
  Competitor,
  AIEngine,
  ProjectResults,
  HistoryData,
  CompetitorComparison,
  PromptRanking,
} from "../types";
import DashboardTab from "../components/geo/DashboardTab";
import SoMTab from "../components/geo/SoMTab";
import CitationsTab from "../components/geo/CitationsTab";
import SentimentTab from "../components/geo/SentimentTab";
import AlertsTab from "../components/geo/AlertsTab";
import ContentGapTab from "../components/geo/ContentGapTab";
import ScheduleTab from "../components/geo/ScheduleTab";
import "../components/geo/geo.css";

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [results, setResults] = useState<ProjectResults | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorComparison[]>(
    [],
  );
  const [rankings, setRankings] = useState<PromptRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ query: "", language: "en" });
  const [newCompetitor, setNewCompetitor] = useState({ name: "", domain: "" });
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "rankings"
    | "geo-dashboard"
    | "som"
    | "citations"
    | "sentiment"
    | "alerts"
    | "content-gap"
    | "schedule"
  >("overview");
  const [selectedEngine, setSelectedEngine] = useState<string>("");

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const [
        projectRes,
        promptsRes,
        competitorsRes,
        enginesRes,
        resultsRes,
        historyRes,
        compRes,
        statusRes,
      ] = await Promise.all([
        projectsAPI.getById(projectId!),
        promptsAPI.getByProject(projectId!),
        competitorsAPI.getByProject(projectId!),
        enginesAPI.getAll(),
        resultsAPI.getProjectResults(projectId!),
        resultsAPI.getHistory(projectId!),
        resultsAPI.getCompetitors(projectId!),
        runsAPI.getProjectRunStatus(projectId!),
      ]);

      if (projectRes.data.success) setProject(projectRes.data.data);
      if (promptsRes.data.success) setPrompts(promptsRes.data.data);
      if (competitorsRes.data.success) setCompetitors(competitorsRes.data.data);
      if (enginesRes.data.success) setEngines(enginesRes.data.data);
      if (resultsRes.data.success) setResults(resultsRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (compRes.data.success) setCompetitorData(compRes.data.data);

      if (statusRes?.data?.success) setRunning(statusRes.data.data.isRunning);
    } catch (error) {
      console.error("Failed to load project data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await promptsAPI.create(projectId!, newPrompt);
      if (res.data.success) {
        setPrompts([...prompts, res.data.data]);
        setShowPromptModal(false);
        setNewPrompt({ query: "", language: "en" });
      }
    } catch (error) {
      console.error("Failed to create prompt", error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await promptsAPI.delete(projectId!, promptId);
      setPrompts(prompts.filter((p) => p.id !== promptId));
    } catch (error) {
      console.error("Failed to delete prompt", error);
    }
  };

  const handleCreateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await competitorsAPI.create(projectId!, newCompetitor);
      if (res.data.success) {
        setCompetitors([...competitors, res.data.data]);
        setShowCompetitorModal(false);
        setNewCompetitor({ name: "", domain: "" });
      }
    } catch (error) {
      console.error("Failed to create competitor", error);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    try {
      await competitorsAPI.delete(projectId!, competitorId);
      setCompetitors(competitors.filter((c) => c.id !== competitorId));
    } catch (error) {
      console.error("Failed to delete competitor", error);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await runsAPI.trigger({
        promptIds: prompts.map((p) => p.id),
        engineIds: engines.filter((e) => e.isActive).map((e) => e.id),
      });
      // Do not set running to false here. The polling effect will handle it.
    } catch (error) {
      console.error("Failed to trigger run", error);
      setRunning(false);
    }
  };

  const handleDeleteProject = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      try {
        await projectsAPI.delete(projectId!);
        navigate("/");
      } catch (error) {
        console.error("Failed to delete project", error);
        alert("Failed to delete project");
      }
    }
  };

  const loadRankings = async (engineId?: string) => {
    try {
      const res = await resultsAPI.getRankings(
        projectId!,
        engineId || undefined,
      );
      if (res.data.success) {
        setRankings(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load rankings", error);
    }
  };

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === "rankings") {
      loadRankings(selectedEngine || undefined);
    }
  }, [projectId, activeTab, selectedEngine]);

  // Poll for run status if running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (running && projectId) {
      interval = setInterval(async () => {
        try {
          const res = await runsAPI.getProjectRunStatus(projectId);
          if (res.data.success) {
            if (!res.data.data.isRunning) {
              setRunning(false);
              loadProjectData(); // Refresh data when done
            }
          }
        } catch (e) {
          console.error("Failed to poll status", e);
        }
      }, 3000); // Check every 3 seconds
    }
    return () => clearInterval(interval);
  }, [running, projectId]);

  if (loading) return <div>{t("app.loading")}</div>;

  return (
    <div className="project-detail">
      <div className="project-header">
        <div>
          <h1>{project?.brandName}</h1>
          <p className="domain">{project?.domain}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleRun}
            disabled={running || prompts.length === 0}
            className="btn-primary"
          >
            {running ? t("project.running") : t("project.runAnalysis")}
          </button>
          <button
            onClick={handleDeleteProject}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Delete Project
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-value">{results?.visibilityScore || 0}</div>
          <div className="metric-label">
            {t("project.metrics.visibilityScore")}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.citationRate || 0}%</div>
          <div className="metric-label">
            {t("project.metrics.citationRate")}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.promptCoverage || 0}%</div>
          <div className="metric-label">
            {t("project.metrics.promptCoverage")}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.avgPosition || "N/A"}</div>
          <div className="metric-label">{t("project.metrics.avgPosition")}</div>
        </div>
      </div>

      <div className="tabs" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === "rankings" ? "active" : ""}`}
          onClick={() => setActiveTab("rankings")}
        >
          Rankings
        </button>
        <button
          className={`tab ${activeTab === "geo-dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("geo-dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab ${activeTab === "som" ? "active" : ""}`}
          onClick={() => setActiveTab("som")}
        >
          📈 SoM
        </button>
        <button
          className={`tab ${activeTab === "citations" ? "active" : ""}`}
          onClick={() => setActiveTab("citations")}
        >
          🔗 Citations
        </button>
        <button
          className={`tab ${activeTab === "sentiment" ? "active" : ""}`}
          onClick={() => setActiveTab("sentiment")}
        >
          💬 Sentiment
        </button>
        <button
          className={`tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          🔔 Alerts
        </button>
        <button
          className={`tab ${activeTab === "content-gap" ? "active" : ""}`}
          onClick={() => setActiveTab("content-gap")}
        >
          📝 Content Gap
        </button>
        <button
          className={`tab ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          🗓️ Schedule
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-section">
            <div className="chart-card">
              <h3>{t("project.charts.visibilityTrend")}</h3>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{ background: "#2a2a2a", border: "none" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#646cff"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">{t("project.charts.noHistory")}</p>
              )}
            </div>
            <div className="chart-card">
              <h3>{t("project.charts.competitorComparison")}</h3>
              {competitorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={competitorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{ background: "#2a2a2a", border: "none" }}
                    />
                    <Bar dataKey="citations" fill="#646cff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">
                  {t("project.charts.noCompetitorData")}
                </p>
              )}
            </div>
          </div>

          <div className="tables-section">
            <div className="table-card">
              <div className="table-header">
                <h3>
                  {t("project.prompts.title")} ({prompts.length})
                </h3>
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="btn-small"
                >
                  {t("project.prompts.add")}
                </button>
              </div>
              <div className="table-list">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="table-row">
                    <span className="query">{prompt.query}</span>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="btn-delete"
                    >
                      {t("project.prompts.delete")}
                    </button>
                  </div>
                ))}
                {prompts.length === 0 && (
                  <p className="empty">{t("project.prompts.empty")}</p>
                )}
              </div>
            </div>
            <div className="table-card">
              <div className="table-header">
                <h3>
                  {t("project.competitors.title")} ({competitors.length})
                </h3>
                <button
                  onClick={() => setShowCompetitorModal(true)}
                  className="btn-small"
                >
                  {t("project.competitors.add")}
                </button>
              </div>
              <div className="table-list">
                {competitors.map((comp) => (
                  <div key={comp.id} className="table-row">
                    <div>
                      <div className="name">{comp.name}</div>
                      <div className="domain">{comp.domain}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompetitor(comp.id)}
                      className="btn-delete"
                    >
                      {t("project.competitors.delete")}
                    </button>
                  </div>
                ))}
                {competitors.length === 0 && (
                  <p className="empty">{t("project.competitors.empty")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rankings" && (
        <div className="tab-content">
          <div className="rankings-header">
            <div className="filter-group">
              <label>Engine:</label>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
              >
                <option value="">All Engines</option>
                {engines.map((engine) => (
                  <option key={engine.id} value={engine.id}>
                    {engine.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rankings.length > 0 ? (
            <div className="rankings-table">
              <table>
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Engine</th>
                    <th>Rank</th>
                    <th>Brand</th>
                    <th>Mentions</th>
                    <th>Avg Position</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking, idx) => (
                    <tr
                      key={`${ranking.promptId}-${ranking.engineId}-${ranking.brand}-${idx}`}
                    >
                      <td className="prompt-cell">{ranking.promptQuery}</td>
                      <td>{ranking.engineName}</td>
                      <td>
                        <span
                          className={`rank rank-${ranking.rank <= 3 ? ranking.rank : "other"}`}
                        >
                          {ranking.rank}
                        </span>
                      </td>
                      <td>{ranking.brand}</td>
                      <td>{ranking.mentions}</td>
                      <td>{ranking.avgPosition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">
              No ranking data available. Run analysis to see results.
            </p>
          )}
        </div>
      )}

      {activeTab === "geo-dashboard" && (
        <div className="tab-content">
          <DashboardTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "som" && (
        <div className="tab-content">
          <SoMTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "citations" && (
        <div className="tab-content">
          <CitationsTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "sentiment" && (
        <div className="tab-content">
          <SentimentTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="tab-content">
          <AlertsTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "content-gap" && (
        <div className="tab-content">
          <ContentGapTab projectId={projectId!} />
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="tab-content">
          <ScheduleTab projectId={projectId!} engines={engines} />
        </div>
      )}

      {showPromptModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPromptModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("project.prompts.modal.title")}</h2>
            <form onSubmit={handleCreatePrompt}>
              <div className="form-group">
                <label>{t("project.prompts.modal.query")}</label>
                <textarea
                  value={newPrompt.query}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, query: e.target.value })
                  }
                  required
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>{t("project.prompts.modal.language")}</label>
                <select
                  value={newPrompt.language}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, language: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="btn-secondary"
                >
                  {t("project.prompts.modal.cancel")}
                </button>
                <button type="submit" className="btn-primary">
                  {t("project.prompts.modal.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompetitorModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCompetitorModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("project.competitors.modal.title")}</h2>
            <form onSubmit={handleCreateCompetitor}>
              <div className="form-group">
                <label>{t("project.competitors.modal.name")}</label>
                <input
                  type="text"
                  value={newCompetitor.name}
                  onChange={(e) =>
                    setNewCompetitor({ ...newCompetitor, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("project.competitors.modal.domain")}</label>
                <input
                  type="url"
                  value={newCompetitor.domain}
                  onChange={(e) =>
                    setNewCompetitor({
                      ...newCompetitor,
                      domain: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCompetitorModal(false)}
                  className="btn-secondary"
                >
                  {t("project.competitors.modal.cancel")}
                </button>
                <button type="submit" className="btn-primary">
                  {t("project.competitors.modal.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .project-detail { max-width: 1200px; margin: 0 auto; }
        .project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .project-header h1 { color: #fff; margin: 0; }
        .project-header .domain { color: #888; margin: 0.5rem 0 0 0; }
        .btn-primary { padding: 0.75rem 1.5rem; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        .btn-primary:hover { background: #535bf2; }
        .btn-primary:disabled { background: #444; cursor: not-allowed; }
        .btn-secondary { padding: 0.75rem 1.5rem; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn-small { padding: 0.5rem 1rem; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn-delete { padding: 0.25rem 0.75rem; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .metric-card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; text-align: center; }
        .metric-card.primary { background: linear-gradient(135deg, #646cff, #535bf2); }
        .metric-value { font-size: 2rem; font-weight: bold; color: #fff; }
        .metric-label { color: rgba(255,255,255,0.7); margin-top: 0.5rem; }
        .charts-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .chart-card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; }
        .chart-card h3 { color: #fff; margin: 0 0 1rem 0; }
        .no-data { color: #888; text-align: center; padding: 2rem; }
        .tables-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .table-card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; }
        .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .table-header h3 { color: #fff; margin: 0; }
        .table-list { max-height: 300px; overflow-y: auto; }
        .table-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid #333; }
        .table-row .query { color: #ccc; }
        .table-row .name { color: #fff; }
        .table-row .domain { color: #888; font-size: 0.875rem; }
        .empty { color: #888; text-align: center; padding: 1rem; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: #2a2a2a; padding: 2rem; border-radius: 8px; width: 100%; max-width: 500px; }
        .modal h2 { color: #fff; margin-top: 0; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #ccc; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #444; border-radius: 4px; background: #1a1a1a; color: #fff; box-sizing: border-box; }
        .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #333; }
        .tab { padding: 0.75rem 1.5rem; background: transparent; color: #888; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 1rem; transition: all 0.2s; }
        .tab:hover { color: #fff; }
        .tab.active { color: #646cff; border-bottom-color: #646cff; }
        .tab-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .rankings-header { margin-bottom: 1rem; }
        .filter-group { display: flex; align-items: center; gap: 0.5rem; }
        .filter-group label { color: #888; }
        .filter-group select { padding: 0.5rem; background: #1a1a1a; color: #fff; border: 1px solid #444; border-radius: 4px; }
        .rankings-table { background: #2a2a2a; border-radius: 8px; overflow: hidden; }
        .rankings-table table { width: 100%; border-collapse: collapse; }
        .rankings-table th { padding: 1rem; text-align: left; color: #888; font-weight: 500; border-bottom: 1px solid #333; }
        .rankings-table td { padding: 1rem; color: #ccc; border-bottom: 1px solid #333; }
        .rankings-table tr:last-child td { border-bottom: none; }
        .rankings-table .prompt-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rank { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; }
        .rank-1 { background: #ffd700; color: #000; }
        .rank-2 { background: #c0c0c0; color: #000; }
        .rank-3 { background: #cd7f32; color: #000; }
        .rank-other { background: #444; color: #fff; }
      `}</style>
    </div>
  );
}

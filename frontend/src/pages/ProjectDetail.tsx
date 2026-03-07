import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { projectsAPI, promptsAPI, competitorsAPI, runsAPI, resultsAPI, enginesAPI } from '../services/api';
import { Project, Prompt, Competitor, AIEngine, ProjectResults, HistoryData, CompetitorComparison } from '../types';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [results, setResults] = useState<ProjectResults | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ query: '', language: 'en' });
  const [newCompetitor, setNewCompetitor] = useState({ name: '', domain: '' });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const [projectRes, promptsRes, competitorsRes, enginesRes, resultsRes, historyRes, compRes] = await Promise.all([
        projectsAPI.getById(projectId!),
        promptsAPI.getByProject(projectId!),
        competitorsAPI.getByProject(projectId!),
        enginesAPI.getAll(),
        resultsAPI.getProjectResults(projectId!),
        resultsAPI.getHistory(projectId!),
        resultsAPI.getCompetitors(projectId!),
      ]);

      if (projectRes.data.success) setProject(projectRes.data.data);
      if (promptsRes.data.success) setPrompts(promptsRes.data.data);
      if (competitorsRes.data.success) setCompetitors(competitorsRes.data.data);
      if (enginesRes.data.success) setEngines(enginesRes.data.data);
      if (resultsRes.data.success) setResults(resultsRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (compRes.data.success) setCompetitorData(compRes.data.data);
    } catch (error) {
      console.error('Failed to load project data', error);
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
        setNewPrompt({ query: '', language: 'en' });
      }
    } catch (error) {
      console.error('Failed to create prompt', error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await promptsAPI.delete(projectId!, promptId);
      setPrompts(prompts.filter(p => p.id !== promptId));
    } catch (error) {
      console.error('Failed to delete prompt', error);
    }
  };

  const handleCreateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await competitorsAPI.create(projectId!, newCompetitor);
      if (res.data.success) {
        setCompetitors([...competitors, res.data.data]);
        setShowCompetitorModal(false);
        setNewCompetitor({ name: '', domain: '' });
      }
    } catch (error) {
      console.error('Failed to create competitor', error);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    try {
      await competitorsAPI.delete(projectId!, competitorId);
      setCompetitors(competitors.filter(c => c.id !== competitorId));
    } catch (error) {
      console.error('Failed to delete competitor', error);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await runsAPI.trigger({ 
        promptIds: prompts.map(p => p.id), 
        engineIds: engines.filter(e => e.isActive).map(e => e.id) 
      });
      setTimeout(loadProjectData, 5000);
    } catch (error) {
      console.error('Failed to trigger run', error);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="project-detail">
      <div className="project-header">
        <div>
          <h1>{project?.brandName}</h1>
          <p className="domain">{project?.domain}</p>
        </div>
        <button onClick={handleRun} disabled={running || prompts.length === 0} className="btn-primary">
          {running ? 'Running...' : 'Run Analysis'}
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-value">{results?.visibilityScore || 0}</div>
          <div className="metric-label">Visibility Score</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.citationRate || 0}%</div>
          <div className="metric-label">Citation Rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.promptCoverage || 0}%</div>
          <div className="metric-label">Prompt Coverage</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{results?.avgPosition || 'N/A'}</div>
          <div className="metric-label">Avg Position</div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card">
          <h3>Visibility Trend</h3>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#2a2a2a', border: 'none' }} />
                <Line type="monotone" dataKey="score" stroke="#646cff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No history data yet. Run the analysis to see trends.</p>
          )}
        </div>
        <div className="chart-card">
          <h3>Competitor Comparison</h3>
          {competitorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={competitorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#2a2a2a', border: 'none' }} />
                <Bar dataKey="citations" fill="#646cff" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No competitor data yet.</p>
          )}
        </div>
      </div>

      <div className="tables-section">
        <div className="table-card">
          <div className="table-header">
            <h3>Prompts ({prompts.length})</h3>
            <button onClick={() => setShowPromptModal(true)} className="btn-small">+ Add</button>
          </div>
          <div className="table-list">
            {prompts.map(prompt => (
              <div key={prompt.id} className="table-row">
                <span className="query">{prompt.query}</span>
                <button onClick={() => handleDeletePrompt(prompt.id)} className="btn-delete">Delete</button>
              </div>
            ))}
            {prompts.length === 0 && <p className="empty">No prompts yet.</p>}
          </div>
        </div>
        <div className="table-card">
          <div className="table-header">
            <h3>Competitors ({competitors.length})</h3>
            <button onClick={() => setShowCompetitorModal(true)} className="btn-small">+ Add</button>
          </div>
          <div className="table-list">
            {competitors.map(comp => (
              <div key={comp.id} className="table-row">
                <div>
                  <div className="name">{comp.name}</div>
                  <div className="domain">{comp.domain}</div>
                </div>
                <button onClick={() => handleDeleteCompetitor(comp.id)} className="btn-delete">Delete</button>
              </div>
            ))}
            {competitors.length === 0 && <p className="empty">No competitors yet.</p>}
          </div>
        </div>
      </div>

      {showPromptModal && (
        <div className="modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Prompt</h2>
            <form onSubmit={handleCreatePrompt}>
              <div className="form-group">
                <label>Search Query</label>
                <textarea
                  value={newPrompt.query}
                  onChange={e => setNewPrompt({ ...newPrompt, query: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={newPrompt.language} onChange={e => setNewPrompt({ ...newPrompt, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPromptModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompetitorModal && (
        <div className="modal-overlay" onClick={() => setShowCompetitorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Competitor</h2>
            <form onSubmit={handleCreateCompetitor}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newCompetitor.name}
                  onChange={e => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Domain</label>
                <input
                  type="url"
                  value={newCompetitor.domain}
                  onChange={e => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCompetitorModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
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
      `}</style>
    </div>
  );
}

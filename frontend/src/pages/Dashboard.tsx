import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsAPI, resultsAPI } from '../services/api';
import { Project, ProjectResults } from '../types';

export default function Dashboard() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ domain: '', brandName: '', country: 'US' });
  const [projectResults, setProjectResults] = useState<Record<string, ProjectResults>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.getAll();
      if (res.data.success) {
        setProjects(res.data.data);
        for (const project of res.data.data) {
          loadProjectResults(project.id);
        }
      }
    } catch (error) {
      console.error('Failed to load projects', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectResults = async (projectId: string) => {
    try {
      const res = await resultsAPI.getProjectResults(projectId);
      if (res.data.success) {
        setProjectResults(prev => ({ ...prev, [projectId]: res.data.data }));
      }
    } catch (error) {
      console.error('Failed to load results', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await projectsAPI.create(newProject);
      if (res.data.success) {
        setProjects([...projects, res.data.data]);
        setShowModal(false);
        setNewProject({ domain: '', brandName: '', country: 'US' });
      }
    } catch (error) {
      console.error('Failed to create project', error);
    }
  };

  if (loading) {
    return <div>{t('app.loading')}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          {t('dashboard.newProject')}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>{t('dashboard.empty')}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => {
            const results = projectResults[project.id];
            return (
              <Link to={`/project/${project.id}`} key={project.id} className="project-card">
                <h3>{project.brandName}</h3>
                <p className="domain">{project.domain}</p>
                <div className="project-stats">
                  <div className="stat">
                    <span className="stat-value">{results?.visibilityScore || 0}</span>
                    <span className="stat-label">{t('dashboard.visibility')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{project._count.prompts}</span>
                    <span className="stat-label">{t('dashboard.prompts')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{project._count.runs}</span>
                    <span className="stat-label">{t('dashboard.runs')}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t('dashboard.createProject.title')}</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>{t('dashboard.createProject.brandName')}</label>
                <input
                  type="text"
                  value={newProject.brandName}
                  onChange={e => setNewProject({ ...newProject, brandName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('dashboard.createProject.domain')}</label>
                <input
                  type="url"
                  value={newProject.domain}
                  onChange={e => setNewProject({ ...newProject, domain: e.target.value })}
                  placeholder={t('dashboard.createProject.domainPlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('dashboard.createProject.country')}</label>
                <select
                  value={newProject.country}
                  onChange={e => setNewProject({ ...newProject, country: e.target.value })}
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="VN">Vietnam</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  {t('dashboard.createProject.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('dashboard.createProject.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .dashboard-header h1 {
          color: #fff;
          margin: 0;
        }
        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: #646cff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-primary:hover {
          background: #535bf2;
        }
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: #444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .empty-state {
          text-align: center;
          padding: 4rem;
          color: #888;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .project-card {
          background: #2a2a2a;
          border-radius: 8px;
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        .project-card h3 {
          margin: 0 0 0.5rem 0;
          color: #fff;
        }
        .project-card .domain {
          color: #888;
          margin: 0 0 1rem 0;
        }
        .project-stats {
          display: flex;
          gap: 1rem;
        }
        .stat {
          flex: 1;
          text-align: center;
          padding: 0.5rem;
          background: #1a1a1a;
          border-radius: 4px;
        }
        .stat-value {
          display: block;
          font-size: 1.25rem;
          font-weight: bold;
          color: #646cff;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #888;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #2a2a2a;
          padding: 2rem;
          border-radius: 8px;
          width: 100%;
          max-width: 500px;
        }
        .modal h2 {
          color: #fff;
          margin-top: 0;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #ccc;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #444;
          border-radius: 4px;
          background: #1a1a1a;
          color: #fff;
          box-sizing: border-box;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Users, ExternalLink } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { competitorsAPI } from '../services/api';
import { Competitor } from '../types';
import Header from '../components/layout/Header';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import Input from '../components/shared/Input';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Competitors() {
  const { t } = useTranslation();
  const { selectedBrand } = useBrand();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    domain: '',
  });

  useEffect(() => {
    if (selectedBrand) {
      loadCompetitors();
    }
  }, [selectedBrand]);

  const loadCompetitors = async () => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const res = await competitorsAPI.getByProject(selectedBrand.id);
      if (res.data.success) {
        setCompetitors(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load competitors', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;
    setSaving(true);
    try {
      const res = await competitorsAPI.create(selectedBrand.id, newCompetitor);
      if (res.data.success) {
        setCompetitors([...competitors, res.data.data]);
        setShowAddModal(false);
        setNewCompetitor({ name: '', domain: '' });
      }
    } catch (error) {
      console.error('Failed to add competitor', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompetitor = async () => {
    if (!selectedBrand || !selectedCompetitorId) return;
    setSaving(true);
    try {
      await competitorsAPI.delete(selectedBrand.id, selectedCompetitorId);
      setCompetitors(competitors.filter((c) => c.id !== selectedCompetitorId));
      setShowDeleteModal(false);
      setSelectedCompetitorId(null);
    } catch (error) {
      console.error('Failed to delete competitor', error);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBrand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('brand.selectBrand')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={t('nav.competitors')}
        showSearch={false}
        showRefresh
        onRefresh={loadCompetitors}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('project.competitors.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedBrand.brandName} • {competitors.length} {t('nav.competitors').toLowerCase()}
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            {t('project.competitors.add')}
          </Button>
        </div>

        {/* Competitors List */}
        {competitors.length === 0 ? (
          <Card className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('project.competitors.empty')}</h3>
              <p className="text-gray-500 mb-4">Start tracking your competitors to see how you compare.</p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                {t('project.competitors.add')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((competitor) => (
              <Card key={competitor.id} variant="bordered">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">
                        {competitor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                      <a
                        href={competitor.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent hover:underline flex items-center gap-1"
                      >
                        {competitor.domain.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCompetitorId(competitor.id);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Competitor Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('project.competitors.modal.title')}
        size="md"
      >
        <form onSubmit={handleAddCompetitor} className="space-y-4">
          <Input
            label={t('project.competitors.modal.name')}
            value={newCompetitor.name}
            onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
            placeholder="Competitor Name"
            required
          />
          <Input
            label={t('project.competitors.modal.domain')}
            value={newCompetitor.domain}
            onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
            placeholder="https://competitor.com"
            required
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('project.competitors.modal.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('project.competitors.delete')}
        size="sm"
      >
        <p className="text-gray-600 mb-6">Are you sure you want to remove this competitor?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteCompetitor} loading={saving}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

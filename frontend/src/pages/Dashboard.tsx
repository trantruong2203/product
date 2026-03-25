import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Globe, Target, BarChart3, Play } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { resultsAPI } from '../services/api';
import { ProjectResults } from '../types';
import Header from '../components/layout/Header';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';
import Input from '../components/shared/Input';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Dashboard() {
  const { t } = useTranslation();
  const { brands, loading: brandsLoading, createBrand, deleteBrand, refreshBrands } = useBrand();
  const [projectResults, setProjectResults] = useState<Record<string, ProjectResults>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newBrand, setNewBrand] = useState({
    brandName: '',
    domain: '',
    country: 'VN',
    language: 'en',
    keywords: '',
  });

  useEffect(() => {
    brands.forEach((brand) => {
      loadProjectResults(brand.id);
    });
  }, [brands]);

  const loadProjectResults = async (projectId: string) => {
    try {
      const res = await resultsAPI.getProjectResults(projectId);
      if (res.data.success) {
        setProjectResults((prev) => ({ ...prev, [projectId]: res.data.data }));
      }
    } catch (error) {
      console.error('Failed to load results', error);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBrand({
        ...newBrand,
        keywords: newBrand.keywords ? newBrand.keywords.split(',').map((k) => k.trim()) : [],
      });
      setShowCreateModal(false);
      setNewBrand({ brandName: '', domain: '', country: 'VN', language: 'en', keywords: '' });
    } catch (error) {
      console.error('Failed to create brand', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      await deleteBrand(selectedBrandId);
      setShowDeleteModal(false);
      setSelectedBrandId(null);
    } catch (error) {
      console.error('Failed to delete brand', error);
    } finally {
      setLoading(false);
    }
  };

  if (brandsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={t('dashboard.title')}
        showSearch={false}
        showRefresh
        onRefresh={refreshBrands}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-xl">
                <Globe className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.visibility')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {brands.length > 0 ? (
                    Object.values(projectResults).reduce((sum, r) => sum + (r?.visibilityScore || 0), 0) / Math.max(brands.length, 1)
                  ).toFixed(1) : 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.prompts')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {brands.reduce((sum, b) => sum + (b._count?.prompts || 0), 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.citations')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(projectResults).reduce((sum, r) => sum + (r?.totalCitations || 0), 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Play className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.runs')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {brands.reduce((sum, b) => sum + (b._count?.runs || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Brands Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('brand.selectBrand')}</h2>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            {t('brand.newBrand')}
          </Button>
        </div>

        {brands.length === 0 ? (
          <Card className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.empty')}</h3>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                {t('brand.createBrand')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => {
              const results = projectResults[brand.id];
              return (
                <Card key={brand.id} variant="bordered" padding="none">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                          <span className="text-xl font-bold text-accent">
                            {brand.brandName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{brand.brandName}</h3>
                          <p className="text-sm text-gray-500">{brand.domain}</p>
                        </div>
                      </div>
                      <Badge variant={brand.isActive ? 'success' : 'default'} dot>
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-accent">{results?.visibilityScore || 0}</p>
                        <p className="text-xs text-gray-500">{t('dashboard.visibility')}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{brand._count?.prompts || 0}</p>
                        <p className="text-xs text-gray-500">{t('dashboard.prompts')}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{results?.totalCitations || 0}</p>
                        <p className="text-xs text-gray-500">{t('dashboard.citations')}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/project/${brand.id}`}
                        className="flex-1 px-4 py-2 bg-accent text-white text-center text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
                      >
                        {t('common.view')}
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedBrandId(brand.id);
                          setShowDeleteModal(true);
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Brand Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('brand.createBrand')}
        size="md"
      >
        <form onSubmit={handleCreateBrand} className="space-y-4">
          <Input
            label={t('brand.brandName')}
            value={newBrand.brandName}
            onChange={(e) => setNewBrand({ ...newBrand, brandName: e.target.value })}
            placeholder="My Brand"
            required
          />
          <Input
            label={t('brand.domain')}
            value={newBrand.domain}
            onChange={(e) => setNewBrand({ ...newBrand, domain: e.target.value })}
            placeholder="https://mybrand.com"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('brand.country')}</label>
              <select
                value={newBrand.country}
                onChange={(e) => setNewBrand({ ...newBrand, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="VN">Vietnam</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('brand.language')}</label>
              <select
                value={newBrand.language}
                onChange={(e) => setNewBrand({ ...newBrand, language: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>
          </div>
          <Input
            label={t('brand.keywords')}
            value={newBrand.keywords}
            onChange={(e) => setNewBrand({ ...newBrand, keywords: e.target.value })}
            placeholder="keyword1, keyword2, keyword3"
            hint={t('dashboard.createProject.keywordsPlaceholder')}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {t('brand.createBrand')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('brand.deleteBrand')}
        size="sm"
      >
        <p className="text-gray-600 mb-6">{t('brand.deleteBrandConfirm')}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteBrand} loading={loading}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

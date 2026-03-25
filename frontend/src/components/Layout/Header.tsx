import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

interface HeaderProps {
  title?: string;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
}

export default function Header({
  title,
  onSearch,
  onRefresh,
  showSearch = true,
  showFilters = false,
  showExport = false,
  showRefresh = false,
}: HeaderProps) {
  const { t } = useTranslation();
  const { selectedBrand } = useBrand();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {title || t('nav.dashboard')}
            </h1>
            {selectedBrand && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedBrand.brandName} • {selectedBrand.domain}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            {showSearch && onSearch && (
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent w-64"
                />
              </form>
            )}

            {/* Filters */}
            {showFilters && (
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                {t('common.filters')}
              </button>
            )}

            {/* Refresh */}
            {(showRefresh || onRefresh) && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('common.refresh')}
              </button>
            )}

            {/* Export */}
            {showExport && (
              <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                <Download className="w-4 h-4" />
                {t('common.export')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

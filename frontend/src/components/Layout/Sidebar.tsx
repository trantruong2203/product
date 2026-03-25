import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  Settings, 
  Bell, 
  BarChart3,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import LanguageSwitcher from '../LanguageSwitcher';

interface SidebarProps {
  onLogout: () => void;
  userEmail: string;
}

export default function Sidebar({ onLogout, userEmail }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { brands, selectedBrand, setSelectedBrand } = useBrand();
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/geo', icon: Target, label: t('nav.geoAnalysis') },
    { path: '/competitors', icon: Users, label: t('nav.competitors') },
    { path: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { path: '/alerts', icon: Bell, label: t('nav.alerts') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/project');
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary text-white">
      {/* Logo */}
      <div className="p-6 border-b border-primary-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">GEO SaaS</h1>
            <p className="text-xs text-primary-300">{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Brand Selector */}
      <div className="p-4 border-b border-primary-600">
        <button
          onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
          className="w-full flex items-center justify-between p-3 bg-primary-600 rounded-lg hover:bg-primary-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-sm font-semibold">
              {selectedBrand?.brandName?.charAt(0).toUpperCase() || 'B'}
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{selectedBrand?.brandName || t('brand.selectBrand')}</p>
              <p className="text-xs text-primary-300">{selectedBrand?.domain || ''}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isBrandDropdownOpen && (
          <div className="mt-2 bg-primary-600 rounded-lg overflow-hidden">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setSelectedBrand(brand);
                  setIsBrandDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 hover:bg-primary-500 transition-colors ${
                  selectedBrand?.id === brand.id ? 'bg-primary-500' : ''
                }`}
              >
                <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-xs font-semibold">
                  {brand.brandName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{brand.brandName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-accent text-white'
                : 'text-primary-200 hover:bg-primary-600 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-primary-600">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-semibold">
            {userEmail?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <LanguageSwitcher />
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-primary-200 hover:text-white hover:bg-primary-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('layout.logout')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary border-b border-primary-600">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <span className="font-bold">GEO SaaS</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-primary-200 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 pt-16">
          <div className="flex" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()} />
            <div className="flex-1 bg-primary" onClick={(e) => e.stopPropagation()}>
              <div className="w-64">
                <SidebarContent />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

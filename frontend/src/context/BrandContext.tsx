import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { projectsAPI } from '../services/api';
import { Project } from '../types';

interface BrandContextType {
  brands: Project[];
  selectedBrand: Project | null;
  loading: boolean;
  setSelectedBrand: (brand: Project | null) => void;
  refreshBrands: () => Promise<void>;
  createBrand: (data: { domain: string; brandName: string; country?: string; language?: string; keywords?: string[] }) => Promise<Project>;
  deleteBrand: (brandId: string) => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Project[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.getAll();
      if (res.data.success) {
        setBrands(res.data.data);
        if (res.data.data.length > 0 && !selectedBrand) {
          setSelectedBrand(res.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBrand]);

  useEffect(() => {
    refreshBrands();
  }, []);

  const createBrand = async (data: { domain: string; brandName: string; country?: string; language?: string; keywords?: string[] }) => {
    const res = await projectsAPI.create(data);
    if (res.data.success) {
      const newBrand = res.data.data;
      setBrands((prev) => [...prev, newBrand]);
      setSelectedBrand(newBrand);
      return newBrand;
    }
    throw new Error('Failed to create brand');
  };

  const deleteBrand = async (brandId: string) => {
    await projectsAPI.delete(brandId);
    setBrands((prev) => prev.filter((b) => b.id !== brandId));
    if (selectedBrand?.id === brandId) {
      setSelectedBrand(brands.length > 1 ? brands.find((b) => b.id !== brandId) || null : null);
    }
  };

  return (
    <BrandContext.Provider
      value={{
        brands,
        selectedBrand,
        loading,
        setSelectedBrand,
        refreshBrands,
        createBrand,
        deleteBrand,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

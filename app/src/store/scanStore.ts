import { create } from 'zustand';

export interface CoinResult {
  name: string;
  country: string;
  year: string;
  material: string;
  weight: string;
  diameter: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare';
  estimatedValue: { min: number; max: number; currency: string };
  variants: string[];
  historicalNote: string;
  confidence: number;
}

interface ScanStore {
  frontUri: string | null;
  backUri: string | null;
  result: CoinResult | null;
  scanId: string | null;
  setFront: (uri: string) => void;
  setBack: (uri: string) => void;
  setResult: (scanId: string, result: CoinResult) => void;
  reset: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  frontUri: null,
  backUri: null,
  result: null,
  scanId: null,
  setFront: (uri) => set({ frontUri: uri }),
  setBack: (uri) => set({ backUri: uri }),
  setResult: (scanId, result) => set({ scanId, result }),
  reset: () => set({ frontUri: null, backUri: null, result: null, scanId: null }),
}));

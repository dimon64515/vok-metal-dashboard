export interface ExpenseEntry {
  id: string;
  date: string;
  category: 'coil' | 'strip' | 'sheet';
  thickness: number;
  area: number;
  weight: number;
  note?: string;
  createdAt: number;
}

export interface ReceiptEntry {
  id: string;
  date: string;
  category: 'coil' | 'strip' | 'sheet';
  thickness: number;
  quantity: number;
  note?: string;
  createdAt: number;
}

export type CategoryType = 'coil' | 'strip' | 'sheet';

export interface CategoryConfig {
  label: string;
  unit: string;
  color: string;
  bgColor: string;
  thicknesses: number[];
}

const CATEGORIES_KEY = 'metal_categories';

const DEFAULT_CATEGORIES: Record<CategoryType, CategoryConfig> = {
  coil: {
    label: 'Бухта',
    unit: 'кг',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.15)',
    thicknesses: [0.5, 0.65, 0.7, 0.8, 0.9, 1.0],
  },
  strip: {
    label: 'Штрипс',
    unit: 'кг',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
    thicknesses: [0.55, 0.7, 0.8, 0.9],
  },
  sheet: {
    label: 'Лист',
    unit: 'шт',
    color: '#10b981',
    bgColor: 'rgba(16,185,129,0.15)',
    thicknesses: [1.2, 1.5, 2.0, 3.0, 5.0],
  },
};

export function loadCategories(): Record<CategoryType, CategoryConfig> {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return { ...DEFAULT_CATEGORIES };
    const parsed = JSON.parse(raw);
    // Merge with defaults to ensure all fields exist
    const result: Record<CategoryType, CategoryConfig> = { ...DEFAULT_CATEGORIES };
    (Object.keys(parsed) as CategoryType[]).forEach((key) => {
      if (parsed[key]) {
        result[key] = { ...DEFAULT_CATEGORIES[key], ...parsed[key] };
      }
    });
    return result;
  } catch {
    return { ...DEFAULT_CATEGORIES };
  }
}

export function saveCategories(categories: Record<CategoryType, CategoryConfig>) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addThickness(category: CategoryType, thickness: number) {
  const cats = loadCategories();
  if (!cats[category].thicknesses.includes(thickness)) {
    cats[category].thicknesses = [...cats[category].thicknesses, thickness].sort((a, b) => a - b);
    saveCategories(cats);
  }
}

export function removeThickness(category: CategoryType, thickness: number) {
  const cats = loadCategories();
  cats[category].thicknesses = cats[category].thicknesses.filter((t) => t !== thickness);
  saveCategories(cats);
}

export function resetCategories() {
  localStorage.removeItem(CATEGORIES_KEY);
}

// Backward-compatible: CATEGORIES is now a getter function
export { DEFAULT_CATEGORIES as CATEGORIES };

export type PageType = 'expense' | 'receipt' | 'inventory' | 'stats' | 'worktime';

export function getDefaultInventory(): { category: CategoryType; thickness: number; quantity: number }[] {
  return [
    { category: 'coil', thickness: 1.0, quantity: 3397 },
    { category: 'coil', thickness: 0.9, quantity: 7915 },
    { category: 'coil', thickness: 0.8, quantity: 0 },
    { category: 'coil', thickness: 0.65, quantity: 10105 },
    { category: 'coil', thickness: 0.5, quantity: 10286 },
    { category: 'coil', thickness: 0.7, quantity: 8471 },
    { category: 'strip', thickness: 0.9, quantity: 1400 },
    { category: 'strip', thickness: 0.8, quantity: 6084 },
    { category: 'strip', thickness: 0.55, quantity: 10228 },
    { category: 'strip', thickness: 0.7, quantity: 7734 },
    { category: 'sheet', thickness: 5.0, quantity: 10 },
    { category: 'sheet', thickness: 3.0, quantity: 15 },
    { category: 'sheet', thickness: 2.0, quantity: 40 },
    { category: 'sheet', thickness: 1.5, quantity: 0 },
    { category: 'sheet', thickness: 1.2, quantity: 0 },
  ];
}

export interface InventoryItem {
  category: CategoryType;
  thickness: number;
  quantity: number;
  unit: string;
  color: string;
}

export interface InventoryAdjustment {
  id: string;
  date: string;
  category: CategoryType;
  thickness: number;
  quantity: number;
  note?: string;
  createdAt: number;
}

// Stable key helper — avoids float key mismatches (1.0 vs "1", 0.50 vs "0.5", etc.)
export function makeKey(category: string, thickness: number): string {
  return `${category}-${thickness.toFixed(2)}`;
}

export interface Employee {
  id: string;
  name: string;
  hourlyRate: number;      // дневная ставка ₽/час
  nightHourlyRate: number; // ночная ставка ₽/час
  dayShiftHours: number;
  nightShiftHours: number;
  active: boolean;
  createdAt: number;
}

export type AttendanceStatus = 'day' | 'night' | 'absent' | 'holiday' | 'sick';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  hours: number;
  note?: string;
  createdAt: number;
}

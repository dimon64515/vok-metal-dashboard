import { useState } from 'react';
import { loadCategories, getDefaultInventory, makeKey } from '@/types';
import type { CategoryType, ExpenseEntry, ReceiptEntry, InventoryAdjustment } from '@/types';
import { Package, Plus, Calendar, ChevronDown, Trash2 } from 'lucide-react';

interface InventoryPageProps {
  adjustments: InventoryAdjustment[];
  expenses: ExpenseEntry[];
  receipts: ReceiptEntry[];
  onAddAdjustment: (entry: Omit<InventoryAdjustment, 'id' | 'createdAt'>) => Promise<InventoryAdjustment | null>;
  onDeleteAdjustment: (id: string) => Promise<void>;
}

export function InventoryPage({ adjustments, expenses, receipts, onAddAdjustment, onDeleteAdjustment }: InventoryPageProps) {
  const [categories] = useState(() => loadCategories());
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjDate, setAdjDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adjCategory, setAdjCategory] = useState<CategoryType>('coil');
  const [adjThickness, setAdjThickness] = useState(categories.coil.thicknesses[0] ?? 0.7);
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [showAdjHistory, setShowAdjHistory] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate inventory: adj as base, then receipts/expenses AFTER adj date
  const inventory: Record<string, number> = {};

  // Step 1: defaults — generate ALL positions from categories (includes user-added thicknesses)
  const defaultInv = getDefaultInventory();
  const defaultsMap = new Map<string, number>();
  defaultInv.forEach((d) => { defaultsMap.set(makeKey(d.category, d.thickness), d.quantity); });

  // Register every category/thickness combo from settings (new thicknesses get qty 0)
  (Object.entries(categories) as [CategoryType, typeof categories.coil][]).forEach(([cat, cfg]) => {
    cfg.thicknesses.forEach((t) => {
      const key = makeKey(cat, t);
      inventory[key] = defaultsMap.get(key) ?? 0;
    });
  });

  // Step 2: find LATEST adjustment per position
  const latestAdj = new Map<string, InventoryAdjustment>();
  adjustments.forEach((a) => {
    const key = makeKey(a.category, a.thickness);
    const existing = latestAdj.get(key);
    if (!existing || a.createdAt > existing.createdAt) {
      latestAdj.set(key, a);
    }
  });

  // Step 3: apply adjustments as BASE
  latestAdj.forEach((a, key) => {
    inventory[key] = a.quantity;
  });

  // Step 4: receipts AFTER adj date
  receipts.forEach((r) => {
    const key = makeKey(r.category, r.thickness);
    const adj = latestAdj.get(key);
    if (!adj || r.date > adj.date || (r.date === adj.date && r.createdAt > adj.createdAt)) {
      inventory[key] = (inventory[key] || 0) + r.quantity;
    }
  });

  // Step 5: expenses AFTER adj date
  expenses.forEach((e) => {
    const key = makeKey(e.category, e.thickness);
    const adj = latestAdj.get(key);
    if (!adj || e.date > adj.date || (e.date === adj.date && e.createdAt > adj.createdAt)) {
      inventory[key] = (inventory[key] || 0) - (e.category === 'sheet' ? 1 : e.weight);
    }
  });

  const mergedInventory: Record<string, { category: CategoryType; thickness: number; quantity: number; unit: string }> = {};
  // Build mergedInventory from categories (includes user-added thicknesses)
  (Object.entries(categories) as [CategoryType, typeof categories.coil][]).forEach(([cat, cfg]) => {
    cfg.thicknesses.forEach((t) => {
      const key = makeKey(cat, t);
      mergedInventory[key] = {
        category: cat,
        thickness: t,
        quantity: Math.max(0, inventory[key] ?? defaultsMap.get(key) ?? 0),
        unit: cfg.unit,
      };
    });
  });

  const finalInventory = mergedInventory;

  const categoryGroups: CategoryType[] = ['coil', 'strip', 'sheet'];

  let totalKg = 0;
  let totalSheets = 0;
  let totalSkus = 0;
  Object.values(finalInventory).forEach((item) => {
    if (item.category === 'sheet') {
      totalSheets += item.quantity;
    } else {
      totalKg += item.quantity;
    }
    totalSkus++;
  });

  // Current calculated quantity for the selected category/thickness
  const currentCalcKey = makeKey(adjCategory, adjThickness);
  const currentCalcQty = finalInventory[currentCalcKey]?.quantity ?? 0;

  const handleAddAdjustment = async () => {
    const desired = parseFloat(adjQuantity.replace(',', '.'));
    if (isNaN(desired) || desired < 0) return;
    await onAddAdjustment({
      date: adjDate,
      category: adjCategory,
      thickness: adjThickness,
      quantity: desired, // Store DESIRED quantity directly
      note: adjNote || `Остаток установлен`,
    });
    setAdjQuantity('');
    setAdjNote('');
    setShowAdjustForm(false);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8ecf4]">Остатки на складе</h1>
          <p className="text-sm text-[#8b95b5] mt-1">Текущие остатки с учётом расхода</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#8b95b5] hover:text-[#e8ecf4] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Корректировка</span>
          </button>
        </div>
      </div>

      {/* Adjustment Form */}
      {showAdjustForm && (
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#e8ecf4]">Корректировка остатков на дату</h3>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Дата</label>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm"
            >
              <Calendar className="w-4 h-4 text-[#8b95b5]" />
              {adjDate.split('-').reverse().join('.')}
              <ChevronDown className="w-3 h-3 text-[#8b95b5] ml-auto" />
            </button>
            {showDatePicker && (
              <input
                type="date"
                value={adjDate}
                onChange={(e) => { setAdjDate(e.target.value); setShowDatePicker(false); }}
                className="w-full h-11 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm"
              />
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Тип металла</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(Object.entries(categories) as [CategoryType, typeof categories.coil][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setAdjCategory(key); setAdjThickness(cfg.thicknesses[0] ?? 0.7); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    adjCategory === key ? 'bg-[#f59e0b] text-[#1a1a2e]' : 'bg-[#1e2740] text-[#8b95b5]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Thickness */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Толщина, мм</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories[adjCategory].thicknesses.map((t) => (
                <button
                  key={t}
                  onClick={() => setAdjThickness(t)}
                  className={`flex-shrink-0 w-14 h-10 rounded-lg text-sm font-bold transition-all ${
                    adjThickness === t
                      ? 'bg-[rgba(245,158,11,0.2)] text-[#f59e0b] border border-[#f59e0b]/40'
                      : 'bg-[#1e2740] text-[#e8ecf4] border border-[#2a3454]'
                  }`}
                >
                  {t.toFixed(t < 1 ? 2 : t % 1 === 0 ? 0 : 1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity - desired balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">
                Желаемый остаток
              </label>
              <span className="text-xs text-[#4a5578]">
                Сейчас: <span className="text-[#f59e0b] font-medium">{currentCalcQty.toLocaleString('ru-RU')}</span> {adjCategory === 'sheet' ? 'шт' : 'кг'}
              </span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={adjQuantity}
              onChange={(e) => setAdjQuantity(e.target.value)}
              placeholder={currentCalcQty.toString()}
              className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-lg font-semibold placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none transition-all"
            />
            <p className="text-[11px] text-[#4a5578]">
              Введите остаток который должен быть. Система посчитает разницу автоматически.
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Примечание</label>
            <input
              type="text"
              value={adjNote}
              onChange={(e) => setAdjNote(e.target.value)}
              placeholder="Причина корректировки..."
              className="w-full h-11 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdjustForm(false)}
              className="flex-1 h-11 bg-[#1e2740] text-[#8b95b5] font-medium rounded-xl transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleAddAdjustment}
              disabled={!adjQuantity || isNaN(parseFloat(adjQuantity.replace(',', '.')))}
              className="flex-1 h-11 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-[#1a1a2e] font-semibold rounded-xl transition-all"
            >
              Записать
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-center">
          <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Бухта 1.0</p>
          <p className="text-xl font-bold text-[#f59e0b] mt-1">{(inventory[makeKey('coil', 1.0)] ?? 0).toLocaleString('ru-RU')}</p>
          <p className="text-[10px] text-[#4a5578]">кг</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-center">
          <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Всего кг</p>
          <p className="text-xl font-bold text-[#e8ecf4] mt-1">{totalKg.toLocaleString('ru-RU')}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-center">
          <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Листов</p>
          <p className="text-xl font-bold text-[#10b981] mt-1">{totalSheets}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-center">
          <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Коррект.</p>
          <p className="text-xl font-bold text-[#3b82f6] mt-1">{adjustments.length}</p>
        </div>
      </div>

      {/* Category sections */}
      {categoryGroups.map((cat) => {
        const cfg = categories[cat];
        const items = Object.entries(finalInventory)
          .filter(([, v]) => v.category === cat)
          .sort(([, a], [, b]) => a.thickness - b.thickness);
        const maxQty = Math.max(...items.map(([, v]) => v.quantity), 1);

        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-base font-semibold text-[#e8ecf4] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map(([key, item]) => {
                const progress = maxQty > 0 ? (item.quantity / maxQty) * 100 : 0;
                const isZero = item.quantity <= 0;

                return (
                  <div
                    key={key}
                    className={`bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 relative ${isZero ? 'opacity-50' : ''}`}
                    style={{ borderLeftWidth: 4, borderLeftColor: cfg.color }}
                  >
                    <p className="text-2xl font-bold text-[#e8ecf4]">
                      {item.thickness.toFixed(item.thickness < 1 ? 2 : item.thickness % 1 === 0 ? 0 : 1)}
                      <span className="text-sm font-normal text-[#8b95b5] ml-1">мм</span>
                    </p>
                    <p className={`text-lg font-semibold mt-1 ${isZero ? 'text-[#4a5578]' : 'text-[#e8ecf4]'}`}>
                      {item.quantity.toLocaleString('ru-RU')}
                      <span className="text-xs font-normal text-[#8b95b5] ml-1">{item.unit}</span>
                    </p>
                    <div className="mt-3 h-1 bg-[#2a3454] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Adjustment History */}
      {adjustments.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAdjHistory(!showAdjHistory)}
            className="flex items-center gap-2 text-sm text-[#8b95b5] hover:text-[#e8ecf4] transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdjHistory ? 'rotate-180' : ''}`} />
            История корректировок ({adjustments.length})
          </button>

          {showAdjHistory && (
            <div className="space-y-2">
              {adjustments.map((adj) => {
                const cfg = categories[adj.category];
                const dateStr = adj.date.split('-').reverse().join('.');
                return (
                  <div key={adj.id} className="flex items-center gap-3 bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                      {adj.thickness.toFixed(adj.thickness < 1 ? 2 : 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e8ecf4]">{cfg.label}</span>
                        <span className="text-[11px] text-[#4a5578]">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-semibold text-[#e8ecf4]">
                          Установлено {adj.quantity.toLocaleString('ru-RU')}
                        </span>
                        <span className="text-xs text-[#8b95b5]">{cfg.unit}</span>
                      </div>
                      {adj.note && <p className="text-xs text-[#4a5578] mt-0.5 truncate">{adj.note}</p>}
                    </div>
                    <button
                      onClick={async () => { await onDeleteAdjustment(adj.id); }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#4a5578] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {Object.keys(finalInventory).length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e2740] flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-[#4a5578]" />
          </div>
          <p className="text-[#8b95b5] text-sm">Склад пуст</p>
          <p className="text-[#4a5578] text-xs mt-1">Добавьте остатки через Приход</p>
        </div>
      )}
    </div>
  );
}

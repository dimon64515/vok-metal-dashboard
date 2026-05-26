import { useState } from 'react';
import { loadCategories } from '@/types';
import type { ReceiptEntry, CategoryType } from '@/types';
import { Calendar, Trash2, ChevronDown, Filter } from 'lucide-react';

interface ReceiptPageProps {
  receipts: ReceiptEntry[];
  onAdd: (entry: Omit<ReceiptEntry, 'id' | 'createdAt'>) => Promise<ReceiptEntry | null>;
  onDelete: (id: string) => Promise<void>;
}

export function ReceiptPage({ receipts, onAdd, onDelete }: ReceiptPageProps) {
  const [categories] = useState(() => loadCategories());
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<CategoryType>('coil');
  const [thickness, setThickness] = useState(() => loadCategories().coil.thicknesses[2] ?? 0.7);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CategoryType | 'all'>('all');

  const thicknesses = categories[category].thicknesses;
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const q = parseFloat(quantity.replace(',', '.'));
    if (!q || q <= 0) return;
    setSubmitting(true);
    await onAdd({
      date,
      category,
      thickness,
      quantity: q,
      note: note || undefined,
    });
    setSubmitting(false);
    setQuantity('');
    setNote('');
  };

  const filteredReceipts = receipts.filter((r) =>
    filterCategory === 'all' ? true : r.category === filterCategory
  );

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8ecf4]">Приход на склад</h1>
          <p className="text-sm text-[#8b95b5] mt-1">Запишите поступление металла</p>
        </div>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-3 py-2 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#8b95b5] hover:text-[#e8ecf4] transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{date.split('-').reverse().join('.')}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {showDatePicker && (
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setShowDatePicker(false); }}
          className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm"
        />
      )}

      <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-5">
        {/* Category selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Тип металла</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(Object.entries(categories) as [CategoryType, typeof categories.coil][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => {
                  setCategory(key);
                  setThickness(cfg.thicknesses[0]);
                }}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  category === key
                    ? 'bg-[#f59e0b] text-[#1a1a2e]'
                    : 'bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4]'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thickness selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Толщина, мм</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {thicknesses.map((t) => (
              <button
                key={t}
                onClick={() => setThickness(t)}
                className={`flex-shrink-0 w-16 h-12 rounded-xl text-sm font-bold transition-all duration-150 ${
                  thickness === t
                    ? 'bg-[rgba(245,158,11,0.2)] text-[#f59e0b] border border-[#f59e0b]/40'
                    : 'bg-[#1e2740] text-[#e8ecf4] border border-[#2a3454] hover:border-[#3d4f7a]'
                }`}
              >
                {t.toFixed(t < 1 ? 2 : 1)}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">
            {category === 'sheet' ? 'Количество, шт' : 'Масса, кг'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full h-14 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-lg font-semibold placeholder:text-[#4a5578] focus:border-[#3d4f7a] focus:ring-2 focus:ring-[rgba(245,158,11,0.25)] outline-none transition-all"
          />
        </div>

        {/* Note input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Примечание</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Поставщик, номер накладной..."
            className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] focus:ring-2 focus:ring-[rgba(245,158,11,0.25)] outline-none transition-all"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!quantity || parseFloat(quantity.replace(',', '.')) <= 0 || submitting}
          className="w-full h-14 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1a2e] font-semibold rounded-xl transition-all duration-150 active:scale-[0.98]"
        >
          {submitting ? 'Сохранение...' : 'Записать приход'}
        </button>
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e8ecf4]">История поставок</h2>
          <span className="text-sm text-[#8b95b5]">{filteredReceipts.length} записей</span>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-3.5 h-3.5 text-[#4a5578] flex-shrink-0" />
          <button
            onClick={() => setFilterCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCategory === 'all'
                ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                : 'bg-[#1e2740] text-[#8b95b5]'
            }`}
          >
            Все
          </button>
          {(Object.entries(categories) as [CategoryType, typeof categories.coil][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterCategory === key
                  ? 'text-[#1a1a2e]'
                  : 'bg-[#1e2740] text-[#8b95b5]'
              }`}
              style={
                filterCategory === key
                  ? { backgroundColor: cfg.color }
                  : {}
              }
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredReceipts.slice(0, 50).map((entry) => {
            const cfg = categories[entry.category];
            const dateStr = new Date(entry.date).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
            });
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3"
              >
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                >
                  {entry.thickness.toFixed(entry.thickness < 1 ? 2 : 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e8ecf4]">{cfg.label}</span>
                    <span className="text-[11px] text-[#4a5578]">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-sm font-semibold text-[#e8ecf4]">
                      {entry.quantity.toLocaleString('ru-RU')}
                    </span>
                    <span className="text-xs text-[#8b95b5]">{cfg.unit}</span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-[#4a5578] mt-0.5 truncate">{entry.note}</p>
                  )}
                </div>
                <button
                  onClick={async () => { await onDelete(entry.id); }}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[#4a5578] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {filteredReceipts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[#8b95b5] text-sm">История поставок пуста</p>
            <p className="text-[#4a5578] text-xs mt-1">Добавьте первую запись выше</p>
          </div>
        )}
      </div>
    </div>
  );
}

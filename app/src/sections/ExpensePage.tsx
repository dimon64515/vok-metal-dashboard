import { useState, useMemo } from 'react';
import { loadCategories } from '@/types';
import type { ExpenseEntry, CategoryType } from '@/types';
import { Calendar, Trash2, ChevronDown } from 'lucide-react';

interface ExpensePageProps {
  expenses: ExpenseEntry[];
  onAdd: (entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => Promise<ExpenseEntry | null>;
  onDelete: (id: string) => Promise<void>;
}

export function ExpensePage({ expenses, onAdd, onDelete }: ExpensePageProps) {
  const [categories] = useState(() => loadCategories());
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<CategoryType>('coil');
  const [thickness, setThickness] = useState(() => loadCategories().coil.thicknesses[2] ?? 0.7);
  const [area, setArea] = useState('');
  const [weightEdit, setWeightEdit] = useState('');
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter expenses by selected date
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === date);
  }, [expenses, date]);

  const dayTotalWeight = dayExpenses.reduce((s, e) => s + e.weight, 0);
  const dayTotalArea = dayExpenses.reduce((s, e) => s + e.area, 0);

  const formatDateDisplay = (isoDate: string) => {
    const parts = isoDate.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };



  const autoWeight = useMemo(() => {
    const a = parseFloat(area.replace(',', '.'));
    if (!a || a <= 0) return 0;
    return +(a * thickness * 7.85).toFixed(2);
  }, [area, thickness]);

  const finalWeight = useMemo(() => {
    if (weightEdit) {
      const w = parseFloat(weightEdit.replace(',', '.'));
      return w > 0 ? w : autoWeight;
    }
    return autoWeight;
  }, [weightEdit, autoWeight]);

  const thicknesses = categories[category].thicknesses;

  const handleSubmit = async () => {
    const a = parseFloat(area.replace(',', '.'));
    if (!a || a <= 0) return;
    setSubmitting(true);
    await onAdd({
      date,
      category,
      thickness,
      area: a,
      weight: finalWeight,
      note: note || undefined,
    });
    setSubmitting(false);
    setArea('');
    setWeightEdit('');
    setNote('');
  };


  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8ecf4]">Расход металла</h1>
          <p className="text-sm text-[#8b95b5] mt-1">Введите площадь — кг посчитаются автоматически</p>
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

        {/* Area input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Площадь, м²</label>
          <input
            type="text"
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="0,00"
            className="w-full h-14 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-lg font-semibold placeholder:text-[#4a5578] focus:border-[#3d4f7a] focus:ring-2 focus:ring-[rgba(245,158,11,0.25)] outline-none transition-all"
          />
        </div>

        {/* Auto-calculated weight */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Масса, кг</label>
            <span className="text-[11px] text-[#4a5578]">авто: {autoWeight.toFixed(1)}</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={weightEdit}
            onChange={(e) => setWeightEdit(e.target.value)}
            placeholder={autoWeight > 0 ? autoWeight.toFixed(1) : '0,00'}
            className="w-full h-14 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-lg font-semibold placeholder:text-[#4a5578] focus:border-[#3d4f7a] focus:ring-2 focus:ring-[rgba(245,158,11,0.25)] outline-none transition-all"
          />
          <p className="text-[11px] text-[#4a5578]">Оставьте пустым для автоматического расчёта</p>
        </div>

        {/* Note input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Примечание</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Номер задания, изделие..."
            className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] focus:ring-2 focus:ring-[rgba(245,158,11,0.25)] outline-none transition-all"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!area || parseFloat(area.replace(',', '.')) <= 0 || submitting}
          className="w-full h-14 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1a2e] font-semibold rounded-xl transition-all duration-150 active:scale-[0.98]"
        >
          {submitting ? 'Сохранение...' : 'Добавить запись'}
        </button>
      </div>

      {/* Entries for selected date */}
      {dayExpenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#e8ecf4]">Записи за {formatDateDisplay(date)}</h2>
            <div className="flex gap-4 text-sm">
              <span className="text-[#8b95b5]">{dayTotalArea.toFixed(2)} м²</span>
              <span className="text-[#f59e0b] font-medium">{dayTotalWeight.toFixed(1)} кг</span>
            </div>
          </div>

          <div className="space-y-2">
            {dayExpenses.map((entry) => {
              const cfg = categories[entry.category];
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3.5 animate-in slide-in-from-right-4 fade-in"
                  style={{ animationDuration: '300ms' }}
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                  >
                    {entry.thickness.toFixed(entry.thickness < 1 ? 2 : 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#e8ecf4]">{cfg.label}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full text-[#8b95b5] bg-[#1e2740]">
                        {entry.thickness} мм
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-[#8b95b5]">{entry.area.toFixed(2)} м²</span>
                      <span className="text-sm font-semibold text-[#f59e0b]">{entry.weight.toFixed(1)} кг</span>
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
        </div>
      )}

      {dayExpenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e2740] flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7 text-[#4a5578]" />
          </div>
          <p className="text-[#8b95b5] text-sm">Нет записей за {formatDateDisplay(date)}</p>
          <p className="text-[#4a5578] text-xs mt-1">Добавьте первую запись выше</p>
        </div>
      )}
    </div>
  );
}

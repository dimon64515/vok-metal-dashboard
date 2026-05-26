import { useState, useMemo } from 'react';
import { loadCategories, getDefaultInventory, makeKey } from '@/types';
import type { ExpenseEntry, CategoryType } from '@/types';
import { ChevronLeft, ChevronRight, ClipboardCopy, Check, Calendar } from 'lucide-react';

interface StatsPageProps {
  expenses: ExpenseEntry[];
  getInventoryOnDate: (date: string) => Record<string, number>;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function getWeekBounds(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

// Convert Date to YYYY-MM-DD using LOCAL time (not UTC)
function dateToLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateRu(isoDate: string) {
  const parts = isoDate.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function StatsPage({ expenses, getInventoryOnDate }: StatsPageProps) {
  const [categories] = useState(() => loadCategories());
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [copied, setCopied] = useState(false);

  // Day mode
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === date);
  }, [expenses, date]);

  const dayGrouped = useMemo(() => {
    const result: Record<string, { thickness: number; area: number; weight: number }> = {};
    dayExpenses.forEach((e) => {
      const key = `${e.thickness}`;
      if (!result[key]) {
        result[key] = { thickness: e.thickness, area: 0, weight: 0 };
      }
      result[key].area += e.area;
      result[key].weight += e.weight;
    });
    return Object.values(result).sort((a, b) => a.thickness - b.thickness);
  }, [dayExpenses]);

  const dayTotalArea = dayExpenses.reduce((s, e) => s + e.area, 0);

  // Week mode
  const { weekStart, weekEnd } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const weekExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [expenses, weekStart, weekEnd]);

  const weekGrouped = useMemo(() => {
    const result: Record<string, { thickness: number; area: number; weight: number }> = {};
    weekExpenses.forEach((e) => {
      const key = `${e.thickness}`;
      if (!result[key]) {
        result[key] = { thickness: e.thickness, area: 0, weight: 0 };
      }
      result[key].area += e.area;
      result[key].weight += e.weight;
    });
    return Object.values(result).sort((a, b) => a.thickness - b.thickness);
  }, [weekExpenses]);

  const weekTotalArea = weekExpenses.reduce((s, e) => s + e.area, 0);
  const weekTotalWeight = weekExpenses.reduce((s, e) => s + e.weight, 0);

  // Month mode
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [expenses, year, month]);

  const monthGrouped = useMemo(() => {
    const result: Record<string, { category: CategoryType; thickness: number; area: number; weight: number }> = {};
    monthlyExpenses.forEach((e) => {
      const key = `${e.category}-${e.thickness}`;
      if (!result[key]) {
        result[key] = { category: e.category, thickness: e.thickness, area: 0, weight: 0 };
      }
      result[key].area += e.area;
      result[key].weight += e.weight;
    });
    return result;
  }, [monthlyExpenses]);

  const monthTotalArea = monthlyExpenses.reduce((s, e) => s + e.area, 0);
  const monthTotalWeight = monthlyExpenses.reduce((s, e) => s + e.weight, 0);

  // Inventory for day report - getInventoryOnDate returns ABSOLUTE values
  const currentInventory = useMemo(() => {
    const defaults = getDefaultInventory();
    const invMap = getInventoryOnDate(date);
    return defaults.reduce((acc, item) => {
      const key = makeKey(item.category, item.thickness);
      acc[key] = { ...item, quantity: Math.max(0, invMap[key] ?? item.quantity) };
      return acc;
    }, {} as Record<string, { category: CategoryType; thickness: number; quantity: number }>);
  }, [date, getInventoryOnDate]);

  // Navigation
  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const prevWeek = () => setWeekOffset((o) => o - 1);
  const nextWeek = () => setWeekOffset((o) => o + 1);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Report generators
  const generateDayReport = () => {
    const lines: string[] = [];
    lines.push(`Отчет за ${formatDateRu(date)}`);
    lines.push('');

    dayGrouped.forEach((item) => {
      const thickStr = item.thickness < 1
        ? item.thickness.toFixed(2).replace('.', ',')
        : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
      lines.push(`${thickStr} - ${item.area.toString().replace('.', ',')} квм (${item.weight.toFixed(1).replace('.', ',')} кг)`);
    });

    lines.push(`Всего квадратов: ${Math.round(dayTotalArea)}`);
    lines.push('');
    lines.push('Остаток металла:');
    lines.push('Бухт (кг):');

    Object.values(currentInventory)
      .filter((i) => i.category === 'coil')
      .sort((a, b) => b.thickness - a.thickness)
      .forEach((item) => {
        const thickStr = item.thickness < 1
          ? item.thickness.toFixed(2).replace('.', ',')
          : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
        lines.push(`${thickStr} - ${item.quantity}`);
      });

    lines.push('Штрипс (кг)');
    Object.values(currentInventory)
      .filter((i) => i.category === 'strip')
      .sort((a, b) => b.thickness - a.thickness)
      .forEach((item) => {
        const thickStr = item.thickness < 1
          ? item.thickness.toFixed(2).replace('.', ',')
          : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
        lines.push(`${thickStr} - ${item.quantity}`);
      });

    lines.push('Листы (шт)');
    Object.values(currentInventory)
      .filter((i) => i.category === 'sheet')
      .sort((a, b) => b.thickness - a.thickness)
      .forEach((item) => {
        const thickStr = item.thickness < 1
          ? item.thickness.toFixed(2).replace('.', ',')
          : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
        lines.push(`${thickStr} - ${item.quantity}`);
      });

    return lines.join('\n');
  };

  const generateWeekReport = () => {
    const lines: string[] = [];
    const startStr = formatDateRu(dateToLocalIso(weekStart));
    const endStr = formatDateRu(dateToLocalIso(weekEnd));
    lines.push(`Отчет за неделю ${startStr} — ${endStr}`);
    lines.push('');

    weekGrouped.forEach((item) => {
      const thickStr = item.thickness < 1
        ? item.thickness.toFixed(2).replace('.', ',')
        : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
      lines.push(`${thickStr} - ${item.area.toFixed(2).replace('.', ',')} кв.м (${item.weight.toFixed(1).replace('.', ',')} кг)`);
    });

    lines.push(`Всего квадратов: ${weekTotalArea.toFixed(2).replace('.', ',')}`);
    lines.push(`Всего кг: ${weekTotalWeight.toFixed(1).replace('.', ',')}`);

    return lines.join('\n');
  };

  const generateMonthReport = () => {
    const lines: string[] = [];
    lines.push(`Отчет за ${MONTHS[month]} ${year}`);
    lines.push('');

    (['coil', 'strip', 'sheet'] as CategoryType[]).forEach((cat) => {
      const cfg = categories[cat];
      const items = Object.values(monthGrouped)
        .filter((g) => g.category === cat)
        .sort((a, b) => a.thickness - b.thickness);

      if (items.length === 0) return;

      lines.push(`— ${cfg.label} —`);
      items.forEach((item) => {
        const thickStr = item.thickness < 1
          ? item.thickness.toFixed(2).replace('.', ',')
          : item.thickness.toFixed(item.thickness % 1 === 0 ? 0 : 1).replace('.', ',');
        lines.push(`${thickStr}мм - ${item.area.toFixed(2).replace('.', ',')} кв.м (${item.weight.toFixed(1).replace('.', ',')} кг)`);
      });
      lines.push('');
    });

    lines.push(`Всего квадратов: ${monthTotalArea.toFixed(2).replace('.', ',')}`);
    lines.push(`Всего кг: ${monthTotalWeight.toFixed(1).replace('.', ',')}`);

    return lines.join('\n');
  };

  const getCurrentReport = () => {
    switch (mode) {
      case 'day': return generateDayReport();
      case 'week': return generateWeekReport();
      case 'month': return generateMonthReport();
    }
  };

  const handleCopy = async () => {
    const report = getCurrentReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasDayData = dayGrouped.length > 0;
  const hasWeekData = weekGrouped.length > 0;
  const hasMonthData = Object.keys(monthGrouped).length > 0;

  const weekLabel = `${formatDateRu(dateToLocalIso(weekStart))} — ${formatDateRu(dateToLocalIso(weekEnd))}`;

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-[#e8ecf4]">Статистика</h1>
        <p className="text-sm text-[#8b95b5] mt-1">
          {mode === 'day' && 'Отчёт за день с остатками'}
          {mode === 'week' && 'Отчёт за неделю'}
          {mode === 'month' && 'Месячный отчёт по расходу'}
        </p>
      </div>

      {/* Mode toggle: Day / Week / Month */}
      <div className="flex bg-[#141b2d] border border-[#2a3454] rounded-xl p-1">
        {(['day', 'week', 'month'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? 'bg-[#f59e0b] text-[#1a1a2e]'
                : 'text-[#8b95b5] hover:text-[#e8ecf4]'
            }`}
          >
            {m === 'day' ? 'День' : m === 'week' ? 'Неделя' : 'Месяц'}
          </button>
        ))}
      </div>

      {/* Date selector */}
      {mode === 'day' && (
        <div className="flex items-center justify-between bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3">
          <button onClick={prevDay} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8b95b5]" />
            <span className="text-base font-semibold text-[#e8ecf4]">{formatDateRu(date)}</span>
          </div>
          <button onClick={nextDay} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {mode === 'week' && (
        <div className="flex items-center justify-between bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3">
          <button onClick={prevWeek} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8b95b5]" />
            <span className="text-base font-semibold text-[#e8ecf4]">{weekLabel}</span>
          </div>
          <button onClick={nextWeek} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {mode === 'month' && (
        <div className="flex items-center justify-between bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-[#e8ecf4]">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* DAY MODE */}
      {mode === 'day' && (
        <>
          {hasDayData ? (
            <>
              <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-5">
                <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Площадь за день</p>
                <p className="text-3xl font-bold text-[#f59e0b] mt-1">{Math.round(dayTotalArea)} <span className="text-base text-[#8b95b5]">кв.м</span></p>
              </div>

              <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a3454]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Толщина</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Площадь, м²</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Масса, кг</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayGrouped.map((item) => (
                      <tr key={item.thickness} className="border-b border-[#2a3454]/50">
                        <td className="px-4 py-3 text-sm font-medium text-[#e8ecf4]">{item.thickness} мм</td>
                        <td className="px-4 py-3 text-sm text-[#e8ecf4] text-right">{item.area.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#f59e0b] text-right">{item.weight.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="bg-[rgba(245,158,11,0.08)]">
                      <td className="px-4 py-3 text-sm font-bold text-[#e8ecf4]">ВСЕГО</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#e8ecf4] text-right">{dayTotalArea.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#f59e0b] text-right">{dayExpenses.reduce((s, e) => s + e.weight, 0).toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Inventory */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#e8ecf4]">Остаток металла</h3>
                {(['coil', 'strip', 'sheet'] as CategoryType[]).map((cat) => {
                  const colors = { coil: '#f59e0b', strip: '#3b82f6', sheet: '#10b981' };
                  const labels = { coil: 'Бухт (кг)', strip: 'Штрипс (кг)', sheet: 'Листы (шт)' };
                  return (
                    <div key={cat} className="bg-[#141b2d] border border-[#2a3454] rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#2a3454]" style={{ backgroundColor: `${colors[cat]}15` }}>
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors[cat] }}>{labels[cat]}</span>
                      </div>
                      <table className="w-full">
                        <tbody>
                          {Object.values(currentInventory)
                            .filter((i) => i.category === cat)
                            .sort((a, b) => b.thickness - a.thickness)
                            .map((item) => (
                              <tr key={item.thickness} className="border-b border-[#2a3454]/30">
                                <td className="px-4 py-2.5 text-sm text-[#8b95b5]">{item.thickness.toFixed(item.thickness < 1 ? 2 : item.thickness % 1 === 0 ? 0 : 1)} мм</td>
                                <td className={`px-4 py-2.5 text-sm font-medium text-right ${item.quantity <= 0 ? 'text-[#4a5578]' : 'text-[#e8ecf4]'}`}>
                                  {item.quantity.toLocaleString('ru-RU')}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1e2740] flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-[#4a5578]" />
              </div>
              <p className="text-[#8b95b5] text-sm">Нет данных за {formatDateRu(date)}</p>
              <p className="text-[#4a5578] text-xs mt-1">Добавьте записи расхода</p>
            </div>
          )}
        </>
      )}

      {/* WEEK MODE */}
      {mode === 'week' && (
        <>
          {hasWeekData ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-5">
                  <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Площадь за неделю</p>
                  <p className="text-2xl font-bold text-[#e8ecf4] mt-1">{weekTotalArea.toFixed(2)}</p>
                  <p className="text-xs text-[#4a5578] mt-0.5">м²</p>
                </div>
                <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-5">
                  <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Масса</p>
                  <p className="text-2xl font-bold text-[#f59e0b] mt-1">{weekTotalWeight.toFixed(1)}</p>
                  <p className="text-xs text-[#4a5578] mt-0.5">кг</p>
                </div>
              </div>

              <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a3454]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Толщина</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Площадь, м²</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Масса, кг</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekGrouped.map((item) => (
                      <tr key={item.thickness} className="border-b border-[#2a3454]/50">
                        <td className="px-4 py-3 text-sm font-medium text-[#e8ecf4]">{item.thickness} мм</td>
                        <td className="px-4 py-3 text-sm text-[#e8ecf4] text-right">{item.area.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#f59e0b] text-right">{item.weight.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="bg-[rgba(245,158,11,0.08)]">
                      <td className="px-4 py-3 text-sm font-bold text-[#e8ecf4]">ВСЕГО</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#e8ecf4] text-right">{weekTotalArea.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#f59e0b] text-right">{weekTotalWeight.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1e2740] flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-[#4a5578]" />
              </div>
              <p className="text-[#8b95b5] text-sm">Нет данных за эту неделю</p>
              <p className="text-[#4a5578] text-xs mt-1">Добавьте записи расхода</p>
            </div>
          )}
        </>
      )}

      {/* MONTH MODE */}
      {mode === 'month' && (
        <>
          {hasMonthData ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-5">
                  <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Площадь</p>
                  <p className="text-2xl font-bold text-[#e8ecf4] mt-1">{monthTotalArea.toFixed(2)}</p>
                  <p className="text-xs text-[#4a5578] mt-0.5">м²</p>
                </div>
                <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-5">
                  <p className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Масса</p>
                  <p className="text-2xl font-bold text-[#f59e0b] mt-1">{monthTotalWeight.toFixed(1)}</p>
                  <p className="text-xs text-[#4a5578] mt-0.5">кг</p>
                </div>
              </div>

              <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a3454]">
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Тип</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Толщина</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Площадь, м²</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Масса, кг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['coil', 'strip', 'sheet'] as CategoryType[]).map((cat) => {
                        const cfg = categories[cat];
                        const items = Object.values(monthGrouped)
                          .filter((g) => g.category === cat)
                          .sort((a, b) => a.thickness - b.thickness);

                        if (items.length === 0) return null;

                        const catArea = items.reduce((s, i) => s + i.area, 0);
                        const catWeight = items.reduce((s, i) => s + i.weight, 0);

                        return (
                          <>
                            {items.map((item, idx) => (
                              <tr key={`${cat}-${item.thickness}`} className={`border-b border-[#2a3454]/50 ${idx === 0 ? 'border-t border-[#2a3454]' : ''}`}>
                                {idx === 0 && (
                                  <td rowSpan={items.length} className="px-4 py-3 text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</td>
                                )}
                                <td className="px-4 py-3 text-sm text-[#e8ecf4]">{item.thickness} мм</td>
                                <td className="px-4 py-3 text-sm text-[#e8ecf4] text-right">{item.area.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-medium text-[#f59e0b] text-right">{item.weight.toFixed(1)}</td>
                              </tr>
                            ))}
                            <tr className="border-b border-[#2a3454] bg-[#1e2740]/30">
                              <td colSpan={2} className="px-4 py-2.5 text-xs font-medium text-[#8b95b5]">Итого {cfg.label.toLowerCase()}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-[#e8ecf4] text-right">{catArea.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-[#f59e0b] text-right">{catWeight.toFixed(1)}</td>
                            </tr>
                          </>
                        );
                      })}
                      <tr className="bg-[rgba(245,158,11,0.08)]">
                        <td colSpan={2} className="px-4 py-3 text-sm font-bold text-[#e8ecf4]">ВСЕГО</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#e8ecf4] text-right">{monthTotalArea.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#f59e0b] text-right">{monthTotalWeight.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1e2740] flex items-center justify-center mb-4">
                <BarChart className="w-7 h-7 text-[#4a5578]" />
              </div>
              <p className="text-[#8b95b5] text-sm">Нет данных за {MONTHS[month]} {year}</p>
              <p className="text-[#4a5578] text-xs mt-1">Добавьте записи расхода</p>
            </div>
          )}
        </>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="w-full h-14 bg-[#1e2740] hover:bg-[#2a3454] border border-[#2a3454] text-[#e8ecf4] font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
      >
        {copied ? (
          <><Check className="w-5 h-5 text-[#10b981]" /><span className="text-[#10b981]">Скопировано!</span></>
        ) : (
          <><ClipboardCopy className="w-5 h-5 text-[#8b95b5]" /><span>Скопировать отчёт</span></>
        )}
      </button>

      {/* Preview */}
      <div className="bg-[#0d1117] border border-[#2a3454] rounded-xl p-4">
        <p className="text-[10px] text-[#4a5578] uppercase tracking-wider mb-2">Предпросмотр</p>
        <pre className="text-xs text-[#8b95b5] whitespace-pre-wrap font-mono leading-relaxed">
          {getCurrentReport()}
        </pre>
      </div>
    </div>
  );
}

function BarChart(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

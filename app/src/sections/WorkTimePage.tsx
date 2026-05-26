import { useState, useMemo, useEffect } from 'react';
import type { Employee, AttendanceRecord, AttendanceStatus } from '@/types';
import { Users, Clock, Plus, Trash2, ChevronLeft, ChevronRight, Edit2, Check, X, Sun, Moon } from 'lucide-react';

interface WorkTimePageProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  onAddEmployee: (e: Omit<Employee, 'id' | 'createdAt'>) => Promise<Employee | null>;
  onEditEmployee: (id: string, changes: Partial<Omit<Employee, 'id' | 'createdAt'>>) => Promise<void>;
  onRemoveEmployee: (id: string) => Promise<void>;
  onSetAttendance: (r: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<void>;
  onClearAttendance: (employeeId: string, date: string, status?: AttendanceStatus) => Promise<void>;
  onLoadMonth: (year: number, month: number) => Promise<void>;
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const STATUS_CFG: Record<AttendanceStatus, { short: string; color: string; bg: string; label: string }> = {
  day:     { short: 'Д',  color: '#10b981', bg: 'rgba(16,185,129,0.18)',  label: 'День' },
  night:   { short: 'Н',  color: '#818cf8', bg: 'rgba(129,140,248,0.18)', label: 'Ночь' },
  absent:  { short: 'П',  color: '#ef4444', bg: 'rgba(239,68,68,0.18)',   label: 'Прогул' },
  holiday: { short: 'В',  color: '#6b7280', bg: 'rgba(107,114,128,0.18)', label: 'Выходной' },
  sick:    { short: 'Б',  color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',  label: 'Больничный' },
};

interface CellModalProps {
  emp: Employee;
  date: string;
  existingRecords: AttendanceRecord[]; // ALL records for this cell
  onSave: (r: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<void>;
  onClear: (status: AttendanceStatus) => Promise<void>;
  onClose: () => void;
}

function CellModal({ emp, date, existingRecords, onSave, onClear, onClose }: CellModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>('day');
  const record = existingRecords.find(r => r.status === status);
  const [hours, setHours] = useState<string>(
    record ? String(record.hours) : String(status === 'night' ? emp.nightShiftHours : emp.dayShiftHours)
  );
  const [note, setNote] = useState(record?.note ?? '');

  // Reset form when status changes
  const handleStatusChange = (s: AttendanceStatus) => {
    setStatus(s);
    const rec = existingRecords.find(r => r.status === s);
    if (rec) {
      setHours(String(rec.hours));
      setNote(rec.note ?? '');
    } else {
      if (s === 'day') setHours(String(emp.dayShiftHours));
      else if (s === 'night') setHours(String(emp.nightShiftHours));
      else setHours('0');
      setNote('');
    }
  };

  const handleSave = async () => {
    const h = parseFloat(hours.replace(',', '.')) || 0;
    await onSave({ employeeId: emp.id, date, status, hours: h, note: note || undefined });
    onClose();
  };

  const handleClear = async () => {
    await onClear(status);
    onClose();
  };

  const dayLabel = date.split('-').reverse().join('.');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md bg-[#141b2d] border border-[#2a3454] rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#e8ecf4]">{emp.name}</p>
            <p className="text-xs text-[#8b95b5]">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4a5578] hover:text-[#e8ecf4]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(STATUS_CFG) as [AttendanceStatus, typeof STATUS_CFG.day][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className="h-10 rounded-xl text-sm font-semibold transition-all border"
              style={status === key
                ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color }
                : { backgroundColor: '#1e2740', color: '#8b95b5', borderColor: '#2a3454' }
              }
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {(status === 'day' || status === 'night') && (
          <div>
            <label className="text-xs text-[#8b95b5] mb-1 block">Часов отработано</label>
            <input
              type="text"
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-lg font-semibold outline-none focus:border-[#f59e0b]"
            />
            <p className="text-xs text-[#4a5578] mt-1">
              По умолчанию: {status === 'night' ? emp.nightShiftHours : emp.dayShiftHours}ч
            </p>
          </div>
        )}

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Примечание (необязательно)"
          className="w-full h-10 px-3 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm outline-none focus:border-[#3d4f7a] placeholder:text-[#4a5578]"
        />

        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 h-12 bg-[#f59e0b] hover:bg-[#d97706] text-[#1a1a2e] font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Сохранить
          </button>
          {record && (
            <button onClick={handleClear} className="w-12 h-12 bg-[#1e2740] hover:bg-[rgba(239,68,68,0.15)] text-[#4a5578] hover:text-[#ef4444] rounded-xl flex items-center justify-center transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkTimePage({
  employees, attendance,
  onAddEmployee, onEditEmployee, onRemoveEmployee,
  onSetAttendance, onClearAttendance, onLoadMonth,
}: WorkTimePageProps) {
  const [tab, setTab] = useState<'table' | 'employees'>('table');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [openCell, setOpenCell] = useState<{ emp: Employee; date: string } | null>(null);

  useEffect(() => { onLoadMonth(year, month); }, [year, month]);

  const daysInMonth = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(year, month, d).getDay();
      return { day: d, dateStr, isWeekend: dow === 0 || dow === 6 };
    });
  }, [year, month]);

  // Group ALL attendance records by cell (employeeId|date) — allows multiple shifts per day
  const cellMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord[]>();
    attendance.forEach((r) => {
      const key = `${r.employeeId}|${r.date}`;
      const arr = m.get(key);
      if (arr) arr.push(r);
      else m.set(key, [r]);
    });
    return m;
  }, [attendance]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  const stats = useMemo(() => {
    return activeEmployees.map((emp) => {
      let hours = 0, dayHours = 0, nightHours = 0, dayShifts = 0, nightShifts = 0, absent = 0, sick = 0;
      daysInMonth.forEach(({ dateStr }) => {
        const recs = cellMap.get(`${emp.id}|${dateStr}`);
        if (!recs) return;
        recs.forEach((rec) => {
          if (rec.status === 'day') { hours += rec.hours; dayHours += rec.hours; dayShifts++; }
          if (rec.status === 'night') { hours += rec.hours; nightHours += rec.hours; nightShifts++; }
          if (rec.status === 'absent') absent++;
          if (rec.status === 'sick') sick++;
        });
      });
      return { emp, hours, dayHours, nightHours, dayShifts, nightShifts, absent, sick, earned: (dayHours * emp.hourlyRate) + (nightHours * (emp.nightHourlyRate || emp.hourlyRate)) };
    });
  }, [activeEmployees, daysInMonth, cellMap]);

  const totalEarned = stats.reduce((s, r) => s + r.earned, 0);
  const totalHours = stats.reduce((s, r) => s + r.hours, 0);

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  // ===== Сотрудники =====
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newNightRate, setNewNightRate] = useState('');
  const [newDayH, setNewDayH] = useState('8');
  const [newNightH, setNewNightH] = useState('12');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ rate: '', nightRate: '', dayH: '', nightH: '' });

  const handleAddEmployee = async () => {
    const name = newName.trim();
    const rate = parseFloat(newRate.replace(',', '.'));
    if (!name || !rate || rate <= 0) return;
    const nightRateVal = parseFloat(newNightRate.replace(',', '.'));
    await onAddEmployee({
      name, hourlyRate: rate, nightHourlyRate: nightRateVal > 0 ? nightRateVal : rate,
      dayShiftHours: parseFloat(newDayH) || 8,
      nightShiftHours: parseFloat(newNightH) || 12,
      active: true,
    });
    setNewName(''); setNewRate(''); setNewNightRate(''); setNewDayH('8'); setNewNightH('12');
    setShowAddForm(false);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditFields({ rate: String(emp.hourlyRate), nightRate: String(emp.nightHourlyRate), dayH: String(emp.dayShiftHours), nightH: String(emp.nightShiftHours) });
  };

  const handleSaveEdit = async (id: string) => {
    const rate = parseFloat(editFields.rate.replace(',', '.'));
    const nightRate = parseFloat(editFields.nightRate.replace(',', '.'));
    if (rate > 0) {
      await onEditEmployee(id, {
        hourlyRate: rate,
        nightHourlyRate: nightRate > 0 ? nightRate : rate,
        dayShiftHours: parseFloat(editFields.dayH) || 8,
        nightShiftHours: parseFloat(editFields.nightH) || 12,
      });
    }
    setEditingId(null);
  };

  const openCellRecords = openCell ? (cellMap.get(`${openCell.emp.id}|${openCell.date}`) || []) : [];

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-[#e8ecf4]">Рабочее время</h1>
        <p className="text-sm text-[#8b95b5] mt-1">Учёт явок и расчёт зарплат</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1e2740] rounded-xl p-1">
        <button
          onClick={() => setTab('table')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === 'table' ? 'bg-[#f59e0b] text-[#1a1a2e]' : 'text-[#8b95b5] hover:text-[#e8ecf4]'}`}
        >
          <Clock className="w-4 h-4" />Табель
        </button>
        <button
          onClick={() => setTab('employees')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === 'employees' ? 'bg-[#f59e0b] text-[#1a1a2e]' : 'text-[#8b95b5] hover:text-[#e8ecf4]'}`}
        >
          <Users className="w-4 h-4" />Сотрудники
        </button>
      </div>

      {/* ========== ТАБЕЛЬ ========== */}
      {tab === 'table' && (
        <>
          {/* Навигация по месяцам */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-[#e8ecf4]">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Итог-карточки */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-4">
              <p className="text-xs text-[#8b95b5] uppercase tracking-wider">К выплате</p>
              <p className="text-2xl font-bold text-[#f59e0b] mt-1">{totalEarned.toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-[#4a5578] mt-0.5">{activeEmployees.length} сотрудников</p>
            </div>
            <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-4">
              <p className="text-xs text-[#8b95b5] uppercase tracking-wider">Отработано</p>
              <p className="text-2xl font-bold text-[#e8ecf4] mt-1">{totalHours} ч</p>
              <p className="text-xs text-[#4a5578] mt-0.5">за {MONTHS[month]}</p>
            </div>
          </div>

          {/* Легенда */}
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(STATUS_CFG) as [AttendanceStatus, typeof STATUS_CFG.day][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                  {cfg.short}
                </div>
                <span className="text-xs text-[#8b95b5]">{cfg.label}</span>
              </div>
            ))}
          </div>

          {activeEmployees.length === 0 ? (
            <div className="text-center py-12 text-[#8b95b5] text-sm">
              Добавьте сотрудников во вкладке «Сотрудники»
            </div>
          ) : (
            <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="border-collapse" style={{ minWidth: `${180 + daysInMonth.length * 36}px` }}>
                  <thead>
                    <tr className="border-b border-[#2a3454]">
                      <th className="sticky left-0 z-10 bg-[#141b2d] text-left px-3 py-2 text-xs text-[#8b95b5] font-medium w-36 min-w-[9rem] border-r border-[#2a3454]">
                        Сотрудник
                      </th>
                      {daysInMonth.map(({ day, isWeekend }) => (
                        <th key={day} className={`text-center px-0 py-2 text-[10px] font-medium w-9 ${isWeekend ? 'text-[#f59e0b]' : 'text-[#8b95b5]'}`}>
                          {day}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-xs text-[#8b95b5] font-medium min-w-[5rem]">Итог</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.map((emp, empIdx) => {
                      const s = stats.find((st) => st.emp.id === emp.id);
                      return (
                        <tr key={emp.id} className={empIdx % 2 === 0 ? 'bg-[#141b2d]' : 'bg-[#0f1623]'}>
                          <td className="sticky left-0 z-10 px-3 py-1.5 text-sm text-[#e8ecf4] font-medium border-r border-[#2a3454] truncate max-w-[9rem]"
                              style={{ backgroundColor: empIdx % 2 === 0 ? '#141b2d' : '#0f1623' }}>
                            {emp.name}
                          </td>
                          {daysInMonth.map(({ dateStr }) => {
                            const recs = cellMap.get(`${emp.id}|${dateStr}`) || [];
                            const dayRec = recs.find(r => r.status === 'day');
                            const nightRec = recs.find(r => r.status === 'night');
                            const otherRec = recs.find(r => r.status !== 'day' && r.status !== 'night');
                            return (
                              <td key={dateStr} className="p-0.5 text-center">
                                <button
                                  onClick={() => setOpenCell({ emp, date: dateStr })}
                                  className="w-8 h-8 rounded-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                                  style={recs.length === 0 
                                    ? { backgroundColor: 'transparent', color: '#2a3454' }
                                    : recs.length === 1 
                                      ? { backgroundColor: STATUS_CFG[recs[0].status].bg, color: STATUS_CFG[recs[0].status].color }
                                      : { backgroundColor: '#1e2740' }
                                  }
                                  title={recs.map(r => `${STATUS_CFG[r.status].label}${r.hours ? ` · ${r.hours}ч` : ''}`).join(', ') || 'Нажмите для отметки'}
                                >
                                  {recs.length === 0 ? '·' : recs.length === 1 ? STATUS_CFG[recs[0].status].short : (
                                    <div className="flex flex-col items-center leading-none gap-px">
                                      {dayRec && <span className="text-[7px] font-bold" style={{ color: STATUS_CFG.day.color }}>Д</span>}
                                      {nightRec && <span className="text-[7px] font-bold" style={{ color: STATUS_CFG.night.color }}>Н</span>}
                                      {otherRec && <span className="text-[7px] font-bold" style={{ color: STATUS_CFG[otherRec.status].color }}>{STATUS_CFG[otherRec.status].short}</span>}
                                    </div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 text-right">
                            <div className="text-xs font-semibold text-[#f59e0b]">{s?.earned.toLocaleString('ru-RU')} ₽</div>
                            <div className="text-[10px] text-[#8b95b5]">{s?.hours}ч</div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-[#2a3454] bg-[rgba(245,158,11,0.05)]">
                      <td className="sticky left-0 px-3 py-2 text-xs font-bold text-[#e8ecf4] bg-[rgba(245,158,11,0.05)] border-r border-[#2a3454]">ИТОГО</td>
                      {daysInMonth.map(({ dateStr }) => {
                        const dayCount = activeEmployees.filter((emp) => {
                          const recs = cellMap.get(`${emp.id}|${dateStr}`) || [];
                          return recs.some(r => r.status === 'day' || r.status === 'night');
                        }).length;
                        return (
                          <td key={dateStr} className="p-0.5 text-center">
                            {dayCount > 0 && <span className="text-[10px] text-[#8b95b5]">{dayCount}</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right">
                        <div className="text-xs font-bold text-[#f59e0b]">{totalEarned.toLocaleString('ru-RU')} ₽</div>
                        <div className="text-[10px] text-[#8b95b5]">{totalHours}ч</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Детализация по сотрудникам */}
          {stats.length > 0 && (
            <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a3454]">
                <p className="text-sm font-semibold text-[#e8ecf4]">Итоги за {MONTHS[month]}</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a3454]">
                    <th className="text-left px-4 py-2 text-xs text-[#8b95b5]">Сотрудник</th>
                    <th className="text-center px-2 py-2 text-xs text-[#10b981]"><Sun className="w-3 h-3 inline" /></th>
                    <th className="text-center px-2 py-2 text-xs text-[#818cf8]"><Moon className="w-3 h-3 inline" /></th>
                    <th className="text-center px-2 py-2 text-xs text-[#ef4444]">П</th>
                    <th className="text-right px-2 py-2 text-xs text-[#10b981]">ч. день</th>
                    <th className="text-right px-2 py-2 text-xs text-[#818cf8]">ч. ночь</th>
                    <th className="text-right px-4 py-2 text-xs text-[#8b95b5]">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(({ emp, dayHours, nightHours, dayShifts, nightShifts, absent, earned }) => (
                    <tr key={emp.id} className="border-b border-[#2a3454]/40">
                      <td className="px-4 py-2 text-sm text-[#e8ecf4]">{emp.name}</td>
                      <td className="px-2 py-2 text-xs text-[#10b981] text-center">{dayShifts}</td>
                      <td className="px-2 py-2 text-xs text-[#818cf8] text-center">{nightShifts}</td>
                      <td className="px-2 py-2 text-xs text-[#ef4444] text-center">{absent || '—'}</td>
                      <td className="px-2 py-2 text-xs text-[#10b981] text-right">{dayHours}</td>
                      <td className="px-2 py-2 text-xs text-[#818cf8] text-right">{nightHours}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-[#f59e0b] text-right">{earned.toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  ))}
                  <tr className="bg-[rgba(245,158,11,0.06)]">
                    <td colSpan={4} className="px-4 py-2.5 text-sm font-bold text-[#e8ecf4]">ВСЕГО</td>
                    <td className="px-2 py-2.5 text-xs font-bold text-[#10b981] text-right">{stats.reduce((s, r) => s + r.dayHours, 0)}</td>
                    <td className="px-2 py-2.5 text-xs font-bold text-[#818cf8] text-right">{stats.reduce((s, r) => s + r.nightHours, 0)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-[#f59e0b] text-right">{totalEarned.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========== СОТРУДНИКИ ========== */}
      {tab === 'employees' && (
        <>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full h-12 bg-[#1e2740] border border-[#2a3454] hover:border-[#3d4f7a] text-[#e8ecf4] rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm font-medium">Добавить сотрудника</span>
          </button>

          {showAddForm && (
            <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-[#e8ecf4]">Новый сотрудник</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ФИО или имя"
                className="w-full h-12 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#10b981] mb-1 block">Дневная ₽/ч</label>
                  <input type="text" inputMode="decimal" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                    placeholder="200" className="w-full h-11 px-3 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm outline-none focus:border-[#3d4f7a]" />
                </div>
                <div>
                  <label className="text-xs text-[#818cf8] mb-1 block">Ночная ₽/ч</label>
                  <input type="text" inputMode="decimal" value={newNightRate} onChange={(e) => setNewNightRate(e.target.value)}
                    placeholder="300" className="w-full h-11 px-3 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm outline-none focus:border-[#3d4f7a]" />
                </div>
                <div>
                  <label className="text-xs text-[#10b981] mb-1 block">День, ч</label>
                  <input type="text" inputMode="decimal" value={newDayH} onChange={(e) => setNewDayH(e.target.value)}
                    placeholder="8" className="w-full h-11 px-3 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm outline-none focus:border-[#3d4f7a]" />
                </div>
                <div>
                  <label className="text-xs text-[#818cf8] mb-1 block">Ночь, ч</label>
                  <input type="text" inputMode="decimal" value={newNightH} onChange={(e) => setNewNightH(e.target.value)}
                    placeholder="12" className="w-full h-11 px-3 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm outline-none focus:border-[#3d4f7a]" />
                </div>
              </div>
              <button
                onClick={handleAddEmployee}
                disabled={!newName.trim() || !newRate || parseFloat(newRate) <= 0}
                className="w-full h-12 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1a2e] font-semibold rounded-xl transition-all"
              >
                Добавить
              </button>
            </div>
          )}

          <div className="space-y-2">
            {employees.length === 0 && (
              <div className="text-center py-10 text-[#8b95b5] text-sm">Сотрудников пока нет</div>
            )}
            {employees.map((emp) => (
              <div key={emp.id} className="bg-[#141b2d] border border-[#2a3454] rounded-xl px-4 py-3">
                {editingId === emp.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#e8ecf4]">{emp.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Дневная ₽/ч', color: '#10b981', key: 'rate' as const },
                        { label: 'Ночная ₽/ч', color: '#818cf8', key: 'nightRate' as const },
                        { label: 'День ч', color: '#10b981', key: 'dayH' as const },
                        { label: 'Ночь ч', color: '#818cf8', key: 'nightH' as const },
                      ].map(({ label, color, key }) => (
                        <div key={key}>
                          <label className="text-xs mb-1 block" style={{ color }}>{label}</label>
                          <input
                            type="text" inputMode="decimal"
                            value={editFields[key]}
                            onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full h-10 px-3 bg-[#1e2740] border border-[#2a3454] rounded-lg text-[#e8ecf4] text-sm outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(emp.id)} className="flex-1 h-9 bg-[#f59e0b] text-[#1a1a2e] font-medium rounded-lg flex items-center justify-center gap-1 text-sm">
                        <Check className="w-4 h-4" /> Сохранить
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-9 h-9 bg-[#1e2740] text-[#8b95b5] rounded-lg flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#e8ecf4]">{emp.name}</p>
                      <p className="text-xs text-[#8b95b5] mt-0.5">
                        <span className="text-[#10b981]">{emp.hourlyRate} ₽/ч</span>
                        <span className="text-[#4a5578]"> / </span>
                        <span className="text-[#818cf8]">{emp.nightHourlyRate || emp.hourlyRate} ₽/ч ночь</span>
                        <span className="text-[#4a5578]"> · Д:{emp.dayShiftHours}ч Н:{emp.nightShiftHours}ч</span>
                      </p>
                    </div>
                    <button onClick={() => startEdit(emp)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-[#4a5578] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemoveEmployee(emp.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-[#4a5578] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Модальное окно редактирования ячейки */}
      {openCell && (
        <CellModal
          emp={openCell.emp}
          date={openCell.date}
          existingRecords={openCellRecords}
          onSave={onSetAttendance}
          onClear={(status) => onClearAttendance(openCell.emp.id, openCell.date, status)}
          onClose={() => setOpenCell(null)}
        />
      )}
    </div>
  );
}

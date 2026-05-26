import { useState, useRef } from 'react';
import { setSupabaseConfig, resetSupabaseClient, hasSupabaseConfig, getSupabaseConfig } from '@/lib/supabase';
import { loadCategories, addThickness, removeThickness, resetCategories } from '@/types';
import type { CategoryType, ExpenseEntry, ReceiptEntry, InventoryAdjustment, Employee, AttendanceRecord } from '@/types';
import {
  Database, ArrowRight, ExternalLink, Download, Upload,
  AlertTriangle, Check, ChevronLeft, Trash2, Plus, X,
  Layers, RotateCcw, ArrowLeft
} from 'lucide-react';

interface SettingsPageProps {
  onDone: () => void;
  expenses?: ExpenseEntry[];
  receipts?: ReceiptEntry[];
  adjustments?: InventoryAdjustment[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
}

export function SettingsPage({ onDone, expenses = [], receipts = [], adjustments = [], employees = [], attendance = [] }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<'menu' | 'supabase' | 'backup' | 'thickness'>('menu');

  const renderBack = () => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => activeSection === 'menu' ? onDone() : setActiveSection('menu')}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e2740] text-[#8b95b5] hover:text-[#e8ecf4] hover:bg-[#2a3454] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-bold text-[#e8ecf4]">
        {activeSection === 'menu' && 'Настройки'}
        {activeSection === 'supabase' && 'Supabase'}
        {activeSection === 'backup' && 'Резервная копия'}
        {activeSection === 'thickness' && 'Толщины металла'}
      </h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {renderBack()}

        {activeSection === 'menu' && (
          <div className="space-y-3">
            {/* Thickness management */}
            <button
              onClick={() => setActiveSection('thickness')}
              className="w-full flex items-center gap-4 bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-left hover:border-[#3d4f7a] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[rgba(245,158,11,0.15)] flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e8ecf4]">Толщины металла</p>
                <p className="text-xs text-[#8b95b5]">Добавить или удалить толщины</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#4a5578] rotate-180" />
            </button>

            {/* Supabase */}
            <button
              onClick={() => setActiveSection('supabase')}
              className="w-full flex items-center gap-4 bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-left hover:border-[#3d4f7a] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[rgba(59,130,246,0.15)] flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e8ecf4]">Supabase</p>
                <p className="text-xs text-[#8b95b5] truncate">
                  {hasSupabaseConfig() ? 'Подключено' : 'Не подключено'}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#4a5578] rotate-180" />
            </button>

            {/* Backup */}
            <button
              onClick={() => setActiveSection('backup')}
              className="w-full flex items-center gap-4 bg-[#141b2d] border border-[#2a3454] rounded-xl p-4 text-left hover:border-[#3d4f7a] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[rgba(16,185,129,0.15)] flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-[#10b981]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e8ecf4]">Резервная копия</p>
                <p className="text-xs text-[#8b95b5]">Экспорт / импорт данных</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#4a5578] rotate-180" />
            </button>
          </div>
        )}

        {activeSection === 'supabase' && <SupabaseSection />}
        {activeSection === 'backup' && <BackupSection expenses={expenses} receipts={receipts} adjustments={adjustments} employees={employees} attendance={attendance} />}
        {activeSection === 'thickness' && <ThicknessSection />}
      </div>
    </div>
  );
}

/* ============ SUPABASE SECTION ============ */
function SupabaseSection() {
  const [url, setUrl] = useState(() => getSupabaseConfig().url);
  const [anonKey, setAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isConnected = hasSupabaseConfig();

  const handleSave = () => {
    setError('');
    setSuccess('');
    if (!url.trim() || !anonKey.trim()) {
      setError('Заполните оба поля');
      return;
    }
    setSaving(true);
    setSupabaseConfig(url.trim(), anonKey.trim());
    resetSupabaseClient();
    setTimeout(() => {
      setSaving(false);
      setSuccess('Подключено! Перезагрузите страницу.');
    }, 500);
  };

  const handleDisconnect = () => {
    setSupabaseConfig('', '');
    resetSupabaseClient();
    setUrl('');
    setAnonKey('');
    setSuccess('Отключено. Перезагрузите страницу.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#10b981]' : 'bg-[#4a5578]'}`} />
          <span className="text-sm font-medium text-[#e8ecf4]">
            {isConnected ? 'Подключено к Supabase' : 'Не подключено'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Project URL</label>
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxxxx.supabase.co"
              className="w-full h-11 mt-1.5 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider">Anon / Public API Key</label>
            <input
              type="text" value={anonKey} onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full h-11 mt-1.5 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none transition-all"
            />
          </div>
        </div>

        {error && <div className="text-sm text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-3 py-2 rounded-lg">{error}</div>}
        {success && <div className="text-sm text-[#10b981] bg-[rgba(16,185,129,0.1)] px-3 py-2 rounded-lg">{success}</div>}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? 'Сохраняем...' : isConnected ? 'Обновить' : 'Подключить'}
            <ArrowRight className="w-4 h-4" />
          </button>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="h-11 px-4 bg-[#1e2740] hover:bg-[rgba(239,68,68,0.15)] text-[#ef4444] font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Отключить
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-4">
        <p className="text-xs font-medium text-[#8b95b5] uppercase tracking-wider mb-2">Как получить данные</p>
        <ol className="space-y-2 text-sm text-[#e8ecf4]">
          <li className="flex gap-2"><span className="text-[#3b82f6] font-bold">1.</span><span>Создайте проект на <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a></span></li>
          <li className="flex gap-2"><span className="text-[#3b82f6] font-bold">2.</span><span>Project Settings → API</span></li>
          <li className="flex gap-2"><span className="text-[#3b82f6] font-bold">3.</span><span>Скопируйте URL и anon key</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============ BACKUP SECTION ============ */
function BackupSection({ expenses, receipts, adjustments, employees, attendance }: {
  expenses: ExpenseEntry[]; receipts: ReceiptEntry[]; adjustments: InventoryAdjustment[];
  employees: Employee[]; attendance: AttendanceRecord[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pendingData, setPendingData] = useState('');

  const handleExport = () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      expenses,
      receipts,
      categories: JSON.parse(localStorage.getItem('metal_categories') || '{}'),
      adjustments,
      employees,
      attendance,
      supabaseUrl: getSupabaseConfig().url,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vok-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('idle');
    setConfirmReplace(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        if (!data.expenses || !Array.isArray(data.expenses)) throw new Error('Неверный формат: отсутствует expenses');
        if (!data.receipts || !Array.isArray(data.receipts)) throw new Error('Неверный формат: отсутствует receipts');
        setPendingData(content);
        setConfirmReplace(true);
      } catch (err) {
        setImportStatus('error');
        setImportMessage(err instanceof Error ? err.message : 'Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    try {
      const data = JSON.parse(pendingData);
      localStorage.setItem('metal_expenses', JSON.stringify(data.expenses || []));
      localStorage.setItem('metal_receipts', JSON.stringify(data.receipts || []));
      if (data.adjustments) localStorage.setItem('metal_adjustments', JSON.stringify(data.adjustments));
      if (data.categories) localStorage.setItem('metal_categories', JSON.stringify(data.categories));
      if (data.employees) localStorage.setItem('metal_employees', JSON.stringify(data.employees));
      if (data.attendance) localStorage.setItem('metal_attendance', JSON.stringify(data.attendance));
      setImportStatus('success');
      setImportMessage(`Импортировано. Перезагрузите страницу.`);
      setConfirmReplace(false);
      setPendingData('');
    } catch {
      setImportStatus('error');
      setImportMessage('Ошибка импорта');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#8b95b5] uppercase tracking-wider">Расходов</p>
          <p className="text-lg font-bold text-[#e8ecf4] mt-1">{expenses.length}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#8b95b5] uppercase tracking-wider">Приходов</p>
          <p className="text-lg font-bold text-[#e8ecf4] mt-1">{receipts.length}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#8b95b5] uppercase tracking-wider">Коррект.</p>
          <p className="text-lg font-bold text-[#e8ecf4] mt-1">{adjustments.length}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#8b95b5] uppercase tracking-wider">Сотрудн.</p>
          <p className="text-lg font-bold text-[#e8ecf4] mt-1">{employees.length}</p>
        </div>
        <div className="bg-[#141b2d] border border-[#2a3454] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#8b95b5] uppercase tracking-wider">Табель</p>
          <p className="text-lg font-bold text-[#e8ecf4] mt-1">{attendance.length}</p>
        </div>
      </div>

      <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
        <button onClick={handleExport} className="w-full h-11 bg-[#10b981] hover:bg-[#059669] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Скачать backup
        </button>
      </div>

      <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
        {!confirmReplace ? (
          <button onClick={() => fileInputRef.current?.click()} className="w-full h-11 bg-[#f59e0b] hover:bg-[#d97706] text-[#1a1a2e] font-medium rounded-xl transition-all flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Выбрать файл
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-[#f59e0b] bg-[rgba(245,158,11,0.1)] px-3 py-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Текущие данные будут заменены. Это действие нельзя отменить.</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmReplace(false); setPendingData(''); }} className="flex-1 h-10 bg-[#1e2740] text-[#8b95b5] font-medium rounded-xl">Отмена</button>
              <button onClick={handleConfirmImport} className="flex-1 h-10 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium rounded-xl flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Заменить
              </button>
            </div>
          </div>
        )}
        {importStatus === 'success' && <div className="text-sm text-[#10b981] bg-[rgba(16,185,129,0.1)] px-3 py-2 rounded-lg flex items-center gap-2"><Check className="w-4 h-4" />{importMessage}</div>}
        {importStatus === 'error' && <div className="text-sm text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-3 py-2 rounded-lg">{importMessage}</div>}
      </div>
    </div>
  );
}

/* ============ THICKNESS SECTION ============ */
function ThicknessSection() {
  const [categories, setCategories] = useState(() => loadCategories());
  const [newValue, setNewValue] = useState('');
  const [activeCat, setActiveCat] = useState<CategoryType>('coil');
  const [confirmReset, setConfirmReset] = useState(false);

  const refresh = () => setCategories(loadCategories());

  const handleAdd = () => {
    const val = parseFloat(newValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    addThickness(activeCat, val);
    setNewValue('');
    refresh();
  };

  const handleRemove = (cat: CategoryType, thickness: number) => {
    removeThickness(cat, thickness);
    refresh();
  };

  const handleReset = () => {
    resetCategories();
    refresh();
    setConfirmReset(false);
  };

  const catLabels: Record<CategoryType, string> = { coil: 'Бухта', strip: 'Штрипс', sheet: 'Лист' };
  const catColors: Record<CategoryType, string> = { coil: '#f59e0b', strip: '#3b82f6', sheet: '#10b981' };

  return (
    <div className="space-y-5">
      {/* Add new thickness */}
      <div className="bg-[#141b2d] border border-[#2a3454] rounded-2xl p-5 space-y-4">
        <p className="text-sm font-medium text-[#e8ecf4]">Добавить толщину</p>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.keys(catLabels) as CategoryType[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCat === cat ? 'text-[#1a1a2e]' : 'bg-[#1e2740] text-[#8b95b5]'
              }`}
              style={activeCat === cat ? { backgroundColor: catColors[cat] } : {}}
            >
              {catLabels[cat]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="0,00"
            className="flex-1 h-11 px-4 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#3d4f7a] outline-none transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newValue || parseFloat(newValue.replace(',', '.')) <= 0}
            className="h-11 px-4 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-[#1a1a2e] font-medium rounded-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {/* Current thicknesses */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-[#e8ecf4]">Текущие толщины</p>

        {(Object.keys(catLabels) as CategoryType[]).map((cat) => (
          <div key={cat} className="bg-[#141b2d] border border-[#2a3454] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#2a3454]" style={{ backgroundColor: `${catColors[cat]}15` }}>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: catColors[cat] }}>{catLabels[cat]}</span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {categories[cat].thicknesses.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2740] border border-[#2a3454] rounded-lg text-sm text-[#e8ecf4]"
                >
                  <span className="font-medium">{t.toFixed(t < 1 ? 2 : t % 1 === 0 ? 0 : 1)} мм</span>
                  <button
                    onClick={() => handleRemove(cat, t)}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#4a5578] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.15)] transition-colors"
                    title="Удалить"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {categories[cat].thicknesses.length === 0 && (
                <p className="text-xs text-[#4a5578] px-2 py-1">Нет толщин</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reset */}
      <div className="pt-2">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full h-10 bg-[#1e2740] hover:bg-[rgba(239,68,68,0.1)] text-[#8b95b5] hover:text-[#ef4444] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Вернуть стандартные значения
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-3 py-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Все изменения толщин будут сброшены. Это нельзя отменить.</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="flex-1 h-10 bg-[#1e2740] text-[#8b95b5] font-medium rounded-xl">Отмена</button>
              <button onClick={handleReset} className="flex-1 h-10 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium rounded-xl flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Сбросить
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#4a5578] text-center">
        Изменения вступят в силу после возврата на главный экран
      </p>
    </div>
  );
}

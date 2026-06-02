import { useState, useEffect } from 'react';
import type { ExpenseEntry, ReceiptEntry, InventoryAdjustment, Employee, AttendanceRecord, CategoryType } from '@/types';
import { makeKey } from '@/types';
import {
  hasSupabaseConfig,
  fetchExpenses,
  fetchReceipts,
  fetchAdjustments,
  fetchReceiptByBatchId,
  insertExpense,
  insertReceipt,
  insertAdjustment as insertAdjustmentDb,
  deleteExpense as deleteExpenseDb,
  deleteReceipt as deleteReceiptDb,
  deleteAdjustment as deleteAdjustmentDb,
  fetchEmployees,
  insertEmployee,
  updateEmployee as updateEmployeeDb,
  deleteEmployee as deleteEmployeeDb,
  fetchAttendance,
  upsertAttendance as upsertAttendanceDb,
  deleteAttendanceRecord as deleteAttendanceRecordDb,
} from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

function isSupabase() {
  return hasSupabaseConfig();
}

const defaults = [
  { category: 'coil' as CategoryType, thickness: 1.0, quantity: 3397 },
  { category: 'coil' as CategoryType, thickness: 0.9, quantity: 7915 },
  { category: 'coil' as CategoryType, thickness: 0.8, quantity: 0 },
  { category: 'coil' as CategoryType, thickness: 0.65, quantity: 10105 },
  { category: 'coil' as CategoryType, thickness: 0.5, quantity: 10286 },
  { category: 'coil' as CategoryType, thickness: 0.7, quantity: 8471 },
  { category: 'strip' as CategoryType, thickness: 0.9, quantity: 1400 },
  { category: 'strip' as CategoryType, thickness: 0.8, quantity: 6084 },
  { category: 'strip' as CategoryType, thickness: 0.55, quantity: 10228 },
  { category: 'strip' as CategoryType, thickness: 0.7, quantity: 7734 },
  { category: 'sheet' as CategoryType, thickness: 5.0, quantity: 10 },
  { category: 'sheet' as CategoryType, thickness: 3.0, quantity: 15 },
  { category: 'sheet' as CategoryType, thickness: 2.0, quantity: 40 },
  { category: 'sheet' as CategoryType, thickness: 1.5, quantity: 0 },
  { category: 'sheet' as CategoryType, thickness: 1.2, quantity: 0 },
];

export function useStorage() {
  const { requireAuth } = useAdminAuth();

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== LOAD =====
  useEffect(() => {
    if (!isSupabase()) return;
    setLoading(true);
    setError('');

    const now = new Date();
    Promise.all([
      fetchExpenses(), fetchReceipts(), fetchAdjustments(),
      fetchEmployees(), fetchAttendance(now.getFullYear(), now.getMonth()),
    ])
      .then(([cloudExp, cloudRec, cloudAdj, cloudEmp, cloudAtt]) => {
        setExpenses(cloudExp);
        setReceipts(cloudRec);
        setAdjustments(cloudAdj);
        setEmployees(cloudEmp);
        setAttendance(cloudAtt);
      })
      .catch((err) => {
        console.error('Load from Supabase failed:', err);
        setError('Ошибка загрузки данных. Проверьте подключение к Supabase.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function addExpense(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) {
    if (!(await requireAuth())) return null;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    const inserted = await insertExpense(entry);
    if (inserted) {
      setExpenses((p) => [inserted, ...p]);
      return inserted;
    }
    throw new Error('Не удалось добавить расход');
  }

  async function deleteExpense(id: string) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    await deleteExpenseDb(id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  }

  async function addReceipt(entry: Omit<ReceiptEntry, 'id' | 'createdAt'>) {
    if (!(await requireAuth())) return null;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    const inserted = await insertReceipt(entry);
    if (inserted) {
      setReceipts((p) => [inserted, ...p]);
      return inserted;
    }
    throw new Error('Не удалось добавить приход');
  }

  async function findDuplicateReceipt(batchId?: string): Promise<ReceiptEntry | null> {
    if (!batchId) return null;
    // Check local state first
    const localDup = receipts.find((r) => r.batchId === batchId);
    if (localDup) return localDup;
    // Check Supabase
    if (!isSupabase()) return null;
    return fetchReceiptByBatchId(batchId);
  }

  async function deleteReceipt(id: string) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    await deleteReceiptDb(id);
    setReceipts((p) => p.filter((r) => r.id !== id));
  }

  async function addAdjustment(entry: Omit<InventoryAdjustment, 'id' | 'createdAt'>) {
    if (!(await requireAuth())) return null;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    const inserted = await insertAdjustmentDb(entry);
    setAdjustments((prev) => [inserted, ...prev]);
    return inserted;
  }

  async function deleteAdjustment(id: string) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    await deleteAdjustmentDb(id);
    setAdjustments((p) => p.filter((a) => a.id !== id));
  }

  async function addEmployee(entry: Omit<Employee, 'id' | 'createdAt'>) {
    if (!(await requireAuth())) return null;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    const inserted = await insertEmployee(entry);
    setEmployees((p) => [...p, inserted]);
    return inserted;
  }

  async function editEmployee(id: string, changes: Partial<Omit<Employee, 'id' | 'createdAt'>>) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    await updateEmployeeDb(id, changes);
    setEmployees((p) => p.map((e) => e.id === id ? { ...e, ...changes } : e));
  }

  async function removeEmployee(id: string) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    await deleteEmployeeDb(id);
    setEmployees((p) => p.filter((e) => e.id !== id));
    setAttendance((p) => p.filter((r) => r.employeeId !== id));
  }

  async function loadAttendanceForMonth(year: number, month: number) {
    if (!isSupabase()) return;
    const records = await fetchAttendance(year, month);
    const mm = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${mm}-`;
    setAttendance((prev) => {
      const other = prev.filter((r) => !r.date.startsWith(prefix));
      return [...other, ...records];
    });
  }

  async function setAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>) {
    if (!(await requireAuth())) return;
    if (!isSupabase()) throw new Error('Supabase не подключен');
    const upserted = await upsertAttendanceDb(record);
    setAttendance((prev) => {
      const filtered = prev.filter((r) => !(r.employeeId === record.employeeId && r.date === record.date && r.status === record.status));
      return [...filtered, upserted];
    });
  }

  async function clearAttendanceRecord(employeeId: string, date: string, status?: string) {
    if (!(await requireAuth())) return;
    if (status) {
      const existing = attendance.find((r) => r.employeeId === employeeId && r.date === date && r.status === status);
      if (existing) {
        await deleteAttendanceRecordDb(existing.id);
      }
      setAttendance((prev) => prev.filter((r) => !(r.employeeId === employeeId && r.date === date && r.status === status)));
    } else {
      const allForDay = attendance.filter((r) => r.employeeId === employeeId && r.date === date);
      for (const rec of allForDay) {
        try { await deleteAttendanceRecordDb(rec.id); } catch {}
      }
      setAttendance((prev) => prev.filter((r) => !(r.employeeId === employeeId && r.date === date)));
    }
  }

  function calcInventory(exps: ExpenseEntry[], recs: ReceiptEntry[], adjs: InventoryAdjustment[]) {
    const inv: Record<string, number> = {};

    // 0. Start with defaults (initial inventory)
    defaults.forEach((d) => { inv[makeKey(d.category, d.thickness)] = d.quantity; });

    // 1. Apply adjustments as BASE (overwrite defaults)
    adjs.forEach((a) => {
      inv[makeKey(a.category, a.thickness)] = a.quantity;
    });

    // 2. Receipts AFTER the adjustment date (or all if no adjustment)
    recs.forEach((r) => {
      const key = makeKey(r.category, r.thickness);
      const adj = adjs
        .filter((a) => a.category === r.category && a.thickness === r.thickness)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (!adj || r.date > adj.date || (r.date === adj.date && r.createdAt > adj.createdAt)) {
        inv[key] = (inv[key] || 0) + r.quantity;
      }
    });

    // 3. Expenses AFTER the adjustment date (or all if no adjustment)
    exps.forEach((e) => {
      const key = makeKey(e.category, e.thickness);
      const adj = adjs
        .filter((a) => a.category === e.category && a.thickness === e.thickness)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (!adj || e.date > adj.date || (e.date === adj.date && e.createdAt > adj.createdAt)) {
        inv[key] = (inv[key] || 0) - (e.category === 'sheet' ? 1 : e.weight);
      }
    });

    return inv;
  }

  function getInventory() { return calcInventory(expenses, receipts, adjustments); }

  function getInventoryOnDate(targetDate: string) {
    const relevantAdjs = adjustments.filter((a) => a.date <= targetDate);
    return calcInventory(
      expenses.filter((e) => e.date <= targetDate),
      receipts.filter((r) => r.date <= targetDate),
      relevantAdjs
    );
  }

  function getTodayExpenses() { return expenses.filter((e) => e.date === new Date().toISOString().split('T')[0]); }
  function getMonthlyExpenses(y: number, m: number) { return expenses.filter((e) => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m; }); }
  function getMonthlyReceipts(y: number, m: number) { return receipts.filter((r) => { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m; }); }

  return {
    expenses, receipts, adjustments, loading, error,
    addExpense, addReceipt, addAdjustment,
    deleteExpense, deleteReceipt, deleteAdjustment,
    findDuplicateReceipt,
    getInventory, getInventoryOnDate,
    getTodayExpenses, getMonthlyExpenses, getMonthlyReceipts,
    employees, attendance,
    addEmployee, editEmployee, removeEmployee,
    setAttendanceRecord, clearAttendanceRecord, loadAttendanceForMonth,
  };
}

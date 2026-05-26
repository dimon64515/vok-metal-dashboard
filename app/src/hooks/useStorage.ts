import { useState, useEffect } from 'react';
import type { ExpenseEntry, ReceiptEntry, InventoryAdjustment, CategoryType, Employee, AttendanceRecord } from '@/types';
import { makeKey } from '@/types';
import {
  getSupabase,
  hasSupabaseConfig,
  fetchExpenses,
  fetchReceipts,
  fetchAdjustments,
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

const EXP_KEY = 'metal_expenses';
const REC_KEY = 'metal_receipts';
const ADJ_KEY = 'metal_adjustments';
const EMP_KEY = 'metal_employees';
const ATT_KEY = 'metal_attendance';

function isSupabase() {
  return hasSupabaseConfig() && getSupabase() !== null;
}

// ===== MERGE UTILITIES =====
// Merge cloud data with local data — local records not in cloud are preserved
function mergeArrays<T extends { id: string; createdAt: number }>(cloud: T[], local: T[]): T[] {
  const map = new Map<string, T>();
  // Cloud records first (they have real UUIDs)
  cloud.forEach((item) => map.set(item.id, item));
  // Add local records that don't exist in cloud
  local.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  // Sort by createdAt desc (newest first)
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// Count local-only records (not synced to cloud)
function countUnsynced<T extends { id: string }>(merged: T[], cloud: T[]): number {
  const cloudIds = new Set(cloud.map((c) => c.id));
  return merged.filter((m) => !cloudIds.has(m.id)).length;
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
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(EXP_KEY) || '[]'); } catch { return []; }
  });
  const [receipts, setReceipts] = useState<ReceiptEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(REC_KEY) || '[]'); } catch { return []; }
  });
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>(() => {
    try { return JSON.parse(localStorage.getItem(ADJ_KEY) || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ synced: number; total: number }>({ synced: 0, total: 0 });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try { return JSON.parse(localStorage.getItem(EMP_KEY) || '[]'); } catch { return []; }
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(ATT_KEY) || '[]'); } catch { return []; }
  });

  // ===== LOAD WITH MERGE (not overwrite) =====
  useEffect(() => {
    if (!isSupabase()) return;
    setLoading(true);

    // Always load local data first as backup
    const localExp = JSON.parse(localStorage.getItem(EXP_KEY) || '[]') as ExpenseEntry[];
    const localRec = JSON.parse(localStorage.getItem(REC_KEY) || '[]') as ReceiptEntry[];
    const localAdj = JSON.parse(localStorage.getItem(ADJ_KEY) || '[]') as InventoryAdjustment[];
    const localEmp = JSON.parse(localStorage.getItem(EMP_KEY) || '[]') as Employee[];
    const localAtt = JSON.parse(localStorage.getItem(ATT_KEY) || '[]') as AttendanceRecord[];

    const now = new Date();
    Promise.all([
      fetchExpenses(), fetchReceipts(), fetchAdjustments(),
      fetchEmployees(), fetchAttendance(now.getFullYear(), now.getMonth()),
    ])
      .then(([cloudExp, cloudRec, cloudAdj, cloudEmp, cloudAtt]) => {
        // MERGE: cloud + local records not in cloud
        const mergedExp = mergeArrays(cloudExp, localExp);
        const mergedRec = mergeArrays(cloudRec, localRec);
        const mergedAdj = mergeArrays(cloudAdj, localAdj);
        const mergedEmp = mergeArrays(cloudEmp, localEmp);
        const mergedAtt = mergeArrays(cloudAtt, localAtt);

        setExpenses(mergedExp);
        setReceipts(mergedRec);
        setAdjustments(mergedAdj);
        setEmployees(mergedEmp);
        setAttendance(mergedAtt);

        // Save merged data to localStorage
        localStorage.setItem(EXP_KEY, JSON.stringify(mergedExp));
        localStorage.setItem(REC_KEY, JSON.stringify(mergedRec));
        localStorage.setItem(ADJ_KEY, JSON.stringify(mergedAdj));
        localStorage.setItem(EMP_KEY, JSON.stringify(mergedEmp));
        localStorage.setItem(ATT_KEY, JSON.stringify(mergedAtt));

        // Count unsynced records (local-only)
        const unsynced =
          countUnsynced(mergedExp, cloudExp) +
          countUnsynced(mergedRec, cloudRec) +
          countUnsynced(mergedAdj, cloudAdj) +
          countUnsynced(mergedEmp, cloudEmp) +
          countUnsynced(mergedAtt, cloudAtt);

        setSyncStatus({ synced: unsynced === 0 ? 1 : 0, total: unsynced });

        // Auto-sync unsynced records in background
        if (unsynced > 0) {
          syncUnsyncedRecords(mergedExp, mergedRec, mergedAdj, mergedEmp, mergedAtt, cloudExp, cloudRec, cloudAdj, cloudEmp, cloudAtt);
        }
      })
      .catch((err) => {
        console.error('Load from Supabase failed, using localStorage:', err);
        // Fallback: use local data only
        setExpenses(localExp);
        setReceipts(localRec);
        setAdjustments(localAdj);
        setEmployees(localEmp);
        setAttendance(localAtt);
      })
      .finally(() => setLoading(false));
  }, []);

  // ===== BACKGROUND SYNC: push local-only records to Supabase =====
  async function syncUnsyncedRecords(
    mergedExp: ExpenseEntry[], mergedRec: ReceiptEntry[], mergedAdj: InventoryAdjustment[],
    mergedEmp: Employee[], mergedAtt: AttendanceRecord[],
    cloudExp: ExpenseEntry[], cloudRec: ReceiptEntry[], cloudAdj: InventoryAdjustment[],
    cloudEmp: Employee[], cloudAtt: AttendanceRecord[],
  ) {
    if (!isSupabase()) return;

    const cloudExpIds = new Set(cloudExp.map((c) => c.id));
    const cloudRecIds = new Set(cloudRec.map((c) => c.id));
    const cloudAdjIds = new Set(cloudAdj.map((c) => c.id));
    const cloudEmpIds = new Set(cloudEmp.map((c) => c.id));
    const cloudAttIds = new Set(cloudAtt.map((c) => c.id));

    let synced = 0;

    // Sync expenses
    for (const item of mergedExp) {
      if (!cloudExpIds.has(item.id) && item.id.startsWith('l-')) {
        try {
          const inserted = await insertExpense(item);
          if (inserted) {
            setExpenses((prev) => prev.map((p) => p.id === item.id ? inserted : p));
            synced++;
          }
        } catch (err) { console.error('Sync expense failed:', err); }
      }
    }

    // Sync receipts
    for (const item of mergedRec) {
      if (!cloudRecIds.has(item.id) && item.id.startsWith('l-')) {
        try {
          const inserted = await insertReceipt(item);
          if (inserted) {
            setReceipts((prev) => prev.map((p) => p.id === item.id ? inserted : p));
            synced++;
          }
        } catch (err) { console.error('Sync receipt failed:', err); }
      }
    }

    // Sync adjustments
    for (const item of mergedAdj) {
      if (!cloudAdjIds.has(item.id) && item.id.startsWith('l-')) {
        try {
          const inserted = await insertAdjustmentDb(item);
          if (inserted) {
            setAdjustments((prev) => prev.map((p) => p.id === item.id ? inserted : p));
            synced++;
          }
        } catch (err) { console.error('Sync adjustment failed:', err); }
      }
    }

    // Sync employees
    for (const item of mergedEmp) {
      if (!cloudEmpIds.has(item.id) && item.id.startsWith('l-')) {
        try {
          const inserted = await insertEmployee(item);
          if (inserted) {
            setEmployees((prev) => prev.map((p) => p.id === item.id ? inserted : p));
            synced++;
          }
        } catch (err) { console.error('Sync employee failed:', err); }
      }
    }

    // Sync attendance
    for (const item of mergedAtt) {
      if (!cloudAttIds.has(item.id) && item.id.startsWith('l-')) {
        try {
          const inserted = await upsertAttendanceDb(item);
          if (inserted) {
            setAttendance((prev) => prev.map((p) => p.id === item.id ? inserted : p));
            synced++;
          }
        } catch (err) { console.error('Sync attendance failed:', err); }
      }
    }

    if (synced > 0) {
      console.log(`Auto-synced ${synced} local records to Supabase`);
      // Refresh all data to get clean state
      const now = new Date();
      const [freshE, freshR, freshA, freshEmp, freshAtt] = await Promise.all([
        fetchExpenses(), fetchReceipts(), fetchAdjustments(),
        fetchEmployees(), fetchAttendance(now.getFullYear(), now.getMonth()),
      ]);
      setExpenses(freshE); setReceipts(freshR); setAdjustments(freshA);
      setEmployees(freshEmp); setAttendance(freshAtt);
      localStorage.setItem(EXP_KEY, JSON.stringify(freshE));
      localStorage.setItem(REC_KEY, JSON.stringify(freshR));
      localStorage.setItem(ADJ_KEY, JSON.stringify(freshA));
      localStorage.setItem(EMP_KEY, JSON.stringify(freshEmp));
      localStorage.setItem(ATT_KEY, JSON.stringify(freshAtt));
      setSyncStatus({ synced: 1, total: 0 });
    }
  }

  async function addExpense(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) {
    if (isSupabase()) {
      try {
        const inserted = await insertExpense(entry);
        if (inserted) {
          setExpenses((p) => {
            const u = [inserted, ...p];
            localStorage.setItem(EXP_KEY, JSON.stringify(u));
            return u;
          });
          return inserted;
        }
      } catch (err) {
        console.error('addExpense Supabase failed, falling back:', err);
      }
    }
    const n: ExpenseEntry = { ...entry, id: `l-${Date.now()}`, createdAt: Date.now() };
    setExpenses((p) => {
      const u = [n, ...p];
      localStorage.setItem(EXP_KEY, JSON.stringify(u));
      return u;
    });
    return n;
  }
  async function deleteExpense(id: string) {
    if (isSupabase()) await deleteExpenseDb(id);
    setExpenses((p) => {
      const u = p.filter((e) => e.id !== id);
      localStorage.setItem(EXP_KEY, JSON.stringify(u));
      return u;
    });
  }

  async function addReceipt(entry: Omit<ReceiptEntry, 'id' | 'createdAt'>) {
    if (isSupabase()) {
      try {
        const inserted = await insertReceipt(entry);
        if (inserted) {
          setReceipts((p) => {
            const u = [inserted, ...p];
            localStorage.setItem(REC_KEY, JSON.stringify(u));
            return u;
          });
          return inserted;
        }
      } catch (err) {
        console.error('addReceipt Supabase failed, falling back:', err);
      }
    }
    const n: ReceiptEntry = { ...entry, id: `l-${Date.now()}`, createdAt: Date.now() };
    setReceipts((p) => {
      const u = [n, ...p];
      localStorage.setItem(REC_KEY, JSON.stringify(u));
      return u;
    });
    return n;
  }
  async function deleteReceipt(id: string) {
    if (isSupabase()) await deleteReceiptDb(id);
    setReceipts((p) => {
      const u = p.filter((r) => r.id !== id);
      localStorage.setItem(REC_KEY, JSON.stringify(u));
      return u;
    });
  }

  async function addAdjustment(entry: Omit<InventoryAdjustment, 'id' | 'createdAt'>) {
    if (isSupabase()) {
      try {
        const inserted = await insertAdjustmentDb(entry);
        setAdjustments((prev) => {
          const updated = [inserted, ...prev];
          localStorage.setItem(ADJ_KEY, JSON.stringify(updated));
          return updated;
        });
        return inserted;
      } catch (err) {
        console.error('addAdjustment Supabase failed, falling back:', err);
      }
    }
    const n: InventoryAdjustment = { ...entry, id: `l-${Date.now()}`, createdAt: Date.now() };
    setAdjustments((prev) => {
      const updated = [n, ...prev];
      localStorage.setItem(ADJ_KEY, JSON.stringify(updated));
      return updated;
    });
    return n;
  }
  async function deleteAdjustment(id: string) {
    if (isSupabase()) { try { await deleteAdjustmentDb(id); } catch {} }
    setAdjustments((p) => {
      const u = p.filter((a) => a.id !== id);
      localStorage.setItem(ADJ_KEY, JSON.stringify(u));
      return u;
    });
  }

  // ===== EMPLOYEES =====

  async function addEmployee(entry: Omit<Employee, 'id' | 'createdAt'>) {
    if (isSupabase()) {
      try {
        const inserted = await insertEmployee(entry);
        setEmployees((p) => { const u = [...p, inserted]; localStorage.setItem(EMP_KEY, JSON.stringify(u)); return u; });
        return inserted;
      } catch (err) { console.error('addEmployee failed:', err); }
    }
    const n: Employee = { ...entry, id: `l-${Date.now()}`, createdAt: Date.now() };
    setEmployees((p) => { const u = [...p, n]; localStorage.setItem(EMP_KEY, JSON.stringify(u)); return u; });
    return n;
  }

  async function editEmployee(id: string, changes: Partial<Omit<Employee, 'id' | 'createdAt'>>) {
    if (isSupabase()) {
      try { await updateEmployeeDb(id, changes); } catch (err) { console.error('editEmployee failed:', err); }
    }
    setEmployees((p) => {
      const u = p.map((e) => e.id === id ? { ...e, ...changes } : e);
      localStorage.setItem(EMP_KEY, JSON.stringify(u));
      return u;
    });
  }

  async function removeEmployee(id: string) {
    if (isSupabase()) { try { await deleteEmployeeDb(id); } catch {} }
    setEmployees((p) => { const u = p.filter((e) => e.id !== id); localStorage.setItem(EMP_KEY, JSON.stringify(u)); return u; });
    setAttendance((p) => { const u = p.filter((r) => r.employeeId !== id); localStorage.setItem(ATT_KEY, JSON.stringify(u)); return u; });
  }

  // ===== ATTENDANCE =====

  async function loadAttendanceForMonth(year: number, month: number) {
    if (!isSupabase()) return;
    try {
      const records = await fetchAttendance(year, month);
      // Merge: cloud records for this month + local records not in cloud
      const mm = String(month + 1).padStart(2, '0');
      const prefix = `${year}-${mm}-`;
      const localForMonth = attendance.filter((r) => r.date.startsWith(prefix));
      const cloudIds = new Set(records.map((r) => r.id));
      const orphanedLocal = localForMonth.filter((r) => !cloudIds.has(r.id));
      const merged = [...records, ...orphanedLocal].sort((a, b) => b.createdAt - a.createdAt);
      setAttendance((prev) => {
        const other = prev.filter((r) => !r.date.startsWith(prefix));
        const updated = [...other, ...merged];
        localStorage.setItem(ATT_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (err) { console.error('loadAttendanceForMonth failed:', err); }
  }

  async function setAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>) {
    if (isSupabase()) {
      try {
        const upserted = await upsertAttendanceDb(record);
        setAttendance((prev) => {
          const filtered = prev.filter((r) => !(r.employeeId === record.employeeId && r.date === record.date && r.status === record.status));
          const updated = [...filtered, upserted];
          localStorage.setItem(ATT_KEY, JSON.stringify(updated));
          return updated;
        });
        return;
      } catch (err) { console.error('setAttendanceRecord failed:', err); }
    }
    const n: AttendanceRecord = { ...record, id: `l-${Date.now()}`, createdAt: Date.now() };
    setAttendance((prev) => {
      const filtered = prev.filter((r) => !(r.employeeId === record.employeeId && r.date === record.date && r.status === record.status));
      const updated = [...filtered, n];
      localStorage.setItem(ATT_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  async function clearAttendanceRecord(employeeId: string, date: string, status?: string) {
    if (status) {
      const existing = attendance.find((r) => r.employeeId === employeeId && r.date === date && r.status === status);
      if (existing && isSupabase()) {
        try { await deleteAttendanceRecordDb(existing.id); } catch {}
      }
      setAttendance((prev) => {
        const updated = prev.filter((r) => !(r.employeeId === employeeId && r.date === date && r.status === status));
        localStorage.setItem(ATT_KEY, JSON.stringify(updated));
        return updated;
      });
    } else {
      const allForDay = attendance.filter((r) => r.employeeId === employeeId && r.date === date);
      if (isSupabase()) {
        for (const rec of allForDay) { try { await deleteAttendanceRecordDb(rec.id); } catch {} }
      }
      setAttendance((prev) => {
        const updated = prev.filter((r) => !(r.employeeId === employeeId && r.date === date));
        localStorage.setItem(ATT_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }

  function calcInventory(exps: ExpenseEntry[], recs: ReceiptEntry[], adjs: InventoryAdjustment[]) {
    const inv: Record<string, number> = {};
    // 1. defaults
    defaults.forEach((d) => { inv[makeKey(d.category, d.thickness)] = d.quantity; });

    // 2. Find the LATEST adjustment per position
    const latestAdj = new Map<string, InventoryAdjustment>();
    adjs.forEach((a) => {
      const key = makeKey(a.category, a.thickness);
      const existing = latestAdj.get(key);
      if (!existing || a.createdAt > existing.createdAt) {
        latestAdj.set(key, a);
      }
    });

    // 3. Apply adjustments as BASE (only receipts/expenses AFTER the adj date count)
    latestAdj.forEach((a, key) => {
      inv[key] = a.quantity;
    });

    // 4. Receipts AFTER the adjustment date
    recs.forEach((r) => {
      const key = makeKey(r.category, r.thickness);
      const adj = latestAdj.get(key);
      if (!adj || r.date > adj.date || (r.date === adj.date && r.createdAt > adj.createdAt)) {
        inv[key] = (inv[key] || 0) + r.quantity;
      }
    });

    // 5. Expenses AFTER the adjustment date
    exps.forEach((e) => {
      const key = makeKey(e.category, e.thickness);
      const adj = latestAdj.get(key);
      if (!adj || e.date > adj.date || (e.date === adj.date && e.createdAt > adj.createdAt)) {
        inv[key] = (inv[key] || 0) - (e.category === 'sheet' ? 1 : e.weight);
      }
    });

    return inv;
  }

  function getInventory() { return calcInventory(expenses, receipts, adjustments); }
  
  function getInventoryOnDate(targetDate: string) {
    return calcInventory(
      expenses.filter((e) => e.date <= targetDate),
      receipts.filter((r) => r.date <= targetDate),
      adjustments.filter((a) => a.date <= targetDate)
    );
  }

  function getTodayExpenses() { return expenses.filter((e) => e.date === new Date().toISOString().split('T')[0]); }
  function getMonthlyExpenses(y: number, m: number) { return expenses.filter((e) => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m; }); }
  function getMonthlyReceipts(y: number, m: number) { return receipts.filter((r) => { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m; }); }

  return { expenses, receipts, adjustments, loading, syncStatus, addExpense, addReceipt, addAdjustment, deleteExpense, deleteReceipt, deleteAdjustment, getInventory, getInventoryOnDate, getTodayExpenses, getMonthlyExpenses, getMonthlyReceipts, employees, attendance, addEmployee, editEmployee, removeEmployee, setAttendanceRecord, clearAttendanceRecord, loadAttendanceForMonth };
}

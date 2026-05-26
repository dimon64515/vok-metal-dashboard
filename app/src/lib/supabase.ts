import type { ExpenseEntry, ReceiptEntry, InventoryAdjustment, Employee, AttendanceRecord, AttendanceStatus } from '@/types';

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_KEY_KEY = 'supabase_anon_key';

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL,
    anonKey: localStorage.getItem(SUPABASE_KEY_KEY) || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function setSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, anonKey);
}

export function hasSupabaseConfig(): boolean {
  const cfg = getSupabaseConfig();
  return !!cfg.url && !!cfg.anonKey;
}

export function getDefaultSupabaseConfig() {
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

export function resetSupabaseClient() {
  // no-op: client is created per-request now
}

function getHeaders(): Record<string, string> {
  const cfg = getSupabaseConfig();
  return {
    'apikey': cfg.anonKey,
    'Authorization': `Bearer ${cfg.anonKey}`,
    'Content-Type': 'application/json',
  };
}

function getBaseUrl(): string {
  const cfg = getSupabaseConfig();
  return `${cfg.url}/rest/v1`;
}

async function supaFetch(endpoint: string, opts?: RequestInit) {
  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...getHeaders(), ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(text);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Database types
export interface DbExpense {
  id: string;
  date: string;
  category: 'coil' | 'strip' | 'sheet';
  thickness: number;
  area: number;
  weight: number;
  note: string | null;
  created_at: string;
}

export interface DbReceipt {
  id: string;
  date: string;
  category: 'coil' | 'strip' | 'sheet';
  thickness: number;
  quantity: number;
  note: string | null;
  created_at: string;
}

function dbToExpense(db: DbExpense): ExpenseEntry {
  return {
    id: db.id,
    date: db.date,
    category: db.category,
    thickness: db.thickness,
    area: db.area,
    weight: db.weight,
    note: db.note || undefined,
    createdAt: new Date(db.created_at).getTime(),
  };
}

function dbToReceipt(db: DbReceipt): ReceiptEntry {
  return {
    id: db.id,
    date: db.date,
    category: db.category,
    thickness: db.thickness,
    quantity: db.quantity,
    note: db.note || undefined,
    createdAt: new Date(db.created_at).getTime(),
  };
}

export async function fetchExpenses(): Promise<ExpenseEntry[]> {
  try {
    const data = await supaFetch('/expenses?select=*&order=created_at.desc') as DbExpense[];
    return (data || []).map(dbToExpense);
  } catch (err) {
    console.error('fetchExpenses error:', err);
    return [];
  }
}

export async function fetchReceipts(): Promise<ReceiptEntry[]> {
  try {
    const data = await supaFetch('/receipts?select=*&order=created_at.desc') as DbReceipt[];
    return (data || []).map(dbToReceipt);
  } catch (err) {
    console.error('fetchReceipts error:', err);
    return [];
  }
}

export async function insertExpense(
  entry: Omit<ExpenseEntry, 'id' | 'createdAt'>
): Promise<ExpenseEntry | null> {
  try {
    const data = await supaFetch('/expenses?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        date: entry.date,
        category: entry.category,
        thickness: entry.thickness,
        area: entry.area,
        weight: entry.weight,
        note: entry.note || null,
      }),
    }) as DbExpense[];
    return data && data[0] ? dbToExpense(data[0]) : null;
  } catch (err) {
    console.error('insertExpense error:', err);
    return null;
  }
}

export async function insertReceipt(
  entry: Omit<ReceiptEntry, 'id' | 'createdAt'>
): Promise<ReceiptEntry | null> {
  try {
    const data = await supaFetch('/receipts?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        date: entry.date,
        category: entry.category,
        thickness: entry.thickness,
        quantity: entry.quantity,
        note: entry.note || null,
      }),
    }) as DbReceipt[];
    return data && data[0] ? dbToReceipt(data[0]) : null;
  } catch (err) {
    console.error('insertReceipt error:', err);
    return null;
  }
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    await supaFetch(`/expenses?id=eq.${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('deleteExpense error:', err);
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  try {
    await supaFetch(`/receipts?id=eq.${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('deleteReceipt error:', err);
  }
}

export interface DbAdjustment {
  id: string;
  date: string;
  category: 'coil' | 'strip' | 'sheet';
  thickness: number;
  quantity: number;
  note: string | null;
  created_at: string;
}

function dbToAdjustment(db: DbAdjustment): InventoryAdjustment {
  return {
    id: db.id,
    date: db.date,
    category: db.category,
    thickness: db.thickness,
    quantity: db.quantity,
    note: db.note || undefined,
    createdAt: new Date(db.created_at).getTime(),
  };
}

export async function fetchAdjustments(): Promise<InventoryAdjustment[]> {
  try {
    const data = await supaFetch('/adjustments?select=*&order=created_at.desc') as DbAdjustment[];
    return (data || []).map(dbToAdjustment);
  } catch (err) {
    console.error('fetchAdjustments error:', err);
    return [];
  }
}

export async function insertAdjustment(
  entry: Omit<InventoryAdjustment, 'id' | 'createdAt'>
): Promise<InventoryAdjustment> {
  const data = await supaFetch('/adjustments?select=*', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      date: entry.date,
      category: entry.category,
      thickness: entry.thickness,
      quantity: entry.quantity,
      note: entry.note || null,
    }),
  }) as DbAdjustment[];
  if (!data || !data[0]) throw new Error('Insert failed');
  return dbToAdjustment(data[0]);
}

export async function deleteAdjustment(id: string): Promise<void> {
  try {
    await supaFetch(`/adjustments?id=eq.${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('deleteAdjustment error:', err);
  }
}

// ===== EMPLOYEES =====

function dbToEmployee(db: Record<string, unknown>): Employee {
  return {
    id: db.id as string,
    name: db.name as string,
    hourlyRate: db.hourly_rate as number,
    nightHourlyRate: (db.night_hourly_rate as number) ?? (db.hourly_rate as number),
    dayShiftHours: db.day_shift_hours as number,
    nightShiftHours: db.night_shift_hours as number,
    active: db.active as boolean,
    createdAt: new Date(db.created_at as string).getTime(),
  };
}

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const data = await supaFetch('/employees?select=*&order=created_at.asc') as Record<string, unknown>[];
    return (data || []).map(dbToEmployee);
  } catch (err) {
    console.error('fetchEmployees error:', err);
    return [];
  }
}

export async function insertEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  const data = await supaFetch('/employees?select=*', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name: emp.name,
      hourly_rate: emp.hourlyRate,
      night_hourly_rate: emp.nightHourlyRate,
      day_shift_hours: emp.dayShiftHours,
      night_shift_hours: emp.nightShiftHours,
      active: emp.active,
    }),
  }) as Record<string, unknown>[];
  if (!data || !data[0]) throw new Error('Insert employee failed');
  return dbToEmployee(data[0]);
}

export async function updateEmployee(id: string, changes: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<void> {
  const db: Record<string, unknown> = {};
  if (changes.name !== undefined) db.name = changes.name;
  if (changes.hourlyRate !== undefined) db.hourly_rate = changes.hourlyRate;
  if (changes.nightHourlyRate !== undefined) db.night_hourly_rate = changes.nightHourlyRate;
  if (changes.dayShiftHours !== undefined) db.day_shift_hours = changes.dayShiftHours;
  if (changes.nightShiftHours !== undefined) db.night_shift_hours = changes.nightShiftHours;
  if (changes.active !== undefined) db.active = changes.active;
  await supaFetch(`/employees?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(db),
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await supaFetch(`/employees?id=eq.${id}`, { method: 'DELETE' });
  } catch {}
}

// ===== ATTENDANCE =====

function dbToAttendance(db: Record<string, unknown>): AttendanceRecord {
  return {
    id: db.id as string,
    employeeId: db.employee_id as string,
    date: db.date as string,
    status: db.status as AttendanceStatus,
    hours: db.hours as number,
    note: (db.note as string) || undefined,
    createdAt: new Date(db.created_at as string).getTime(),
  };
}

export async function fetchAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
  try {
    const mm = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const from = `${year}-${mm}-01`;
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
    const data = await supaFetch(`/attendance?select=*&date=gte.${from}&date=lte.${to}`) as Record<string, unknown>[];
    return (data || []).map(dbToAttendance);
  } catch (err) {
    console.error('fetchAttendance error:', err);
    return [];
  }
}

export async function upsertAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
  const data = await supaFetch('/attendance?select=*', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      employee_id: record.employeeId,
      date: record.date,
      status: record.status,
      hours: record.hours,
      note: record.note || null,
    }),
  }) as Record<string, unknown>[];
  if (!data || !data[0]) throw new Error('Upsert attendance failed');
  return dbToAttendance(data[0]);
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  try {
    await supaFetch(`/attendance?id=eq.${id}`, { method: 'DELETE' });
  } catch {}
}

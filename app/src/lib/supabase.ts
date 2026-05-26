import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ExpenseEntry, ReceiptEntry, InventoryAdjustment, Employee, AttendanceRecord, AttendanceStatus } from '@/types';

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_KEY_KEY = 'supabase_anon_key';

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem(SUPABASE_URL_KEY) || '',
    anonKey: localStorage.getItem(SUPABASE_KEY_KEY) || '',
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

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;
  supabase = createClient(cfg.url, cfg.anonKey, {
    db: { schema: 'public' },
  });
  return supabase;
}

export function resetSupabaseClient() {
  supabase = null;
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
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchExpenses error:', error);
    return [];
  }
  return (data || []).map(dbToExpense);
}

export async function fetchReceipts(): Promise<ReceiptEntry[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchReceipts error:', error);
    return [];
  }
  return (data || []).map(dbToReceipt);
}

export async function insertExpense(
  entry: Omit<ExpenseEntry, 'id' | 'createdAt'>
): Promise<ExpenseEntry | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('expenses')
    .insert({
      date: entry.date,
      category: entry.category,
      thickness: entry.thickness,
      area: entry.area,
      weight: entry.weight,
      note: entry.note || null,
    })
    .select()
    .single();
  if (error || !data) {
    console.error('insertExpense error:', error);
    return null;
  }
  return dbToExpense(data);
}

export async function insertReceipt(
  entry: Omit<ReceiptEntry, 'id' | 'createdAt'>
): Promise<ReceiptEntry | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('receipts')
    .insert({
      date: entry.date,
      category: entry.category,
      thickness: entry.thickness,
      quantity: entry.quantity,
      note: entry.note || null,
    })
    .select()
    .single();
  if (error || !data) {
    console.error('insertReceipt error:', error);
    return null;
  }
  return dbToReceipt(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('expenses').delete().eq('id', id);
  if (error) console.error('deleteExpense error:', error);
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
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('adjustments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchAdjustments error:', error);
    return [];
  }
  return (data || []).map(dbToAdjustment);
}

export async function insertAdjustment(
  entry: Omit<InventoryAdjustment, 'id' | 'createdAt'>
): Promise<InventoryAdjustment> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not connected');
  const { data, error } = await client
    .from('adjustments')
    .insert({
      date: entry.date,
      category: entry.category,
      thickness: entry.thickness,
      quantity: entry.quantity,
      note: entry.note || null,
    })
    .select()
    .single();
  if (error || !data) {
    console.error('insertAdjustment error:', error);
    throw new Error(error?.message || 'Insert failed');
  }
  return dbToAdjustment(data);
}

export async function deleteAdjustment(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('adjustments').delete().eq('id', id);
  if (error) console.error('deleteAdjustment error:', error);
}

export async function deleteReceipt(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('receipts').delete().eq('id', id);
  if (error) console.error('deleteReceipt error:', error);
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
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('employees').select('*').order('created_at', { ascending: true });
  if (error) { console.error('fetchEmployees error:', error); return []; }
  return (data || []).map(dbToEmployee);
}

export async function insertEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not connected');
  const { data, error } = await client
    .from('employees')
    .insert({ name: emp.name, hourly_rate: emp.hourlyRate, night_hourly_rate: emp.nightHourlyRate, day_shift_hours: emp.dayShiftHours, night_shift_hours: emp.nightShiftHours, active: emp.active })
    .select().single();
  if (error || !data) throw new Error(error?.message || 'Insert employee failed');
  return dbToEmployee(data);
}

export async function updateEmployee(id: string, changes: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const db: Record<string, unknown> = {};
  if (changes.name !== undefined) db.name = changes.name;
  if (changes.hourlyRate !== undefined) db.hourly_rate = changes.hourlyRate;
  if (changes.nightHourlyRate !== undefined) db.night_hourly_rate = changes.nightHourlyRate;
  if (changes.dayShiftHours !== undefined) db.day_shift_hours = changes.dayShiftHours;
  if (changes.nightShiftHours !== undefined) db.night_shift_hours = changes.nightShiftHours;
  if (changes.active !== undefined) db.active = changes.active;
  const { error } = await client.from('employees').update(db).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('employees').delete().eq('id', id);
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
  const client = getSupabase();
  if (!client) return [];
  const mm = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  const from = `${year}-${mm}-01`;
  const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await client
    .from('attendance').select('*').gte('date', from).lte('date', to);
  if (error) { console.error('fetchAttendance error:', error); return []; }
  return (data || []).map(dbToAttendance);
}

export async function upsertAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not connected');
  const { data, error } = await client
    .from('attendance')
    .upsert(
      { employee_id: record.employeeId, date: record.date, status: record.status, hours: record.hours, note: record.note || null },
      { onConflict: 'employee_id,date,status' }
    )
    .select().single();
  if (error || !data) throw new Error(error?.message || 'Upsert attendance failed');
  return dbToAttendance(data);
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('attendance').delete().eq('id', id);
}

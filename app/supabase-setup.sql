-- SQL для создания таблиц в Supabase
-- Выполните это в SQL Editor вашего проекта Supabase

-- Таблица расхода металла
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coil', 'strip', 'sheet')),
  thickness REAL NOT NULL,
  area REAL NOT NULL,
  weight REAL NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица прихода на склад
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coil', 'strip', 'sheet')),
  thickness REAL NOT NULL,
  quantity REAL NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица корректировок остатков
-- Хранит ЖЕЛАЕМЫЙ остаток (не дельту!)
CREATE TABLE IF NOT EXISTS adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coil', 'strip', 'sheet')),
  thickness REAL NOT NULL,
  quantity REAL NOT NULL,  -- Это желаемый остаток, например 4860
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_adjustments_date ON adjustments(date);
CREATE INDEX IF NOT EXISTS idx_adjustments_category ON adjustments(category);

-- Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;

-- Политика: разрешить все операции (публичный доступ)
CREATE POLICY "Allow all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON adjustments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ТАБЛИЦЫ ДЛЯ УЧЁТА РАБОЧЕГО ВРЕМЕНИ
-- ============================================

-- Сотрудники
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_rate REAL NOT NULL DEFAULT 0,
  night_hourly_rate REAL NOT NULL DEFAULT 0,
  day_shift_hours REAL NOT NULL DEFAULT 8,
  night_shift_hours REAL NOT NULL DEFAULT 12,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON employees FOR ALL USING (true) WITH CHECK (true);

-- Табель посещаемости
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('day', 'night', 'absent', 'holiday', 'sick')),
  hours REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date, status)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);

-- Migration for existing tables: change unique constraint from (employee_id, date) to (employee_id, date, status)
DO $$
BEGIN
  ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_date_key;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_employee_id_date_status_key'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_employee_id_date_status_key UNIQUE(employee_id, date, status);
  END IF;
END $$;

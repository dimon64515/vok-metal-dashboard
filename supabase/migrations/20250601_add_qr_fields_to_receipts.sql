-- Миграция: добавляем поля для QR-сканера в таблицу receipts
-- Запустите это в Supabase Dashboard → SQL Editor → New query → Run

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS batch_id text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS grade text;

-- Индекс для быстрой проверки дубликатов по номеру плавки
CREATE INDEX IF NOT EXISTS idx_receipts_batch_id ON receipts(batch_id);

-- Разрешаем PostgREST видеть новые колонки (обычно не требуется, но на всякий случай)
NOTIFY pgrst, 'reload schema';

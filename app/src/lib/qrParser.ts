import { getSupabaseConfig } from './supabase';
import type { CategoryType } from '@/types';

export interface QrParseResult {
  category?: CategoryType;
  thickness?: number;
  quantity?: number;
  batchId?: string;
  grade?: string;
  sourceUrl?: string;
  note?: string;
  raw: string;
  fallback?: boolean;
  message?: string;
}

function detectCategory(text: string): CategoryType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('рулон') || lower.includes('бухта') || lower.includes('coil')) return 'coil';
  if (lower.includes('лист') || lower.includes('sheet') || lower.includes('плита')) return 'sheet';
  if (lower.includes('полоса') || lower.includes('штрипс') || lower.includes('strip')) return 'strip';
  return undefined;
}

function extractField(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    // Match patterns like "Label : value", "Label: value", "Label(value):value"
    const regex = new RegExp(
      `${label}\\s*[:：]\\s*(.+?)(?=\\n|$)`,
      'i'
    );
    const match = text.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parseNumber(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function extractUrl(text: string): string | undefined {
  const urlMatch = text.match(/(https?:\/\/[^\s\n]+)/i);
  return urlMatch ? urlMatch[1].trim() : undefined;
}

export function parseTextQr(raw: string): QrParseResult {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const thickness = parseNumber(extractField(text, ['Толщина \\([^)]*\\)', 'Толщина']));
  const netWeight = parseNumber(extractField(text, ['Масса нетто \\([^)]*\\)', 'Масса нетто', 'Net weight']));
  const grossWeight = parseNumber(extractField(text, ['Масса брутто \\([^)]*\\)', 'Масса брутто', 'Gross weight']));
  const batchId = extractField(text, ['Номер плавки', 'Плавка', 'Melt number', 'Heat number']);
  const grade = extractField(text, ['Марка', 'Grade', 'Steel grade']);
  const width = extractField(text, ['Ширина \\([^)]*\\)', 'Ширина', 'Width']);
  const length = extractField(text, ['Длина \\([^)]*\\)', 'Длина', 'Length']);
  const idn = extractField(text, ['ИДН', 'IDN']);
  const standard = extractField(text, ['Стандарт', 'Standard', 'ГОСТ']);

  const category = detectCategory(text);
  const sourceUrl = extractUrl(text);

  // Build note from remaining fields
  const noteParts: string[] = [];
  if (width) noteParts.push(`Ширина: ${width} мм`);
  if (length) noteParts.push(`Длина: ${length} м`);
  if (idn) noteParts.push(`ИДН: ${idn}`);
  if (standard) noteParts.push(`Стандарт: ${standard}`);
  if (grossWeight && netWeight) noteParts.push(`Брутто: ${grossWeight} кг`);

  return {
    category,
    thickness,
    quantity: netWeight ?? grossWeight,
    batchId,
    grade,
    sourceUrl,
    note: noteParts.length > 0 ? noteParts.join(', ') : undefined,
    raw,
  };
}

export async function parseUrlQr(url: string): Promise<QrParseResult> {
  const cfg = getSupabaseConfig();
  if (!cfg.url) {
    throw new Error('Supabase не настроен');
  }

  try {
    const res = await fetch(`${cfg.url}/functions/v1/parse-nlmk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.anonKey}`,
        'apikey': cfg.anonKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`Edge Function error: ${text}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      category: detectCategory(JSON.stringify(data)) || data.category,
      thickness: parseNumber(String(data.thickness ?? '')),
      quantity: parseNumber(String(data.quantity ?? data.netWeight ?? data.weight ?? '')),
      batchId: data.batchId || data.meltNumber || data.heatNumber,
      grade: data.grade || data.steelGrade,
      sourceUrl: url,
      note: data.note,
      raw: url,
      fallback: data.fallback || false,
      message: data.message,
    };
  } catch (err) {
    console.error('parseUrlQr error:', err);
    // Fallback: return just the URL so user can open it manually
    return {
      sourceUrl: url,
      raw: url,
    };
  }
}

export async function parseQrContent(raw: string): Promise<QrParseResult> {
  const trimmed = raw.trim();
  const urlRegex = /^https?:\/\//i;

  if (urlRegex.test(trimmed)) {
    return parseUrlQr(trimmed);
  }

  return parseTextQr(trimmed);
}

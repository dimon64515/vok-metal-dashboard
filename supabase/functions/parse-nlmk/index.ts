import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface ParseRequest {
  url: string;
}

function extractFromHtml(html: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Remove scripts and styles for cleaner text
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const text = clean;

  // Common Russian field patterns
  const patterns = [
    { key: 'thickness', regexes: [/Толщина\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Thickness\s*[:\-]?\s*(\d+[.,]?\d*)/i] },
    { key: 'width', regexes: [/Ширина\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Width\s*[:\-]?\s*(\d+[.,]?\d*)/i] },
    { key: 'length', regexes: [/Длина\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Length\s*[:\-]?\s*(\d+[.,]?\d*)/i] },
    { key: 'netWeight', regexes: [/Масса\s*нетто\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Net\s*weight\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Вес\s*нетто\s*[:\-]?\s*(\d+[.,]?\d*)/i] },
    { key: 'grossWeight', regexes: [/Масса\s*брутто\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Gross\s*weight\s*[:\-]?\s*(\d+[.,]?\d*)/i, /Вес\s*брутто\s*[:\-]?\s*(\d+[.,]?\d*)/i] },
    { key: 'meltNumber', regexes: [/Номер\s*плавки\s*[:\-]?\s*([A-Z0-9\-]+)/i, /Плавка\s*[:\-]?\s*([A-Z0-9\-]+)/i, /Heat\s*[:\-]?\s*([A-Z0-9\-]+)/i, /Melt\s*[:\-]?\s*([A-Z0-9\-]+)/i] },
    { key: 'grade', regexes: [/Марка\s*[:\-]?\s*([A-Z0-9А-Яа-я\-]+)/i, /Grade\s*[:\-]?\s*([A-Z0-9\-]+)/i, /Steel\s*grade\s*[:\-]?\s*([A-Z0-9\-]+)/i] },
    { key: 'standard', regexes: [/Стандарт\s*[:\-]?\s*(ГОСТ\s*[0-9\-]+)/i, /Standard\s*[:\-]?\s*([A-Z0-9\-]+)/i] },
    { key: 'idn', regexes: [/ИДН\s*[:\-]?\s*(\d+)/i] },
    { key: 'category', regexes: [/Рулон/i, /Лист/i, /Полоса/i, /Штрипс/i] },
  ];

  for (const { key, regexes } of patterns) {
    for (const regex of regexes) {
      const match = text.match(regex);
      if (match) {
        result[key] = match[1]?.trim() || match[0]?.trim() || '';
        break;
      }
    }
  }

  // Try to find any table-like key-value pairs
  const kvPattern = /([А-ЯA-Z][А-Яа-яA-Za-z\s()]+?)[:\-]\s*([^\n]{1,100})/g;
  let m;
  while ((m = kvPattern.exec(text)) !== null) {
    const k = m[1].trim();
    const v = m[2].trim();
    if (k.length > 2 && v.length > 0 && v.length < 100) {
      const lower = k.toLowerCase();
      if (!result.thickness && lower.includes('толщин')) result.thickness = v;
      if (!result.netWeight && (lower.includes('нетто') || lower.includes('net'))) result.netWeight = v;
      if (!result.grossWeight && (lower.includes('брутто') || lower.includes('gross'))) result.grossWeight = v;
      if (!result.meltNumber && (lower.includes('плавк') || lower.includes('melt'))) result.meltNumber = v;
      if (!result.grade && (lower.includes('марк') || lower.includes('grade'))) result.grade = v;
    }
  }

  return result;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = (await req.json()) as ParseRequest;
    const url = body?.url;

    if (!url || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Fetch with redirect following
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Fetch failed: ${response.status} ${response.statusText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const html = await response.text();
    const extracted = extractFromHtml(html);

    // Build response with normalized keys
    const result: Record<string, unknown> = {
      sourceUrl: url,
      rawHtmlLength: html.length,
      ...extracted,
    };

    // Normalize category
    if (extracted.category) {
      const cat = extracted.category.toLowerCase();
      if (cat.includes('рулон') || cat.includes('бухта')) result.category = 'coil';
      else if (cat.includes('лист')) result.category = 'sheet';
      else if (cat.includes('полоса') || cat.includes('штрипс')) result.category = 'strip';
    }

    // Normalize numeric fields
    const toNum = (v: string | undefined) => {
      if (!v) return undefined;
      const n = parseFloat(v.replace(',', '.'));
      return isNaN(n) ? undefined : n;
    };

    if (extracted.thickness) result.thickness = toNum(extracted.thickness);
    if (extracted.netWeight) result.quantity = toNum(extracted.netWeight);
    if (extracted.grossWeight && !result.quantity) result.quantity = toNum(extracted.grossWeight);
    if (extracted.width) result.width = toNum(extracted.width);
    if (extracted.length) result.length = toNum(extracted.length);

    // Build note from remaining fields
    const noteParts: string[] = [];
    if (extracted.width) noteParts.push(`Ширина: ${extracted.width} мм`);
    if (extracted.length) noteParts.push(`Длина: ${extracted.length} м`);
    if (extracted.standard) noteParts.push(`Стандарт: ${extracted.standard}`);
    if (extracted.idn) noteParts.push(`ИДН: ${extracted.idn}`);
    if (extracted.grossWeight && extracted.netWeight) noteParts.push(`Брутто: ${extracted.grossWeight} кг`);
    if (noteParts.length) result.note = noteParts.join(', ');

    // Map meltNumber to batchId
    if (extracted.meltNumber) {
      result.batchId = extracted.meltNumber;
      result.meltNumber = extracted.meltNumber;
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});

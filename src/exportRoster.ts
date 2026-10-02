import {
  deltaWord,
  fill,
  fmtNum,
  formatDelta,
  formatDay,
  formatHours,
  formatMonth,
  personName,
  personRole,
  shiftGlyph,
  shiftName,
  t,
  weekdayShort,
  type Lang,
} from './i18n';
import { cellKey, isWeekend } from './model';
import type { StaffStats } from './model';
import type { AssignmentMap, Coverage, ShiftCode, Staff } from './types';
import { SHIFT_META } from './types';

export type ExportModel = {
  lang: Lang;
  place: string;
  teamName: string;
  month: string;
  staff: Staff[];
  days: string[];
  assignments: AssignmentMap;
  stats: StaffStats[];
  fairness: number;
  gaps: number;
  min: Coverage;
  target: Coverage;
};

const FONT = 'Inter, "Noto Sans Khmer", sans-serif';

export async function ensureRosterFonts() {
  await Promise.all([
    document.fonts.load(`700 28px ${FONT}`),
    document.fonts.load(`600 14px ${FONT}`),
    document.fonts.load('700 18px "Noto Sans Khmer"'),
    document.fonts.load('400 22px "Noto Serif Khmer"'),
  ]);
  await document.fonts.ready;
}

export function rosterCaption(model: ExportModel): string {
  const { lang } = model;
  const lines = [
    `${lang === 'km' ? 'កាលវិភាគ' : 'Duty roster'} · ${formatMonth(model.month, lang)}`,
    `${model.place} · ${model.teamName}`,
    `${t(lang, 'fairness')} ${fmtNum(model.fairness, lang)}`,
  ];
  if (model.gaps > 0) lines.push(fill(t(lang, 'gapSome'), { n: fmtNum(model.gaps, lang) }));
  lines.push(
    model.staff
      .map((person) => {
        const row = model.stats.find((item) => item.staffId === person.id);
        return `${personName(person, lang)} ${formatHours(row?.hours ?? 0, lang)}`;
      })
      .join(' · '),
  );
  return lines.join('\n');
}

export function rosterPlainText(model: ExportModel): string {
  const { lang } = model;
  const lines = [rosterCaption(model), ''];
  for (const date of model.days) {
    lines.push(formatDay(date, lang));
    for (const shift of ['M', 'A', 'N'] as const) {
      const names = model.staff
        .filter((person) => model.assignments[cellKey(person.id, date)] === shift)
        .map((person) => personName(person, lang));
      lines.push(
        `  ${shiftName(shift, lang)} (${fmtNum(names.length, lang)}) ${names.join(', ') || '—'}`,
      );
    }
    const away = model.staff
      .filter((person) => {
        const code = model.assignments[cellKey(person.id, date)];
        return code === 'L' || code === 'T';
      })
      .map((person) => `${personName(person, lang)} ${shiftName(model.assignments[cellKey(person.id, date)] ?? 'L', lang)}`);
    if (away.length) lines.push(`  ${away.join(', ')}`);
  }
  return lines.join('\n');
}

export function fileStem(teamId: string, month: string): string {
  return `vien-${teamId}-${month}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function clipText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

export async function renderRosterCanvas(model: ExportModel): Promise<HTMLCanvasElement> {
  await ensureRosterFonts();
  const pad = 32;
  const nameW = 268;
  const hourW = 86;
  const cellW = 46;
  const titleH = 108;
  const headH = 54;
  const rowH = 40;
  const footH = 78;
  const width = pad * 2 + nameW + hourW + model.days.length * cellW;
  const height = pad * 2 + titleH + headH + model.staff.length * rowH + footH;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f7f3eb';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1c2433';
  ctx.fillRect(0, 0, width, 8);

  ctx.fillStyle = '#243556';
  roundRect(ctx, pad, pad, 36, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#f0c14a';
  ctx.font = `400 20px "Noto Serif Khmer", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('វ', pad + 18, pad + 19);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#1c2433';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('Vien', pad + 48, pad + 24);
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = '#5c5348';
  ctx.fillText(t(model.lang, 'appKhmer'), pad + 112, pad + 22);

  ctx.font = `600 16px ${FONT}`;
  ctx.fillStyle = '#1e1a16';
  ctx.fillText(`${model.place} · ${model.teamName}`, pad, pad + 62);
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = '#5c5348';
  const summary = `${formatMonth(model.month, model.lang)} · ${t(model.lang, 'fairness')} ${fmtNum(model.fairness, model.lang)} · ${t(model.lang, 'minLabel')} ${fmtNum(model.min.M, model.lang)}/${fmtNum(model.min.A, model.lang)}/${fmtNum(model.min.N, model.lang)}`;
  ctx.fillText(summary, pad, pad + 86);

  const tableX = pad;
  const tableY = pad + titleH;
  const gridX = tableX + nameW + hourW;

  model.days.forEach((date, index) => {
    const x = gridX + index * cellW;
    ctx.fillStyle = dateEndsWeekend(date) ? '#efe4d4' : '#f7f3eb';
    ctx.fillRect(x, tableY, cellW, headH + model.staff.length * rowH);
  });

  ctx.strokeStyle = '#e4d9c8';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, tableY, nameW + hourW + model.days.length * cellW, headH + model.staff.length * rowH);

  ctx.fillStyle = '#1e1a16';
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(t(model.lang, 'staff'), tableX + 12, tableY + 32);
  ctx.textAlign = 'right';
  ctx.fillText(t(model.lang, 'hours'), tableX + nameW + hourW - 12, tableY + 32);

  model.days.forEach((date, index) => {
    const x = gridX + index * cellW + cellW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = isWeekend(date) ? '#8a4b28' : '#1e1a16';
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(fmtNum(Number(date.slice(8)), model.lang), x, tableY + 22);
    ctx.font = `500 11px ${FONT}`;
    ctx.fillStyle = '#6d645b';
    ctx.fillText(weekdayShort(date, model.lang), x, tableY + 40);
  });

  model.staff.forEach((person, row) => {
    const y = tableY + headH + row * rowH;
    const stats = model.stats.find((item) => item.staffId === person.id);
    ctx.fillStyle = row % 2 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(90, 60, 30, 0.03)';
    ctx.fillRect(tableX, y, nameW + hourW, rowH);
    ctx.fillStyle = '#1e1a16';
    ctx.textAlign = 'left';
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(clipText(ctx, personName(person, model.lang), nameW - 24), tableX + 12, y + 17);
    ctx.fillStyle = '#6d645b';
    ctx.font = `500 11px ${FONT}`;
    const secondary = model.lang === 'km' ? person.nameEn : person.nameKm;
    ctx.fillText(clipText(ctx, `${personRole(person, model.lang)} · ${secondary}`, nameW - 24), tableX + 12, y + 32);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1e1a16';
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(formatHours(stats?.hours ?? 0, model.lang), tableX + nameW + hourW - 12, y + 17);
    const delta = stats?.delta ?? 0;
    ctx.fillStyle = Math.abs(Math.round(delta)) <= 8 ? '#2f6b45' : delta > 0 ? '#a33b24' : '#8a5a10';
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(
      `${formatDelta(delta, model.lang)} ${deltaWord(delta, model.lang)}`,
      tableX + nameW + hourW - 12,
      y + 32,
    );

    model.days.forEach((date, index) => {
      const code = model.assignments[cellKey(person.id, date)];
      const x = gridX + index * cellW;
      if (!code || code === 'O') {
        ctx.fillStyle = '#8a8175';
        ctx.font = `500 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(code === 'O' ? '–' : '', x + cellW / 2, y + 24);
        return;
      }
      const meta = SHIFT_META[code];
      roundRect(ctx, x + 4, y + 6, cellW - 8, rowH - 12, 6);
      ctx.fillStyle = meta.bg;
      ctx.fill();
      ctx.fillStyle = meta.fg;
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shiftGlyph(code, model.lang), x + cellW / 2, y + rowH / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    });
  });

  const legendY = tableY + headH + model.staff.length * rowH + 28;
  const legend = (['M', 'A', 'N', 'L', 'T', 'O'] as ShiftCode[]).map((code) => ({
    code,
    label: `${shiftName(code, model.lang)}${SHIFT_META[code].hours ? ` ${formatHours(SHIFT_META[code].hours, model.lang)}` : ''}`,
  }));
  let cursor = pad;
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const item of legend) {
    const meta = SHIFT_META[item.code];
    roundRect(ctx, cursor, legendY - 10, 18, 18, 4);
    ctx.fillStyle = item.code === 'O' ? '#f7f3eb' : meta.bg;
    ctx.fill();
    if (item.code === 'O') {
      ctx.strokeStyle = '#c8bba8';
      ctx.stroke();
    }
    ctx.fillStyle = item.code === 'O' ? '#5c5348' : meta.fg;
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(shiftGlyph(item.code, model.lang), cursor + 9, legendY + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3f382f';
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText(item.label, cursor + 24, legendY + 1);
    cursor += 24 + ctx.measureText(item.label).width + 18;
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6d645b';
  ctx.font = `500 12px ${FONT}`;
  ctx.fillText(t(model.lang, 'generated'), width - pad, legendY + 1);
  ctx.textBaseline = 'alphabetic';
  return canvas;
}

function dateEndsWeekend(date: string): boolean {
  return isWeekend(date);
}

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png');
  return blob;
}

export async function canvasToPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const rgb = new Uint8Array(width * height * 3);
  for (let source = 0, target = 0; source < image.data.length; source += 4, target += 3) {
    rgb[target] = image.data[source];
    rgb[target + 1] = image.data[source + 1];
    rgb[target + 2] = image.data[source + 2];
  }
  const compressed = await deflate(rgb);
  return buildPdf(width, height, compressed);
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([asBuffer(bytes)]).stream().pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function buildPdf(width: number, height: number, image: Uint8Array): Blob {
  const pageW = 1191;
  const pageH = 842;
  const margin = 36;
  const scale = Math.min((pageW - margin * 2) / width, (pageH - margin * 2) / height);
  const dw = +(width * scale).toFixed(2);
  const dh = +(height * scale).toFixed(2);
  const x = +((pageW - dw) / 2).toFixed(2);
  const y = +((pageH - dh) / 2).toFixed(2);
  const content = `q\n${dw} 0 0 ${dh} ${x} ${y} cm\n/Im0 Do\nQ\n`;
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  const objects: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Count 1 /Kids [3 0 R] >>'],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`,
    ],
    [`<< /Length ${contentBytes.length} >>\nstream\n`, contentBytes, '\nendstream'],
    [
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`,
      image,
      '\nendstream',
    ],
  ];

  const chunks: BlobPart[] = [];
  let pos = 0;
  const push = (piece: string | Uint8Array) => {
    const bytes = typeof piece === 'string' ? encoder.encode(piece) : piece;
    const copy = asBuffer(bytes);
    chunks.push(copy);
    pos += copy.byteLength;
  };
  push('%PDF-1.4\n');
  const offsets = [0];
  objects.forEach((pieces, index) => {
    offsets.push(pos);
    push(`${index + 1} 0 obj\n`);
    pieces.forEach(push);
    push('\nendobj\n');
  });
  const xref = pos;
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    table += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  push(table);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

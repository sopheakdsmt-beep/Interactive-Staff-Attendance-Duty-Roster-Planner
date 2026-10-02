import { Fragment, useEffect, useRef, useState } from 'react';
import {
  fmtNum,
  formatDelta,
  formatHours,
  personName,
  shiftGlyph,
  shiftName,
  t,
  weekdayShort,
  type Lang,
} from './i18n';
import { cellKey, isWeekend, type StaffStats } from './model';
import type { AssignmentMap, CellRef, Coverage, ShiftCode, Staff } from './types';
import { SHIFT_META } from './types';

export type Brush = ShiftCode | 'clear' | null;

type DragState =
  | { kind: 'brush'; code: ShiftCode | 'clear'; x: number; y: number; over: CellRef | null }
  | { kind: 'cell'; cell: CellRef; code: ShiftCode; x: number; y: number; over: CellRef | null };

type Props = {
  lang: Lang;
  staff: Staff[];
  days: string[];
  assignments: AssignmentMap;
  stats: StaffStats[];
  min: Coverage;
  target: Coverage;
  violations: { staffId: string; date: string }[];
  coverage: Record<string, Coverage>;
  selected: CellRef | null;
  brush: Brush;
  today: string;
  status: string;
  scrollDate: string | null;
  scrollToken: number;
  onSelect: (cell: CellRef | null) => void;
  onBrush: (brush: Brush) => void;
  onCommitCells: (edits: { staffId: string; date: string; code: ShiftCode | null }[]) => void;
  onSwap: (src: CellRef, dst: CellRef) => void;
  onInspect: (staffId: string) => void;
};

const TOOLS: (ShiftCode | 'clear')[] = ['M', 'A', 'N', 'L', 'T', 'O', 'clear'];

function ghostStyle(drag: DragState): { background: string; color: string; glyph: ShiftCode | 'clear' } {
  const glyph = drag.kind === 'brush' ? drag.code : drag.code;
  if (glyph === 'clear') return { background: '#f7f3eb', color: '#1e1a16', glyph };
  return { background: SHIFT_META[glyph].bg, color: SHIFT_META[glyph].fg, glyph };
}

function hitCell(x: number, y: number): CellRef | null {
  const node = document.elementFromPoint(x, y);
  const cell = node?.closest<HTMLElement>('[data-cell]');
  const staffId = cell?.dataset.staff;
  const date = cell?.dataset.date;
  if (!staffId || !date) return null;
  return { staffId, date };
}

export function Planner(props: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const cleanupRef = useRef<(() => void) | null>(null);
  const draggingRef = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [paintKeys, setPaintKeys] = useState<Set<string>>(new Set());

  useEffect(() => () => cleanupRef.current?.(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const block = (event: TouchEvent) => {
      if (draggingRef.current) event.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  useEffect(() => {
    if (!props.scrollDate) return;
    const target = scrollRef.current?.querySelector(`[data-date="${props.scrollDate}"]`);
    target?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [props.scrollDate, props.scrollToken]);

  const autoScroll = (x: number, y: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const edge = 56;
    if (x < rect.left + edge) el.scrollLeft -= 18;
    else if (x > rect.right - edge) el.scrollLeft += 18;
    if (y < rect.top + edge) el.scrollTop -= 14;
    else if (y > rect.bottom - edge) el.scrollTop += 14;
  };

  const track = (move: (event: PointerEvent) => void, up: (event: PointerEvent) => void) => {
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (cleanupRef.current === stop) cleanupRef.current = null;
    };
    cleanupRef.current?.();
    cleanupRef.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return stop;
  };

  const onCellPointerDown = (event: React.PointerEvent<HTMLButtonElement>, cell: CellRef) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerType = event.pointerType;
    const code = propsRef.current.assignments[cellKey(cell.staffId, cell.date)];
    const brush = propsRef.current.brush;

    if (brush) {
      draggingRef.current = true;
      const visited = new Set<string>([cellKey(cell.staffId, cell.date)]);
      setPaintKeys(new Set(visited));
      const move = (ev: PointerEvent) => {
        autoScroll(ev.clientX, ev.clientY);
        const hit = hitCell(ev.clientX, ev.clientY);
        if (!hit) return;
        const key = cellKey(hit.staffId, hit.date);
        if (visited.has(key)) return;
        visited.add(key);
        setPaintKeys(new Set(visited));
      };
      const up = () => {
        stop();
        draggingRef.current = false;
        setPaintKeys(new Set());
        const paintCode = brush === 'clear' ? null : brush;
        propsRef.current.onCommitCells(
          [...visited].map((key) => {
            const split = key.indexOf('|');
            return { staffId: key.slice(0, split), date: key.slice(split + 1), code: paintCode };
          }),
        );
      };
      const stop = track(move, up);
      return;
    }

    let dragStarted = false;
    let moved = false;
    let timer: number | null = null;

    const startDrag = () => {
      if (!code) return;
      dragStarted = true;
      draggingRef.current = true;
      setDrag({ kind: 'cell', cell, code, x: startX, y: startY, over: cell });
    };

    if (pointerType === 'touch' && code) {
      timer = window.setTimeout(startDrag, 240);
    }

    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!dragStarted && dist > 8) {
        moved = true;
        if (timer) window.clearTimeout(timer);
        if (pointerType !== 'touch') startDrag();
      }
      if (!dragStarted) return;
      autoScroll(ev.clientX, ev.clientY);
      setDrag({
        kind: 'cell',
        cell,
        code: code!,
        x: ev.clientX,
        y: ev.clientY,
        over: hitCell(ev.clientX, ev.clientY),
      });
    };
    const up = (ev: PointerEvent) => {
      if (timer) window.clearTimeout(timer);
      stop();
      draggingRef.current = false;
      if (dragStarted) {
        const hit = hitCell(ev.clientX, ev.clientY);
        setDrag(null);
        if (hit && (hit.staffId !== cell.staffId || hit.date !== cell.date)) propsRef.current.onSwap(cell, hit);
        return;
      }
      if (!moved) propsRef.current.onSelect(cell);
    };
    const stop = track(move, up);
  };

  const onChipPointerDown = (event: React.PointerEvent<HTMLButtonElement>, code: ShiftCode | 'clear') => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!dragging && dist > 6) {
        dragging = true;
        draggingRef.current = true;
      }
      if (!dragging) return;
      autoScroll(ev.clientX, ev.clientY);
      setDrag({ kind: 'brush', code, x: ev.clientX, y: ev.clientY, over: hitCell(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      stop();
      draggingRef.current = false;
      if (dragging) {
        const hit = hitCell(ev.clientX, ev.clientY);
        setDrag(null);
        if (hit) {
          propsRef.current.onCommitCells([
            { staffId: hit.staffId, date: hit.date, code: code === 'clear' ? null : code },
          ]);
        }
        return;
      }
      const current = propsRef.current;
      if (current.brush === code) current.onBrush(null);
      else {
        current.onBrush(code);
        if (current.selected) {
          current.onCommitCells([
            {
              staffId: current.selected.staffId,
              date: current.selected.date,
              code: code === 'clear' ? null : code,
            },
          ]);
        }
      }
    };
    const stop = track(move, up);
  };

  const maxHours = Math.max(...props.stats.map((row) => row.hours), 1);
  const violationKeys = new Set(props.violations.map((item) => cellKey(item.staffId, item.date)));

  return (
    <div className="planner">
      <div className={`scroller ${drag ? 'dragging' : ''}`} ref={scrollRef} data-testid="roster-grid">
        <div
          className="grid"
          role="grid"
          aria-rowcount={props.staff.length + 2}
          aria-colcount={props.days.length + 1}
          style={{
            ['--cols' as string]: String(props.days.length),
            gridTemplateColumns: `var(--rail) repeat(${props.days.length}, minmax(var(--cell), 1fr))`,
            gridTemplateRows: `var(--head) var(--sub) repeat(${props.staff.length}, var(--row))`,
          }}
        >
          <div className="rail head">
            <span>{t(props.lang, 'staff')}</span>
            <span>{t(props.lang, 'hours')}</span>
          </div>
          {props.days.map((date) => (
            <div
              key={date}
              data-date={date}
              className={`day ${isWeekend(date) ? 'weekend' : ''} ${date === props.today ? 'today' : ''}`}
              role="columnheader"
            >
              <b>{fmtNum(Number(date.slice(8)), props.lang)}</b>
              <small>{weekdayShort(date, props.lang)}</small>
            </div>
          ))}
          <div className="rail sub">{t(props.lang, 'coverage')}</div>
          {props.days.map((date) => {
            const cov = props.coverage[date] ?? { M: 0, A: 0, N: 0 };
            return (
              <div
                key={`${date}-cov`}
                className={`cov ${isWeekend(date) ? 'weekend' : ''} ${date === props.today ? 'today' : ''}`}
              >
                {(['M', 'A', 'N'] as const).map((shift) => {
                  const have = cov[shift];
                  const tone = have < props.min[shift] ? 'short' : have < props.target[shift] ? 'thin' : 'ok';
                  return (
                    <i key={shift} className={`${shift.toLowerCase()} ${tone}`}>
                      {fmtNum(have, props.lang)}
                    </i>
                  );
                })}
              </div>
            );
          })}
          {props.staff.map((person) => {
            const row = props.stats.find((item) => item.staffId === person.id);
            const hours = row?.hours ?? 0;
            const delta = row?.delta ?? 0;
            const rounded = Math.round(delta);
            const tone = Math.abs(rounded) <= 8 ? 'even' : rounded > 0 ? 'over' : 'under';
            return (
              <Fragment key={person.id}>
                <button type="button" className="rail person" onClick={() => props.onInspect(person.id)}>
                  <span className="av" style={{ background: `hsl(${person.hue} 42% 36%)` }}>
                    {props.lang === 'km' ? person.nameKm.slice(0, 1) : person.nameEn.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="who">
                    <strong>{personName(person, props.lang)}</strong>
                    <span className={`meter ${tone}`} aria-hidden="true">
                      <span style={{ width: `${Math.round((hours / maxHours) * 100)}%` }} />
                    </span>
                  </span>
                  <span className={`hrs ${tone}`}>
                    {formatHours(hours, props.lang)}
                    <small>{formatDelta(delta, props.lang)}</small>
                  </span>
                </button>
                {props.days.map((date) => {
                  const key = cellKey(person.id, date);
                  const code = props.assignments[key];
                  const selected = props.selected?.staffId === person.id && props.selected.date === date;
                  const over = drag?.over?.staffId === person.id && drag.over.date === date;
                  const lifting = drag?.kind === 'cell' && drag.cell.staffId === person.id && drag.cell.date === date;
                  const classes = [
                    'cell',
                    code ? `shift-${code}` : 'shift-empty',
                    isWeekend(date) ? 'weekend' : '',
                    date === props.today ? 'today' : '',
                    selected ? 'selected' : '',
                    violationKeys.has(key) ? 'bad' : '',
                    over ? 'over' : '',
                    paintKeys.has(key) ? 'preview' : '',
                    lifting ? 'lifting' : '',
                    props.brush ? 'brushing' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={key}
                      type="button"
                      className={classes}
                      data-cell="true"
                      data-staff={person.id}
                      data-date={date}
                      data-shift={code ?? ''}
                      role="gridcell"
                      aria-selected={selected}
                      aria-label={`${personName(person, props.lang)} ${date} ${code ? shiftName(code, props.lang) : t(props.lang, 'unassigned')}`}
                      onPointerDown={(event) => onCellPointerDown(event, { staffId: person.id, date })}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <span className="mark">{code ? shiftGlyph(code, props.lang) : ''}</span>
                    </button>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
      <div className="tray">
        <div className="tools" role="toolbar" aria-label={t(props.lang, 'legend')}>
          {TOOLS.map((code) => {
            const meta = code === 'clear' ? null : SHIFT_META[code];
            const span = meta?.start
              ? `${props.lang === 'km' ? `${fmtNum(meta.hours, props.lang)}ម៉` : `${meta.hours}h`} · ${fmtNum(meta.start, props.lang)}–${fmtNum(meta.end, props.lang)}`
              : t(props.lang, code === 'clear' ? 'clearCell' : code === 'L' ? 'leave' : 'off');
            return (
              <button
                key={code}
                type="button"
                data-testid={`shift-${code}`}
                className={`tray-chip ${code} ${props.brush === code ? 'armed' : ''}`}
                aria-pressed={props.brush === code}
                onPointerDown={(event) => onChipPointerDown(event, code)}
                onContextMenu={(event) => event.preventDefault()}
              >
                <b>{shiftGlyph(code, props.lang)}</b>
                <span>
                  <strong>{shiftName(code, props.lang)}</strong>
                  <small>{span}</small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="status" aria-live="polite">
          {props.status}
        </p>
      </div>
      {drag ? <DragGhost drag={drag} lang={props.lang} /> : null}
    </div>
  );
}

function DragGhost({ drag, lang }: { drag: DragState; lang: Lang }) {
  const style = ghostStyle(drag);
  return (
    <div className="ghost" style={{ left: drag.x, top: drag.y, background: style.background, color: style.color }}>
      {shiftGlyph(style.glyph, lang)}
    </div>
  );
}

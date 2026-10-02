import { useEffect, useMemo, useState } from 'react';
import {
  deltaWord,
  fill,
  fmtNum,
  formatDay,
  formatMonth,
  personName,
  shiftName,
  t,
  type Lang,
} from './i18n';
import {
  addMonths,
  applyEdits,
  applySwap,
  approveRequest,
  currentMonth,
  declineRequest,
  evaluateRoster,
  monthDates,
  overlapsApproved,
  rebuildRoster,
  sameAssignments,
} from './model';
import { Brush, Planner } from './Planner';
import { ExportDialog, Inspector, LeaveDrawer } from './panels';
import { makeMonth, TEAMS, teamById } from './seed';
import { bucketKey, loadState, Persisted, saveState } from './storage';
import type { Bucket, CellRef, LeaveRequest, ShiftCode } from './types';
import type { ExportModel } from './exportRoster';

function initialState(): Persisted {
  const month = currentMonth();
  const team = TEAMS[0];
  const lang: Lang =
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('km') ? 'km' : 'en';
  return {
    teamId: team.id,
    month,
    lang,
    hintDismissed: false,
    buckets: { [bucketKey(team.id, month)]: makeMonth(team, month) },
  };
}

function cloneBucket(bucket: Bucket): Bucket {
  return { assignments: { ...bucket.assignments }, requests: bucket.requests.map((request) => ({ ...request })) };
}

function sameRequests(a: LeaveRequest[], b: LeaveRequest[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function App() {
  const [data, setData] = useState<Persisted>(() => loadState() ?? initialState());
  const [past, setPast] = useState<Bucket[]>([]);
  const [future, setFuture] = useState<Bucket[]>([]);
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [brush, setBrush] = useState<Brush>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scroll, setScroll] = useState<{ date: string; token: number } | null>(null);
  const [hidePortrait, setHidePortrait] = useState(false);

  const team = teamById(data.teamId);
  const id = bucketKey(data.teamId, data.month);
  const days = useMemo(() => monthDates(data.month), [data.month]);
  const bucket = useMemo(
    () => data.buckets[id] ?? makeMonth(team, data.month),
    [data.buckets, data.month, id, team],
  );
  const health = useMemo(
    () => evaluateRoster(team.staff, days, bucket.assignments, team.min),
    [bucket.assignments, days, team],
  );

  useEffect(() => {
    saveState(data);
  }, [data]);

  useEffect(() => {
    if (data.buckets[id]) return;
    setData((prev) => {
      const key = bucketKey(prev.teamId, prev.month);
      if (prev.buckets[key]) return prev;
      return {
        ...prev,
        buckets: { ...prev.buckets, [key]: makeMonth(teamById(prev.teamId), prev.month) },
      };
    });
  }, [data.buckets, id]);

  useEffect(() => {
    document.title = data.lang === 'km' ? 'វេន · កាលវិភាគការងារ' : 'Vien · Duty Roster';
    document.documentElement.lang = data.lang === 'km' ? 'km' : 'en';
  }, [data.lang]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => setToast(message);

  const writeBucket = (next: Bucket, message?: string) => {
    if (sameAssignments(next.assignments, bucket.assignments) && sameRequests(next.requests, bucket.requests)) return;
    setPast((stack) => [...stack, cloneBucket(bucket)].slice(-40));
    setFuture([]);
    setData((prev) => ({ ...prev, buckets: { ...prev.buckets, [id]: next } }));
    if (message) showToast(message);
    navigator.vibrate?.(8);
  };

  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((stack) => stack.slice(0, -1));
    setFuture((stack) => [...stack, cloneBucket(bucket)]);
    setData((prev) => ({ ...prev, buckets: { ...prev.buckets, [id]: previous } }));
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setFuture((stack) => stack.slice(0, -1));
    setPast((stack) => [...stack, cloneBucket(bucket)].slice(-40));
    setData((prev) => ({ ...prev, buckets: { ...prev.buckets, [id]: next } }));
  };

  const changeMonth = (delta: number) => {
    setData((prev) => ({ ...prev, month: addMonths(prev.month, delta) }));
    setPast([]);
    setFuture([]);
    setSelected(null);
    setBrush(null);
  };

  const changeTeam = (teamId: string) => {
    setData((prev) => ({ ...prev, teamId }));
    setPast([]);
    setFuture([]);
    setSelected(null);
    setBrush(null);
    setInspectId(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (leaveOpen) setLeaveOpen(false);
        else if (inspectId) setInspectId(null);
        else if (brush) setBrush(null);
        else setSelected(null);
        return;
      }
      if (leaveOpen || exportOpen || inspectId) return;
      const letters: Record<string, ShiftCode | null> = {
        m: 'M',
        a: 'A',
        n: 'N',
        l: 'L',
        o: 'O',
        t: 'T',
      };
      if (event.key in letters || event.key === 'Backspace' || event.key === 'Delete') {
        if (!selected) return;
        event.preventDefault();
        const code = event.key in letters ? letters[event.key] : null;
        const next = applyEdits(bucket.assignments, [{ ...selected, code }]);
        writeBucket({ ...bucket, assignments: next });
        if (event.key in letters) {
          const index = days.indexOf(selected.date);
          const nextDate = days[index + 1];
          if (nextDate) setSelected({ ...selected, date: nextDate });
        }
        return;
      }
      if (!event.key.startsWith('Arrow')) return;
      event.preventDefault();
      const fallback = { staffId: team.staff[0].id, date: days[0] };
      const current = selected ?? fallback;
      let row = Math.max(0, team.staff.findIndex((person) => person.id === current.staffId));
      let col = Math.max(0, days.indexOf(current.date));
      if (event.key === 'ArrowRight') col += 1;
      if (event.key === 'ArrowLeft') col -= 1;
      if (event.key === 'ArrowDown') row += 1;
      if (event.key === 'ArrowUp') row -= 1;
      row = Math.min(Math.max(row, 0), team.staff.length - 1);
      col = Math.min(Math.max(col, 0), days.length - 1);
      setSelected({ staffId: team.staff[row].id, date: days[col] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pending = bucket.requests.filter((request) => request.status === 'pending').length;
  const selectedPerson = team.staff.find((person) => person.id === selected?.staffId);
  const status = brush
    ? fill(t(data.lang, 'brushOn'), { shift: shiftName(brush, data.lang) })
    : selected && selectedPerson
      ? fill(t(data.lang, 'selectedCell'), {
          name: personName(selectedPerson, data.lang),
          date: formatDay(selected.date, data.lang),
        })
      : t(data.lang, 'trayIdle');

  const exportModel: ExportModel = useMemo(
    () => ({
      lang: data.lang,
      place: data.lang === 'km' ? team.placeKm : team.placeEn,
      teamName: data.lang === 'km' ? team.nameKm : team.nameEn,
      month: data.month,
      staff: team.staff,
      days,
      assignments: bucket.assignments,
      stats: health.stats,
      fairness: health.fairness,
      gaps: health.gaps.length,
      min: team.min,
      target: team.target,
    }),
    [bucket.assignments, data.lang, data.month, days, health, team],
  );
  const inspectPerson = team.staff.find((person) => person.id === inspectId);
  const inspectStats = health.stats.find((row) => row.staffId === inspectId);

  return (
    <div className="app">
      {!hidePortrait ? (
        <div className="portrait-note">
          <p>{t(data.lang, 'portrait')}</p>
          <button type="button" onClick={() => setHidePortrait(true)}>
            {t(data.lang, 'dismiss')}
          </button>
        </div>
      ) : null}
      <header className="topbar">
        <div className="brand">
          <span className="seal" aria-hidden="true">
            វ
          </span>
          <div>
            <strong>Vien</strong>
            <small>{t(data.lang, 'appKhmer')}</small>
          </div>
        </div>
        <div className="month">
          <button type="button" aria-label={t(data.lang, 'prevMonth')} onClick={() => changeMonth(-1)}>
            ‹
          </button>
          <div>
            <b data-testid="month-label">{formatMonth(data.month, data.lang)}</b>
            <small>{data.lang === 'km' ? `${team.placeKm} · ${team.nameKm}` : `${team.placeEn} · ${team.nameEn}`}</small>
          </div>
          <button type="button" aria-label={t(data.lang, 'nextMonth')} onClick={() => changeMonth(1)}>
            ›
          </button>
        </div>
        <div className="metrics">
          <button type="button" className={`metric ${health.fairness >= 90 ? 'good' : health.fairness >= 75 ? 'mid' : 'bad'}`} title={t(data.lang, 'fairHint')} data-testid="metric-fairness">
            <b>{fmtNum(health.fairness, data.lang)}</b>
            <span>{t(data.lang, 'fairness')}</span>
          </button>
          <button
            type="button"
            className={`metric ${health.gaps.length ? 'bad' : 'good'}`}
            data-testid="metric-coverage"
            onClick={() => {
              const gap = health.gaps[0];
              if (gap) setScroll({ date: gap.date, token: Date.now() });
            }}
          >
            <b>{fmtNum(health.gaps.length, data.lang)}</b>
            <span>{t(data.lang, 'coverage')}</span>
          </button>
          <button
            type="button"
            className={`metric ${health.violations.length ? 'bad' : 'good'}`}
            onClick={() => {
              const violation = health.violations[0];
              if (!violation) return;
              setSelected({ staffId: violation.staffId, date: violation.date });
              setScroll({ date: violation.date, token: Date.now() });
            }}
          >
            <b>{fmtNum(health.violations.length, data.lang)}</b>
            <span>{t(data.lang, 'rest')}</span>
          </button>
          <button type="button" className={`metric ${pending ? 'mid' : ''}`} data-testid="btn-leave" onClick={() => { setLeaveOpen(true); setExportOpen(false); setInspectId(null); }}>
            <b>{fmtNum(pending, data.lang)}</b>
            <span>{t(data.lang, 'pending')}</span>
          </button>
        </div>
        <div className="actions">
          <label className="team">
            <span className="sr">{t(data.lang, 'teamLabel')}</span>
            <select data-testid="team-select" value={data.teamId} onChange={(event) => changeTeam(event.target.value)}>
              {TEAMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {data.lang === 'km' ? `${item.placeKm} · ${item.nameKm}` : `${item.placeEn} · ${item.nameEn}`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" data-testid="lang-toggle" onClick={() => setData((prev) => ({ ...prev, lang: prev.lang === 'en' ? 'km' : 'en' }))}>
            {data.lang === 'en' ? 'ខ្មែរ' : 'EN'}
          </button>
          <button type="button" data-testid="btn-undo" disabled={past.length === 0} onClick={undo}>
            {t(data.lang, 'undo')}
          </button>
          <button type="button" disabled={future.length === 0} onClick={redo}>
            {t(data.lang, 'redo')}
          </button>
          <button
            type="button"
            className="solid"
            data-testid="btn-balance"
            onClick={() => {
              const assignments = rebuildRoster(team.staff, days, bucket.assignments, bucket.requests, team.target, team.min);
              writeBucket({ ...bucket, assignments }, t(data.lang, 'rebuildToast'));
            }}
          >
            {t(data.lang, 'balance')}
          </button>
          <button
            type="button"
            className="primary"
            data-testid="btn-export"
            onClick={() => {
              setExportOpen(true);
              setLeaveOpen(false);
              setInspectId(null);
            }}
          >
            {t(data.lang, 'export')}
          </button>
        </div>
      </header>
      {!data.hintDismissed ? (
        <div className="hint">
          <p>{t(data.lang, 'hint')}</p>
          <button type="button" onClick={() => setData((prev) => ({ ...prev, hintDismissed: true }))}>
            {t(data.lang, 'dismiss')}
          </button>
        </div>
      ) : null}
      <main className="board-frame">
        <Planner
          lang={data.lang}
          staff={team.staff}
          days={days}
          assignments={bucket.assignments}
          stats={health.stats}
          min={team.min}
          target={team.target}
          violations={health.violations}
          coverage={health.coverage}
          selected={selected}
          brush={brush}
          today={todayIso()}
          status={status}
          scrollDate={scroll?.date ?? null}
          scrollToken={scroll?.token ?? 0}
          onSelect={setSelected}
          onBrush={setBrush}
          onCommitCells={(edits) => {
            const next = applyEdits(bucket.assignments, edits);
            writeBucket({ ...bucket, assignments: next });
            const last = edits[edits.length - 1];
            if (last) setSelected({ staffId: last.staffId, date: last.date });
          }}
          onSwap={(src, dst) => {
            const nextMap = applySwap(bucket.assignments, src, dst);
            const source = team.staff.find((person) => person.id === src.staffId);
            const target = team.staff.find((person) => person.id === dst.staffId);
            const moved = !bucket.assignments[`${dst.staffId}|${dst.date}`];
            writeBucket(
              { ...bucket, assignments: nextMap },
              source && target
                ? moved
                  ? fill(t(data.lang, 'moveToast'), { name: personName(target, data.lang) })
                  : fill(t(data.lang, 'swapToast'), {
                      a: personName(source, data.lang),
                      b: personName(target, data.lang),
                    })
                : undefined,
            );
            setSelected(dst);
          }}
          onInspect={(staffId) => {
            setInspectId(staffId);
            setLeaveOpen(false);
            setExportOpen(false);
          }}
        />
      </main>
      {inspectPerson && inspectStats ? (
        <Inspector lang={data.lang} person={inspectPerson} stats={inspectStats} onClose={() => setInspectId(null)} />
      ) : null}
      {leaveOpen ? (
        <LeaveDrawer
          lang={data.lang}
          staff={team.staff}
          requests={bucket.requests}
          days={days}
          onClose={() => setLeaveOpen(false)}
          onApprove={(requestId) => {
            const request = bucket.requests.find((item) => item.id === requestId);
            if (!request) return;
            if (overlapsApproved(bucket.requests, request.staffId, request.start, request.end)) {
              showToast(t(data.lang, 'overlap'));
              return;
            }
            const next = approveRequest(bucket.requests, requestId, bucket.assignments, days);
            const person = team.staff.find((item) => item.id === request.staffId);
            const range = request.start === request.end ? formatDay(request.start, data.lang) : `${formatDay(request.start, data.lang)} – ${formatDay(request.end, data.lang)}`;
            writeBucket(next, fill(t(data.lang, 'approveToast'), { name: person ? personName(person, data.lang) : '', range }));
          }}
          onDecline={(requestId) => {
            const next = declineRequest(bucket.requests, requestId, bucket.assignments, days);
            writeBucket(next, t(data.lang, 'declineToast'));
          }}
          onAdd={(draft) => {
            if (draft.end < draft.start) return t(data.lang, 'rangeInvalid');
            if (!days.includes(draft.start) || !days.includes(draft.end)) return t(data.lang, 'rangeInvalid');
            if (overlapsApproved(bucket.requests, draft.staffId, draft.start, draft.end)) return t(data.lang, 'overlap');
            const request: LeaveRequest = {
              id: `req-${Date.now().toString(36)}`,
              staffId: draft.staffId,
              start: draft.start,
              end: draft.end,
              kind: draft.kind,
              noteEn: draft.note,
              noteKm: draft.note,
              status: 'pending',
            };
            writeBucket({ ...bucket, requests: [...bucket.requests, request] }, t(data.lang, 'added'));
            return null;
          }}
          onReset={() => {
            const fresh = makeMonth(team, data.month);
            writeBucket(fresh, t(data.lang, 'resetDone'));
            setLeaveOpen(false);
          }}
        />
      ) : null}
      {exportOpen ? (
        <ExportDialog model={exportModel} teamId={team.id} onClose={() => setExportOpen(false)} onToast={showToast} />
      ) : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
      <p className="sr" aria-live="polite">
        {t(data.lang, 'fairness')} {fmtNum(health.fairness, data.lang)}. {deltaWord(0, data.lang)}
      </p>
    </div>
  );
}

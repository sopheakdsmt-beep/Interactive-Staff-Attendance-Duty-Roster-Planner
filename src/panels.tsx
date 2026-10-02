import { useEffect, useMemo, useState } from 'react';
import {
  canvasToPdf,
  canvasToPng,
  downloadBlob,
  fileStem,
  renderRosterCanvas,
  rosterCaption,
  rosterPlainText,
  type ExportModel,
} from './exportRoster';
import {
  deltaWord,
  fill,
  fmtNum,
  formatDay,
  formatDelta,
  formatHours,
  personName,
  personRole,
  shiftName,
  t,
  type Lang,
} from './i18n';
import type { StaffStats } from './model';
import type { LeaveRequest, Staff } from './types';

export function Inspector({
  lang,
  person,
  stats,
  onClose,
}: {
  lang: Lang;
  person: Staff;
  stats: StaffStats;
  onClose: () => void;
}) {
  const rounded = Math.round(stats.delta);
  return (
    <div className="inspector" role="dialog" aria-label={personName(person, lang)}>
      <header>
        <span className="av lg" style={{ background: `hsl(${person.hue} 42% 36%)` }}>
          {lang === 'km' ? person.nameKm.slice(0, 1) : person.nameEn.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <strong>{personName(person, lang)}</strong>
          <small>
            {personRole(person, lang)} · {lang === 'km' ? person.nameEn : person.nameKm}
          </small>
        </div>
        <button type="button" onClick={onClose}>
          {t(lang, 'close')}
        </button>
      </header>
      <p className="big-hours">{formatHours(stats.hours, lang)}</p>
      <p className={`delta-line ${Math.abs(rounded) <= 8 ? 'even' : rounded > 0 ? 'over' : 'under'}`}>
        {fill(t(lang, 'fairLine'), {
          hours: fmtNum(Math.round(stats.fairShare), lang),
          delta: formatDelta(stats.delta, lang),
          word: deltaWord(stats.delta, lang),
        })}
      </p>
      <dl>
        <div>
          <dt>{t(lang, 'morningShifts')}</dt>
          <dd>{fmtNum(stats.mornings, lang)}</dd>
        </div>
        <div>
          <dt>{t(lang, 'afternoonShifts')}</dt>
          <dd>{fmtNum(stats.afternoons, lang)}</dd>
        </div>
        <div>
          <dt>{t(lang, 'nightShifts')}</dt>
          <dd>{fmtNum(stats.nights, lang)}</dd>
        </div>
        <div>
          <dt>{t(lang, 'weekendDuties')}</dt>
          <dd>{fmtNum(stats.weekendDuties, lang)}</dd>
        </div>
        <div>
          <dt>{t(lang, 'leaveDays')}</dt>
          <dd>{fmtNum(stats.leaves, lang)}</dd>
        </div>
        <div>
          <dt>{t(lang, 'trainingDays')}</dt>
          <dd>{fmtNum(stats.trainings, lang)}</dd>
        </div>
      </dl>
      <p className="fine">{t(lang, 'nightRestRule')}</p>
    </div>
  );
}

export function LeaveDrawer({
  lang,
  staff,
  requests,
  days,
  onClose,
  onApprove,
  onDecline,
  onAdd,
  onReset,
}: {
  lang: Lang;
  staff: Staff[];
  requests: LeaveRequest[];
  days: string[];
  onClose: () => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onAdd: (draft: { staffId: string; start: string; end: string; kind: 'L' | 'T'; note: string }) => string | null;
  onReset: () => void;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? '');
  const [start, setStart] = useState(days[0] ?? '');
  const [end, setEnd] = useState(days[0] ?? '');
  const [kind, setKind] = useState<'L' | 'T'>('L');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const ordered = [...requests].sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.start.localeCompare(b.start));

  return (
    <div className="scrim" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-labelledby="leave-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="leave-title">{t(lang, 'leaveTitle')}</h2>
          <button type="button" onClick={onClose}>
            {t(lang, 'close')}
          </button>
        </header>
        {ordered.length === 0 ? <p className="empty">{t(lang, 'noPending')}</p> : null}
        <ul className="requests">
          {ordered.map((request) => {
            const person = staff.find((item) => item.id === request.staffId);
            const noteText = lang === 'km' ? request.noteKm || request.noteEn : request.noteEn || request.noteKm;
            return (
              <li key={request.id} className={request.status}>
                <div>
                  <strong>{person ? personName(person, lang) : request.staffId}</strong>
                  <span className={`tag ${request.status}`}>{t(lang, statusKey(request.status))}</span>
                </div>
                <p>
                  {shiftName(request.kind, lang)} · {formatDay(request.start, lang)}
                  {request.end !== request.start ? ` – ${formatDay(request.end, lang)}` : ''}
                </p>
                {noteText ? <p className="note">{noteText}</p> : null}
                {request.status === 'pending' ? (
                  <div className="row-actions">
                    <button type="button" className="solid" onClick={() => onApprove(request.id)}>
                      {t(lang, 'approve')}
                    </button>
                    <button type="button" onClick={() => onDecline(request.id)}>
                      {t(lang, 'decline')}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <form
          className="leave-form"
          onSubmit={(event) => {
            event.preventDefault();
            const message = onAdd({ staffId, start, end, kind, note });
            if (message) setError(message);
            else {
              setError('');
              setNote('');
            }
          }}
        >
          <h3>{t(lang, 'addRequest')}</h3>
          <label>
            {t(lang, 'staff')}
            <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {personName(person, lang)}
                </option>
              ))}
            </select>
          </label>
          <div className="split">
            <label>
              {t(lang, 'from')}
              <input type="date" min={days[0]} max={days[days.length - 1]} value={start} onChange={(event) => setStart(event.target.value)} required />
            </label>
            <label>
              {t(lang, 'to')}
              <input type="date" min={days[0]} max={days[days.length - 1]} value={end} onChange={(event) => setEnd(event.target.value)} required />
            </label>
          </div>
          <label>
            {t(lang, 'kind')}
            <select value={kind} onChange={(event) => setKind(event.target.value as 'L' | 'T')}>
              <option value="L">{t(lang, 'leave')}</option>
              <option value="T">{t(lang, 'training')}</option>
            </select>
          </label>
          <label>
            {t(lang, 'note')}
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={80} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="solid">
            {t(lang, 'addRequest')}
          </button>
        </form>
        <button
          type="button"
          className="texty"
          onClick={() => {
            if (window.confirm(t(lang, 'resetConfirm'))) onReset();
          }}
        >
          {t(lang, 'resetMonth')}
        </button>
      </aside>
    </div>
  );
}

function statusRank(status: LeaveRequest['status']) {
  if (status === 'pending') return 0;
  if (status === 'approved') return 1;
  return 2;
}

function statusKey(status: LeaveRequest['status']): 'pendingStatus' | 'approved' | 'declined' {
  if (status === 'pending') return 'pendingStatus';
  if (status === 'approved') return 'approved';
  return 'declined';
}

export function ExportDialog({
  model,
  teamId,
  onClose,
  onToast,
}: {
  model: ExportModel;
  teamId: string;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const [preview, setPreview] = useState('');
  const [png, setPng] = useState<Blob | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const caption = useMemo(() => rosterCaption(model), [model]);
  const plain = useMemo(() => rosterPlainText(model), [model]);
  const stem = fileStem(teamId, model.month);
  const canFileShare = useMemo(() => {
    try {
      const file = new File([new Blob(['x'], { type: 'image/png' })], 'roster.png', { type: 'image/png' });
      return !!navigator.canShare?.({ files: [file] });
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    setBusy(true);
    renderRosterCanvas(model)
      .then(async (next) => {
        if (cancel) return;
        const blob = await canvasToPng(next);
        if (cancel) return;
        setCanvas(next);
        setPng(blob);
        setPreview(next.toDataURL('image/png'));
        setError(false);
      })
      .catch(() => {
        if (!cancel) setError(true);
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [model]);

  const sendPng = async () => {
    if (!png) return;
    const file = new File([png], `${stem}.png`, { type: 'image/png' });
    if (canFileShare && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Vien', text: caption });
        onToast(t(model.lang, 'shared'));
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    downloadBlob(png, `${stem}.png`);
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // The download still gives them the image.
    }
    window.open(`https://t.me/share/url?text=${encodeURIComponent(caption)}`, '_blank', 'noopener');
    onToast(t(model.lang, 'shareFallback'));
  };

  return (
    <div className="scrim center" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-labelledby="export-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id="export-title">{t(model.lang, 'exportTitle')}</h2>
          <button type="button" onClick={onClose} autoFocus>
            {t(model.lang, 'close')}
          </button>
        </header>
        <p className="help">{t(model.lang, 'exportHelp')}</p>
        {error ? <p className="form-error">{t(model.lang, 'exportFail')}</p> : null}
        <div className="preview-wrap">
          {preview ? <img src={preview} alt={t(model.lang, 'preview')} /> : <p className="empty">{busy ? '…' : ''}</p>}
        </div>
        <div className="export-actions">
          <button type="button" className="primary" data-testid="send-telegram" disabled={!png} onClick={() => void sendPng()}>
            {t(model.lang, 'sharePng')}
          </button>
          <button
            type="button"
            data-testid="download-png"
            disabled={!png}
            onClick={() => png && downloadBlob(png, `${stem}.png`)}
          >
            {t(model.lang, 'downloadPng')}
            <small>{t(model.lang, 'pngNote')}</small>
          </button>
          <button
            type="button"
            data-testid="download-pdf"
            disabled={!canvas}
            onClick={() => {
              if (!canvas) return;
              void canvasToPdf(canvas)
                .then((blob) => downloadBlob(blob, `${stem}.pdf`))
                .catch(() => onToast(t(model.lang, 'exportFail')));
            }}
          >
            {t(model.lang, 'downloadPdf')}
            <small>{t(model.lang, 'pdfNote')}</small>
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(plain).then(
                () => onToast(t(model.lang, 'copied')),
                () => onToast(t(model.lang, 'copyFail')),
              );
            }}
          >
            {t(model.lang, 'copyText')}
            <small>{fill(t(model.lang, 'charCount'), { n: fmtNum(plain.length, model.lang) })}</small>
          </button>
          <button
            type="button"
            onClick={() => {
              const payload = plain.length <= 3500 ? plain : caption;
              window.open(`https://t.me/share/url?text=${encodeURIComponent(payload)}`, '_blank', 'noopener');
            }}
          >
            {t(model.lang, 'sendText')}
          </button>
        </div>
        <label className="caption">
          {t(model.lang, 'caption')}
          <textarea readOnly value={caption} rows={5} />
        </label>
      </div>
    </div>
  );
}

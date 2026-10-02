import type {
  AssignmentMap,
  CellRef,
  Coverage,
  DutyShift,
  LeaveRequest,
  ShiftCode,
  Staff,
} from './types';
import { DUTY_SHIFTS, SHIFT_META } from './types';

export function cellKey(staffId: string, date: string): string {
  return `${staffId}|${date}`;
}

export function monthDates(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d += 1) out.push(`${ym}-${String(d).padStart(2, '0')}`);
  return out;
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isWeekend(iso: string): boolean {
  const day = weekdayIndex(iso);
  return day === 0 || day === 6;
}

export function isDuty(code: ShiftCode | undefined): code is DutyShift {
  return code === 'M' || code === 'A' || code === 'N';
}

export function isWork(code: ShiftCode | undefined): boolean {
  return code === 'M' || code === 'A' || code === 'N' || code === 'T';
}

export function shiftHours(code: ShiftCode | undefined): number {
  return code ? SHIFT_META[code].hours : 0;
}

/** A night shift must be followed by a rest day, not another duty or training. */
export function violatesRest(prev: ShiftCode | undefined, next: ShiftCode | undefined): boolean {
  if (prev !== 'N' || !next) return false;
  return next === 'M' || next === 'A' || next === 'N' || next === 'T';
}

export type StaffStats = {
  staffId: string;
  hours: number;
  mornings: number;
  afternoons: number;
  nights: number;
  leaves: number;
  offs: number;
  trainings: number;
  weekendDuties: number;
  empty: number;
  available: number;
  fairShare: number;
  delta: number;
};

export type Gap = { date: string; shift: DutyShift; have: number; need: number };
export type Violation = { staffId: string; date: string };

export type RosterHealth = {
  stats: StaffStats[];
  fairness: number;
  coverage: Record<string, Coverage>;
  gaps: Gap[];
  violations: Violation[];
};

export function staffStats(staffId: string, days: string[], assignments: AssignmentMap): StaffStats {
  const stats: StaffStats = {
    staffId,
    hours: 0,
    mornings: 0,
    afternoons: 0,
    nights: 0,
    leaves: 0,
    offs: 0,
    trainings: 0,
    weekendDuties: 0,
    empty: 0,
    available: 0,
    fairShare: 0,
    delta: 0,
  };
  for (const date of days) {
    const code = assignments[cellKey(staffId, date)];
    if (!code) {
      stats.empty += 1;
      stats.available += 1;
      continue;
    }
    stats.hours += shiftHours(code);
    if (code !== 'L') stats.available += 1;
    if (code === 'M') stats.mornings += 1;
    else if (code === 'A') stats.afternoons += 1;
    else if (code === 'N') stats.nights += 1;
    else if (code === 'L') stats.leaves += 1;
    else if (code === 'O') stats.offs += 1;
    else if (code === 'T') stats.trainings += 1;
    if (isWork(code) && isWeekend(date)) stats.weekendDuties += 1;
  }
  return stats;
}

export function fairnessScore(deltas: number[]): number {
  if (deltas.length === 0) return 100;
  const mean = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const variance = deltas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / deltas.length;
  const sd = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round(100 - sd * 2.5)));
}

function fairShareMap(staff: Staff[], days: string[], assignments: AssignmentMap): Map<string, number> {
  let totalHours = 0;
  let totalAvailable = 0;
  const available = new Map<string, number>();
  for (const person of staff) {
    const stats = staffStats(person.id, days, assignments);
    available.set(person.id, stats.available);
    totalHours += stats.hours;
    totalAvailable += stats.available;
  }
  const rate = totalAvailable ? totalHours / totalAvailable : 0;
  const fair = new Map<string, number>();
  for (const person of staff) fair.set(person.id, rate * (available.get(person.id) ?? 0));
  return fair;
}

export function coverageOn(staff: Staff[], date: string, assignments: AssignmentMap): Coverage {
  const cov: Coverage = { M: 0, A: 0, N: 0 };
  for (const person of staff) {
    const code = assignments[cellKey(person.id, date)];
    if (code === 'M' || code === 'A' || code === 'N') cov[code] += 1;
  }
  return cov;
}

export function evaluateRoster(
  staff: Staff[],
  days: string[],
  assignments: AssignmentMap,
  min: Coverage,
): RosterHealth {
  const fair = fairShareMap(staff, days, assignments);
  const stats = staff.map((person) => {
    const row = staffStats(person.id, days, assignments);
    row.fairShare = fair.get(person.id) ?? 0;
    row.delta = row.hours - row.fairShare;
    return row;
  });
  const coverage: Record<string, Coverage> = {};
  const gaps: Gap[] = [];
  for (const date of days) {
    const cov = coverageOn(staff, date, assignments);
    coverage[date] = cov;
    for (const shift of DUTY_SHIFTS) {
      if (cov[shift] < min[shift]) {
        gaps.push({ date, shift, have: cov[shift], need: min[shift] });
      }
    }
  }
  const violations: Violation[] = [];
  for (const person of staff) {
    for (let i = 1; i < days.length; i += 1) {
      const prev = assignments[cellKey(person.id, days[i - 1])];
      const curr = assignments[cellKey(person.id, days[i])];
      if (violatesRest(prev, curr)) violations.push({ staffId: person.id, date: days[i] });
    }
  }
  return {
    stats,
    fairness: fairnessScore(stats.map((row) => row.delta)),
    coverage,
    gaps,
    violations,
  };
}

function restOk(staffId: string, days: string[], assignments: AssignmentMap): boolean {
  for (let i = 1; i < days.length; i += 1) {
    const prev = assignments[cellKey(staffId, days[i - 1])];
    const curr = assignments[cellKey(staffId, days[i])];
    if (violatesRest(prev, curr)) return false;
  }
  return true;
}

function meetsMinimum(staff: Staff[], days: string[], assignments: AssignmentMap, min: Coverage): boolean {
  for (const date of days) {
    const cov = coverageOn(staff, date, assignments);
    if (cov.M < min.M || cov.A < min.A || cov.N < min.N) return false;
  }
  return true;
}

/**
 * Build a month that hits the coverage target, gives the day after every night
 * shift off, and keeps each person near the hours their available days justify.
 * Approved leave and training passed in `locked` stay put.
 */
export function buildFairRoster(
  staff: Staff[],
  days: string[],
  locked: AssignmentMap,
  target: Coverage,
  min: Coverage,
): AssignmentMap {
  const out: AssignmentMap = { ...locked };
  const lockedKeys = new Set(Object.keys(locked));
  const compare = (a: Staff, b: Staff, shift: DutyShift, date: string, dayIndex: number): number => {
    const left = staffStats(a.id, days, out);
    const right = staffStats(b.id, days, out);
    // Nights must rotate on their own. Hour totals stay low after a night because
    // the next day is rest, and that used to pull the same people back into nights.
    if (shift === 'N' && left.nights !== right.nights) return left.nights - right.nights;
    if (Math.abs(left.hours - right.hours) > 8) return left.hours - right.hours;
    if (isWeekend(date) && left.weekendDuties !== right.weekendDuties) {
      return left.weekendDuties - right.weekendDuties;
    }
    const previous = (person: Staff) => (dayIndex > 0 ? out[cellKey(person.id, days[dayIndex - 1])] : undefined);
    const aRepeat = previous(a) === shift;
    const bRepeat = previous(b) === shift;
    if (aRepeat !== bRepeat) return aRepeat ? 1 : -1;
    if (left.hours !== right.hours) return left.hours - right.hours;
    if (shift === 'M' && left.mornings !== right.mornings) return left.mornings - right.mornings;
    if (shift === 'A' && left.afternoons !== right.afternoons) return left.afternoons - right.afternoons;
    if (left.nights !== right.nights) return left.nights - right.nights;
    return a.id.localeCompare(b.id);
  };

  const nightAllowed = (personId: string, dayIndex: number, already: Set<string>): boolean => {
    const nextDate = days[dayIndex + 1];
    if (!nextDate) return true;
    const nextCode = out[cellKey(personId, nextDate)];
    if (nextCode && isWork(nextCode)) return false;
    const nights = new Set(already);
    nights.add(personId);
    let free = 0;
    for (const person of staff) {
      if (nights.has(person.id)) continue;
      const code = out[cellKey(person.id, nextDate)];
      if (code === 'L' || code === 'T') continue;
      free += 1;
    }
    return free >= min.M + min.A + min.N;
  };

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const date = days[dayIndex];
    const prevDate = dayIndex > 0 ? days[dayIndex - 1] : null;
    const pool: Staff[] = [];
    for (const person of staff) {
      const key = cellKey(person.id, date);
      if (out[key]) continue;
      const prev = prevDate ? out[cellKey(person.id, prevDate)] : undefined;
      if (prev === 'N') {
        out[key] = 'O';
        continue;
      }
      pool.push(person);
    }

    const assigned = new Set<string>();
    const take = (shift: DutyShift, count: number) => {
      const ranked = pool
        .filter((person) => !assigned.has(person.id))
        .sort((a, b) => compare(a, b, shift, date, dayIndex));
      let got = 0;
      for (const person of ranked) {
        if (got >= count) break;
        if (shift === 'N' && !nightAllowed(person.id, dayIndex, assigned)) continue;
        out[cellKey(person.id, date)] = shift;
        assigned.add(person.id);
        got += 1;
      }
    };

    take('N', target.N);
    take('M', target.M);
    take('A', target.A);

    for (const person of pool) {
      const key = cellKey(person.id, date);
      if (!out[key]) out[key] = 'O';
    }
  }

  balanceHours(staff, days, out, lockedKeys, min);
  balanceWeekends(staff, days, out, lockedKeys, min);
  balanceNights(staff, days, out, lockedKeys, min);
  return out;
}

function balanceHours(
  staff: Staff[],
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  min: Coverage,
) {
  const fair = fairShareMap(staff, days, out);
  for (let iter = 0; iter < 500; iter += 1) {
    const ranked = staff
      .map((person) => ({
        id: person.id,
        delta: staffStats(person.id, days, out).hours - (fair.get(person.id) ?? 0),
      }))
      .sort((a, b) => a.delta - b.delta || a.id.localeCompare(b.id));
    if (ranked[ranked.length - 1].delta - ranked[0].delta <= 8) return;
    let moved = false;
    for (let highIndex = ranked.length - 1; highIndex > 0 && !moved; highIndex -= 1) {
      for (let lowIndex = 0; lowIndex < highIndex && !moved; lowIndex += 1) {
        if (ranked[highIndex].delta - ranked[lowIndex].delta <= 8) continue;
        moved = moveDuty(ranked[highIndex].id, ranked[lowIndex].id, staff, days, out, lockedKeys, min);
      }
    }
    if (!moved) return;
  }
}

function moveDuty(
  highId: string,
  lowId: string,
  staff: Staff[],
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  min: Coverage,
): boolean {
  for (const date of days) {
    const highKey = cellKey(highId, date);
    const lowKey = cellKey(lowId, date);
    if (lockedKeys.has(highKey) || lockedKeys.has(lowKey)) continue;
    const highCode = out[highKey];
    const lowCode = out[lowKey];
    if (!isDuty(highCode) || lowCode !== 'O') continue;
    out[highKey] = 'O';
    out[lowKey] = highCode;
    if (
      restOk(highId, days, out) &&
      restOk(lowId, days, out) &&
      meetsMinimum(staff, days, out, min)
    ) {
      return true;
    }
    out[highKey] = highCode;
    out[lowKey] = lowCode;
  }
  return false;
}

function balanceWeekends(
  staff: Staff[],
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  min: Coverage,
) {
  for (let iter = 0; iter < 200; iter += 1) {
    const ranked = staff
      .map((person) => ({ id: person.id, weekends: staffStats(person.id, days, out).weekendDuties }))
      .sort((a, b) => a.weekends - b.weekends || a.id.localeCompare(b.id));
    let moved = false;
    outer: for (let highIndex = ranked.length - 1; highIndex > 0; highIndex -= 1) {
      for (let lowIndex = 0; lowIndex < highIndex; lowIndex += 1) {
        if (ranked[highIndex].weekends - ranked[lowIndex].weekends < 2) continue;
        if (swapLikeDays(ranked[highIndex].id, ranked[lowIndex].id, days, out, lockedKeys, staff, min, true)) {
          moved = true;
          break outer;
        }
      }
    }
    if (!moved) return;
  }
}

function balanceNights(
  staff: Staff[],
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  min: Coverage,
) {
  for (let iter = 0; iter < 200; iter += 1) {
    const ranked = staff
      .map((person) => ({ id: person.id, nights: staffStats(person.id, days, out).nights }))
      .sort((a, b) => a.nights - b.nights || a.id.localeCompare(b.id));
    let moved = false;
    outer: for (let highIndex = ranked.length - 1; highIndex > 0; highIndex -= 1) {
      for (let lowIndex = 0; lowIndex < highIndex; lowIndex += 1) {
        if (ranked[highIndex].nights - ranked[lowIndex].nights < 2) continue;
        if (swapNightForDay(ranked[highIndex].id, ranked[lowIndex].id, days, out, lockedKeys, staff, min)) {
          moved = true;
          break outer;
        }
      }
    }
    if (!moved) return;
  }
}

function swapLikeDays(
  highId: string,
  lowId: string,
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  staff: Staff[],
  min: Coverage,
  weekendBias: boolean,
): boolean {
  const primary = days.filter((date) => isWeekend(date) === weekendBias);
  const secondary = days.filter((date) => isWeekend(date) !== weekendBias);
  for (const from of primary) {
    const highFrom = cellKey(highId, from);
    const lowFrom = cellKey(lowId, from);
    if (lockedKeys.has(highFrom) || lockedKeys.has(lowFrom)) continue;
    const shift = out[highFrom];
    if (!isDuty(shift) || out[lowFrom] !== 'O') continue;
    for (const back of secondary) {
      const lowBack = cellKey(lowId, back);
      const highBack = cellKey(highId, back);
      if (lockedKeys.has(lowBack) || lockedKeys.has(highBack)) continue;
      if (out[lowBack] !== shift || out[highBack] !== 'O') continue;
      out[highFrom] = 'O';
      out[lowFrom] = shift;
      out[lowBack] = 'O';
      out[highBack] = shift;
      if (
        restOk(highId, days, out) &&
        restOk(lowId, days, out) &&
        meetsMinimum(staff, days, out, min)
      ) {
        return true;
      }
      out[highFrom] = shift;
      out[lowFrom] = 'O';
      out[lowBack] = shift;
      out[highBack] = 'O';
    }
  }
  return false;
}

function swapNightForDay(
  highId: string,
  lowId: string,
  days: string[],
  out: AssignmentMap,
  lockedKeys: Set<string>,
  staff: Staff[],
  min: Coverage,
): boolean {
  for (const nightDate of days) {
    const highNight = cellKey(highId, nightDate);
    const lowNight = cellKey(lowId, nightDate);
    if (lockedKeys.has(highNight) || lockedKeys.has(lowNight)) continue;
    if (out[highNight] !== 'N' || out[lowNight] !== 'O') continue;
    for (const dayDate of days) {
      if (dayDate === nightDate) continue;
      const lowDay = cellKey(lowId, dayDate);
      const highDay = cellKey(highId, dayDate);
      if (lockedKeys.has(lowDay) || lockedKeys.has(highDay)) continue;
      const shift = out[lowDay];
      if ((shift !== 'M' && shift !== 'A') || out[highDay] !== 'O') continue;
      out[highNight] = 'O';
      out[lowNight] = 'N';
      out[lowDay] = 'O';
      out[highDay] = shift;
      if (
        restOk(highId, days, out) &&
        restOk(lowId, days, out) &&
        meetsMinimum(staff, days, out, min)
      ) {
        return true;
      }
      out[highNight] = 'N';
      out[lowNight] = 'O';
      out[lowDay] = shift;
      out[highDay] = 'O';
    }
  }
  return false;
}

export function sameAssignments(a: AssignmentMap, b: AssignmentMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function applyEdits(
  map: AssignmentMap,
  edits: { staffId: string; date: string; code: ShiftCode | null }[],
): AssignmentMap {
  const next: AssignmentMap = { ...map };
  for (const edit of edits) {
    const key = cellKey(edit.staffId, edit.date);
    if (edit.code === null) delete next[key];
    else next[key] = edit.code;
  }
  return next;
}

export function applySwap(map: AssignmentMap, src: CellRef, dst: CellRef): AssignmentMap {
  if (src.staffId === dst.staffId && src.date === dst.date) return map;
  const next: AssignmentMap = { ...map };
  const srcKey = cellKey(src.staffId, src.date);
  const dstKey = cellKey(dst.staffId, dst.date);
  const srcCode = next[srcKey];
  if (!srcCode) return map;
  const dstCode = next[dstKey];
  if (dstCode) {
    next[srcKey] = dstCode;
    next[dstKey] = srcCode;
  } else {
    delete next[srcKey];
    next[dstKey] = srcCode;
  }
  return next;
}

export function datesCovered(days: string[], start: string, end: string): string[] {
  return days.filter((date) => date >= start && date <= end);
}

export function approveRequest(
  requests: LeaveRequest[],
  id: string,
  assignments: AssignmentMap,
  days: string[],
): { requests: LeaveRequest[]; assignments: AssignmentMap } {
  const current = requests.find((request) => request.id === id);
  const nextRequests = requests.map((request) =>
    request.id === id ? { ...request, status: 'approved' as const } : request,
  );
  const nextAssignments: AssignmentMap = { ...assignments };
  if (current) {
    for (const date of datesCovered(days, current.start, current.end)) {
      nextAssignments[cellKey(current.staffId, date)] = current.kind;
    }
  }
  return { requests: nextRequests, assignments: nextAssignments };
}

export function declineRequest(
  requests: LeaveRequest[],
  id: string,
  assignments: AssignmentMap,
  days: string[],
): { requests: LeaveRequest[]; assignments: AssignmentMap } {
  const current = requests.find((request) => request.id === id);
  const nextRequests = requests.map((request) =>
    request.id === id ? { ...request, status: 'declined' as const } : request,
  );
  const nextAssignments: AssignmentMap = { ...assignments };
  if (current?.status === 'approved') {
    for (const date of datesCovered(days, current.start, current.end)) {
      const key = cellKey(current.staffId, date);
      if (nextAssignments[key] === current.kind) delete nextAssignments[key];
    }
  }
  return { requests: nextRequests, assignments: nextAssignments };
}

export function overlapsApproved(
  requests: LeaveRequest[],
  staffId: string,
  start: string,
  end: string,
): boolean {
  return requests.some(
    (request) =>
      request.status === 'approved' &&
      request.staffId === staffId &&
      !(request.end < start || request.start > end),
  );
}

export function locksForRoster(days: string[], assignments: AssignmentMap, requests: LeaveRequest[]): AssignmentMap {
  const locked: AssignmentMap = {};
  for (const [key, code] of Object.entries(assignments)) {
    if (code === 'L' || code === 'T') locked[key] = code;
  }
  for (const request of requests) {
    if (request.status !== 'approved') continue;
    for (const date of datesCovered(days, request.start, request.end)) {
      locked[cellKey(request.staffId, date)] = request.kind;
    }
  }
  return locked;
}

export function rebuildRoster(
  staff: Staff[],
  days: string[],
  assignments: AssignmentMap,
  requests: LeaveRequest[],
  target: Coverage,
  min: Coverage,
): AssignmentMap {
  return buildFairRoster(staff, days, locksForRoster(days, assignments, requests), target, min);
}

import { describe, expect, it } from 'vitest';
import { fairnessScore, evaluateRoster, violatesRest, cellKey, applySwap, monthDates } from './model';
import { makeMonth, TEAMS } from './seed';

function assertHealthy(teamId: string, month: string) {
  const team = TEAMS.find((item) => item.id === teamId)!;
  const bucket = makeMonth(team, month);
  const days = monthDates(month);
  const health = evaluateRoster(team.staff, days, bucket.assignments, team.min);
  const hours = health.stats.map((row) => row.hours);
  const deltas = health.stats.map((row) => Math.round(row.delta));
  const nights = health.stats.map((row) => row.nights);
  const weekends = health.stats.map((row) => row.weekendDuties);
  const spread = Math.max(...deltas) - Math.min(...deltas);
  const detail = [
    `fair ${health.fairness}`,
    `delta spread ${spread}`,
    `hours ${hours.join(',')}`,
    `deltas ${deltas.join(',')}`,
    `nights ${Math.min(...nights)}-${Math.max(...nights)}`,
    `weekends ${Math.min(...weekends)}-${Math.max(...weekends)}`,
    `gaps ${health.gaps.length}`,
    `rest ${health.violations.length}`,
  ].join(' | ');
  expect(health.violations, detail).toEqual([]);
  expect(health.gaps, detail).toEqual([]);
  expect(spread, detail).toBeLessThanOrEqual(8);
  expect(Math.max(...nights) - Math.min(...nights), detail).toBeLessThanOrEqual(3);
  expect(Math.max(...weekends) - Math.min(...weekends), detail).toBeLessThanOrEqual(3);
  for (const person of team.staff) {
    for (const date of days) {
      expect(bucket.assignments[cellKey(person.id, date)], `${person.id} ${date}`).toBeTruthy();
    }
  }
  return bucket;
}

describe('fair roster', () => {
  it('covers emergency and hotel months without rest breaks or coverage gaps', () => {
    for (const month of ['2026-02', '2026-04', '2026-10']) {
      assertHealthy('emergency', month);
      assertHealthy('riverside', month);
    }
  });

  it('keeps approved leave on the grid', () => {
    const bucket = makeMonth(TEAMS[0], '2026-10');
    expect(bucket.assignments[cellKey('h-channa', '2026-10-12')]).toBe('L');
    expect(bucket.assignments[cellKey('h-channa', '2026-10-13')]).toBe('L');
    expect(bucket.assignments[cellKey('h-channa', '2026-10-14')]).toBe('L');
    const hotel = makeMonth(TEAMS[1], '2026-10');
    expect(hotel.assignments[cellKey('r-mealea', '2026-10-08')]).toBe('L');
  });

  it('scores an even team as perfectly fair and flags a morning after night', () => {
    expect(fairnessScore([0, 0, 0, 0])).toBe(100);
    expect(violatesRest('N', 'M')).toBe(true);
    expect(violatesRest('N', 'T')).toBe(true);
    expect(violatesRest('N', 'O')).toBe(false);
    expect(violatesRest('N', 'L')).toBe(false);
    expect(violatesRest('M', 'N')).toBe(false);
  });

  it('detects a painted rest violation and swaps two cells', () => {
    const team = TEAMS[0];
    const days = monthDates('2026-10');
    const bucket = makeMonth(team, '2026-10');
    const broken = {
      ...bucket.assignments,
      [cellKey('h-dara', '2026-10-02')]: 'N' as const,
      [cellKey('h-dara', '2026-10-03')]: 'M' as const,
    };
    const health = evaluateRoster(team.staff, days, broken, team.min);
    expect(health.violations).toContainEqual({ staffId: 'h-dara', date: '2026-10-03' });
    const swapped = applySwap(
      bucket.assignments,
      { staffId: 'h-dara', date: '2026-10-02' },
      { staffId: 'h-bopha', date: '2026-10-02' },
    );
    expect(swapped[cellKey('h-dara', '2026-10-02')]).toBe(bucket.assignments[cellKey('h-bopha', '2026-10-02')]);
    expect(swapped[cellKey('h-bopha', '2026-10-02')]).toBe(bucket.assignments[cellKey('h-dara', '2026-10-02')]);
  });
});

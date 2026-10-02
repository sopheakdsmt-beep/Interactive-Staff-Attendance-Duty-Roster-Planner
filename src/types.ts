export type ShiftCode = 'M' | 'A' | 'N' | 'L' | 'O' | 'T';

export type Staff = {
  id: string;
  nameEn: string;
  nameKm: string;
  roleEn: string;
  roleKm: string;
  hue: number;
};

export type RequestStatus = 'pending' | 'approved' | 'declined';

export type LeaveRequest = {
  id: string;
  staffId: string;
  start: string;
  end: string;
  kind: 'L' | 'T';
  noteEn: string;
  noteKm: string;
  status: RequestStatus;
};

export type RequestTemplate = {
  id: string;
  staffId: string;
  startDay: number;
  endDay: number;
  kind: 'L' | 'T';
  noteEn: string;
  noteKm: string;
  status: RequestStatus;
};

export type Coverage = { M: number; A: number; N: number };

export type Team = {
  id: string;
  nameEn: string;
  nameKm: string;
  placeEn: string;
  placeKm: string;
  min: Coverage;
  target: Coverage;
  staff: Staff[];
  templates: RequestTemplate[];
};

export type AssignmentMap = Record<string, ShiftCode>;

export type Bucket = {
  assignments: AssignmentMap;
  requests: LeaveRequest[];
};

export type CellRef = { staffId: string; date: string };

export const DUTY_SHIFTS = ['M', 'A', 'N'] as const;
export type DutyShift = (typeof DUTY_SHIFTS)[number];

export const SHIFT_META: Record<
  ShiftCode,
  { hours: number; bg: string; fg: string; start: string; end: string }
> = {
  M: { hours: 8, bg: '#f0c14a', fg: '#2c2206', start: '07:00', end: '15:00' },
  A: { hours: 8, bg: '#d85a32', fg: '#fff8f5', start: '15:00', end: '23:00' },
  N: { hours: 8, bg: '#243556', fg: '#f3f6fd', start: '23:00', end: '07:00' },
  L: { hours: 0, bg: '#dceadf', fg: '#1d4a30', start: '', end: '' },
  O: { hours: 0, bg: 'transparent', fg: '#7d756b', start: '', end: '' },
  T: { hours: 8, bg: '#d7e7f4', fg: '#16384f', start: '08:00', end: '16:00' },
};

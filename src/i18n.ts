import { weekdayIndex } from './model';
import type { ShiftCode } from './types';

export type Lang = 'en' | 'km';

const en = {
  appKhmer: 'កាលវិភាគការងារ',
  staff: 'Staff',
  hours: 'Hours',
  coverage: 'Cover',
  fairness: 'Fairness',
  pending: 'Leave',
  rest: 'Rest',
  balance: 'Balance',
  undo: 'Undo',
  redo: 'Redo',
  export: 'Export',
  close: 'Close',
  dismiss: 'Got it',
  approve: 'Approve',
  decline: 'Decline',
  addRequest: 'Add request',
  resetMonth: 'Reset month',
  resetConfirm: 'Reset this month to a fresh fair roster? Edits on this month will be lost.',
  note: 'Note',
  from: 'From',
  to: 'To',
  kind: 'Type',
  leave: 'Leave',
  training: 'Training',
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  off: 'Off',
  clear: 'Clear',
  sharePng: 'Send PNG to Telegram',
  downloadPng: 'Download PNG',
  downloadPdf: 'Download PDF',
  copyText: 'Copy roster text',
  copied: 'Roster text copied',
  shared: 'Share sheet opened. Choose the Telegram group.',
  shareFallback: 'PNG saved and the caption is copied. Attach the image in the Telegram chat that opened.',
  exportTitle: 'Send the roster',
  exportHelp:
    'The PNG is drawn for a group chat. On a tablet, Send opens the share sheet — pick the ward or hotel group and the image goes with the message. PDF is one A3 landscape page.',
  preview: 'Preview',
  caption: 'Caption',
  leaveTitle: 'Leave & training',
  noPending: 'No one is waiting on a decision.',
  approved: 'Approved',
  declined: 'Declined',
  pendingStatus: 'Pending',
  fairHint: '100 means duty hours sit on each person’s fair share, after leave.',
  brushOn: 'Brush: {shift}. Tap cells, or tap the brush again to stop.',
  selectedCell: '{name} · {date}',
  trayIdle: 'Drag a shift onto a day, or tap a shift and then tap cells.',
  hint: 'Drag a shift from the tray onto a day. Tap a shift, then mark cells with a stylus. Long-press a filled cell and drag it onto another person to swap.',
  portrait: 'Turn the tablet sideways. A full month across 16 names needs the landscape width.',
  rebuildToast: 'Month rebalanced around leave and training. Undo is ready.',
  approveToast: '{name} marked {range}. Hours and cover updated.',
  declineToast: 'Request declined.',
  swapToast: 'Swapped {a} and {b}.',
  moveToast: 'Moved to {name}.',
  copyFail: 'Could not copy the roster text.',
  exportFail: 'Could not build the export file.',
  vsFair: 'vs fair share',
  leaveDays: 'Leave days',
  weekendDuties: 'Weekend duties',
  nightShifts: 'Night shifts',
  morningShifts: 'Morning shifts',
  afternoonShifts: 'Afternoon shifts',
  trainingDays: 'Training days',
  fairShare: 'Fair share',
  over: 'over',
  under: 'under',
  even: 'even',
  today: 'Today',
  rangeInvalid: 'The end date is before the start.',
  overlap: 'That person already has approved leave in these dates.',
  added: 'Request added. Approve it when you are ready to place it on the grid.',
  generated: 'Prepared for Telegram',
  legend: 'Legend',
  dutyHours: 'Duty hours',
  resetDone: 'Sample month restored.',
  sendText: 'Send text to Telegram',
  pdfNote: 'A3 landscape',
  pngNote: 'High-resolution PNG',
  teamLabel: 'Team',
  nextMonth: 'Next month',
  prevMonth: 'Previous month',
  gapNone: 'Cover holds',
  gapSome: '{n} gaps',
  restNone: 'Rest holds',
  restSome: '{n} rest breaks',
  waiting: '{n} waiting',
  charCount: '{n} characters',
  unassigned: 'Empty',
  placeLeave: 'Place on the roster',
  hoursLine: '{hours}h duty',
  fairLine: 'Fair share {hours}h · {delta} {word}',
  nightRestRule: 'The day after a night shift should be off.',
  minLabel: 'Minimum',
  targetLabel: 'Planned',
  noSelection: 'Select a cell to use the keyboard.',
  clearCell: 'Clear cell',
};

const km: Record<keyof typeof en, string> = {
  appKhmer: 'កាលវិភាគការងារ',
  staff: 'បុគ្គលិក',
  hours: 'ម៉ោង',
  coverage: 'កម្លាំង',
  fairness: 'សមធម៌',
  pending: 'ច្បាប់',
  rest: 'សម្រាក',
  balance: 'រៀបស្មើ',
  undo: 'មិនធ្វើវិញ',
  redo: 'ធ្វើឡើងវិញ',
  export: 'នាំចេញ',
  close: 'បិទ',
  dismiss: 'យល់ហើយ',
  approve: 'អនុម័ត',
  decline: 'បដិសេធ',
  addRequest: 'បន្ថែមសំណើ',
  resetMonth: 'កំណត់ខែឡើងវិញ',
  resetConfirm: 'កំណត់ខែនេះទៅកាលវិភាគស្មើថ្មី? ការកែក្នុងខែនេះនឹងបាត់។',
  note: 'ចំណាំ',
  from: 'ពី',
  to: 'ដល់',
  kind: 'ប្រភេទ',
  leave: 'ច្បាប់',
  training: 'បណ្តុះបណ្តាល',
  morning: 'ព្រឹក',
  afternoon: 'រសៀល',
  night: 'យប់',
  off: 'ឈប់',
  clear: 'លុប',
  sharePng: 'ផ្ញើ PNG ទៅ Telegram',
  downloadPng: 'ទាញយក PNG',
  downloadPdf: 'ទាញយក PDF',
  copyText: 'ចម្លងអត្ថបទកាលវិភាគ',
  copied: 'បានចម្លងអត្ថបទកាលវិភាគ',
  shared: 'បានបើកផ្ទាំងចែករំលែក។ ជ្រើសក្រុម Telegram។',
  shareFallback: 'បានរក្សាទុក PNG ហើយចម្លងចំណងជើង។ ភ្ជាប់រូបក្នុងការជជែក Telegram ដែលបានបើក។',
  exportTitle: 'ផ្ញើកាលវិភាគ',
  exportHelp:
    'រូប PNG សម្រាប់ក្រុមជជែក។ លើថេប្លេត ប៊ូតុងផ្ញើបើកផ្ទាំងចែករំលែក — ជ្រើសក្រុមវួដ ឬសណ្ឋាគារ រួចរូបភ្ជាប់ជាមួយសារ។ PDF ជាទំព័រ A3 ផ្ដេកមួយ។',
  preview: 'មើលជាមុន',
  caption: 'ចំណងជើង',
  leaveTitle: 'ច្បាប់ និងបណ្តុះបណ្តាល',
  noPending: 'មិនមានសំណើរង់ចាំទេ។',
  approved: 'បានអនុម័ត',
  declined: 'បានបដិសេធ',
  pendingStatus: 'រង់ចាំ',
  fairHint: '១០០ មានន័យថាម៉ោងធ្វើការស្ថិតលើចំណែកសមធម៌របស់ម្នាក់ៗ ក្រោយដកច្បាប់។',
  brushOn: 'ជក់៖ {shift}។ ចុចលើក្រឡា ឬចុចជក់ម្ដងទៀតដើម្បីឈប់។',
  selectedCell: '{name} · {date}',
  trayIdle: 'អូសវេនទៅដាក់លើថ្ងៃ ឬចុចវេនរួចចុចលើក្រឡា។',
  hint: 'អូសវេនពីថាសខាងក្រោមទៅដាក់លើថ្ងៃ។ ចុចវេន រួចចុចក្រឡាដោយប៊ិក។ ចុចឲ្យជាប់លើក្រឡាដែលមានវេន រួចអូសទៅបុគ្គលិកផ្សេងដើម្បីប្ដូរ។',
  portrait: 'បង្វែរថេប្លេតទៅផ្ដេក។ មួយខែពេញជាមួយឈ្មោះ ១៦ នាក់ ត្រូវការទទឹងអេក្រង់ផ្ដេក។',
  rebuildToast: 'បានរៀបខែឱ្យស្មើជុំវិញច្បាប់ និងបណ្តុះបណ្តាល។ អាចមិនធ្វើវិញបាន។',
  approveToast: 'បានដាក់ {name} សម្រាប់ {range}។ ម៉ោង និងកម្លាំងបានធ្វើបច្ចុប្បន្នភាព។',
  declineToast: 'បានបដិសេធសំណើ។',
  swapToast: 'បានប្ដូរ {a} និង {b}។',
  moveToast: 'បានផ្លាស់ទៅ {name}។',
  copyFail: 'មិនអាចចម្លងអត្ថបទកាលវិភាគបានទេ។',
  exportFail: 'មិនអាចបង្កើតឯកសារបានទេ។',
  vsFair: 'ធៀបនឹងចំណែកសមធម៌',
  leaveDays: 'ថ្ងៃច្បាប់',
  weekendDuties: 'វេនចុងសប្ដាហ៍',
  nightShifts: 'វេនយប់',
  morningShifts: 'វេនព្រឹក',
  afternoonShifts: 'វេនរសៀល',
  trainingDays: 'ថ្ងៃបណ្តុះបណ្តាល',
  fairShare: 'ចំណែកសមធម៌',
  over: 'លើស',
  under: 'ខ្វះ',
  even: 'ស្មើ',
  today: 'ថ្ងៃនេះ',
  rangeInvalid: 'ថ្ងៃបញ្ចប់នៅមុនថ្ងៃចាប់ផ្ដើម។',
  overlap: 'បុគ្គលិកនេះមានច្បាប់បានអនុម័តក្នុងកាលបរិច្ឆេទនេះរួចហើយ។',
  added: 'បានបន្ថែមសំណើ។ អនុម័តនៅពេលត្រៀមដាក់លើក្រឡា។',
  generated: 'រៀបសម្រាប់ Telegram',
  legend: 'សញ្ញា',
  dutyHours: 'ម៉ោងធ្វើការ',
  resetDone: 'បានស្ដារខែគំរូ។',
  sendText: 'ផ្ញើអត្ថបទទៅ Telegram',
  pdfNote: 'A3 ផ្ដេក',
  pngNote: 'PNG គុណភាពខ្ពស់',
  teamLabel: 'ក្រុម',
  nextMonth: 'ខែបន្ទាប់',
  prevMonth: 'ខែមុន',
  gapNone: 'កម្លាំងគ្រប់',
  gapSome: 'ខ្វះ {n}',
  restNone: 'ថ្ងៃសម្រាកគ្រប់',
  restSome: 'ខ្វះសម្រាក {n}',
  waiting: 'រង់ចាំ {n}',
  charCount: '{n} តួ',
  unassigned: 'ទទេ',
  placeLeave: 'ដាក់លើកាលវិភាគ',
  hoursLine: '{hours} ម៉ោង',
  fairLine: 'ចំណែកសមធម៌ {hours} ម៉ោង · {delta} {word}',
  nightRestRule: 'ថ្ងៃបន្ទាប់ពីវេនយប់គួរតែឈប់សម្រាក។',
  minLabel: 'អប្បបរមា',
  targetLabel: 'គ្រោង',
  noSelection: 'ជ្រើសក្រឡាដើម្បីប្រើក្ដារចុច។',
  clearCell: 'លុបក្រឡា',
};

export type StrKey = keyof typeof en;

export function t(lang: Lang, key: StrKey): string {
  return lang === 'km' ? km[key] : en[key];
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

const KM_DIGITS = '០១២៣៤៥៦៧៨៩';

export function kmDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => KM_DIGITS[Number(digit)] ?? digit);
}

export function fmtNum(value: number | string, lang: Lang): string {
  return lang === 'km' ? kmDigits(value) : String(value);
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_KM = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_KM = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍'];
const WEEKDAY_SHORT_KM = ['អា', 'ច', 'អង', 'ពុ', 'ព្រ', 'សុ', 'សៅ'];

export function formatMonth(ym: string, lang: Lang): string {
  const [year, month] = ym.split('-').map(Number);
  const name = (lang === 'km' ? MONTHS_KM : MONTHS_EN)[month - 1] ?? '';
  return `${name} ${fmtNum(year, lang)}`;
}

export function formatDay(iso: string, lang: Lang, short = false): string {
  const day = Number(iso.slice(8, 10));
  const names = lang === 'km' ? (short ? WEEKDAY_SHORT_KM : WEEKDAY_KM) : WEEKDAY_EN;
  return `${fmtNum(day, lang)} ${names[weekdayIndex(iso)] ?? ''}`;
}

export function weekdayShort(iso: string, lang: Lang): string {
  const names = lang === 'km' ? WEEKDAY_SHORT_KM : WEEKDAY_EN;
  return names[weekdayIndex(iso)] ?? '';
}

export function shiftName(code: ShiftCode | 'clear', lang: Lang): string {
  if (code === 'clear') return t(lang, 'clear');
  const names = {
    M: 'morning',
    A: 'afternoon',
    N: 'night',
    L: 'leave',
    O: 'off',
    T: 'training',
  } as const satisfies Record<ShiftCode, StrKey>;
  return t(lang, names[code]);
}

export function shiftGlyph(code: ShiftCode | 'clear' | undefined, lang: Lang): string {
  if (!code) return '';
  if (code === 'clear') return '⌫';
  if (code === 'O') return '–';
  if (lang === 'en') return code;
  return { M: 'ព', A: 'រ', N: 'យ', L: 'ច', T: 'ប' }[code];
}

export function personName(person: { nameEn: string; nameKm: string }, lang: Lang): string {
  return lang === 'km' ? person.nameKm : person.nameEn;
}

export function personRole(person: { roleEn: string; roleKm: string }, lang: Lang): string {
  return lang === 'km' ? person.roleKm : person.roleEn;
}

export function formatHours(hours: number, lang: Lang): string {
  const n = fmtNum(Math.round(hours), lang);
  return lang === 'km' ? `${n}ម` : `${n}h`;
}

export function formatDelta(delta: number, lang: Lang): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return '0';
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${fmtNum(Math.abs(rounded), lang)}`;
}

export function deltaWord(delta: number, lang: Lang): string {
  const rounded = Math.round(delta);
  if (Math.abs(rounded) <= 8) return t(lang, 'even');
  return t(lang, rounded > 0 ? 'over' : 'under');
}

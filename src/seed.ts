import { buildFairRoster, cellKey, monthDates } from './model';
import type { AssignmentMap, Bucket, Staff, Team } from './types';

function person(
  id: string,
  nameEn: string,
  nameKm: string,
  roleEn: string,
  roleKm: string,
  hue: number,
): Staff {
  return { id, nameEn, nameKm, roleEn, roleKm, hue };
}

const emergencyStaff: Staff[] = [
  person('h-channa', 'Channa', 'ចាន់ណា', 'Charge', 'ប្រធានវេន', 18),
  person('h-dara', 'Dara', 'ដារា', 'RN', 'គិលានុបដ្ឋាយិកា', 42),
  person('h-bopha', 'Bopha', 'បូពា', 'RN', 'គិលានុបដ្ឋាយិកា', 68),
  person('h-vibol', 'Vibol', 'វិបុល', 'RN', 'គិលានុបដ្ឋាយិកា', 128),
  person('h-sreymom', 'Sreymom', 'ស្រីមុំ', 'RN', 'គិលានុបដ្ឋាយិកា', 156),
  person('h-ratanak', 'Ratanak', 'រតនា', 'EN', 'គិលានុបដ្ឋាយិកាជំនួយ', 188),
  person('h-maly', 'Maly', 'ម៉ាលី', 'EN', 'គិលានុបដ្ឋាយិកាជំនួយ', 210),
  person('h-piseth', 'Piseth', 'ពិសិដ្ឋ', 'EN', 'គិលានុបដ្ឋាយិកាជំនួយ', 232),
  person('h-kanha', 'Kanha', 'កញ្ញា', 'Aide', 'ជំនួយគិលានុបដ្ឋាយិកា', 262),
  person('h-sokha', 'Sokha', 'សុខា', 'Aide', 'ជំនួយគិលានុបដ្ឋាយិកា', 286),
  person('h-theary', 'Theary', 'ធារី', 'Aide', 'ជំនួយគិលានុបដ្ឋាយិកា', 318),
  person('h-vuthy', 'Vuthy', 'វុទ្ធី', 'Aide', 'ជំនួយគិលានុបដ្ឋាយិកា', 4),
  person('h-leakhena', 'Leakhena', 'លក្ខិណា', 'Aide', 'ជំនួយគិលានុបដ្ឋាយិកា', 348),
  person('h-sovann', 'Sovann', 'សុវណ្ណ', 'Clerk', 'ស្មៀនវួដ', 88),
  person('h-pech', 'Pech', 'ពេជ្រ', 'Clerk', 'ស្មៀនវួដ', 108),
  person('h-munny', 'Munny', 'មុន្នី', 'Support', 'ជំនួយអ្នកជំងឺ', 200),
];

const hotelStaff: Staff[] = [
  person('r-nita', 'Nita', 'នីតា', 'Lead', 'ប្រធានក្រុម', 22),
  person('r-arun', 'Arun', 'អរុណ', 'Desk', 'ផ្នែកទទួលភ្ញៀវ', 48),
  person('r-kana', 'Kana', 'កាណា', 'Desk', 'ផ្នែកទទួលភ្ញៀវ', 72),
  person('r-sokhom', 'Sokhom', 'សុខុម', 'Desk', 'ផ្នែកទទួលភ្ញៀវ', 132),
  person('r-vanna', 'Vanna', 'វណ្ណា', 'Concierge', 'អ្នកស្វាគមន៍', 162),
  person('r-lina', 'Lina', 'លីណា', 'Concierge', 'អ្នកស្វាគមន៍', 192),
  person('r-dara', 'Dara', 'ដារា', 'Bell', 'អ្នកដឹកអីវ៉ាន់', 214),
  person('r-pich', 'Pich', 'ពិច', 'Bell', 'អ្នកដឹកអីវ៉ាន់', 236),
  person('r-mealea', 'Mealea', 'មាលា', 'HK lead', 'ប្រធានអ្នកសម្អាត', 268),
  person('r-sreynich', 'Sreynich', 'ស្រីនិច', 'HK', 'អ្នកសម្អាត', 292),
  person('r-thida', 'Thida', 'ធីតា', 'HK', 'អ្នកសម្អាត', 322),
  person('r-bunthoeun', 'Bunthoeun', 'ប៊ុនធឿន', 'HK', 'អ្នកសម្អាត', 8),
  person('r-reasmey', 'Reasmey', 'រស្មី', 'HK', 'អ្នកសម្អាត', 352),
  person('r-kunthea', 'Kunthea', 'កុន្ធា', 'HK', 'អ្នកសម្អាត', 96),
  person('r-vicheka', 'Vicheka', 'វិច្ឆិកា', 'Audit', 'ពិនិត្យយប់', 118),
  person('r-samnang', 'Samnang', 'សំណាង', 'Audit', 'ពិនិត្យយប់', 206),
];

export const TEAMS: Team[] = [
  {
    id: 'emergency',
    nameEn: 'Emergency Floor',
    nameKm: 'ផ្នែកសង្គ្រោះ',
    placeEn: 'Sunrise Hospital',
    placeKm: 'មន្ទីរពេទ្យព្រឹកព្រលឹម',
    min: { M: 4, A: 3, N: 2 },
    target: { M: 5, A: 4, N: 3 },
    staff: emergencyStaff,
    templates: [
      {
        id: 'h-channa-leave',
        staffId: 'h-channa',
        startDay: 12,
        endDay: 14,
        kind: 'L',
        noteEn: 'Family ceremony',
        noteKm: 'ពិធីគ្រួសារ',
        status: 'approved',
      },
      {
        id: 'h-maly-train',
        staffId: 'h-maly',
        startDay: 5,
        endDay: 6,
        kind: 'T',
        noteEn: 'Ward training',
        noteKm: 'បណ្តុះបណ្តាលក្នុងវួដ',
        status: 'pending',
      },
      {
        id: 'h-piseth-sick',
        staffId: 'h-piseth',
        startDay: 20,
        endDay: 20,
        kind: 'L',
        noteEn: 'Sick day',
        noteKm: 'ឈឺ',
        status: 'pending',
      },
      {
        id: 'h-vuthy-annual',
        staffId: 'h-vuthy',
        startDay: 27,
        endDay: 28,
        kind: 'L',
        noteEn: 'Annual leave',
        noteKm: 'ច្បាប់ប្រចាំឆ្នាំ',
        status: 'pending',
      },
    ],
  },
  {
    id: 'riverside',
    nameEn: 'Front Office',
    nameKm: 'ផ្នែកទទួលភ្ញៀវ',
    placeEn: 'Riverside Hotel',
    placeKm: 'សណ្ឋាគារមាត់ទន្លេ',
    min: { M: 3, A: 3, N: 2 },
    target: { M: 4, A: 4, N: 2 },
    staff: hotelStaff,
    templates: [
      {
        id: 'r-mealea-leave',
        staffId: 'r-mealea',
        startDay: 8,
        endDay: 10,
        kind: 'L',
        noteEn: 'Hometown visit',
        noteKm: 'ទៅស្រុកកំណើត',
        status: 'approved',
      },
      {
        id: 'r-thida-train',
        staffId: 'r-thida',
        startDay: 3,
        endDay: 4,
        kind: 'T',
        noteEn: 'Guest-care training',
        noteKm: 'បណ្តុះបណ្តាលសេវាភ្ញៀវ',
        status: 'pending',
      },
      {
        id: 'r-arun-doctor',
        staffId: 'r-arun',
        startDay: 18,
        endDay: 18,
        kind: 'L',
        noteEn: 'Doctor visit',
        noteKm: 'ជួបពេទ្យ',
        status: 'pending',
      },
      {
        id: 'r-vicheka-annual',
        staffId: 'r-vicheka',
        startDay: 25,
        endDay: 26,
        kind: 'L',
        noteEn: 'Annual leave',
        noteKm: 'ច្បាប់ប្រចាំឆ្នាំ',
        status: 'pending',
      },
    ],
  },
];

export function teamById(id: string): Team {
  return TEAMS.find((team) => team.id === id) ?? TEAMS[0];
}

export function makeMonth(team: Team, month: string): Bucket {
  const days = monthDates(month);
  const requests = team.templates.flatMap((template) => {
    const start = `${month}-${String(template.startDay).padStart(2, '0')}`;
    const end = `${month}-${String(template.endDay).padStart(2, '0')}`;
    if (!days.includes(start) || !days.includes(end)) return [];
    return [
      {
        id: `${template.id}@${month}`,
        staffId: template.staffId,
        start,
        end,
        kind: template.kind,
        noteEn: template.noteEn,
        noteKm: template.noteKm,
        status: template.status,
      },
    ];
  });
  const locked: AssignmentMap = {};
  for (const request of requests) {
    if (request.status !== 'approved') continue;
    for (const date of days) {
      if (date >= request.start && date <= request.end) {
        locked[cellKey(request.staffId, date)] = request.kind;
      }
    }
  }
  return {
    requests,
    assignments: buildFairRoster(team.staff, days, locked, team.target, team.min),
  };
}

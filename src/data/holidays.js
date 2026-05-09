// Bank/public holiday lists for UK (England/Wales) and Hong Kong, 2025-2028.
// Dates are ISO strings (YYYY-MM-DD). Tweak if your observance differs.
const UK = {
  2025: ['2025-01-01','2025-04-18','2025-04-21','2025-05-05','2025-05-26','2025-08-25','2025-12-25','2025-12-26'],
  2026: ['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28'],
  2027: ['2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'],
  2028: ['2028-01-03','2028-04-14','2028-04-17','2028-05-01','2028-05-29','2028-08-28','2028-12-25','2028-12-26']
}

// HK list includes: New Year, Lunar New Year (3 days), Ching Ming, Easter Fri/Mon, Labour, Buddha/Tuen Ng (approx), HKSAR Day, Mid-Autumn next day, National Day, Chung Yeung, Christmas (+Boxing).
const HK = {
  // precise lists for 2025 and 2026 taken from GovHK 'General holidays' pages
  2025: [
    '2025-01-01',
    '2025-01-29','2025-01-30','2025-01-31', // Lunar New Year (3 days)
    '2025-04-04', // Ching Ming
    '2025-04-18','2025-04-19','2025-04-21', // Good Friday, following day, Easter Monday
    '2025-05-01', // Labour Day
    '2025-05-05', // Birthday of the Buddha
    '2025-05-31', // Tuen Ng (Dragon Boat)
    '2025-07-01', // HKSAR
    '2025-10-01', // National Day
    '2025-10-07', // Day following Mid-Autumn (observed)
    '2025-10-29', // Chung Yeung
    '2025-12-25','2025-12-26' // Christmas, Boxing
  ],
  2026: [
    '2026-01-01',
    '2026-02-17','2026-02-18','2026-02-19', // Lunar New Year
    '2026-04-03','2026-04-04','2026-04-06','2026-04-07', // Good Fri, following day, Ching Ming substitute (6 Apr), extra substitution (7 Apr)
    '2026-05-01',
    '2026-05-25', // Birthday of the Buddha (substitute)
    '2026-06-19', // Tuen Ng / Dragon Boat (gov page lists 19 Jun)
    '2026-07-01',
    '2026-09-26', // Day following Mid-Autumn (26 Sep)
    '2026-10-01',
    '2026-10-19', // Day following Chung Yeung (19 Oct)
    '2026-12-25','2026-12-26'
  ],
  // 2027/2028: use current best-known dates (may be updated when GovHK publishes official lists)
  2027: ['2027-01-01','2027-02-06','2027-02-08','2027-02-09','2027-03-26','2027-03-29','2027-04-05','2027-05-01','2027-06-09','2027-07-01','2027-09-23','2027-10-01','2027-10-18','2027-12-25','2027-12-27'],
  2028: ['2028-01-03','2028-01-26','2028-01-27','2028-01-28','2028-04-14','2028-04-17','2028-04-04','2028-05-01','2028-06-27','2028-07-03','2028-09-22','2028-10-02','2028-10-09','2028-12-25','2028-12-26']
}

export function getHolidays(year, region='UK'){
  const y = typeof year === 'number' ? year : parseInt(year,10)
  if(region === 'HK') return HK[y] || []
  return UK[y] || []
}

/**
 * Parser for OSM opening_hours format.
 * Handles common patterns: "Mo-Fr 11:00-23:00; Sa-Su 10:00-24:00"
 * Returns null (unknown) for unparseable strings — caller decides what to do.
 */

const DAY_INDEX: Record<string, number> = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
};

const DAY_ABBREVS = Object.keys(DAY_INDEX); // su, mo, tu, ...

/**
 * Expand a day spec like "mo-fr" or "mo,we,fr" or "mo-fr,su" into a Set of day indices.
 */
function parseDays(spec: string): Set<number> {
  const days = new Set<number>();
  const parts = spec.split(",").map((s) => s.trim());

  for (const part of parts) {
    const rangeMatch = part.match(/^([a-z]{2})\s*-\s*([a-z]{2})$/);
    if (rangeMatch) {
      const start = DAY_INDEX[rangeMatch[1]];
      const end = DAY_INDEX[rangeMatch[2]];
      if (start === undefined || end === undefined) continue;
      // Walk forward (handles wrap: sa-mo)
      let i = start;
      while (true) {
        days.add(i);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    } else {
      const idx = DAY_INDEX[part];
      if (idx !== undefined) days.add(idx);
    }
  }

  return days;
}

/**
 * Parse a time like "11:00" or "23:30" into minutes since midnight.
 * Supports "24:00" as 1440.
 */
function parseTime(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

/**
 * Check if a venue with the given OSM opening_hours string is open at `date`.
 *
 * Returns:
 *  - true  → confirmed open
 *  - false → confirmed closed
 *  - null  → unknown (no data or unparseable)
 */
export function isOpenAt(openingHours: string | undefined, date: Date): boolean | null {
  if (!openingHours) return null;

  const str = openingHours.toLowerCase().trim();

  // "24/7" is always open
  if (str === "24/7") return true;

  const dayOfWeek = date.getDay(); // 0 = Sunday
  const nowMinutes = date.getHours() * 60 + date.getMinutes();

  // Split into rules: "mo-fr 11:00-23:00; sa-su 10:00-22:00"
  const rules = str.split(";").map((r) => r.trim()).filter(Boolean);

  let matched = false;

  for (const rule of rules) {
    // Skip "off" rules like "PH off"
    if (rule.endsWith("off")) continue;

    // Try: "days time-time" pattern
    // Match day spec (letters, commas, hyphens) then time range
    const m = rule.match(
      /^([a-z]{2}[\sa-z,\-]*?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/
    );

    if (m) {
      const days = parseDays(m[1].trim());
      const open = parseTime(m[2]);
      const close = parseTime(m[3]);
      if (open === null || close === null) continue;

      if (!days.has(dayOfWeek)) continue;

      matched = true;

      if (close > open) {
        // Same day range: 11:00-23:00
        if (nowMinutes >= open && nowMinutes < close) return true;
      } else {
        // Overnight range: 18:00-02:00
        if (nowMinutes >= open || nowMinutes < close) return true;
      }
      continue;
    }

    // Try: bare time range without days (applies every day) "11:00-23:00"
    const bareTime = rule.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (bareTime) {
      const open = parseTime(bareTime[1]);
      const close = parseTime(bareTime[2]);
      if (open === null || close === null) continue;

      matched = true;

      if (close > open) {
        if (nowMinutes >= open && nowMinutes < close) return true;
      } else {
        if (nowMinutes >= open || nowMinutes < close) return true;
      }
    }
  }

  // If we parsed at least one rule but none matched → closed
  if (matched) return false;

  // No hours data — assume open (most Chicago bars/restaurants are open until 2 AM)
  return true;
}

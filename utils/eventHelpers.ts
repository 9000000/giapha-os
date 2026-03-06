import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom_event";

export interface FamilyEvent {
  personId: string | null;
  personName: string;
  type: EventType;
  /** Solar date of the next occurrence */
  nextOccurrence: Date;
  /** Days until the next occurrence (negative = already passed this year, shown for context) */
  daysUntil: number;
  /** Display label for both solar and lunar representation */
  solarDateLabel: string;
  solarDaysUntil?: number;
  lunarDateLabel: string;
  lunarDaysUntil?: number;
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null;
  originMonth?: number | null;
  originDay?: number | null;
  /** Whether the person is deceased */
  isDeceased: boolean;
  /** Optional location for the event */
  location?: string | null;
  /** Optional content/description for the event */
  content?: string | null;
}

export interface CustomEventRecord {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

/**
 * Finds the next solar Date on which a given lunar (month, day) falls,
 * starting from `fromDate`.
 */
function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  // Derive the current lunar year by converting today's solar date to lunar
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  for (let offset = 0; offset <= 2; offset++) {
    // try fallback day 29 if day 30 doesn't exist in that lunar month
    for (const d of [lunarDay, lunarDay - 1]) {
      try {
        const l = LunarClass.fromYmd(
          currentLunarYear + offset,
          lunarMonth,
          d,
        );
        const s = l.getSolar();
        const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
        candidate.setHours(0, 0, 0, 0);
        if (candidate >= fromDate) return candidate;
      } catch {
        // lunar date may not exist in this year (e.g., leap month); try next
      }
    }
  }
  return null;
}

/**
 * Computes upcoming FamilyEvents from a list of persons.
 * - Birthdays use the solar birth_month / birth_day.
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death.
 */
export function computeEvents(
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    is_deceased: boolean;
  }[],
  customEvents: CustomEventRecord[] = []
): FamilyEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    // ── Birthday (solar) ────────────────────────────────────────────
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear();
      let next = new Date(thisYear, p.birth_month - 1, p.birth_day);
      if (next < today)
        next = new Date(thisYear + 1, p.birth_month - 1, p.birth_day);

      const daysUntil = Math.round(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Convert the ORIGINAL solar occurrence to lunar to display both
      const lunarOriginYear = p.birth_year || today.getFullYear();
      let lunarDateLabel = "";
      let lunarDaysUntil: number | undefined = undefined;
      let nextLunarOccurrence: Date | null = null;
      let nextLunarYear: number | undefined = undefined;
      try {
        const sDate = Solar.fromYmd(lunarOriginYear, p.birth_month, p.birth_day);
        const lDate = sDate.getLunar();
        const lDay = lDate.getDay();
        const lMonthRaw = lDate.getMonth();
        const isLMonthLeap = lMonthRaw < 0;
        const lMonthStr = Math.abs(lMonthRaw).toString().padStart(2, "0");

        // Calculate days until LUNAR birthday
        nextLunarOccurrence = nextSolarForLunar(Math.abs(lMonthRaw), lDay, today);
        if (nextLunarOccurrence) {
          lunarDaysUntil = Math.round((nextLunarOccurrence.getTime() - today.getTime()) / 86400000);
          const sOcc = Solar.fromYmd(nextLunarOccurrence.getFullYear(), nextLunarOccurrence.getMonth() + 1, nextLunarOccurrence.getDate());
          nextLunarYear = sOcc.getLunar().getYear();
        }
        lunarDateLabel = `${lDay.toString().padStart(2, "0")}/${lMonthStr}${isLMonthLeap ? " Nhuận" : ""}/${nextLunarYear || today.getFullYear()} ÂL`;
      } catch (e) {
        console.error(e);
      }

      events.push({
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        nextOccurrence: next,
        daysUntil: Math.min(daysUntil, lunarDaysUntil ?? daysUntil),
        solarDateLabel: `${p.birth_day.toString().padStart(2, "0")}/${p.birth_month.toString().padStart(2, "0")}/${next.getFullYear()}`,
        solarDaysUntil: daysUntil,
        lunarDateLabel,
        lunarDaysUntil,
        originYear: p.birth_year || null,
        originMonth: p.birth_month,
        originDay: p.birth_day,
        isDeceased: p.is_deceased,
      });
    }

    // ── Death anniversary (lunar) ────────────────────────────────────
    if (p.is_deceased && p.death_month && p.death_day) {
      try {
        // Assume user inputs LUNAR date for death anniversary (traditional in Vietnam)
        const lMonth = p.death_month;
        const lDay = p.death_day;

        const next = nextSolarForLunar(lMonth, lDay, today);
        if (!next) continue;

        const daysUntil = Math.round(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        const sOcc = Solar.fromYmd(next.getFullYear(), next.getMonth() + 1, next.getDate());
        const lOccYear = sOcc.getLunar().getYear();

        events.push({
          personId: p.id,
          personName: p.full_name,
          type: "death_anniversary",
          nextOccurrence: next,
          daysUntil,
          solarDateLabel: `${next.getDate().toString().padStart(2, "0")}/${(next.getMonth() + 1).toString().padStart(2, "0")}/${next.getFullYear()}`,
          lunarDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")}/${lOccYear} ÂL`,
          lunarDaysUntil: daysUntil,
          originYear: p.death_year,
          isDeceased: p.is_deceased,
        });
      } catch {
        // Skip if lunar conversion fails
      }
    }
  }

  // ── Custom Events (solar) ───────────────────────────────────────
  for (const ce of customEvents) {
    if (!ce.event_date) continue;
    const [y, m, d] = ce.event_date.split("-").map(Number);
    if (!y || !m || !d) continue;

    const next = new Date(y, m - 1, d);
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let lunarDateLabel = "";
    let lunarDaysUntil: number | undefined = undefined;
    let nextLunarYear: number | undefined = undefined;
    try {
      const sDate = Solar.fromYmd(y, m, d);
      const lDate = sDate.getLunar();
      const lDay = lDate.getDay();
      const lMonthRaw = lDate.getMonth();
      const isLMonthLeap = lMonthRaw < 0;
      const lMonthStr = Math.abs(lMonthRaw).toString().padStart(2, "0");

      const nextLunarOcc = nextSolarForLunar(Math.abs(lMonthRaw), lDay, today);
      if (nextLunarOcc) {
        lunarDaysUntil = Math.round((nextLunarOcc.getTime() - today.getTime()) / 86400000);
        const sOcc = Solar.fromYmd(nextLunarOcc.getFullYear(), nextLunarOcc.getMonth() + 1, nextLunarOcc.getDate());
        nextLunarYear = sOcc.getLunar().getYear();
      }
      lunarDateLabel = `${lDay.toString().padStart(2, "0")}/${lMonthStr}${isLMonthLeap ? " Nhuận" : ""}/${nextLunarYear || today.getFullYear()} ÂL`;
    } catch (e) {
      console.error(e);
    }

    events.push({
      personId: ce.id, // using event id here
      personName: ce.name, // mapping custom event name to personName
      type: "custom_event",
      nextOccurrence: next,
      daysUntil: Math.min(daysUntil, lunarDaysUntil ?? daysUntil),
      solarDateLabel: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${next.getFullYear()}`,
      solarDaysUntil: daysUntil,
      lunarDateLabel,
      lunarDaysUntil,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content,
    });
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}

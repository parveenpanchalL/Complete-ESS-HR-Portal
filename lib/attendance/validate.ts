import * as XLSX from "xlsx";
import { q } from "@/lib/db";
import { hoursBetween } from "@/lib/utils/date";

export type RawAttendanceRow = {
  rowNumber: number; employeeId: string; date: string; rawDate: string;
  inTime: string; outTime: string; status: string;
};
export type ValidatedRow = RawAttendanceRow & {
  employeeDbId?: string; workingHours?: number | null; errors: string[];
};
export type Summary = {
  totalRecords: number; matchedEmployees: number; unknownEmployeeIds: number; duplicateRecords: number;
  invalidDates: number; invalidStatus: number; invalidTimeFormat: number; validRecords: number; errorRecords: number;
};

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_ROWS = 60000;

const VALID_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY", "WEEKLY_OFF", "HALF_DAY", "LATE", "MISSING_PUNCH"];
const ALIASES: Record<string, string> = {
  present: "PRESENT", p: "PRESENT", absent: "ABSENT", a: "ABSENT", leave: "LEAVE", holiday: "HOLIDAY",
  "weekly off": "WEEKLY_OFF", weeklyoff: "WEEKLY_OFF", "half day": "HALF_DAY", halfday: "HALF_DAY",
  late: "LATE", "missing punch": "MISSING_PUNCH", missingpunch: "MISSING_PUNCH",
};

function normalizeStatus(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const up = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return VALID_STATUSES.includes(up) ? up : null;
}

export function validYmd(y: string, mo: string, d: string): string | null {
  const Y = Number(y), M = Number(mo), D = Number(d);
  const dt = new Date(Date.UTC(Y, M - 1, D));
  if (dt.getUTCFullYear() !== Y || dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== D) return null;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function normalizeDate(raw: string): string | null {
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return validYmd(m[3], m[2], m[1]);
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return validYmd(m[1], m[2], m[3]);
  if (/^\d+(\.\d+)?$/.test(s)) { // Excel serial date
    const dt = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    if (!Number.isNaN(dt.getTime()))
      return validYmd(String(dt.getUTCFullYear()), String(dt.getUTCMonth() + 1), String(dt.getUTCDate()));
  }
  return null;
}

function normalizeTime(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === "—") return "";
  if (/^0?\.\d+$|^\d\.\d+$/.test(s) && Number(s) < 1) { // Excel time fraction
    const mins = Math.round(Number(s) * 24 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const m = s.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : s;
}

/** Minimal RFC4180-ish CSV line splitter: handles quoted fields with embedded commas/quotes. */
function parseCsvText(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); out.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") pushField();
    else if (c === "\r") continue;
    else if (c === "\n") pushRow();
    else field += c;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

function rowsFromAoa(aoa: string[][]): Record<string, unknown>[] {
  if (aoa.length === 0) return [];
  const headers = aoa[0].map((h) => h.trim());
  return aoa.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

/**
 * CSV is parsed as plain text (no type inference) so a field like "06-01-2026" is never silently
 * reinterpreted as a date/number. Binary .xlsx/.xls go through SheetJS, which correctly reports a
 * true Excel date cell as a serial number (handled in normalizeDate) and a text cell as text.
 */
export function parseAttendanceBuffer(buffer: ArrayBuffer, isCsv: boolean): RawAttendanceRow[] {
  let rows: Record<string, unknown>[];
  if (isCsv) {
    let text = new TextDecoder("utf-8").decode(buffer);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
    rows = rowsFromAoa(parseCsvText(text));
  } else {
    const wb = XLSX.read(buffer, { type: "array", cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  }
  if (rows.length > MAX_ROWS) throw new Error(`File has more than ${MAX_ROWS} rows. Split it into smaller files.`);
  return rows.map((row, idx) => {
    const get = (keys: string[]) => {
      for (const k of Object.keys(row)) if (keys.includes(k.trim().toLowerCase())) return String(row[k] ?? "").trim();
      return "";
    };
    const rawDate = get(["date"]);
    return {
      rowNumber: idx + 2,
      employeeId: get(["employee id", "employeeid", "emp id", "empid"]).toUpperCase(),
      rawDate,
      date: normalizeDate(rawDate) || "",
      inTime: normalizeTime(get(["in time", "intime", "in"])),
      outTime: normalizeTime(get(["out time", "outtime", "out"])),
      status: get(["status"]),
    };
  });
}

export async function validateRows(rows: RawAttendanceRow[]): Promise<{ validated: ValidatedRow[]; summary: Summary }> {
  const emps = await q<{ id: string; employee_id: string; status: string }>(`SELECT id, employee_id, status FROM employees`);
  const map = new Map(emps.map((e) => [e.employee_id.toUpperCase(), e]));

  const seen = new Set<string>();
  const matched = new Set<string>();
  let unknown = 0, dup = 0, badDate = 0, badStatus = 0, badTime = 0;
  const timeRe = /^([01]?\d|2[0-3]):[0-5]\d$/;

  const validated = rows.map((row): ValidatedRow => {
    const errors: string[] = [];
    if (!row.employeeId) errors.push("Missing Employee ID");
    const emp = row.employeeId ? map.get(row.employeeId) : undefined;
    if (row.employeeId && !emp) { errors.push(`Unknown Employee ID: ${row.employeeId}`); unknown++; }
    else if (emp) matched.add(emp.id);

    let dateOk = /^\d{4}-\d{2}-\d{2}$/.test(row.date) && validYmd(row.date.slice(0, 4), row.date.slice(5, 7), row.date.slice(8, 10)) === row.date;
    if (!dateOk) { errors.push(`Invalid date: "${row.rawDate || row.date}"`); badDate++; dateOk = false; }

    const status = row.status ? normalizeStatus(row.status) : null;
    if (!status) { errors.push(`Invalid status: "${row.status}"`); badStatus++; }

    if (row.inTime && !timeRe.test(row.inTime)) { errors.push(`Invalid in-time: "${row.inTime}"`); badTime++; }
    if (row.outTime && !timeRe.test(row.outTime)) { errors.push(`Invalid out-time: "${row.outTime}"`); badTime++; }
    if (status && ["PRESENT", "LATE"].includes(status) && !row.inTime && !row.outTime)
      errors.push("Present/Late requires at least an in or out time");

    if (row.employeeId && dateOk) {
      const key = `${row.employeeId}|${row.date}`;
      if (seen.has(key)) { errors.push("Duplicate record (same Employee ID + Date in file)"); dup++; } else seen.add(key);
    }

    const bothTimes = !!row.inTime && !!row.outTime && timeRe.test(row.inTime) && timeRe.test(row.outTime);
    const hours = bothTimes ? hoursBetween(row.inTime, row.outTime) : null;
    if (bothTimes && hours === null) errors.push("Out time must be after in time");

    return { ...row, status: status || row.status, employeeDbId: emp?.id, workingHours: hours, errors };
  });

  const errorRecords = validated.filter((r) => r.errors.length > 0).length;
  return {
    validated,
    summary: {
      totalRecords: rows.length, matchedEmployees: matched.size, unknownEmployeeIds: unknown, duplicateRecords: dup,
      invalidDates: badDate, invalidStatus: badStatus, invalidTimeFormat: badTime,
      validRecords: rows.length - errorRecords, errorRecords,
    },
  };
}

/** Never trust rows posted back from the browser: re-validate from the raw fields. */
export async function revalidatePosted(rows: Partial<RawAttendanceRow>[]): Promise<ValidatedRow[]> {
  const raw: RawAttendanceRow[] = rows.slice(0, MAX_ROWS).map((r, i) => ({
    rowNumber: Number(r.rowNumber) || i + 2,
    employeeId: String(r.employeeId ?? "").trim().toUpperCase(),
    rawDate: String(r.rawDate ?? r.date ?? ""),
    date: String(r.date ?? ""),
    inTime: String(r.inTime ?? ""),
    outTime: String(r.outTime ?? ""),
    status: String(r.status ?? ""),
  }));
  return (await validateRows(raw)).validated;
}
